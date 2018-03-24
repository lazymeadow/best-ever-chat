import json
from json import JSONEncoder


class RoomList:
    room_map = {}

    def __init__(self, db, user_list):
        self.db = db
        self.user_list = user_list

        self.room_map[0] = {
            'name': 'General',
            'id': 0,
            'members': self.user_list.get_usernames()
        }

        rooms = self.db.query('SELECT id, name, owner, group_concat(parasite_id) AS members '
                              'FROM rooms LEFT JOIN room_access a ON rooms.id = a.room_id '
                              'GROUP BY id')
        for room in rooms:
            new_room = {}
            new_room.update(room)
            new_room['members'] = new_room['members'].split(',')
            self.room_map[room.id] = new_room
        print self

    def get_room(self, room_id):
        """
        Retrieve room info from current map
        :param str room_id: parasite id
        :return dict: room info
        """
        self.room_map.get(room_id, None)

    def add_room(self, room):
        """
        Update a room in the map. If the room is already there, the data will be updated to match.
        :param dict room: room data
        """
        if room['id'] not in self.room_map.keys():
            # validate that all necessary information is present with defaults and id check (if no id, invalid)
            if 'id' in room.keys():
                room.update(self._room_defaults)
                self.room_map[room['id']] = room
        else:
            self.room_map[room['id']].update(room)

    def get_room_map(self):
        # we need to return a map that is filtered down to the necessary information for a room list
        return self.room_map.copy()

    def get_room_list(self):
        return sorted([self.room_map[item] for item in self.room_map], key=lambda room: room['name'])

    def get_room_list_for_user(self, user_id):
        return sorted([self.room_map[item] for item in self.room_map if user_id in self.room_map[item]['members']],
                      key=lambda room: room['name'])

    def __str__(self):
        return json.dumps(self.get_room_list())
