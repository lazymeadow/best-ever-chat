import json
from time import time

from sockjs.tornado import SockJSConnection, SockJSRouter

from chat.lib import log_from_client

CLIENT_VERSION = '3.0'


class NewMultiRoomChatConnection(SockJSConnection):
    current_user = None
    http_server = None

    _user_list = None
    _room_list = None

    def on_open(self, info):
        print 'opened'
        # on initial connection, we need to send the "initialization" information
        # the room list (filtered for the user)
        # the user list (of current status for users)
        # the user's default settings (to be used on the client)
        parasite = self.session.handler.get_secure_cookie('parasite')
        if parasite is None:
            self._send_auth_fail()
            return False

        self._user_list = self.http_server.user_list
        self._room_list = self.http_server.room_list

        self._user_list.add_participant(self)
        self._user_list.update_user_status(parasite, 'active')

        self.current_user = self.http_server.db.get(
            "SELECT id, password, username, color, sound, soundSet, email, faction FROM parasite WHERE id = %s",
            parasite)

        self.broadcast_user_list()
        self.send_room_list()
        self._broadcast_alert('{} is online.'.format(self.current_user.username))

        self._send_from_server('Connection successful.')

    def on_message(self, message):
        json_message = json.loads(message)

        if self.current_user['id'] != self.session.handler.get_secure_cookie('parasite'):
            self._send_auth_fail()

        if json_message['type'] == 'chat message':
            self._broadcast_chat_message(json_message['user id'], json_message['message'], json_message['room id'])
        elif json_message['type'] == 'room action':
            if json_message['action'] == 'create':
                self._create_room(json_message['room name'])
            elif json_message['action'] == 'delete':
                self._delete_room(json_message['room id'])
            elif json_message['action'] == 'join':
                self._join_room(json_message['room id'])
            elif json_message['action'] == 'leave':
                self._leave_room(json_message['room id'])
            elif json_message['action'] == 'invite':
                self._send_invitations(json_message['user ids'], json_message['room id'])
        elif json_message['type'] == 'version':
            if json_message['client version'] < CLIENT_VERSION:
                self._send_alert('Your client is out of date. You\'d better refresh your page!', 'permanent')
            elif json_message['client version'] > CLIENT_VERSION:
                self._send_alert('How did you mess up a perfectly good client version number?', 'permanent')
        elif json_message['type'] == 'client log':
            log_from_client(json_message['level'], json_message['log'], self.current_user['id'],
                            self.session.session_id)

    def on_close(self):
        print 'close'
        self._user_list.update_user_status(self.current_user.id, 'offline')
        self.broadcast_user_list()
        self._broadcast_alert('{} is offline.'.format(self.current_user.username))

    def _get_my_participants(self):
        return self._user_list.get_user_participants(self.current_user['id'])

    def _broadcast_chat_message(self, user_id, message, room_id):
        """
        Broadcast chat message to all users in the specified room. Triggers the spam ban if the user is sending too many
        messages too quickly.
        :param user_id: user sending the message
        :param message: message to be sent
        :param room_id: room receiving the message
        """
        user = self._user_list.get_user(user_id)
        # send the unfiltered message
        new_message = {'username': user['username'],
                       'color': user['color'],
                       'message': message,
                       'time': time(),
                       'room id': room_id}
        self.broadcast(self._room_list.get_room_participants(room_id), {'type': 'chat message', 'data': new_message})
        # save unfiltered message in history
        self._room_list.add_message_to_history(room_id, new_message.copy())

    def broadcast_user_list(self, participant_list=None):
        self.broadcast(participant_list or self._user_list.get_all_participants(),
                       {'type': 'user list',
                        'data': {
                            'users': self._user_list.get_user_list()
                        }})

    def _create_room(self, name):
        participant_list = self._room_list.create_room(name, self.current_user['id'])
        if participant_list is not None:
            [x.send_room_list() for x in participant_list]
            self.broadcast_user_list(participant_list)

    def _delete_room(self, room_id):
        (room_name, participant_list) = self._room_list.remove_room(room_id)
        if participant_list is not None:
            [x.send_room_list() for x in participant_list]
            self.broadcast_user_list(participant_list)
            self._broadcast_alert("Room '{}' has been deleted.".format(room_name), participant_list=participant_list)

    def _join_room(self, room_id):
        if self._room_list.add_user_to_room(room_id, self.current_user['id']) is True:
            #TODO delete the invitation from the database
            #TODO add chat message for user join/leave room
            participant_list = self._room_list.get_room_participants(room_id)
            [x.send_room_list() for x in participant_list]
            self.broadcast_user_list(participant_list)
            room_name = self._room_list.get_room_name(room_id)
            self._broadcast_alert("{} has joined the room '{}'.".format(self.current_user['username'], room_name),
                                  participant_list=[x for x in participant_list if
                                                    x.current_user['id'] != self.current_user['id']])
            self._send_alert("You joined the room '{}'.".format(room_name))
        else:
            self._send_alert('Failed to join room. Maybe somebody is playing a joke on you?')

    def _leave_room(self, room_id):
        if self._room_list.remove_user_from_room(room_id, self.current_user['id']) is True:
            room_participants = self._room_list.get_room_participants(room_id)
            participant_list = room_participants + self._get_my_participants()
            [x.send_room_list() for x in participant_list]
            self.broadcast_user_list(participant_list)
            room_name = self._room_list.get_room_name(room_id)
            self._broadcast_alert('{} has left the room {}.'.format(self.current_user['username'], room_name),
                                  participant_list=room_participants)
            self._send_alert("You left the room '{}'.".format(room_name))
        else:
            self._send_alert("You can't leave that room!")

    def _send_invitations(self, user_ids, room_id):
        for user_id in user_ids:
            if self._room_list.is_valid_invitation(self.current_user['id'], user_id, room_id):
                #TODO save the invitation in the database
                #TODO probably give user access and "not in room" status in room_access table, so join is updating
                self.broadcast(self._user_list.get_user_participants(user_id),
                               {'type': 'invitation',
                                'data': {
                                    'user': self.current_user['username'],
                                    'room id': room_id,
                                    'room name': self._room_list.get_room_name(room_id)}})
            else:
                self._send_alert("You can't invite {} to that room!".format(self._user_list.get_username(user_id)))

    def send_room_list(self):
        self.send({'type': 'room data',
                   'data': {
                       'rooms': self._room_list.get_room_list_for_user(self.current_user.id),
                       'all': True
                   }})

    def _send_auth_fail(self):
        """
        Authentication failed, send a message to the client to log out.
        """
        self.send({'type': 'auth fail',
                   'data': {'username': 'Server',
                            'message': 'Cannot connect. Authentication failure!',
                            'time': time()}})

    def _broadcast_alert(self, message, alert_type='fade', participant_list=None):
        participants = participant_list or self._user_list.get_all_participants(exclude=self.current_user['id'])
        self.broadcast(participants, {'type': 'alert', 'data': {'message': message,
                                                                'alert_type': alert_type}})

    def _send_alert(self, message, alert_type='fade'):
        """

        :param message:
        :param alert_type: 'fade', 'dismiss', 'permanent
        :return:
        """
        self.send({'type': 'alert', 'data': {'message': message,
                                             'alert_type': alert_type}})

    def _send_from_server(self, message, room_id=None):
        """
        Send a chat message from the server to the current socket. If no room_id, client should display message in
        all rooms.
        :param message: message to send
        :param room_id: room to associate with message
        """
        self.send({'type': 'chat message',
                   'data': {
                       'username': 'Server',
                       'message': message,
                       'time': time(),
                       'room': room_id}})


new_chat_router = SockJSRouter(NewMultiRoomChatConnection, '/newchat', {
    'disabled_transports': [
        'xhr',
        'xhr_streaming',
        'jsonp',
        'htmlfile',
        'eventsource'
    ]
})
