import json
from collections import deque

from tornado.escape import to_unicode

from chat.lib import MAX_DEQUE_LENGTH


class UserList:
    _user_map = {}
    _participants = set()
    _user_defaults = {
        'color': '#555555',
        'faction': 'rebel',
        'status': 'offline'
    }

    def __init__(self, db):
        self.db = db
        users = self.db.query("SELECT id, username, color, faction FROM parasite")
        for user in users:
            user['username'] = to_unicode(user['username'])
            new_user = self._user_defaults.copy()
            new_user.update(user)
            self._user_map[user.id] = new_user

    def is_existing_user(self, user_id):
        return user_id in self._user_map.keys()

    def is_valid_username(self, user_name):
        return (user_name not in self._user_map.keys()) and (user_name not in [self._user_map[x]['username'] for x in self._user_map.keys()])

    def get_username(self, user_id):
        return self._user_map[user_id]['username']

    def get_user(self, user_id):
        """
        Retrieve user info from current map
        :param str user_id: parasite id
        :return dict: user info
        """
        return self._user_map.get(user_id, None)

    def add_user(self, user):
        """
        Update a user in the map. If the user is already there, the data will be updated to match.
        :param dict user: user data
        """
        if user['id'] not in self._user_map.keys():
            # validate that all necessary information is present with defaults and id check (if no id, invalid)
            if 'id' in user.keys():
                user.update(self._user_defaults)
                self._user_map[user['id']] = user
        else:
            self._user_map[user['id']].update(user)

    def load_user(self, user_id):
        user = self.db.get("SELECT id, username, color, faction FROM parasite WHERE id = %s", user_id)
        if user['id'] not in self._user_map.keys():
            # this means this is a probably NEW user, created since the server was started.
            new_user = self._user_defaults.copy()
            new_user.update(user)
            self._user_map[user.id] = new_user
        else:
            self._user_map[user['id']].update(user)

    def get_user_map(self):
        # we need to return a map that is filtered down to the necessary information for a user list
        return self._user_map.copy()

    def get_user_list(self):
        # Sorting RELIES on the fact that the stati are ALPHABETICAL!! If this changes, make a good sort!
        return sorted(sorted([self._user_map[item] for item in self._user_map], key=lambda user: user['username']), key=lambda user: user['status'])

    def get_all_usernames(self):
        return [x for x in self._user_map]

    def update_user_status(self, user_id, status, participant=None):
        if status in ['offline', 'active', 'idle'] and self._user_map.has_key(user_id):
            if status is 'offline':
                if participant is not None and participant in self._participants:
                    self._participants.remove(participant)
                    if len(self.get_user_participants(user_id)) == 0:
                        self._user_map[user_id]['status'] = status
            else:
                self._user_map[user_id]['status'] = status

    def update_username(self, user_id, new_username):
        self._user_map[user_id]['username'] = new_username
        self.db.update("UPDATE parasite SET username = %s WHERE id = %s", new_username, user_id)

    def add_participant(self, participant):
        self._participants.add(participant)

    def get_all_participants(self, exclude=None):
        if exclude is not None:
            return [x for x in self._participants if x.current_user['id'] != exclude]
        return self._participants

    def get_user_participants(self, user_id):
        return [x for x in self._participants if x.current_user['id'] == user_id]

    def __str__(self):
        return json.dumps(self.get_user_list())
