import json
import time
from collections import deque
from datetime import timedelta

import bcrypt
import sockjs.tornado
import tornado.web
from boto3 import resource
from tornado import gen, ioloop
from tornado.escape import xhtml_escape, linkify, to_unicode
from tornado.ioloop import IOLoop, PeriodicCallback

from chat.custom_render import executor
from chat.lib import get_matching_participants, retrieve_image_in_s3, preprocess_message
from chat.profamity_filter import ProfamityFilter
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
profamity_filter = ProfamityFilter()

client_version = '2.0.1'


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
    filter_profamity = False

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

        profamity_cookie = self.session.handler.get_cookie('profamity_filter')
        self.filter_profamity = json.loads(profamity_cookie) if profamity_cookie is not None else False

        self.joined_rooms = [0]
        current_rooms = self.http_server.db.query(
            "SELECT room_id FROM room_access WHERE parasite_id = %s AND in_room IS TRUE", parasite)
        if len(current_rooms) != 0:
            self.joined_rooms.extend(
                filter(lambda x: x not in self.joined_rooms, map(lambda x: x['room_id'], current_rooms)))
        self.current_user.username = to_unicode(self.current_user.username)
        self.username = self.current_user.username
        for room in self.joined_rooms:
            if room not in rooms.keys():
                rooms[room] = self.http_server.db.get("SELECT * FROM rooms WHERE id = %s", room)

                rooms[room]['participants'] = set()
                rooms[room]['history'] = deque(maxlen=MAX_DEQUE_LENGTH)
            rooms[room]['participants'].add(self)

        def spam_callback():
            """
            Callback for resetting spam counter every second
            """
            self.messageCount = 0

        PeriodicCallback(
            spam_callback,
            1000
        ).start()

        # Add client to the clients list
        send_updates = False
        self.participants.add(self)
        if self.username not in users.keys():
            users[self.username] = {'color': self.current_user['color'] or '',
                                    'typing': {},
                                    'idle': self.idle,
                                    'faction': self.current_user['faction'],
                                    'real_name': self.current_user['id'],
                                    'private_history': deque(maxlen=MAX_DEQUE_LENGTH)}
            for room in self.joined_rooms:
                users[self.username]['typing'][room] = False
            send_updates = True

        # wait until after user is initialized to send room data
        self.send_room_information()
        if send_updates:
            # Send that someone joined
            self.broadcast_from_server([x for x in self.participants if x.username != self.username],
                                       self.username + ' has connected', rooms_to_send=self.joined_rooms)

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
        elif json_message['type'] == 'version':
            if json_message['client_version'] < client_version:
                self.send_from_server(
                    'Best Evar Chat client has been updated to {}, please refresh your page.'.format(client_version))
                self.send({'type': 'versionUpdate'})
            elif json_message['client_version'] > client_version:
                self.send_from_server('How did you mess up a perfectly good client version number?')
        elif json_message['type'] == 'imageMessage':
            self.broadcast_image(json_message['user'], json_message['url'], json_message['room'],
                                 json_message['nsfw_flag'])
        elif json_message['type'] == 'userSettings':
            self.update_user_settings(json_message['settings'])
        elif json_message['type'] == 'userStatus':
            self.update_user_status(json_message['status'])
        elif json_message['type'] == 'password_change':
            self.change_user_password(json_message['user'], json_message['data'])
        elif json_message['type'] == 'newRoom':
            self.create_room(json_message['data'])
        elif json_message['type'] == 'roomInvitation':
            self.send_invitation(json_message['room_id'], json_message['invitees'])
        elif json_message['type'] == 'joinRoom':
            self.join_room(json_message['room_id'])
        elif json_message['type'] == 'leaveRoom':
            self.leave_room(json_message['data'])
        elif json_message['type'] == 'deleteRoom':
            self.delete_room(json_message['data'])

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
            self.broadcast_from_server(self.participants, self.username + " left.", rooms_to_send=self.joined_rooms)
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

    def broadcast_from_server(self, send_to, message, message_type='chatMessage', data=None, room_id=None,
                              rooms_to_send=None, save_history=False):
        """
        Broadcast a message to given participants.
        :param save_history: boolean flag to save to server history
        :param send_to: participants to receive broadcast message
        :param message: display message to send
        :param message_type: type of message
        :param data: data to send with message
        :param room_id: room to associate with message. ignored if rooms is defined
        :param rooms_to_send: rooms to associate message with. if defined, room_id is ignored
        """
        if rooms_to_send is not None:
            new_message = {'user': 'Server',
                           'message': message,
                           'time': time.time(),
                           'data': data,
                           'room': rooms_to_send}
            for room in rooms_to_send:
                if save_history is True:
                    rooms[room]['history'].append(new_message)
            self.broadcast(send_to, {'type': message_type,
                                     'data': new_message})
        else:
            new_message = {'user': 'Server',
                           'message': message,
                           'time': time.time(),
                           'data': data,
                           'room': room_id}
            if save_history is True:
                rooms[room_id]['history'].append(new_message)
            self.broadcast(send_to, {'type': message_type,
                                     'data': new_message})

    def broadcast_user_list(self, room_id=None):
        """
        Broadcasts user list. If room_id is specified, broadcast only to that room. Otherwise, broadcast user list to
        all participants that share a room with the current participant.
        :param room_id: room to broadcast to
        """
        if room_id is not None:
            room_participants = rooms[room_id]['participants']
            room_users = {}
            for user_key in [x.username for x in list(room_participants)]:
                room_users[user_key] = users[user_key].copy()
                room_users[user_key]['typing'] = users[user_key]['typing'][room_id]
                room_users[user_key].pop('private_history')
            self.broadcast(room_participants, {'type': 'userList', 'data': {'users': room_users, 'room': room_id}})
        else:
            for room in self.joined_rooms:
                # get the users that line up with the participants for the room
                room_participants = rooms[room]['participants']
                room_users = {}
                for user_key in [x.username for x in list(room_participants)]:
                    room_users[user_key] = users[user_key].copy()
                    room_users[user_key]['typing'] = users[user_key]['typing'][room]
                    room_users[user_key].pop('private_history')
                self.broadcast(self.participants, {'type': 'userList', 'data': {'users': room_users, 'room': room}})

    def broadcast_private_message(self, recipient, recipient_username, message):
        """
        Broadcast private message to the appropriate users. The sender is the current user.
        :param recipient: the recipient of the message
        :param recipient_username: the recipient's username
        :param message: the message to send
        """
        sender_participants = get_matching_participants(self.participants, self.current_user['id'])
        recipient_participants = get_matching_participants(self.participants, recipient)
        for participant in recipient_participants:
            participant.reply_to = self.current_user['id']
        recipients = set(sender_participants + recipient_participants)
        # get participants who have a filter on and participants who don't
        prudish_participants = [x for x in recipients if x.filter_profamity is True]
        recipients = recipients.difference(prudish_participants)

        # get the filtered message separately from the profane message
        original_message = preprocess_message(message, emoji)
        filtered_message = profamity_filter.scan_for_fucks(original_message)

        # send the unfiltered message
        new_message = {'sender': sender_participants[0].username, 'recipient': recipient_participants[0].username,
                       'time': time.time(), 'message': original_message}
        self.broadcast(recipients, {'type': 'privateMessage', 'data': new_message})
        # save unfiltered message in history
        new_message['type'] = 'privateMessage'
        users[recipient_username]['private_history'].append(new_message.copy())
        if recipient_username != self.username:
            users[self.username]['private_history'].append(new_message.copy())
        # send the filtered message
        new_message['message'] = filtered_message
        self.broadcast(prudish_participants, {'type': 'privateMessage', 'data': new_message})

    def spammy_check_callback(self):
        """
        Callback for count down to spam ban lifting.
        """
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
        """
        Callback for limiting times a user can trigger a spam ban warning when trying to send a message.
        """
        self.spammy_timeout = None

    def you_are_spammy(self):
        """
        Trigger the spam ban. The user cannot send messages for 10 seconds. The warning is sent to tell the user they
        have 10 seconds before they can speak again.
        """
        self.limited = 10
        # reset the message count every second.
        ioloop.IOLoop.instance().add_timeout(
            timedelta(seconds=1),
            self.spammy_check_callback
        )
        self.send_from_server('Wow, you are sending messages way too fast. Slow down, turbo.')
        if not self.spammy_timeout:  # check in case the user has already triggered the warning
            self.send_from_server('Wait {} seconds to speak.'.format(self.limited))
            self.spammy_timeout = ioloop.IOLoop.instance().add_timeout(timedelta(seconds=1),
                                                                       self.clear_spammy_warning_callback)

    def broadcast_chat_message(self, user, message, room_id):
        """
        Broadcast chat message to all users in the specified room. Triggers the spam ban if the user is sending too many
        messages too quickly.
        :param user: user sending the message
        :param message: message to be sent
        :param room_id: room receiving the message
        """
        if self.limited:
            if not self.spammy_timeout:
                self.send_from_server('Wait {} seconds to speak.'.format(self.limited))
                self.spammy_timeout = ioloop.IOLoop.instance().add_timeout(timedelta(seconds=1),
                                                                           self.clear_spammy_warning_callback)
        else:
            self.messageCount += 1
            if self.messageCount > 3:
                spammy_participants = [x for x in self.participants if x.current_user.id == self.current_user['id']]
                self.broadcast_from_server(self.participants.difference(spammy_participants),
                                           "{} has been blocked for spamming!!".format(self.username))
                for participant in spammy_participants:
                    participant.you_are_spammy()
            else:
                # get room participants who have a filter on and participants who don't
                prudish_participants = [x for x in rooms[room_id]['participants'] if x.filter_profamity is True]
                recipients = rooms[room_id]['participants'].difference(prudish_participants)

                # get the filtered message separately from the profane message
                original_message = preprocess_message(message, emoji)
                filtered_message = profamity_filter.scan_for_fucks(original_message)

                # send the unfiltered message
                new_message = {'user': user,
                               'color': users[user]['color'],
                               'message': original_message,
                               'time': time.time(),
                               'room': room_id}
                self.broadcast(recipients, {'type': 'chatMessage', 'data': new_message})
                # save unfiltered message in history
                rooms[room_id]['history'].append(new_message.copy())
                # send the filtered message
                new_message['message'] = filtered_message
                self.broadcast(prudish_participants, {'type': 'chatMessage', 'data': new_message})

    def broadcast_image(self, user, image_url, room_id, nsfw_flag=False):
        """
        Broadcast an image message to the given room. Stores the image in the s3 bucket, if available, setting the img
        tag's src to the cache. If s3 is unavailable, the img src is the original url. Images are wrapping in an a tag
        with the original url as the href.
        :param user: user sending the message
        :param image_url: url of the image
        :param room_id: room receiving the message
        """
        image_src_url = retrieve_image_in_s3(image_url, self.bucket)

        new_message = {'user': user,
                       'color': users[user]['color'],
                       'image_url': xhtml_escape(image_url),
                       'image_src_url': xhtml_escape(image_src_url),
                       'nsfw_flag': nsfw_flag,
                       # 'message': "<a href=\"{}\" target=\"_blank\"><img src=\"{}\" /></a>".format(
                       #     xhtml_escape(image_url), xhtml_escape(image_src_url)),
                       'time': time.time(),
                       'room': room_id}
        rooms[room_id]['history'].append(new_message)
        self.broadcast(self.participants, {'type': 'chatMessage',
                                           'data': new_message})

    def update_user_settings(self, settings):
        """
        Update the user's settings (in the map and in the database) and broadcast updates appropriately.
        Settings allowed:
            newSounds -> sounds
            newSoundSet -> soundSet
            newColor -> color
            newEmail -> email
            newFaction -> faction
            newUser -> username
        newUser requires that oldUser be sent for validation checking. Validation failure will not change the setting.
        Username changes are broadcast to all users in the appropriate rooms.
        :param settings: map of settings to change.
        """
        updating_participants = get_matching_participants(self.participants, self.current_user['id'])

        should_broadcast_users = False

        if 'newProfamity' in settings.keys():
            self.filter_profamity = settings['newProfamity']
            self.send_room_information()
            self.send_from_server('Profamity filter enabled. Watch yo profamity!' if self.filter_profamity
                                  else 'Profamity filter disabled.')

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

                self.broadcast_from_server(self.participants.difference(self_set),
                                           user + " is now " + self.username, rooms_to_send=self.joined_rooms)
                self.broadcast_from_server(updating_participants, "Name changed to " + self.username + ".",
                                           message_type='update', data={'username': self.username})
                should_broadcast_users = True

        if should_broadcast_users:
            self.broadcast_user_list()

        self.http_server.db.execute(
            to_unicode('UPDATE parasite SET color=%s, username=_utf8mb4%s, sound=%s, soundSet=%s, email=%s, faction=%s WHERE id=%s'),
            self.current_user.color, self.current_user.username, self.current_user.sound,
            self.current_user.soundSet, self.current_user.email, self.current_user.faction, self.current_user['id'])

    def update_user_status(self, json_status):
        """
`       Update the user's status and broadcast the change to all appropriate rooms.
        Status changes available:
            idle: boolean (global)
            typing: boolean (requires room)
            room: integer
        :param user: the user with the status change
        :param json_status: status information
        :return: for exiting when information is not available
        """
        if not json_status:
            return

        if 'idle' in json_status:
            idleStatus = json_status['idle']
            if idleStatus != users[self.username]['idle']:
                # get all user participants
                updating_participants = get_matching_participants(self.participants, self.current_user['id'])
                if idleStatus:
                    self.idle = True  # set before check
                    # if all participants are idle, set idle and broadcast user list
                    should_update = True
                    for participant in updating_participants:
                        should_update = should_update and participant.idle
                    if should_update:
                        users[self.username]['idle'] = True
                        self.broadcast_user_list()
                else:
                    # if all participants are idle, set active and broadcast user list
                    should_update = True
                    for participant in updating_participants:
                        should_update = should_update and participant.idle
                    # if we should update, do so. otherwise, do it anyway if the user is idle.
                    if should_update or users[self.username]['idle'] is True:
                        users[self.username]['idle'] = False
                        self.broadcast_user_list()
                    self.idle = False  # set after check

        elif 'typing' in json_status:
            room_id = json_status['room']
            if 'currentMessage' in json_status and json_status['currentMessage']:
                typing_status = json_status['currentMessage'][0] != '/'
            else:
                typing_status = json_status['typing']

            if room_id in users[self.username]['typing'] and users[self.username]['typing'][
                room_id] is not typing_status:
                users[self.username]['typing'][room_id] = typing_status
                self.broadcast_user_list(room_id=room_id)

    @gen.coroutine
    def change_user_password(self, user, password_list):
        """
        Update a user's password to the given value. Requires that the value be sent with a confirmation entry (two
        identical values)
        :param user: user with the password change
        :param password_list: list containing password and confirmation
        :return: for exiting if necessary information is not available
        """
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
        """
        Parse a command message (beginning with a '/') and do the appropriate action.
        Available commands:
            /t, /tell
            /rt, /retell
            /r, /reply
            /h, /help
        :param json_message: message to parse
        """
        message = json_message['message']
        command, _, command_args = message[1:].partition(' ')
        if command == 'help' or command == 'h':
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
            user = None
            if len(matching_users) > 0:
                user = max(matching_users)
                message = command_args.replace(user, '', 1)

            if user in users.keys():
                self_participants = get_matching_participants(self.participants, self.username, 'username')
                for participant in self_participants:
                    participant.previous_tell = users[user]['real_name']
                self.broadcast_private_message(self.previous_tell,
                                               user,
                                               message)
            else:
                self.send_from_server('Unrecognized user. Are they online?')
        elif command == 'retell' or command == 'rt':
            if self.previous_tell is not None:
                previous_tell_users = [x for x in users if users[x]['real_name'] == self.previous_tell]
                if len(previous_tell_users) == 0:
                    self.send_from_server('{} is not connected to chat.'.format(previous_tell_users[0]))
                else:
                    self.broadcast_private_message(self.previous_tell,
                                                   previous_tell_users[0],
                                                   command_args)
            else:
                self.send_from_server('You cannot retell if you have not sent a tell.')

        elif command == 'reply' or command == 'r':
            if self.reply_to is not None:
                reply_users = [x for x in users if users[x]['real_name'] == self.reply_to]
                if len(reply_users) == 0:
                    self.send_from_server('{} is not connected to chat.'.format(reply_users[0]))
                else:
                    self.broadcast_private_message(self.reply_to,
                                                   reply_users[0],
                                                   command_args)
            else:
                self.send_from_server('You cannot reply if you have not received a tell.')
        else:
            self.send_from_server('Invalid command \'{}\''.format(command))

    def send_room_information(self, room_id=None):
        """
        Send room information to the current user. If room_id is specified, send only that room. Otherwise, send all
        rooms the user is currently in.
        :param room_id: room to send
        """
        if room_id is not None:
            room_data = rooms[room_id].copy()
            room_data.pop('participants')
            room_data['history'] = sorted([x.copy() for x in room_data['history']] +
                                          [x.copy() for x in users[self.username]['private_history']],
                                          key=lambda x: x['time'])
            # for the messages in the history apply the profamity filter
            if self.filter_profamity:
                for item in room_data['history']:
                    item['message'] = profamity_filter.scan_for_fucks(item['message'])
            self.send({'type': 'room_data', 'data': {'rooms': [room_data]}})
        else:
            current_rooms = []
            for room in self.joined_rooms:
                room_data = rooms[room].copy()
                room_data.pop('participants')
                room_data['history'] = sorted([x.copy() for x in room_data['history']] +
                                              [x.copy() for x in users[self.username]['private_history']],
                                              key=lambda x: x['time'])
                # for the messages in the history apply the profamity filter
                if self.filter_profamity:
                    for item in room_data['history']:
                        item['message'] = profamity_filter.scan_for_fucks(item['message'])
                current_rooms.append(room_data)
            self.send({'type': 'room_data', 'data': {'all': room_id is None, 'rooms': current_rooms}})

    def create_room(self, room_data):
        """
        Create a new room in the chat. The current user will be the owner of the room.
        Room settings available on creation:
            name
        :param room_data: initial room settings
        :return: if necessary data is not provided
        """
        if 'name' not in room_data.keys():
            return
        # create room in db
        room_id = self.http_server.db.insert("INSERT INTO rooms (name, owner) VALUES (%s, %s)",
                                             room_data['name'], self.current_user['id'])
        # add room to owner user
        self.http_server.db.execute("INSERT INTO room_access (room_id, parasite_id, in_room) VALUES (%s, %s, TRUE)",
                                    room_id, self.current_user['id'])
        self.joined_rooms.append(room_id)
        # add room to list
        rooms[room_id] = self.http_server.db.get("SELECT * FROM rooms WHERE id = %s", room_id)
        rooms[room_id]['participants'] = set()
        rooms[room_id]['history'] = deque(maxlen=MAX_DEQUE_LENGTH)
        rooms[room_id]['owner'] = self.current_user['id']
        # set user in room
        rooms[room_id]['participants'].update(get_matching_participants(self.participants, self.current_user['id']))
        users[self.username]['typing'][room_id] = False

        # broadcast room information to owner
        # need to send the room information to ALL of the owners connections, not just this one
        [participant.send_room_information(room_id=room_id) for participant in list(rooms[room_id]['participants'])]
        self.broadcast_user_list(room_id=room_id)
        self.broadcast_from_server(rooms[room_id]['participants'], "Created room {}.".format(room_data['name']))

        if 'invitees' in room_data.keys():
            self.send_invitation(room_id, room_data['invitees'])

    def send_invitation(self, room_id, invitees):
        """
        Join a room.
        :param room_id: the room to invite users to
        :param invitees: the usernames to send invitations to
        """
        invited_participants = []
        [invited_participants.extend(get_matching_participants(self.participants, x, match_attr='username')) for x in
         invitees]
        # add access row in database for invitees
        [self.http_server.db.execute("INSERT INTO room_access (room_id, parasite_id, in_room) VALUES (%s, %s, FALSE) "
                                     "ON DUPLICATE KEY UPDATE in_room = FALSE",
                                     room_id, x)
         for x in list(set([x.current_user['id'] for x in invited_participants]))]
        # send the invitation
        self.broadcast(invited_participants, {'type': 'invitation',
                                              'data': {'room_id': room_id,
                                                       'room_name': rooms[room_id]['name'],
                                                       'sender': self.username}})

    def join_room(self, room_id):
        """
        Join a room.
        :param room_id:
        """
        if room_id not in rooms.keys():
            self.send_from_server('That room does not exist. Maybe somebody is playing a joke on you?')
        else:
            own_participants = get_matching_participants(self.participants, self.current_user['id'])
            # join room in database
            self.http_server.db.execute("UPDATE room_access SET in_room = TRUE WHERE parasite_id = %s AND room_id = %s",
                                        self.current_user['id'], room_id)
            # add self to room
            [participant.joined_rooms.append(room_id) for participant in own_participants]
            rooms[room_id]['participants'].update(own_participants)
            users[self.username]['typing'][room_id] = False
            # broadcast presence to the other room members
            self.broadcast_from_server(rooms[room_id]['participants'].difference(own_participants),
                                       '{} has entered the room.'.format(self.username),
                                       room_id=room_id)
            # broadcast room user list
            [participant.send_room_information(room_id=room_id) for participant in own_participants]
            self.broadcast_user_list(room_id=room_id)
            # broadcast success to self
            self.broadcast_from_server(own_participants,
                                       'You have joined the room \'{}\'.'.format(rooms[room_id]['name']))

    def leave_room(self, room_id):
        """
        Remove the current user from the given room. This does NOT delete the room, and does NOT revoke the user's
        access to the room.
        :param room_id: room to leave
        :return: if room_id is not provided
        """
        if room_id is None:
            return
        self.http_server.db.execute("UPDATE room_access SET in_room = FALSE WHERE parasite_id = %s AND room_id = %s",
                                    self.current_user['id'], room_id)
        own_participants = get_matching_participants(self.participants, self.current_user['id'])
        # remove room from participants
        [participant.joined_rooms.remove(room_id) for participant in own_participants if
         room_id in participant.joined_rooms]
        # remove participants from room
        rooms[room_id]['participants'].difference_update(own_participants)
        # update participant room info
        [participant.send_room_information() for participant in own_participants]

        # broadcast room information to members
        self.broadcast_from_server(rooms[room_id]['participants'], '{} has left the room.'.format(self.username),
                                   room_id=room_id)
        self.broadcast_user_list(room_id=room_id)

        # broadcast leave confirmation to client
        self.broadcast_from_server(own_participants, 'You have left {}.'.format(rooms[room_id]['name']))

    def delete_room(self, room_id):
        """
        Delete the room. Remove all current users from it, revoke access, and remove the room from all history.
        :param room_id:
        """
        if room_id not in rooms.keys():
            self.send_from_server('That room does not exist. Why would you delete a room that doesn\'t exist?')
        elif rooms[room_id]['owner'] != self.current_user['id']:
            self.send_from_server('Nice try. You can\'t delete a room if you\'re not the owner!')
        else:
            # remove all room_access rows for the room from database
            self.http_server.db.execute("DELETE FROM room_access WHERE room_id = %s", room_id)
            # remove the room from database
            self.http_server.db.execute("DELETE FROM rooms WHERE id = %s", room_id)
            # send message to inform all clients that the room is gone and remove the tab
            self.broadcast_from_server(rooms[room_id]['participants'],
                                       'Room \'{}\' has been deleted by {}.'.format(rooms[room_id]['name'],
                                                                                    rooms[room_id]['owner']),
                                       message_type='deleteRoom', data={'room_id': room_id}, room_id=0)
            # remove the room from the list of rooms and participant lists
            [participant.joined_rooms.remove(room_id) for participant in rooms[room_id]['participants'] if
             room_id in participant.joined_rooms]
            rooms.pop(room_id, None)


chat_router = sockjs.tornado.SockJSRouter(MultiRoomChatConnection, '/chat', {
    'disabled_transports': [
        'xhr',
        'xhr_streaming',
        'jsonp',
        'htmlfile',
        'eventsource'
    ]
})
