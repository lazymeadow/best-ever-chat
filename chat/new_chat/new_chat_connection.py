import json
from time import time

from boto3 import resource
from sockjs.tornado import SockJSConnection, SockJSRouter
from tornado.escape import xhtml_escape

from chat.lib import log_from_client, retrieve_image_in_s3, preprocess_message, emoji, is_image_url

CLIENT_VERSION = '3.0'


class NewMultiRoomChatConnection(SockJSConnection):
    current_user = None
    http_server = None

    _user_list = None
    _room_list = None
    _message_queue = None
    _bucket = resource('s3').Bucket('best-ever-chat-image-cache')

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
        self._message_queue = self.http_server.message_queue

        self._user_list.add_participant(self)
        self._user_list.update_user_status(parasite, 'active')

        self.current_user = self.http_server.db.get(
            "SELECT id, password, username, color, sound, soundSet, email, faction FROM parasite WHERE id = %s",
            parasite)

        self._broadcast_user_list()
        self.send_room_list()
        self._broadcast_alert(u'{} is online.'.format(self.current_user.username))

        self._send_from_server('Connection successful.')

        # send queued messages
        messages = self._message_queue.get_invitations(self.current_user['id'])
        for message in messages:
            self.send({'type': message['type'],
                       'data': json.loads(message['content'])})
            self._message_queue.remove_invitation(message['user id'], message['room id'])

    def on_message(self, message):
        json_message = json.loads(message)

        if self.current_user['id'] != self.session.handler.get_secure_cookie('parasite'):
            self._send_auth_fail()

        if json_message['type'] == 'client log':
            log_from_client(json_message['level'], json_message['log'], self.current_user['id'],
                            self.session.session_id)
            return

        if json_message['user id'] != self.current_user['id']:
            return

        if json_message['type'] == 'chat message':
            self._broadcast_chat_message(json_message['user id'], json_message['message'], json_message['room id'])
        if json_message['type'] == 'image':
            self._broadcast_image(json_message['user id'], json_message['image url'], json_message['room id'],
                                  json_message['nsfw'])
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

    def on_close(self):
        print 'close'
        self._user_list.update_user_status(self.current_user.id, 'offline', self)
        self._broadcast_user_list()
        self._broadcast_alert(u'{} is offline.'.format(self.current_user.username))

    def send_room_list(self, room_id=None):
        if room_id is not None:
            self.send({'type': 'room data',
                       'data': {
                           'rooms': [self._room_list.get_room(room_id)],
                           'all': False
                       }})
        else:
            self.send({'type': 'room data',
                       'data': {
                           'rooms': self._room_list.get_room_list_for_user(self.current_user.id),
                           'all': True
                       }})

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

        # if the message consists only of an image url, let's convert it to an image message, automatically sfw.
        if is_image_url(message):
            self._broadcast_image(user_id, message, room_id)
            return

        user = self._user_list.get_user(user_id)
        # send the message
        new_message = {'username': user['username'],
                       'color': user['color'],
                       'message': preprocess_message(message, emoji),
                       'time': time(),
                       'room id': room_id}
        self.broadcast(self._room_list.get_room_participants(room_id), {'type': 'chat message', 'data': new_message})
        # save message in history
        self._room_list.add_message_to_history(room_id, new_message.copy())

    def _broadcast_image(self, user_id, image_url, room_id, nsfw_flag=False):
        """
        Broadcast an image message to the given room. Stores the image in the s3 bucket, if available, setting the img
        tag's src to the cache. If s3 is unavailable, the img src is the original url. Images are wrapping in an a tag
        with the original url as the href.
        :param user_id: user sending the message
        :param image_url: url of the image
        :param room_id: room receiving the message
        :param nsfw_flag: true if image is nsfw
        """
        #if the url doesn't look like an image, just send it as a normal chat
        if not is_image_url(image_url):
            self._broadcast_chat_message(user_id, image_url, room_id)
            return

        image_src_url = retrieve_image_in_s3(image_url, self._bucket)
        user = self._user_list.get_user(user_id)

        new_message = {'username': user['username'],
                       'color': user['color'],
                       'image url': xhtml_escape(image_url),
                       'image src url': xhtml_escape(image_src_url),
                       'nsfw flag': nsfw_flag,
                       'time': time(),
                       'room id': room_id}
        self.broadcast(self._room_list.get_room_participants(room_id), {'type': 'chat message',
                                                                        'data': new_message})
        self._room_list.add_message_to_history(room_id, new_message)

    def _broadcast_user_list(self, participant_list=None):
        self.broadcast(participant_list or self._user_list.get_all_participants(),
                       {'type': 'user list',
                        'data': {
                            'users': self._user_list.get_user_list()
                        }})

    ### ROOM ACTIONS

    def _create_room(self, name):
        (room_id, participant_list) = self._room_list.create_room(name, self.current_user['id'])
        if participant_list is not None:
            [x.send_room_list(room_id=room_id) for x in participant_list]
            self._broadcast_user_list(participant_list)

    def _delete_room(self, room_id):
        (room_name, participant_list) = self._room_list.remove_room(room_id)
        if participant_list is not None:
            [x.send_room_list() for x in participant_list]
            self._broadcast_user_list(participant_list)
            self._broadcast_alert(u"Room '{}' has been deleted.".format(room_name), participant_list=participant_list)

    def _join_room(self, room_id):
        if self._room_list.add_user_to_room(room_id, self.current_user['id']) is True:
            # TODO delete the invitation from the database
            participant_list = self._room_list.get_room_participants(room_id)
            [x.send_room_list(room_id) for x in participant_list]
            self._broadcast_user_list(participant_list)
            room_name = self._room_list.get_room_name(room_id)

            # broadcast presence to the other room members
            other_participants = [x for x in participant_list if x.current_user['id'] != self.current_user['id']]
            self._broadcast_from_server(other_participants,
                                        u'{} has entered the room.'.format(self.current_user['username']),
                                        room_id=room_id, save_history=True)
            # send alerts
            self._broadcast_alert(u"{} has joined '{}'.".format(self.current_user['username'], room_name),
                                  participant_list=other_participants)
            self._send_alert(u"You joined the room '{}'.".format(room_name))
        else:
            self._send_alert('Failed to join room. Maybe somebody is playing a joke on you?')

    def _leave_room(self, room_id):
        if self._room_list.remove_user_from_room(room_id, self.current_user['id']) is True:
            room_participants = self._room_list.get_room_participants(room_id)
            # send room update to remaining room members
            [x.send_room_list(room_id) for x in room_participants]
            # send full room list to self
            [x.send_room_list() for x in self._get_my_participants()]

            participant_list = room_participants + self._get_my_participants()
            self._broadcast_user_list(participant_list)
            room_name = self._room_list.get_room_name(room_id)

            # broadcast departure to other room members
            self._broadcast_from_server(room_participants,
                                        u'{} has left the room.'.format(self.current_user['username']),
                                        room_id=room_id, save_history=True)
            # send alerts
            self._broadcast_alert(u"{} has left '{}'.".format(self.current_user['username'], room_name),
                                  participant_list=room_participants)
            self._send_alert(u"You left the room '{}'.".format(room_name))
        else:
            self._send_alert("You can't leave that room!")

    def _send_invitations(self, user_ids, room_id):
        for user_id in user_ids:
            if self._room_list.is_valid_invitation(self.current_user['id'], user_id, room_id):
                # TODO save the invitation in the database, adding to RoomList class
                self._room_list.grant_user_room_access(room_id, user_id)
                invitee_participants = self._user_list.get_user_participants(user_id)
                message_data = {'user': self.current_user['username'],
                                'room id': room_id,
                                'room name': self._room_list.get_room_name(room_id)}
                if len(invitee_participants) == 0:
                    # save invitation
                    self._message_queue.add_invitation(user_id, room_id, json.dumps(message_data))
                else:
                    self.broadcast(invitee_participants,
                                   {'type': 'invitation',
                                    'data': message_data})
            else:
                self._send_alert(u"You can't invite {} to that room!".format(self._user_list.get_username(user_id)))

    ### GENERAL HELPER FUNCTIONS

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

    def _broadcast_from_server(self, send_to, message, message_type='chat message', data=None, room_id=None,
                               rooms_to_send=None, save_history=False):
        """
        Broadcast a message to given participants.
        :param send_to: participants to receive broadcast message
        :param message: display message to send
        :param message_type: type of message
        :param data: data to send with message
        :param room_id: room to associate with message. ignored if rooms is defined
        :param rooms_to_send: rooms to associate message with. if defined, room_id is ignored
        """
        if rooms_to_send is not None:
            for room in rooms_to_send:
                self._broadcast_from_server(send_to, message, message_type=message_type, data=data, room_id=room,
                                            save_history=save_history)
        else:
            new_message = {'username': 'Server',
                           'message': message,
                           'time': time(),
                           'data': data,
                           'room id': room_id}
            if save_history is True:
                self._room_list.add_message_to_history(room_id, new_message)
            self.broadcast(send_to, {'type': message_type,
                                     'data': new_message})


new_chat_router = SockJSRouter(NewMultiRoomChatConnection, prefix='/newchat', user_settings={
    'sockjs_url': 'https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js',
    'disabled_transports': [
        'xhr',
        'xhr_streaming',
        'jsonp',
        'htmlfile',
        'eventsource'
    ]
})
