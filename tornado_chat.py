# -*- coding: utf-8 -*-
"""
    Best chat ever now a sockjs-tornado application.
"""
import json
import os
import time
from collections import deque

import sockjs.tornado
import tornado.web
from tornado.escape import to_unicode, linkify, xhtml_escape

from custom_render import BaseHandler

settings = {
    'debug_warning': True,
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

history = deque(maxlen=75)

client_version = 43


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


class ChatConnection(sockjs.tornado.SockJSConnection):
    """Chat connection implementation"""
    # Class level variable
    participants = set()
    username = None

    def on_open(self, info):
        self.username = info.get_cookie('username').value
        # Send that someone joined
        self.broadcast_from_server(self.participants, self.username + ' has connected')

        # Add client to the clients list
        self.participants.add(self)
        users[self.username] = {'color': info.get_cookie('color').value,
                                'sounds': info.get_cookie('sounds').value}

        self.broadcast_user_list()
        self.send_chat_history()
        self.send_from_server('Connection successful')

    def on_message(self, message):
        json_message = json.loads(message)
        if json_message['type'] == 'version':
            if json_message['client_version'] < client_version:
                self.send_from_server('Your client is out of date. Please refresh your page, you dork.')
            if json_message['client_version'] > client_version:
                self.send_from_server('There is something wrong with your client version. What did you do?')
        if json_message['type'] == 'chatMessage':
            self.broadcast_chat_message(json_message['user'], json_message['message'])
        if json_message['type'] == 'imageMessage':
            self.broadcast_image(json_message['user'], json_message['url'])
        if json_message['type'] == 'userSettings':
            self.update_user_settings(json_message['user'], json_message['settings'])

    def on_close(self):
        # Remove client from the clients list and broadcast leave message
        self.participants.remove(self)
        users.pop(self.username, None)

        self.broadcast_from_server(self.participants, self.username + " left.")
        self.broadcast_user_list()

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

    def broadcast_user_list(self):
        self.broadcast(self.participants, {'type': 'userList', 'data': users})

    def send_chat_history(self):
        self.send({'type': 'history', 'data': sorted(history, cmp=lambda x, y: cmp(x['time'], y['time']))})

    def broadcast_chat_message(self, user, message):
        new_message = {'user': user,
                       'color': users[user]['color'],
                       'message': linkify(to_unicode(message), extra_params='target="_"', require_protocol=False),
                       'time': time.time()}
        history.append(new_message)
        self.broadcast(self.participants, {'type': 'chatMessage',
                                           'data': new_message})

    def broadcast_image(self, user, image_url):
        new_message = {'user': user,
                       'color': users[user]['color'],
                       'message': "<a href=\"{}\" target=\"_\"><img src=\"{}\" width=\"100px\" /></a>".format(
                           xhtml_escape(image_url), xhtml_escape(image_url)),
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


if __name__ == "__main__":
    import logging

    logging.getLogger().setLevel(logging.DEBUG)

    # 1. Create chat router
    ChatRouter = sockjs.tornado.SockJSRouter(ChatConnection, '/chat')

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
    app.listen(6969)

    # 4. Start IOLoop
    tornado.ioloop.IOLoop.instance().start()
