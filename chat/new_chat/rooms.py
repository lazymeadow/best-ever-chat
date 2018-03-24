import json
from collections import deque
from json import JSONEncoder


MAX_DEQUE_LENGTH = 75

class RoomList:
    room_map = {}

    def __init__(self, db, user_list):
        self.db = db
        self.user_list = user_list

        self.room_map[0] = {
            'name': 'General',
            'owner': None,
            'id': 0,
            'members': self.user_list.get_usernames(),
            'history': deque(maxlen=MAX_DEQUE_LENGTH)
        }

        rooms = self.db.query('SELECT id, name, owner, group_concat(parasite_id) AS members '
                              'FROM rooms LEFT JOIN room_access a ON rooms.id = a.room_id '
                              'GROUP BY id')
        for room in rooms:
            new_room = {}
            new_room.update(room)
            new_room['members'] = new_room['members'].split(',')
            new_room['history'] = deque(maxlen=MAX_DEQUE_LENGTH)
            self.room_map[room.id] = new_room
        print self

    def get_room(self, room_id):
        """
        Retrieve room info from current map
        :param str room_id: parasite id
        :return dict: room info
        """
        self.room_map.get(room_id, None)

    def get_room_map(self):
        # we need to return a map that is filtered down to the necessary information for a room list
        return self.room_map.copy()

    def get_room_list(self):
        return sorted([{'id': self.room_map[item]['id'],
                        'name': self.room_map[item]['name'],
                        'owner': self.room_map[item]['owner'],
                        'members': self.room_map[item]['members']} for item in self.room_map], key=lambda room: room['name'])

    def get_room_list_for_user(self, user_id):
        return sorted([{'id': self.room_map[item]['id'],
                        'name': self.room_map[item]['name'],
                        'owner': self.room_map[item]['owner'],
                        'history': sorted([x.copy() for x in self.room_map[item]['history']],
                                          key=lambda x: x['time'])}
                       for item in self.room_map if user_id in self.room_map[item]['members']],
                      key=lambda room: room['name'])

    def __str__(self):
        return json.dumps(self.get_room_list())
