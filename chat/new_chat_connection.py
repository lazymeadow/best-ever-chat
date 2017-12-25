from time import time

from sockjs.tornado import SockJSConnection, SockJSRouter


class NewMultiRoomChatConnection(SockJSConnection):
    current_user = None
    http_server = None
    participants = set()
    user_list = None

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
        self.user_list.add_participant(self)
        self.user_list.update_user_status(parasite, 'active')
        print self.user_list

        self.current_user = self.http_server.db.get(
            "SELECT id, password, username, color, sound, soundSet, email, faction FROM parasite WHERE id = %s",
            parasite)

        self.broadcast_user_list()
    def on_message(self, message):
        print 'message'

    def on_close(self):
        print 'close'
        self.user_list.update_user_status(self.current_user.id, 'offline')
        self.broadcast_user_list()

    def broadcast_user_list(self):
        self.broadcast(self.user_list.get_all_participants(), {'type': 'user list',
                                                               'data': {
                                                                   'users': self.user_list.get_user_list()
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


new_chat_router = SockJSRouter(NewMultiRoomChatConnection, '/newchat', {
    'disabled_transports': [
        'xhr',
        'xhr_streaming',
        'jsonp',
        'htmlfile',
        'eventsource'
    ]
})
