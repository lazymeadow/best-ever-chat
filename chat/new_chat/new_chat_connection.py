import json
from time import time

from sockjs.tornado import SockJSConnection, SockJSRouter

from chat.lib import log_from_client


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

        self.send_from_server('Connection successful.')

    def on_message(self, message):
        json_message = json.loads(message)

        if self.current_user['id'] != self.session.handler.get_secure_cookie('parasite'):
            self.send_auth_fail()

        if json_message['type'] == 'client log':
            log_from_client(json_message['level'], json_message['log'], self.current_user['id'],
                            self.session.session_id)

    def on_close(self):
        print 'close'
        self.user_list.update_user_status(self.current_user.id, 'offline')
        self.broadcast_user_list()

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
                       'user': 'Server',
                       'message': 'Wow, you are not authenticated! Not even a little bit. Go fix that.',
                       'time': time()
                   }})

    def send_from_server(self, message, room_id=None):
        """
        Send a chat message from the server to the current socket. If no room_id, client should display message in
        all rooms.
        :param message: message to send
        :param room_id: room to associate with message
        """
        self.send({'type': 'chat message',
                   'data': {
                       'user': 'Server',
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