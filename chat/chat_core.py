import json
import time
from collections import deque
from datetime import timedelta

import bcrypt
import sockjs.tornado
import tornado.web
from boto3 import resource
from tornado import gen, ioloop
from tornado.escape import xhtml_escape
from tornado.ioloop import IOLoop, PeriodicCallback

from chat.custom_render import executor
from chat.lib import get_matching_participants, retrieve_image_in_s3, preprocess_message
from emoji.emojipy import Emoji

MAX_DEQUE_LENGTH = 75

users = {}
rooms = {
    0: {
        'name': 'General',
        'participants': set(),
        'owner': None,
        'history': deque(maxlen=MAX_DEQUE_LENGTH),
        'id': 0
    }
}

emoji = Emoji()

client_version = '2.0'


class MultiRoomChatConnection(sockjs.tornado.SockJSConnection):
    """Chat connection implementation"""
    # Class level variable
    participants = set()
    username = None
    current_user = None
    previous_tell = None
    reply_to = None
    idle = False
    http_server = None
    limited = False
    messageCount = 0
    spammy_timeout = None

    bucket = resource('s3').Bucket('best-ever-chat-image-cache')

    def on_open(self, info):
        """
        Fires on initial connection. Add user to list and appropriate rooms, then broadcast connection.
        :return:
        """
        parasite = self.session.handler.get_secure_cookie('parasite')
        if parasite is None:
            self.send_auth_fail()
            return False
        self.current_user = self.http_server.db.get(
            "SELECT id, password, username, color, sound, soundSet, email, faction FROM parasite WHERE id = %s",
            parasite)
        if not self.current_user:
            self.current_user = {}

        self.joined_rooms = [0]
        current_rooms = self.http_server.db.query(
            "SELECT room_id FROM room_access WHERE parasite_id=%s AND in_room IS TRUE", parasite)
        if len(current_rooms) != 0:
            self.joined_rooms.extend(
                filter(lambda x: x not in self.joined_rooms, map(lambda x: x['room_id'], current_rooms)))
        self.username = self.current_user.username
        for room in self.joined_rooms:
            if room not in rooms.keys():
                rooms[room] = self.http_server.db.get("SELECT * FROM rooms WHERE id=%s", room)
                rooms[room]['participants'] = set()
                rooms[room]['history'] = deque(maxlen=MAX_DEQUE_LENGTH)
            rooms[room]['participants'].add(self)

        self.send_room_information()

        def spam_callback():
            self.messageCount = 0

        PeriodicCallback(
            spam_callback,
            1000
        ).start()

        # Add client to the clients list
        self.participants.add(self)
        if self.username not in users.keys():
            users[self.username] = {'color': self.current_user.color or '',
                                    'typing': False,
                                    'idle': self.idle,
                                    'faction': self.current_user.faction,
                                    'real_name': self.current_user['id']}
            # Send that someone joined
            self.broadcast_from_server([x for x in self.participants if x.username != self.username],
                                       self.username + ' has connected', rooms=self.joined_rooms)
            self.broadcast_user_list()

        self.send_from_server('Connection successful. Type /help or /h for available commands.')

    def on_message(self, message):
        """
        Fires when a message is received from the client through the socket. Calls handler methods based on message
        type.

        :param message: JSON message sent from client
        """
        json_message = json.loads(message)
        if self.current_user['id'] != self.session.handler.get_secure_cookie('parasite'):
            self.send_auth_fail()
        if json_message['type'] == 'chatMessage':
            if json_message['message'] and json_message['message'][0] == '/':
                self.parse_command(json_message)
            else:
                self.broadcast_chat_message(json_message['user'], json_message['message'], json_message['room'])
        if json_message['type'] == 'version':
            if json_message['client_version'] < client_version:
                self.send_from_server('Your client is out of date. You\'d better refresh your page!')
                self.send({'type': 'versionUpdate'})
            if json_message['client_version'] > client_version:
                self.send_from_server('How did you mess up a perfectly good client version number?')
        if json_message['type'] == 'imageMessage':
            self.broadcast_image(json_message['user'], json_message['url'], json_message['room'])
        if json_message['type'] == 'userSettings':
            self.update_user_settings(json_message['settings'])
        if json_message['type'] == 'userStatus':
            self.update_user_status(json_message['user'], json_message['status'])
        if json_message['type'] == 'password_change':
            self.change_user_password(json_message['user'], json_message['data'])
        if json_message['type'] == 'newRoom':
            self.create_room(json_message['user'], json_message['data'])
        if json_message['type'] == 'joinRoom':
            self.join_room(json_message['user'], json_message['data'])
        if json_message['type'] == 'leaveRoom':
            self.leave_room(json_message['user'], json_message['data'])
        if json_message['type'] == 'deleteRoom':
            self.delete_room(json_message['user'], json_message['data'])

    def on_close(self):
        """
        Fired on client disconnect/socket close. Removes user from participant, user, and room lists.
        """
        self.participants.remove(self)
        for room in self.joined_rooms:
            rooms[room]['participants'].remove(self)
        # if this was the last open socket for the user, the user left the chat.
        if len(get_matching_participants(self.participants, self.username, 'username')) == 0:
            users.pop(self.username, None)
            self.broadcast_from_server(self.participants, self.username + " left.", rooms=self.joined_rooms)
            self.broadcast_user_list()

        # Close the socket.
        IOLoop.current().add_callback(self.close)

    def send_auth_fail(self):
        """
        Authentication failed, send a message to the client to log out.
        """
        self.send({'type': 'auth_fail',
                   'data': {
                       'user': 'Server',
                       'message': 'You really messed something up. Please standby while I clean it up...',
                       'time': time.time()
                   }})

    def send_from_server(self, message, room_id=None):
        """
        Send a chat message from the server to the current socket. If no room_id, client should display message in
        all rooms.
        :param message: message to send
        :param room_id: room to associate with message
        """
        self.send({'type': 'chatMessage',
                   'data': {
                       'user': 'Server',
                       'message': message,
                       'time': time.time(),
                       'room': room_id}})

    def broadcast_from_server(self, send_to, message, message_type='chatMessage', data=None, room_id=None, rooms=None):
        """
        Broadcast a message to given participants.
        :param send_to: participants to receive broadcast message
        :param message: display message to send
        :param message_type: type of message
        :param data: data to send with message
        :param room_id: room to associate with message. igornied if rooms is defined
        :param rooms: rooms to associate message with. if defined, room_id is ignored
        """
        if rooms is not None:
            for room in rooms:
                new_message = {'user': 'Server',
                               'message': message,
                               'time': time.time(),
                               'data': data,
                               'room': room}
                self.broadcast(send_to, {'type': message_type,
                                         'data': new_message})
        else:
            new_message = {'user': 'Server',
                           'message': message,
                           'time': time.time(),
                           'data': data,
                           'room': room_id}
            self.broadcast(send_to, {'type': message_type,
                                     'data': new_message})

    def broadcast_user_list(self, room_id=None):
        """
        Broadcasts user list. If room_id is specified, broadcast only to that room. Otherwise, broadcast user list to
        all participants that share a room with the current participant.
        """
        if room_id is not None:
            room_participants = rooms[room_id]['participants']
            room_users = {}
            for user_key in map(lambda x: x.username, room_participants):
                room_users[user_key] = users[user_key]
            self.broadcast(room_participants, {'type': 'userList', 'data': {'users': room_users, 'room': room_id}})
        else:
            for room in self.joined_rooms:
                # get the users that line up with the participants for the room
                room_participants = rooms[room]['participants']
                room_users = {}
                for user_key in map(lambda x: x.username, room_participants):
                    room_users[user_key] = users[user_key]
                self.broadcast(self.participants, {'type': 'userList', 'data': {'users': room_users, 'room': room}})

    def broadcast_private_message(self, sender, recipient, message):
        # TODO make private messages persistent
        sender_participants = get_matching_participants(self.participants, sender)
        recipient_participants = get_matching_participants(self.participants, recipient)
        for participant in recipient_participants:
            participant.reply_to = sender
        recipients = sender_participants + recipient_participants
        new_message = {'type': 'privateMessage', 'data': {'sender': sender_participants[0].username,
                                                          'recipient': recipient_participants[0].username,
                                                          'message': message,
                                                          'time': time.time()}}
        self.broadcast(recipients, new_message)

    def spammy_check_callback(self):
        # decerement limit counter
        self.limited -= 1
        # check if 0 - set to false and send update
        if self.limited == 0:
            self.limited = False
            self.send_from_server('You can send messages again.')
        # else if 5, 3, 2, 1 then send update
        else:
            if self.limited <= 3:
                self.send_from_server('{} seconds before you can speak!'.format(self.limited))
            ioloop.IOLoop.instance().add_timeout(
                timedelta(seconds=1),
                self.spammy_check_callback
            )

    def clear_spammy_warning_callback(self):
        self.spammy_timeout = None

    def you_are_spammy(self):
        # reset the message count every second.
        self.limited = 10
        # unlimit the user in 3 seconds.
        ioloop.IOLoop.instance().add_timeout(
            timedelta(seconds=1),
            self.spammy_check_callback
        )
        self.send_from_server('Wow, you are sending messages way too fast. Slow down, turbo.')
        if not self.spammy_timeout:
            self.send_from_server('Wait {} seconds to speak.'.format(self.limited))
            self.spammy_timeout = ioloop.IOLoop.instance().add_timeout(timedelta(seconds=1),
                                                                       self.clear_spammy_warning_callback)

    def broadcast_chat_message(self, user, message, room_id):
        if self.limited:
            if not self.spammy_timeout:
                self.send_from_server('Wait {} seconds to speak.'.format(self.limited))
                self.spammy_timeout = ioloop.IOLoop.instance().add_timeout(timedelta(seconds=1),
                                                                           self.clear_spammy_warning_callback)
        else:
            self.messageCount += 1
            if self.messageCount > 5:
                spammy_participants = [x for x in self.participants if x.current_user.id == self.current_user['id']]
                self.broadcast_from_server(self.participants.difference(spammy_participants),
                                           "{} has been blocked for spamming!!".format(self.username))
                for participant in spammy_participants:
                    participant.you_are_spammy()
            else:
                message_text = preprocess_message(message, emoji)

                new_message = {'user': user,
                               'color': users[user]['color'],
                               'message': message_text,
                               'time': time.time(),
                               'room': room_id}
                rooms[room_id]['history'].append(new_message)
                self.broadcast(self.participants, {'type': 'chatMessage',
                                                   'data': new_message})

    def broadcast_image(self, user, image_url, room_id):
        image_src_url = retrieve_image_in_s3(image_url, self.bucket)

        new_message = {'user': user,
                       'color': users[user]['color'],
                       'message': "<a href=\"{}\" target=\"_blank\"><img src=\"{}\" /></a>".format(
                           xhtml_escape(image_url), xhtml_escape(image_src_url)),
                       'time': time.time(),
                       'room': room_id}
        rooms[room_id]['history'].append(new_message)
        self.broadcast(self.participants, {'type': 'chatMessage',
                                           'data': new_message})

    def update_user_settings(self, settings):
        updating_participants = get_matching_participants(self.participants, self.current_user['id'])

        should_broadcast_users = False

        if 'newSounds' in settings.keys():
            self.current_user.sound = settings['newSounds']
            self.broadcast_from_server(updating_participants,
                                       'Volume set to {}.'.format(self.current_user.sound),
                                       message_type='update', data={'sounds': self.current_user.sound})

        if 'newSoundSet' in settings.keys():
            self.current_user.soundSet = settings['newSoundSet']
            self.broadcast_from_server(updating_participants, '{} sounds chosen.'.format(self.current_user.soundSet),
                                       message_type='update', data={'sound_set': self.current_user.soundSet})

        if 'newColor' in settings.keys():
            self.current_user.color = settings['newColor']
            users[self.username]['color'] = settings['newColor']
            self.broadcast_from_server(updating_participants, 'Color updated.', message_type='update',
                                       data={'color': self.current_user.color})

        if 'newEmail' in settings.keys():
            self.current_user.email = settings['newEmail']
            self.broadcast_from_server(updating_participants, 'Email updated to {}.'.format(self.current_user.email),
                                       message_type='update',
                                       data={'email': self.current_user.email})

        if 'newFaction' in settings.keys():
            self.current_user.faction = settings['newFaction']
            users[self.username]['faction'] = settings['newFaction']
            self.broadcast_from_server(updating_participants,
                                       'Faction changed to {}.'.format(self.current_user.faction),
                                       message_type='update', data={'faction': self.current_user.faction})
            should_broadcast_users = True

        if 'newUser' in settings.keys() and 'oldUser' in settings.keys():
            user = settings['oldUser']
            if settings['newUser'] in users.keys():  # username is taken, validation backup
                self.send({'type': 'revertName', 'data': self.username})
                self.send_from_server('Name already taken.')
            else:
                prev_user_data = users.pop(self.username, {})
                self.username = settings['newUser']
                self.current_user.username = self.username
                users[self.username] = prev_user_data

                self_set = {self}

                # TODO: broadcast in all rooms where user is located
                self.broadcast_from_server(self.participants.difference(self_set),
                                           user + " is now " + self.username, rooms=self.joined_rooms)
                self.broadcast_from_server(updating_participants, "Name changed.", message_type='update',
                                           data={'username': self.username})
                should_broadcast_users = True

        if should_broadcast_users:
            self.broadcast_user_list()

        self.http_server.db.execute(
            'UPDATE parasite SET color=%s, username=%s, sound=%s, soundSet=%s, email=%s, faction=%s WHERE id=%s',
            self.current_user.color, self.current_user.username, self.current_user.sound,
            self.current_user.soundSet, self.current_user.email, self.current_user.faction, self.current_user['id'])

    def update_user_status(self, user, json_status):
        if user != self.username or not json_status:
            return

        if 'idle' in json_status:
            idleStatus = json_status['idle']
            # get all user participants
            updating_participants = get_matching_participants(self.participants, self.current_user['id'])
            if idleStatus:
                self.idle = True  # set before check
                # if all participants are idle, set idle and broadcast user list
                should_update = False
                for participant in updating_participants:
                    should_update = should_update or participant.idle
                if should_update:
                    users[self.username]['idle'] = True
                    self.broadcast_user_list()
            else:
                # if all participants are idle, set active and broadcast user list
                users[self.username]['idle'] = False
                should_update = False
                for participant in updating_participants:
                    should_update = should_update or not participant.idle

                if should_update:
                    self.broadcast_user_list()
                self.idle = False  # set after check
        elif 'typing' in json_status:
            if 'currentMessage' in json_status and json_status['currentMessage']:
                typing_status = json_status['currentMessage'][0] != '/'
            else:
                typing_status = json_status['typing']

            if users[self.username]['typing'] is not typing_status:
                users[self.username]['typing'] = typing_status
                # TODO broadcast only to the room the user is typing in
                self.broadcast_user_list()

    @gen.coroutine
    def change_user_password(self, user, password_list):
        if user != self.username or not password_list or len(password_list) != 2 or password_list[0] != password_list[
            1]:
            return

        updating_participants = get_matching_participants(self.participants, self.current_user['id'])

        hashed_password = yield executor.submit(
            bcrypt.hashpw, tornado.escape.utf8(password_list[0]),
            bcrypt.gensalt())
        if self.current_user.password != hashed_password:
            self.http_server.db.execute("UPDATE parasite SET password = %s WHERE id = %s", hashed_password,
                                        self.current_user['id'])

        self.broadcast_from_server(updating_participants, 'PASSWORD CHANGED! I hope that\'s what you wanted.')

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
                                  '</table>')
        elif command == 'tell' or command == 't':
            matching_users = [item for item in users.keys() if command_args.startswith(item)]
            user = max(matching_users)

            message = command_args.replace(user, '')

            if user == '':
                self.send_from_server('Who do you want to private message?<table><tr>' +
                                      '<td>/tell &lt;username&gt;</td>' +
                                      '<td>/t &lt;username&gt;</td>' +
                                      '</tr></table>')
            elif user in users.keys():
                self_participants = get_matching_participants(self.participants, self.username, 'username')
                for participant in self_participants:
                    participant.previous_tell = users[user]['real_name']
                self.broadcast_private_message(self.current_user['id'],
                                               self.previous_tell,
                                               message)
            else:
                self.send_from_server('{} is not connected to chat.'.format(user))
        elif command == 'retell' or command == 'rt':
            if self.previous_tell is not None:
                previous_tell_users = [x for x in users if users[x]['real_name'] == self.previous_tell]
                if len(previous_tell_users) == 0:
                    self.send_from_server('{} is not connected to chat.'.format(previous_tell_users[0]))
                else:
                    self.broadcast_private_message(self.current_user['id'],
                                                   self.previous_tell,
                                                   command_args)
            else:
                self.send_from_server('You cannot retell if you have not sent a tell.')

        elif command == 'reply' or command == 'r':
            if self.reply_to is not None:
                reply_users = [x for x in users if users[x]['real_name'] == self.reply_to]
                if len(reply_users) == 0:
                    self.send_from_server('{} is not connected to chat.'.format(reply_users[0]))
                else:
                    self.broadcast_private_message(self.current_user['id'],
                                                   self.reply_to,
                                                   command_args)
            else:
                self.send_from_server('You cannot reply if you have not received a tell.')
        else:
            self.send_from_server('Invalid command \'{}\''.format(command))

    def send_room_information(self, room_id=None):
        if room_id is not None:
            room_data = rooms[room_id].copy()
            room_data.pop('participants')
            room_data['history'] = list(room_data['history'])
            self.send({'type': 'room_data', 'data': [room_data]})
        else:
            current_rooms = []
            for room in self.joined_rooms:
                room_data = rooms[room].copy()
                room_data.pop('participants')
                room_data['history'] = list(room_data['history'])
                current_rooms.append(room_data)
            self.send({'type': 'room_data', 'data': current_rooms})

    def create_room(self, user, room_data):
        if user != self.username or 'name' not in room_data.keys():
            return
        # create room in db
        room_id = self.http_server.db.insert("INSERT INTO rooms (name, owner_id) VALUES (%s, %s)", room_data['name'],
                                             self.current_user['id'])
        # add room to owner user
        self.http_server.db.execute("INSERT INTO room_access (room_id, parasite_id, in_room) VALUES (%s, %s, %s)",
                                    room_id,
                                    self.current_user['id'], True)
        self.joined_rooms.append(room_id)
        # add room to list
        rooms[room_id] = self.http_server.db.get("SELECT * FROM rooms WHERE id=%s", room_id)
        rooms[room_id]['participants'] = set()
        rooms[room_id]['history'] = deque(maxlen=MAX_DEQUE_LENGTH)
        rooms[room_id]['owner'] = self.username
        # set user in room
        rooms[room_id]['participants'].update(get_matching_participants(self.participants, self.current_user['id']))

        # broadcast room information to owner
        self.send_room_information(room_id=room_id)
        self.send_from_server("Created room {}.".format(room_data['name']))

    def _room(self, param, param1):
        pass

    def leave_room(self, user, room_id):
        if user != self.username or room_id is None:
            return
        self.http_server.db.execute("UPDATE room_access SET in_room=FALSE WHERE parasite_id=%s",
                                    self.current_user['id'])
        self.joined_rooms.remove(room_id)
        # remove self from room
        rooms[room_id]['participants'].difference_update(
            get_matching_participants(self.participants, self.current_user['id']))

        # broadcast room information to members
        self.broadcast_from_server(rooms[room_id]['participants'], '{} has left the room.'.format(self.username),
                                   room_id=room_id)
        self.broadcast_room_user_list(room_id)

        # broadcast leave confirmation to client
        self.send_from_server('You have left {}.'.format(rooms[room_id]['name']))

    def delete_room(self, param, param1):
        pass


chat_router = sockjs.tornado.SockJSRouter(MultiRoomChatConnection, '/chat', {
    'disabled_transports': [
        'xhr',
        'xhr_streaming',
        'jsonp',
        'htmlfile',
        'eventsource'
    ]
})
