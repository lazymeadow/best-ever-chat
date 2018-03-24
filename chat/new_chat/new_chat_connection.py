import json
from time import time

from sockjs.tornado import SockJSConnection, SockJSRouter

from chat.lib import log_from_client

CLIENT_VERSION = '3.0'


class NewMultiRoomChatConnection(SockJSConnection):
    current_user = None
    http_server = None
    participants = set()
    user_list = None
    room_list = None

    def on_open(self, info):
        print 'opened'
        # on initial connection, we need to send the "initialization" information
        # the room list (filtered for the user)
        # the user list (of current status for users)
        # the user's default settings (to be used on the client)
        parasite = self.session.handler.get_secure_cookie('parasite')
        if parasite is None:
            self.send_auth_fail()
            return False

        self.user_list = self.http_server.user_list
        self.room_list = self.http_server.room_list

        self.user_list.add_participant(self)
        self.user_list.update_user_status(parasite, 'active')
        print self.user_list

        self.current_user = self.http_server.db.get(
            "SELECT id, password, username, color, sound, soundSet, email, faction FROM parasite WHERE id = %s",
            parasite)

        self.broadcast_user_list()
        self.send_room_list()
        self.broadcast_alert('{} is online.'.format(self.current_user.username))

        self.send_from_server('Connection successful.')

    def on_message(self, message):
        json_message = json.loads(message)

        if self.current_user['id'] != self.session.handler.get_secure_cookie('parasite'):
            self.send_auth_fail()

        if json_message['type'] == 'chat message':
            self.broadcast_chat_message(json_message['user id'], json_message['message'], json_message['room'])
        elif json_message['type'] == 'version':
            if json_message['client version'] < CLIENT_VERSION:
                self.send_alert('Your client is out of date. You\'d better refresh your page!', 'permanent')
            elif json_message['client version'] > CLIENT_VERSION:
                self.send_alert('How did you mess up a perfectly good client version number?', 'permanent')
        elif json_message['type'] == 'client log':
            log_from_client(json_message['level'], json_message['log'], self.current_user['id'],
                            self.session.session_id)

    def on_close(self):
        print 'close'
        self.user_list.update_user_status(self.current_user.id, 'offline')
        self.broadcast_user_list()
        self.broadcast_alert('{} is offline.'.format(self.current_user.username))

    def broadcast_chat_message(self, user_id, message, room_id):
        """
        Broadcast chat message to all users in the specified room. Triggers the spam ban if the user is sending too many
        messages too quickly.
        :param user_id: user sending the message
        :param message: message to be sent
        :param room_id: room receiving the message
        """
        user = self.user_list.get_user(user_id)
        # send the unfiltered message
        new_message = {'username': user['username'],
                       'color': user['color'],
                       'message': message,
                       'time': time(),
                       'room': room_id}
        self.broadcast(self.room_list.get_room_participants(room_id), {'type': 'chat message', 'data': new_message})
        # save unfiltered message in history
        self.room_list.add_message_to_history(room_id, new_message.copy())

    def broadcast_user_list(self):
        self.broadcast(self.user_list.get_all_participants(), {'type': 'user list',
                                                               'data': {
                                                                   'users': self.user_list.get_user_list()
                                                               }})

    def send_room_list(self):
        self.send({'type': 'room data',
                   'data': {
                       'rooms': self.room_list.get_room_list_for_user(self.current_user.id),
                       'all': True
                   }})

    def send_auth_fail(self):
        """
        Authentication failed, send a message to the client to log out.
        """
        self.send({'type': 'auth fail',
                   'data': {
                       'username': 'Server',
                       'message': 'Wow, you are not authenticated! Not even a little bit. Go fix that.',
                       'time': time()
                   }})

    def broadcast_alert(self, message, room_id=None, alert_type='fade'):
        participants = self.user_list.get_all_participants(
            exclude=self.current_user['id']) if room_id is None else self.room_list.get_room_participants(
            room_id)
        self.broadcast(participants, {'type': 'alert',
                                      'data': {
                                          'message': message,
                                          'alert_type': alert_type}})

    def send_alert(self, message, alert_type='fade'):
        """

        :param message:
        :param alert_type: 'fade', 'dismiss', 'permanent
        :return:
        """
        self.send({'type': 'alert',
                   'data': {'message': message,
                            'alert_type': alert_type}})

    def send_from_server(self, message, room_id=None):
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
