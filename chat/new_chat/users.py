import json
from json import JSONEncoder


class UserList:
    user_map = {}
    participants = set()
    _user_defaults = {
        'color': '#555555',
        'faction': 'rebel',
        'status': 'offline'
    }

    def __init__(self, db):
        self.db = db
        users = self.db.query("SELECT id, username, color, faction FROM parasite")
        for user in users:
            new_user = self._user_defaults.copy()
            new_user.update(user)
            self.user_map[user.id] = new_user
        print self

    def get_user(self, user_id):
        """
        Retrieve user info from current map
        :param str user_id: parasite id
        :return dict: user info
        """
        self.user_map.get(user_id, None)

    def add_user(self, user):
        """
        Update a user in the map. If the user is already there, the data will be updated to match.
        :param dict user: user data
        """
        if user['id'] not in self.user_map.keys():
            # validate that all necessary information is present with defaults and id check (if no id, invalid)
            if 'id' in user.keys():
                user.update(self._user_defaults)
                self.user_map[user['id']] = user
        else:
            self.user_map[user['id']].update(user)

    def get_user_map(self):
        # we need to return a map that is filtered down to the necessary information for a user list
        return self.user_map.copy()

    def get_user_list(self):
        # Sorting RELIES on the fact that the stati are ALPHABETICAL!! If this changes, make a good sort!
        return sorted(sorted([self.user_map[item] for item in self.user_map], key=lambda user: user['username']), key=lambda user: user['status'])

    def get_usernames(self):
        return [x for x in self.user_map]

    def update_user_status(self, user_id, status):
        if status in ['offline', 'active', 'idle'] and self.user_map.has_key(user_id):
            self.user_map[user_id]['status'] = status

    def add_participant(self, participant):
        self.participants.add(participant)

    def get_all_participants(self):
        return self.participants

    def get_user_participants(self, user_id):
        return [x for x in self.participants if x.current_user['id'] == user_id]

    def __str__(self):
        return json.dumps(self.get_user_list())
