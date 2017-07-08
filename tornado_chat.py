# -*- coding: utf-8 -*-
"""
    Best chat ever now a sockjs-tornado application.
"""
import StringIO
import json
import os
import time
from collections import deque
from hashlib import sha256

import sockjs.tornado
import tornado.web
from boto3 import resource
from requests import get
from tornado.escape import to_unicode, linkify, xhtml_escape, url_unescape

from custom_render import BaseHandler

settings = {
    'debug_warning': False,
    'template_path': 'templates',
    'static_path': os.path.join(os.path.dirname(__file__), 'static'),
    'emojis': [u'💩', u'😀', u'😁', u'😂', u'😃', u'😄', u'😅', u'😆', u'😉', u'😊', u'😋', u'😌', u'😍', u'😎',
               u'😏', u'😐', u'😑', u'😒', u'😓', u'😔', u'😕', u'😖', u'😗', u'😘', u'😙', u'😚', u'😛', u'😜',
               u'😝', u'😞', u'😟', u'😠', u'😡', u'😢', u'😣', u'😤', u'😥', u'😦', u'😧', u'😨', u'😩', u'😪',
               u'😫', u'😬', u'😭', u'😮', u'😯', u'😰', u'😱', u'😲', u'😳', u'😴', u'😵', u'😶', u'😷', u'🙁',
               u'🙂', u'🙃', u'🙄', u'🤖', u'🖳', u'💩', u'🚽', u'🚲', u'🐢', u'🐉', u'🐅', u'🐄', u'🐐', u'🐑',
               u'🐬', u'🐳', u'💩', u'🖕', u'🖖', u'✌', u'🤘', u'🤙', u'🤚', u'🤛', u'🤜', u'🤝', u'🤞', u'💪',
               u'🚀', u'🥓', u'🥒', u'🥞', u'🥔', u'🍌', u'🍍', u'🦄', u'🦈', u'💩']
}

users = {}

MAX_DEQUE_LENGTH = 75

history = deque(maxlen=MAX_DEQUE_LENGTH)

client_version = 46
update_message = "Oh my gosh, try sending an image!!"


class PageHandler(BaseHandler):
    """Regular HTTP handler to serve the chatroom page"""

    def get(self):
        self.render2('index.html', debug=self.settings['debug_warning'], emoji_list=self.settings['emojis'])


class ValidateHandler(BaseHandler):
    def post(self):
        new_name = self.get_argument('set_name', default=None, strip=True)
        if new_name is None or new_name == '':
            self.write(json.dumps(False))
            return
        if new_name == self.get_argument('username', default=None, strip=True):
            self.write(json.dumps(True))
            return
        self.write(json.dumps(new_name not in users.keys()))


class MultiRoomChatConnection(sockjs.tornado.SockJSConnection):
    """Chat connection implementation"""
    # Class level variable
    participants = set()
    rooms = {"main": []}
    username = None
    previous_tell = None
    reply_to = None

    bucket = resource('s3').Bucket('best-ever-chat-image-cache')

    def on_open(self, info):
        self.username = url_unescape(info.get_cookie('username').value)
        # Send that someone joined
        self.broadcast_from_server(self.participants, self.username + ' has connected')

        # Add client to the clients list
        self.participants.add(self)
        users[self.username] = {'color': info.get_cookie('color').value,
                                'sounds': info.get_cookie('sounds').value}

        self.broadcast_user_list()
        self.send_chat_history()
        self.send_information(update_message)
        self.send_from_server('Connection successful')

    def on_message(self, message):
        json_message = json.loads(message)
        if json_message['type'] == 'chatMessage':
            if json_message['message'] and json_message['message'][0] == '/':
                self.parse_command(json_message)
            else:
                self.broadcast_chat_message(json_message['user'], json_message['message'])
        if json_message['type'] == 'version':
            if json_message['client_version'] < client_version:
                self.send_from_server('Your client is out of date. Refresh your page, or else.')
                self.send({'type': 'versionUpdate'})
            if json_message['client_version'] > client_version:
                self.send_from_server('There is something wrong with your client version. What did you do?')
        if json_message['type'] == 'imageMessage':
            self.broadcast_image(json_message['user'], json_message['url'])
        if json_message['type'] == 'userSettings':
            self.update_user_settings(json_message['user'], json_message['settings'])

    def on_close(self):
        # Remove client from the clients list and broadcast leave message
        users.pop(self.username, None)
        self.participants.remove(self)

        self.broadcast_from_server(self.participants, self.username + " left.")
        self.broadcast_user_list()
        self.close()

    def send_from_server(self, message):
        self.send({'type': 'chatMessage',
                   'data': {
                       'user': 'Server',
                       'message': message,
                       'time': time.time()}})

    def broadcast_from_server(self, send_to, message):
        new_message = {'user': 'Server',
                       'message': message,
                       'time': time.time()}
        self.broadcast(send_to, {'type': 'chatMessage',
                                 'data': new_message})

    def send_information(self, message):
        self.send({'type': 'information', 'data': {'message': message}})

    def broadcast_user_list(self):
        self.broadcast(self.participants, {'type': 'userList', 'data': users})

    def send_chat_history(self):
        self.send({'type': 'history', 'data': sorted(history, cmp=lambda x, y: cmp(x['time'], y['time']))})

    def broadcast_private_message(self, sender, recipient, message):
        recipients = set()
        recipients.add(sender)
        recipients.add(recipient)
        recipient.reply_to = [x for x in self.participants if x.username == sender.username][0]
        new_message = {'type': 'privateMessage', 'data': {'sender': sender.username,
                                                          'recipient': recipient.username,
                                                          'message': message,
                                                          'time': time.time()}}
        self.broadcast(recipients, new_message)

    def broadcast_chat_message(self, user, message):
        new_message = {'user': user,
                       'color': users[user]['color'],
                       'message': linkify(to_unicode(message), extra_params='target="_blank"', require_protocol=False),
                       'time': time.time()}
        history.append(new_message)
        self.broadcast(self.participants, {'type': 'chatMessage',
                                           'data': new_message})

    def broadcast_image(self, user, image_url):
        s3_key = 'images/' + sha256(image_url).hexdigest()
        try:
            exists = filter(lambda x: x.key == s3_key, list(self.bucket.objects.all()))
            logging.info('Found object in S3: {}'.format(exists))
            if len(exists) <= 0:
                req_for_image = get(image_url, stream=True)
                file_object_from_req = req_for_image.raw
                req_data = file_object_from_req.read()
                if len(req_data) == 0:
                    raise Exception('empty data, response code:{}'.format(req_for_image.status_code))

                # Do the actual upload to s3
                self.bucket.put_object(Key=s3_key, Body=req_data, ACL='public-read')
            image_src_url = 'https://s3-us-west-2.amazonaws.com/best-ever-chat-image-cache/' + s3_key
        except Exception as e:
            logging.info(e.message)
            logging.info('Image failed to transfer to S3 bucket: URL({}) KEY({})'.format(image_url, s3_key))
            image_src_url = image_url

        new_message = {'user': user,
                       'color': users[user]['color'],
                       'message': "<a href=\"{}\" target=\"_blank\"><img src=\"{}\" width=\"300px\" /></a>".format(
                           xhtml_escape(image_url), xhtml_escape(image_src_url)),
                       'time': time.time()}
        history.append(new_message)
        self.broadcast(self.participants, {'type': 'chatMessage',
                                           'data': new_message})

    def update_user_settings(self, user, settings):
        if user != self.username:
            return

        if 'newColor' in settings.keys():
            users[self.username]['color'] = settings['newColor']
            self.send_from_server('Color updated.')

        if 'newUser' in settings.keys():
            if settings['newUser'] in users.keys():  # username is taken, validation backup
                self.send({'type': 'revertName', 'data': self.username})
                self.send_from_server('Name already taken.')
            else:
                prev_user_data = users.pop(self.username, {})
                self.username = settings['newUser']
                users[self.username] = prev_user_data

                self_set = set()
                self_set.add(self)

                self.broadcast_from_server(self.participants.difference(self_set),
                                           user + " is now " + self.username)
                self.send_from_server("Name changed.")
                self.broadcast_user_list()

    def parse_command(self, json_message):
        message = json_message['message']
        command, _, command_args = message[1:].partition(' ')
        if command == 'help':
            self.send_from_server('Okay, fine, this is what you can do:<table>' +
                                  '<tr>' +
                                  '<td>/tell &lt;username&gt;</td>' +
                                  '<td>/t &lt;username&gt;</td>' +
                                  '<td>send a private message</td>' +
                                  '</tr>' +
                                  '<tr>' +
                                  '<td>/reply</td>' +
                                  '<td>/r</td>' +
                                  '<td>reply to the last private message you received</td>' +
                                  '</tr>' +
                                  '<tr>' +
                                  '<td>/retell</td>' +
                                  '<td>/rt</td>' +
                                  '<td>send a private message to the last person you sent one to</td>' +
                                  '</tr>' +
                                  # '<tr>' +
                                  # '<td>/create &lt;room name&gt;</td>' +
                                  # '<td>/c &lt;room name&gt;</td>' +
                                  # '<td>create a sub-room</td>' +
                                  # '</tr>' +
                                  # '<tr>' +
                                  # '<td>/invite &lt;username&gt;</td>' +
                                  # '<td>/i &lt;username&gt;</td>' +
                                  # '<td>invite someone to a sub-room you are in</td>' +
                                  # '</tr>' +
                                  # '<tr>' +
                                  # '<td>/leave &lt;room name&gt;</td>' +
                                  # '<td>/l &lt;room name&gt;</td>' +
                                  # '<td>leave a sub-room you are in</td>' +
                                  # '</tr>' +
                                  '</table>')
        # elif command == 'create':
        #     room_name = command_args.split(' ')[0]
        #     if room_name == '':
        #         self.send_from_server('You must supply a name to create a room.')
        #     else:
        #         if room_name in users.keys():
        #             self.send_from_server('You cannot use an existing username as a room name.')
        #         elif room_name in self.rooms.keys():
        #             self.send_from_server('Room \'{}\' already exists'.format(room_name))
        #         else:
        #             self.rooms[room_name] = [self.username]
        #             print self.rooms
        #             self.send_from_server('Created room \'{}\''.format(room_name))
        # elif command == 'invite':
        #     invitees = command_args.split(' ')
        #     room_name = invitees.pop(0)
        #     print invitees
        #     print room_name
        #     for user in invitees:
        #         if user not in users.keys():
        #             self.send_from_server('You cannot invite someone who is not connected to chat.')
        #         else:
        #             self.broadcast_from_server(
        #                 [x for x in self.participants if x.username in self.rooms[room_name]],
        #                 '{} has joined \'{}\''.format(user, room_name))
        #             self.rooms[room_name].append(user)
        #             self.broadcast_from_server([x for x in self.participants if x.username == user],
        #                                        'You have been added to \'{}\''.format(room_name))
        #     print self.username
        elif command == 'tell' or command == 't':
            user, _, message = command_args.partition(' ')
            if user == '':
                self.send_from_server('Who do you want to private message?<table><tr>' +
                                      '<td>/tell &lt;username&gt;</td>' +
                                      '<td>/t &lt;username&gt;</td>' +
                                      '</tr></table>')
            elif user in users.keys():
                self.previous_tell = [x for x in self.participants if x.username == user][0]
                self.broadcast_private_message(self,
                                               self.previous_tell,
                                               message)
            else:
                self.send_from_server('{} is not connected to chat.'.format(user))
        elif command == 'retell' or command == 'rt':
            if self.previous_tell is not None:
                if self.previous_tell not in self.participants:
                    self.send_from_server('{} is not connected to chat.'.format(self.previous_tell.username))
                else:
                    self.broadcast_private_message(self,
                                                   self.previous_tell,
                                                   command_args)
            else:
                self.send_from_server('You cannot retell if you have not sent a tell.')

        elif command == 'reply' or command == 'r':
            if self.reply_to is not None:
                if self.reply_to not in self.participants:
                    self.send_from_server('{} is not connected to chat.'.format(self.reply_to.username))
                else:
                    self.broadcast_private_message(self,
                                                   self.reply_to,
                                                   command_args)
            else:
                self.send_from_server('You cannot reply if you have not received a tell.')
        else:
            # if command in self.rooms.keys():
            #     print command, 'is a room'
            # else:
            self.send_from_server('Invalid command \'{}\''.format(command))


if __name__ == "__main__":
    import logging

    logging.getLogger().setLevel(logging.DEBUG)

    # 1. Create chat router
    ChatRouter = sockjs.tornado.SockJSRouter(MultiRoomChatConnection, '/chat', user_settings={
        'disabled_transports': [
            'xhr',
            'xhr_streaming',
            'jsonp',
            'htmlfile',
            'eventsource'
        ]
    })

    # 2. Create Tornado application
    app = tornado.web.Application(
        [
            (r"/", PageHandler),
            (r'/static/(.*)', {'path': settings['static_path']}),
            ('/validate_username', ValidateHandler)
        ] +
        ChatRouter.urls,
        **settings
    )

    # 3. Make Tornado app listen on port 6969
    app.listen(6969, no_keep_alive=True)

    # 4. Start IOLoop
    tornado.ioloop.IOLoop.instance().start()
