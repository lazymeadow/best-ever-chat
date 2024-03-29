import json
from time import time

from boto3 import resource
from sockjs.tornado import SockJSConnection, SockJSRouter
from tornado.escape import xhtml_escape, to_unicode

from chat.emails import send_admin_email
from chat.lib import retrieve_image_in_s3, preprocess_message, emoji, is_image_url, create_github_issue, upload_to_s3, \
    is_gorilla_groove_url
from chat.loggers import log_from_client, log_from_server, LogLevel
from chat.tools.lib import can_use_tool, get_tool_list, user_perm_has_access, get_tool_data, get_tool_def, \
    tool_data_request

CLIENT_VERSION = '3.5.2'


class NewMultiRoomChatConnection(SockJSConnection):
    current_user = None
    http_server = None

    _user_list = None
    _room_list = None
    _message_queue = None
    _bucket = resource('s3').Bucket('best-ever-chat-image-cache')

    def on_open(self, info):
        # on initial connection, we need to send the "initialization" information
        # the room list (filtered for the user)
        # the user list (of current status for users)
        # the user's default settings (to be used on the client)

        self.session.verify_state()
        parasite = self.session.handler.get_secure_cookie('parasite')
        if parasite is None:
            self._send_auth_fail()
            return False

        parasite = parasite.decode("utf-8")

        # format manually here because the current user is not yet defined
        log_from_server(LogLevel.debug,
                        '({}:{}@{}) Client connecting...'.format(parasite, self.session.session_id, info.ip))

        self._user_list = self.http_server.user_list
        self._room_list = self.http_server.room_list
        self._private_messages = self.http_server.private_message_map
        self._message_queue = self.http_server.message_queue

        self._user_list.add_participant(self)
        self.current_user = self._user_list.get_user(parasite)
        was_offline = self.current_user['status'] == 'offline'

        self._user_list.update_user_status(parasite, 'active')
        self._user_list.update_user_last_active(self.current_user['id'])

        self._broadcast_user_list()
        self._send_room_list()
        self._send_pm_thread_list()
        if was_offline is True:
            self._broadcast_alert(u'{} is online.'.format(self.current_user['username']))

        self._send_alert('Connection successful.')

        log_from_server(LogLevel.debug, '{} Client connected successfully.'.format(self._format_parasite_for_log()))

        # send queued messages
        messages = self._message_queue.get_all(self.current_user['id'])
        for message in messages:
            message_data = json.loads(message['content'])
            if 'id' in message.keys():
                message_data['id'] = message['id']
            self.send({'type': message['type'],
                       'data': message_data})

        log_from_server(LogLevel.debug,
                        '{} Sent client {} queued messages.'.format(self._format_parasite_for_log(), len(messages)))

    def on_message(self, message):
        json_message = json.loads(message)
        parasite = self.session.handler.get_secure_cookie('parasite')

        if parasite is None or self.current_user is None or self.current_user['id'] != parasite.decode("utf-8"):
            self._send_auth_fail()
            return

        message_type = json_message['type']
        if message_type == 'client log':
            log_from_client(json_message['level'], json_message['log'], self.current_user['id'],
                            self.session.session_id)
            return

        if 'user id' not in json_message or json_message['user id'] != self.current_user['id']:
            log_from_server(LogLevel.warning,
                            'Socket message received from incorrect parasite ({}) for client connection {}. Sending authentication failure.'.format(
                                json_message['user id'] if 'user id' in json_message else 'unknown',
                                self._format_parasite_for_log()))
            self._send_auth_fail()
            return

        if message_type == 'chat message':
            self._broadcast_chat_message(json_message['user id'], json_message['message'], json_message['room id'])
        elif message_type == 'private message':
            self._broadcast_private_message(json_message['recipient id'], json_message['message'])
        elif message_type == 'image':
            destination_is_thread = json_message['room id'] in self._user_list.get_all_usernames()
            # if the url doesn't look like an image, just send it as a normal chat
            if not is_image_url(json_message['image url']):
                if destination_is_thread:
                    self._broadcast_private_message(json_message['room id'], json_message['image url'])
                else:
                    self._broadcast_chat_message(json_message['user id'], json_message['image url'],
                                                 json_message['room id'])
            else:
                image_src_url = retrieve_image_in_s3(json_message['image url'], self._bucket)

                self._broadcast_image(json_message['user id'], image_src_url, json_message['room id'],
                                      json_message['nsfw'], json_message['image url'])
        elif message_type == 'image upload':
            try:
                image_url = upload_to_s3(json_message['image data'], json_message['image type'], self._bucket)
                self._broadcast_image(json_message['user id'], image_url, json_message['room id'],
                                      json_message['nsfw'])
            except Exception as e:
                self._send_alert('Failed to upload image. This incident has been recorded.', 'dismiss')
                send_admin_email(self.http_server.admin_email, str(e))
        elif message_type == 'room action':
            if json_message['action'] == 'create':
                self._create_room(json_message['room name'])
            elif json_message['action'] == 'delete':
                self._delete_room(json_message['room id'])
            elif json_message['action'] == 'join':
                self._join_room(json_message['room id'], json_message['accept'], json_message['inviter id'])
            elif json_message['action'] == 'leave':
                self._leave_room(json_message['room id'])
            elif json_message['action'] == 'invite':
                self._send_invitations(json_message['user ids'], json_message['room id'])
        elif message_type == 'status':
            self._user_list.update_user_status(self.current_user['id'], json_message['status'])
            self._broadcast_user_list()
        elif message_type == 'typing':
            self._user_list.update_user_typing_status(self.current_user['id'], json_message['status'])
            self._broadcast_user_list()
        elif message_type == 'version':
            if json_message['client version'] < CLIENT_VERSION:
                self._send_alert('Your client is out of date. You\'d better refresh your page!', 'permanent')
            elif json_message['client version'] > CLIENT_VERSION:
                self._send_alert('How did you mess up a perfectly good client version number?', 'permanent')
        elif message_type == 'settings':
            self._update_settings(json_message['data'])
        elif message_type == 'remove alert':
            self._message_queue.remove_alert(json_message['user id'], json_message['id'])
        elif message_type == 'bug' or message_type == 'feature':
            self._send_to_github(message_type, json_message['title'], json_message['body'])
        elif message_type == 'tool list':
            self._get_tool_list(json_message['tool set'])
        elif message_type == 'data request':
            self._handle_data_request(json_message['data type'])
        elif message_type == 'admin request':
            self._handle_admin_request(json_message['request type'], json_message['data'])
        else:
            log_from_server(LogLevel.critical, 'Received unknown message type: ' + str(json_message))

    def on_close(self):
        if self.current_user is None:
            return
        self._user_list.update_user_status(self.current_user['id'], 'offline', self)
        self._user_list.update_user_typing_status(self.current_user['id'], False)
        self._user_list.update_user_last_active(self.current_user['id'])
        self._user_list.remove_participant(self)
        self._broadcast_user_list(self._user_list.get_all_participants(self.current_user['id']))
        if self._user_list.get_user(self.current_user['id'])['status'] == 'offline':
            self._broadcast_alert(u'{} is offline.'.format(self.current_user['username']))

    def _send_room_list(self, room_id=None):
        if room_id is not None:
            self.send({'type': 'room data',
                       'data': {
                           'rooms': [self._room_list.get_room(room_id)],
                           'all': False
                       }})
        else:
            self.send({'type': 'room data',
                       'data': {
                           'rooms': self._room_list.get_room_list_for_user(self.current_user['id']),
                           'all': True
                       }})

    def _send_pm_thread_list(self):
        return self.send({'type': 'private message data',
                          'data': {
                              'threads': self._private_messages.get_thread_list_for_user(self.current_user['id'])
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
            # get the s3 img url
            image_src_url = retrieve_image_in_s3(message, self._bucket)
            self._broadcast_image(user_id, image_src_url, room_id, original_url=message)
            return

        # if a message consists only of what looks like a gorilla groove track link, convert it to a gg message type.
        if is_gorilla_groove_url(message):
            self._broadcast_gg(user_id, room_id, message)
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
        self._room_list.add_message_to_history(room_id, new_message)

    def _broadcast_private_message(self, recipient_id, message):
        """
        Broadcast a private message to the two appropriate users.
        :param recipient_id:    user receiving the message
        :param message:         message to be sent
        """
        verified_thread_id = self._private_messages.retrieve_thread_id(self.current_user['id'], recipient_id)

        # if the message consists only of an image url, let's convert it to an image message, automatically sfw.
        if is_image_url(message):
            # get the s3 image url
            image_src_url = retrieve_image_in_s3(message, self._bucket)
            # send the image as an image message instead
            self._broadcast_image(self.current_user['id'], image_src_url, recipient_id, original_url=message)
            return

        # if a message consists only of what looks like a gorilla groove track link, convert it to a gg message type.
        if is_gorilla_groove_url(message):
            self._broadcast_gg(self.current_user['id'], recipient_id, message)
            return

        user = self._user_list.get_user(self.current_user['id'])
        new_pm = {'sender id': self.current_user['id'],
                  'recipient id': recipient_id,
                  'username': user['username'],
                  'color': user['color'],
                  'message': preprocess_message(message, emoji),
                  'time': time()}
        self.broadcast(self._private_messages.get_thread_participants(verified_thread_id),
                       {'type': 'private message', 'data': new_pm})

        self._private_messages.add_pm_to_thread(new_pm, self.current_user['id'], recipient_id, verified_thread_id)

    def _broadcast_gg(self, user_id, destination_id, link):
        # if the room id is a user's id, then process it as a thread
        destination_is_thread = destination_id in self._user_list.get_all_usernames()

        user = self._user_list.get_user(user_id)
        gg_msg = {
            'username': user['username'],
            'color': user['color'],
            'track link': xhtml_escape(link),
            'time': time()
        }

        if destination_is_thread:
            gg_msg['sender id'] = self.current_user['id']
            gg_msg['recipient id'] = destination_id
            verified_thread_id = self._private_messages.retrieve_thread_id(self.current_user['id'], destination_id)
            self.broadcast(self._private_messages.get_thread_participants(verified_thread_id),
                           {'type': 'private message',
                            'data': gg_msg})

            self._private_messages.add_pm_to_thread(gg_msg, self.current_user['id'], destination_id,
                                                    verified_thread_id)
        else:
            gg_msg['room id'] = destination_id
            self.broadcast(self._room_list.get_room_participants(destination_id), {'type': 'chat message',
                                                                                   'data': gg_msg})
            self._room_list.add_message_to_history(destination_id, gg_msg)

    def _broadcast_image(self, user_id, image_url, destination_id, nsfw_flag=False, original_url=None):
        """
        Broadcast an image message to the given room. The client can link to the image with the 'image url'
        property, and the source url is 'image src url'. This allows <img> to be wrapped in <a> with a different
        location to display images from the cache, but still provide the original source.
        :param user_id: user sending the message
        :param image_url: url of the image for loading
        :param destination_id: room or thread receiving the message
        :param nsfw_flag: true if image is nsfw
        :param original_url if not None, is the original source url
        """
        # if the room id is a user's id, then process it as a thread
        destination_is_thread = destination_id in self._user_list.get_all_usernames()

        user = self._user_list.get_user(user_id)

        img_msg = {
            'username': user['username'],
            'color': user['color'],
            'image url': xhtml_escape(original_url if original_url is not None else image_url),
            'image src url': xhtml_escape(image_url),
            'nsfw flag': nsfw_flag,
            'time': time()
        }

        if destination_is_thread:
            img_msg['sender id'] = self.current_user['id']
            img_msg['recipient id'] = destination_id
            verified_thread_id = self._private_messages.retrieve_thread_id(self.current_user['id'], destination_id)
            self.broadcast(self._private_messages.get_thread_participants(verified_thread_id),
                           {'type': 'private message',
                            'data': img_msg})

            self._private_messages.add_pm_to_thread(img_msg, self.current_user['id'], destination_id,
                                                    verified_thread_id)
        else:
            img_msg['room id'] = destination_id
            self.broadcast(self._room_list.get_room_participants(destination_id), {'type': 'chat message',
                                                                                   'data': img_msg})
            self._room_list.add_message_to_history(destination_id, img_msg)

    def _broadcast_user_list(self, participant_list=None):
        self.broadcast(participant_list or self._user_list.get_all_participants(),
                       {'type': 'user list',
                        'data': {
                            'users': self._user_list.get_user_list()
                        }})

    ### USER ACTIONS

    def _update_settings(self, settings):
        updates_map = {}
        settings_keys = settings.keys()
        if 'email' in settings_keys:
            new_email = settings.pop('email')
            if self._user_list.update_user_email(self.current_user['id'], new_email):
                updates_map['email'] = new_email
                self._send_alert(u'Email updated to {}.'.format(new_email))
            else:
                self._send_alert(u'Email change unsuccessful.')

        if 'password' in settings_keys:
            password_data = settings.pop('password')
            if password_data['password1'] != password_data['password2']:
                self._send_alert('Password entries did not match.')
            else:
                updated = self._user_list.update_user_password(self.current_user['id'], password_data['password1'])
                if updated:
                    self._send_alert('Password changed.')
                else:
                    self._send_alert('Password not changed.')

        update_user_list = 'username' in settings_keys or 'faction' in settings_keys

        if 'username' in settings_keys:
            new_username = to_unicode(settings.pop('username'))
            old_username = self.current_user['username']
            if self._user_list.is_valid_username(new_username) is not True:
                self._send_alert(u'{} is not a valid username.'.format(new_username))
            elif self._user_list.update_username(self.current_user['id'], new_username):
                self._send_alert(u'Username changed from {} to {}.'.format(old_username, new_username))
                self._broadcast_alert(u'{} is now {}.'.format(old_username, new_username))
                updates_map['username'] = new_username

        for key, value in settings.iteritems():
            old_value = self.current_user[key]
            if self._user_list.update_user_conf(self.current_user['id'], key, value):
                self._send_alert('{} changed from {} to {}.'.format(key.title(), old_value, value))
                updates_map[key] = value
            else:
                self._send_alert('{} was not changed.'.format(key.title()))

        if update_user_list:
            self._broadcast_user_list()

        self.broadcast(self._user_list.get_user_participants(self.current_user['id']), {
            "type": "update",
            "data": updates_map
        })

    ### ROOM ACTIONS

    def _create_room(self, name):
        (room_id, participant_list) = self._room_list.create_room(name, self.current_user['id'])
        if participant_list is not None:
            [x._send_room_list(room_id=room_id) for x in participant_list]
            self._broadcast_user_list(participant_list)

    def _delete_room(self, room_id):
        (room_name, participant_list) = self._room_list.remove_room(room_id)
        if participant_list is not None:
            [x._send_room_list() for x in participant_list]
            self._broadcast_user_list(participant_list)
            self._broadcast_alert(u"Room '{}' has been deleted.".format(room_name), participant_list=participant_list)

    def _join_room(self, room_id, accept, inviter_id):
        room_name = self._room_list.get_room_name(room_id)
        if accept is True:
            if self._room_list.add_user_to_room(room_id, self.current_user['id']) is True:
                participant_list = self._room_list.get_room_participants(room_id)
                [x._send_room_list(room_id) for x in participant_list]
                self._broadcast_user_list(participant_list)

                # send alerts
                other_participants = [x for x in participant_list if x.current_user['id'] != self.current_user['id']]
                self._broadcast_alert(u"{} has joined '{}'.".format(self.current_user['username'], room_name),
                                      participant_list=other_participants)
                self._send_alert(u"You joined the room '{}'.".format(room_name))
                self._message_queue.remove_invitation(self.current_user['id'], room_id)
            else:
                self._send_alert('Failed to join room. Maybe somebody is playing a joke on you?')
        elif self._room_list.remove_user_from_room(room_id, self.current_user['id']) is True:
            # broadcast decline to inviter
            self._broadcast_alert(u"{} declined to join {}.".format(self.current_user['username'], room_name),
                                  participant_list=self._user_list.get_user_participants(inviter_id))
            # broadcast acknowledgement to invitee
            self._send_alert(
                u"You declined the invitation from {} to join {}.".format(self._user_list.get_username(inviter_id),
                                                                          room_name))
            # remove invitation
            self._message_queue.remove_invitation(self.current_user['id'], room_id)
        else:
            self._send_alert(u"There was a problem handling your request.")

    def _leave_room(self, room_id):
        if self._room_list.remove_user_from_room(room_id, self.current_user['id']) is True:
            room_participants = self._room_list.get_room_participants(room_id)
            # send room update to remaining room members
            [x._send_room_list(room_id) for x in room_participants]
            # send full room list to self
            [x._send_room_list() for x in self._get_my_participants()]

            participant_list = room_participants + self._get_my_participants()
            self._broadcast_user_list(participant_list)
            room_name = self._room_list.get_room_name(room_id)

            # send alerts
            self._broadcast_alert(u"{} has left '{}'.".format(self.current_user['username'], room_name),
                                  participant_list=room_participants)
            self._send_alert(u"You left the room '{}'.".format(room_name))
        else:
            self._send_alert("You can't leave that room!")

    def _send_invitations(self, user_ids, room_id):
        room_name = self._room_list.get_room_name(room_id)
        for user_id in user_ids:
            invitee_username = self._user_list.get_username(user_id)
            if self._room_list.is_valid_invitation(self.current_user['id'], user_id, room_id):
                self._room_list.grant_user_room_access(room_id, user_id)
                invitee_participants = self._user_list.get_user_participants(user_id)
                message_data = {'user': self.current_user['username'],
                                'user id': self.current_user['id'],
                                'room id': room_id,
                                'room name': room_name}
                self._message_queue.add_invitation(user_id, room_id, json.dumps(message_data))
                self.broadcast(invitee_participants,
                               {'type': 'invitation',
                                'data': message_data})
                self._send_alert(u"Invitation sent to {} to join {}.".format(invitee_username, room_name))
            else:
                self._send_alert(u"You can't invite {} to join {}!".format(invitee_username, room_name))

    def _send_to_github(self, type, title, body):
        response = create_github_issue(self.http_server.github_username,
                                       self.http_server.github_token,
                                       title,
                                       body,
                                       type)
        issue_json = response.json()
        if response.ok:
            message = preprocess_message(
                '{} #{} created! View it at {}'.format(type.title(), issue_json['number'], issue_json['html_url']),
                emoji)
            self._send_alert(message, 'dismiss')
        else:
            self._send_alert('Failed to create {}! ({})'.format(type, issue_json['message']), 'dismiss')

    ### TOOL ACTIONS

    def _get_tool_list(self, permission_level):
        if user_perm_has_access(self.current_user['permission'], permission_level):
            log_from_server(LogLevel.info, "{} Sending {} tool list to parasite".format(self._format_parasite_for_log(),
                                                                                        permission_level))
            self.send({
                'type': 'tool list',
                'data': {
                    'data': get_tool_list(permission_level),
                    'perm level': permission_level
                }
            })
        else:
            message = "{} Unauthorized tool list request for {} tools by parasite".format(
                self._format_parasite_for_log(), permission_level)
            send_admin_email(self.http_server.admin_email, message)

    def _handle_data_request(self, data_type):
        data = None
        data_error = None
        tool_data = None
        if can_use_tool(self.current_user['permission'], data_type):
            log_from_server(LogLevel.info,
                            "{} Fulfilling request for tool {} for parasite".format(self._format_parasite_for_log(),
                                                                                    data_type))
            data = tool_data_request(self, data_type)
            tool_data = get_tool_data(data_type)
        else:
            data_error = 'Insufficient permissions'
            message = "{} Unauthorized tool data request for tool {} by parasite".format(
                self._format_parasite_for_log(), data_type)
            send_admin_email(self.http_server.admin_email, message)
        self.send({
            'type': 'data response',
            'data': {
                'request': data_type,
                'data': data,
                'tool info': tool_data,
                'error': data_error
            }
        })

    def _handle_admin_request(self, request_type, data):
        if can_use_tool(self.current_user['permission'], request_type):
            log_from_server(LogLevel.info,
                            "{} Executing tool {} for parasite".format(self._format_parasite_for_log(), request_type))
            tool_data = get_tool_def(request_type)
            if tool_data['tool type'] == 'grant':
                self._handle_grant_tool(tool_data, data['parasite'])
            if tool_data['tool type'] == 'room':
                self._handle_room_tool(tool_data, data['room'])
            if tool_data['tool type'] == 'room owner':
                self._handle_room_owner_tool(tool_data, data['room'], data['parasite'])
            if tool_data['tool type'] == 'data':
                self._handle_data_tool(tool_data, data['id'])
            if tool_data['tool type'] == 'parasite':
                self._handle_parasite_tool(tool_data, data['parasite'])
        else:
            message = "{} Unauthorized use attempt for tool {} by parasite".format(self._format_parasite_for_log(),
                                                                                   request_type)
            send_admin_email(self.http_server.admin_email, message)

    def _handle_grant_tool(self, tool_data, parasite):
        self._user_list.update_user_conf(parasite, 'permission', tool_data['grant'])
        self.broadcast(self._user_list.get_user_participants(parasite), {
            "type": "update",
            "data": {'permission': tool_data['grant']}
        })
        self._message_queue.add_alert(parasite, json.dumps(tool_data['success alert']))
        self.broadcast(self._user_list.get_user_participants(parasite), {
            'type': 'alert',
            'data': tool_data['success alert']
        })
        self._handle_data_request(tool_data['tool key'])
        self.send({
            'type': 'tool confirm',
            'data': {
                'message': tool_data['tool confirm'](parasite),
                'perm level': tool_data['perm level']
            }
        })

    def _handle_room_tool(self, tool_data, room):
        room_name = self._room_list.get_room_name(room)
        # empty room log
        if tool_data['tool action'] == 'empty':
            self._room_list.empty_room_log(room)
            room_members = self._room_list.get_room_participants(room)
            self.broadcast(room_members, {
                'type': 'room data',
                'data': {
                    'rooms': [self._room_list.get_room(room)],
                    'all': False,
                    'clear log': True
                }
            })
        # delete room
        if tool_data['tool action'] == 'delete':
            self._delete_room(room)

        self._handle_data_request(tool_data['tool key'])
        self.send({
            'type': 'tool confirm',
            'data': {
                'message': tool_data['tool confirm'](room_name),
                'perm level': tool_data['perm level']
            }
        })

    def _handle_room_owner_tool(self, tool_data, room, new_owner):
        success = self._room_list.set_room_owner(room, new_owner)
        room_name = self._room_list.get_room_name(room)
        if success:
            self._broadcast_alert("You're now the owner of the room '{}'".format(room_name), 'dismiss', self._user_list.get_user_participants(new_owner))
            [x._send_room_list(room_id=room) for x in self._room_list.get_room_participants(room)]
            self._handle_data_request(tool_data['tool key'])
            self.send({
                'type': 'tool confirm',
                'data': {
                    'message': tool_data['tool confirm'](room_name, self._user_list.get_username(new_owner)),
                    'perm level': tool_data['perm level']
                }
            })

    def _handle_data_tool(self, tool_data, entity_id):
        data = None
        if tool_data['data type'] == 'parasite':
            data = self._user_list.get_user(entity_id).copy()
            del data['password']
        if tool_data['data type'] == 'room':
            data = self._room_list.get_room(entity_id).copy()
            data['history'] = len(data['history'])

        self.send({
            'type': 'tool confirm',
            'data': {
                'message': tool_data['tool confirm'](data),
                'perm level': tool_data['perm level']
            }
        })

    def _handle_parasite_tool(self, tool_data, parasite):
        if tool_data['tool action'] == 'deactivate':
            # make sure the user isn't online... that'd be awkward.
            if len(self._user_list.get_user_participants(parasite)) != 0:
                self.send({
                    'type': 'tool confirm',
                    'data': {
                        'message': 'Lol, no.',
                        'perm level': tool_data['perm level']
                    }
                })
                return

            # remove from all rooms
            self._room_list.remove_user_from_all_rooms(parasite)
            # remove all message queue items
            self._message_queue.remove_all(parasite)
            # deactivate user
            self._user_list.deactivate_parasite(parasite)
            # broadcast user list to all
            self._broadcast_user_list()
            self._broadcast_alert('{}\'s account has been deactivated.'.format(parasite))
        elif tool_data['tool action'] == 'reactivate':
            # reactivate user
            self._user_list.reactivate_parasite(parasite)
            # put the user back in the general room
            self._room_list.add_user_to_room(0, parasite)
            # add an alert to their queue so they know why everything's reset
            self._message_queue.add_alert(parasite, json.dumps(tool_data['success alert']))
            # broadcast user list to all
            self._broadcast_user_list()
            self._broadcast_alert('{}\'s account has been reactivated.'.format(parasite))

        # return confirm
        self._handle_data_request(tool_data['tool key'])
        self.send({
            'type': 'tool confirm',
            'data': {
                'message': tool_data['tool confirm'](parasite),
                'perm level': tool_data['perm level']
            }
        })

    ### GENERAL HELPER FUNCTIONS

    def _send_auth_fail(self):
        """
        Authentication failed, send a message to the client to log out.
        """
        log_from_server(LogLevel.debug, "{} Authentication failure.".format(self.session.session_id))
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
        self.send({'type': 'alert', 'data': {'message': message, 'type': alert_type}})

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

    def _format_parasite_for_log(self):
        return "({}:{}@{})".format(self.current_user['id'], self.session.session_id, self.session.conn_info.ip)


new_chat_router = SockJSRouter(NewMultiRoomChatConnection, '/chat')
