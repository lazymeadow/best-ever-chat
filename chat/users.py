import json

from datetime import datetime

from chat.emails import send_password_changed_email
from chat.lib import hash_password, check_password
from chat.loggers import log_from_server, LogLevel
from chat.tools.lib import ADMIN_PERM, MOD_PERM, USER_PERM

allowed_factions = [
    'first-order',
    'first-order-alt',
    'empire',
    'galactic-republic',
    'galactic-senate',
    'jedi-order',
    'mandalorian',
    'old-republic',
    'rebel',
    'sith',
    'trade-federation'
]


class UserList:
    _user_map = {}
    _participants = set()
    _user_defaults = {
        'status': 'offline',
        'color': '#555555',
        'faction': 'rebel',
        'soundSet': 'AIM',
        'volume': '100',
        'typing': False,
        'lastActive': None,
        'permission': 'user'
    }

    def __init__(self, db):
        log_from_server(LogLevel.info, 'Initializing user list...')
        self.db = db
        parasites = self.db.query("SELECT id FROM parasite WHERE activeAccount = true")
        for parasite in parasites:
            self.load_user(parasite['id'])

    def is_existing_user(self, user_id):
        return user_id in self._user_map.keys()

    def is_valid_username(self, user_name):
        return self.is_a_user(user_name) != True or user_name not in [self._user_map[x]['username'] for x in self._user_map.keys()]

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
        user = self.db.get(
            "SELECT id, password, username, email, last_active as lastActive FROM parasite WHERE id = %s",
            user_id)

        user_conf = self.db.query("SELECT name, value FROM parasite_config WHERE parasite_id = %s", user_id)
        for conf in user_conf:
            user[conf['name']] = conf['value']

        if user['lastActive']:
            user['lastActive'] = user['lastActive'].strftime('%Y-%m-%d %H:%M:%S')
        if user['id'] not in self._user_map.keys():
            # this means this is a probably NEW user, created since the server was started.
            new_user = self._user_defaults.copy()
            new_user.update(user)
            self._user_map[user['id']] = new_user
        else:
            self._user_map[user['id']].update(user)

    def get_user_map(self):
        # we need to return a map that is filtered down to the necessary information for a user list
        return self._user_map.copy()

    def _get_list_user(self, user_id):
        user_copy = self._user_map[user_id].copy()
        del user_copy['password']
        return user_copy

    def get_user_list(self):
        # Sorting RELIES on the fact that the stati are ALPHABETICAL!! If this changes, make a good sort!
        return sorted(
            sorted([self._get_list_user(item) for item in self._user_map], key=lambda user: user['username'].lower()),
                      key=lambda user: user['status'])

    def get_all_usernames(self):
        return [x for x in self._user_map]

    def update_user_status(self, user_id, status, participant=None):
        if status in ['offline', 'active', 'idle'] and self._user_map.has_key(user_id):
            if status == 'offline':
                if participant is not None and participant in self._participants:
                    self._participants.remove(participant)
                    if len(self.get_user_participants(user_id)) == 0:
                        self._user_map[user_id]['status'] = status
            else:
                self._user_map[user_id]['status'] = status

    def update_user_typing_status(self, user_id, is_typing):
        if self._user_map.has_key(user_id):
            self._user_map[user_id]['typing'] = is_typing

    def update_username(self, user_id, new_username):
        old_username = self._user_map[user_id]['username']
        if old_username != new_username:
            self._user_map[user_id]['username'] = new_username
            for participant in self.get_user_participants(user_id):
                participant.current_user['username'] = new_username
            self.db.update("UPDATE parasite SET username = %s WHERE id = %s", new_username, user_id)
            return True

    def update_user_email(self, user_id, new_email):
        old_email = self._user_map[user_id]['email']
        if old_email != new_email:
            self._user_map[user_id]['email'] = new_email
            for participant in self.get_user_participants(user_id):
                participant.current_user['email'] = new_email
            self.db.update("UPDATE parasite SET email = %s WHERE id = %s", new_email, user_id)
            return True

    def update_user_password(self, user_id, new_password, check_match=True):
        old_password = self._user_map[user_id]['password']
        if not check_match or not check_password(new_password, old_password):
            hashed_password = hash_password(new_password).result()  # hash_password returns a Future
            self._user_map[user_id]['password'] = hashed_password
            for participant in self.get_user_participants(user_id):
                participant.current_user['password'] = hashed_password
            self.db.update("UPDATE parasite SET password = %s WHERE id = %s", hashed_password, user_id)
            send_password_changed_email(self._user_map[user_id]['email'], user_id)
            return True

    def update_user_conf(self, user_id, conf_name, conf_value):
        if self._user_map.has_key(user_id) and self._user_map[user_id][conf_name] != conf_value:
            if conf_name == 'faction' and conf_value not in allowed_factions:
                return False

            self._user_map[user_id][conf_name] = conf_value
            self.db.update(
                "INSERT INTO parasite_config (name, value, parasite_id) VALUES (%s, %s, %s)  ON DUPLICATE KEY UPDATE value=%s",
                conf_name, conf_value, user_id, conf_value)
            return True

    def update_user_last_active(self, user_id):
        if self._user_map.has_key(user_id):
            now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            self._user_map[user_id]['lastActive'] = now
            self.db.update("UPDATE parasite SET last_active = %s WHERE id = %s", now, user_id)

    def add_participant(self, participant):
        self._participants.add(participant)

    def remove_participant(self, participant):
        self._participants.discard(participant)

    def get_all_participants(self, exclude=None):
        if exclude is not None:
            return set([x for x in self._participants if x.current_user['id'] != exclude])
        return self._participants

    def get_user_participants(self, user_id):
        return set([x for x in self._participants if x.current_user['id'] == user_id])

    def _get_user_list_by_perm(self, perm, current_user_id):
        return [{'id': item, 'username': self._user_map[item]['username']} for item in self._user_map if (item != current_user_id and self._user_map[item]['permission'] == perm)]

    def get_users(self, current_user_id):
        return self._get_user_list_by_perm(USER_PERM, current_user_id)

    def get_moderators(self, current_user_id):
        return self._get_user_list_by_perm(MOD_PERM, current_user_id)

    def get_admins(self, current_user_id):
        return self._get_user_list_by_perm(ADMIN_PERM, current_user_id)

    def get_all(self):
        return [{'id': item, 'username': self._user_map[item]['username']} for item in self._user_map]

    def get_inactive_user_ids(self):
        return self.db.query("SELECT id FROM parasite WHERE activeAccount = false")

    def get_active_user_ids(self):
        return self.db.query("SELECT id FROM parasite WHERE activeAccount = true")

    def deactivate_parasite(self, user_id):
        self.db.execute("DELETE FROM parasite_config WHERE parasite_id = %s", user_id)
        self.db.update("UPDATE parasite SET activeAccount = false, last_active = null, reset_token = null WHERE id = %s", user_id)
        del self._user_map[user_id]

    def reactivate_parasite(self, user_id):
        self.db.update("UPDATE parasite SET activeAccount = true WHERE id = %s", user_id)
        self.load_user(user_id)

    def is_active_user(self, user_id):
        parasite = self.db.get("SELECT activeAccount FROM parasite WHERE id = %s", user_id)
        return parasite['activeAccount'] == ''

    def is_a_user(self, user_id):
        parasite = self.db.get("SELECT id FROM parasite WHERE id = %s", user_id)
        return parasite is not None

    def __str__(self):
        return json.dumps(self.get_user_list())
