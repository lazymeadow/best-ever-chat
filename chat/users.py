import json
from datetime import datetime

from chat.emails import send_password_changed_email
from chat.lib import hash_password, check_password, db_select, db_select_one, db_upsert
from chat.loggers import log_from_server

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
        log_from_server('info', 'Initializing user list...')
        self.db = db
        parasites = db_select(self.db, "SELECT id FROM parasite")
        for parasite in parasites:
            self.load_user(parasite['id'])

    def is_existing_user(self, user_id):
        return user_id in self._user_map.keys()

    def is_valid_username(self, user_name):
        return (user_name not in [self._user_map[x]['username'] for x in self._user_map.keys()]) or (
                user_name not in self._user_map.keys())

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
        user = db_select_one(self.db,
            "SELECT id, password, username, email, last_active as lastActive FROM parasite WHERE id = %s",
            user_id)

        user_conf = db_select(self.db, "SELECT name, value FROM parasite_config WHERE parasite_id = %s", user_id)
        user.update(user_conf)

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

    def get_user_list(self):
        # Sorting RELIES on the fact that the stati are ALPHABETICAL!! If this changes, make a good sort!
        return sorted(
            sorted([self._user_map[item] for item in self._user_map], key=lambda user: user['username'].lower()),
            key=lambda user: user['status'])

    def get_all_usernames(self):
        return [x for x in self._user_map]

    def update_user_status(self, user_id, status, participant=None):
        if status in ['offline', 'active', 'idle'] and user_id in self._user_map:
            if status == 'offline':
                if participant is not None and participant in self._participants:
                    self._participants.remove(participant)
                    if len(self.get_user_participants(user_id)) == 0:
                        self._user_map[user_id]['status'] = status
            else:
                self._user_map[user_id]['status'] = status

    def update_user_typing_status(self, user_id, is_typing):
        if user_id in self._user_map:
            self._user_map[user_id]['typing'] = is_typing

    def update_username(self, user_id, new_username):
        old_username = self._user_map[user_id]['username']
        if old_username != new_username:
            self._user_map[user_id]['username'] = new_username
            for participant in self.get_user_participants(user_id):
                participant.current_user['username'] = new_username
            db_upsert(self.db, "UPDATE parasite SET username = %s WHERE id = %s", new_username, user_id)
            return True

    def update_user_email(self, user_id, new_email):
        old_email = self._user_map[user_id]['email']
        if old_email != new_email:
            self._user_map[user_id]['email'] = new_email
            for participant in self.get_user_participants(user_id):
                participant.current_user['email'] = new_email
            db_upsert(self.db, "UPDATE parasite SET email = %s WHERE id = %s", new_email, user_id)
            return True

    def update_user_password(self, user_id, new_password, check_match=True):
        old_password = self._user_map[user_id]['password']
        if not check_match or not check_password(new_password, old_password):
            hashed_password = hash_password(new_password).result()  # hash_password returns a Future
            self._user_map[user_id]['password'] = hashed_password
            for participant in self.get_user_participants(user_id):
                participant.current_user['password'] = hashed_password
            db_upsert(self.db, "UPDATE parasite SET password = %s WHERE id = %s", hashed_password, user_id)
            send_password_changed_email(self._user_map[user_id]['email'], user_id)
            return True

    def update_user_conf(self, user_id, conf_name, conf_value):
        if user_id in self._user_map and self._user_map[user_id][conf_name] != conf_value:
            if conf_name == 'faction' and conf_value not in allowed_factions:
                return False

            self._user_map[user_id][conf_name] = conf_value
            db_upsert(self.db,
                "INSERT INTO parasite_config (name, value, parasite_id) VALUES (%s, %s, %s)  ON DUPLICATE KEY UPDATE value=%s",
                conf_name, conf_value, user_id, conf_value)
            return True

    def update_user_last_active(self, user_id):
        if user_id in self._user_map:
            now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S');
            self._user_map[user_id]['lastActive'] = now
            db_upsert(self.db, "UPDATE parasite SET last_active = %s WHERE id = %s", now, user_id)

    def add_participant(self, participant):
        self._participants.add(participant)

    def remove_participant(self, participant):
        self._participants.discard(participant)

    def get_all_participants(self, exclude=None):
        if exclude is not None:
            return [x for x in self._participants if x.current_user['id'] != exclude]
        return self._participants

    def get_user_participants(self, user_id):
        return [x for x in self._participants if x.current_user['id'] == user_id]

    def _get_user_list_by_perm(self, perm):
        return [{'id': item, 'username': self._user_map[item]['username']} for item in self._user_map if self._user_map[item]['permission'] == perm]

    def get_users(self):
        return self._get_user_list_by_perm('user')

    def get_moderators(self):
        return self._get_user_list_by_perm('mod')

    def get_admins(self):
        return self._get_user_list_by_perm('admin')

    def __str__(self):
        return json.dumps(self.get_user_list())
