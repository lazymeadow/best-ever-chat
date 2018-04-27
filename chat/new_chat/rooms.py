import json
from collections import deque

from chat.lib import MAX_DEQUE_LENGTH


class RoomList:
    _room_map = {}
    _room_defaults = {
        'members': set(),
        'history': deque(maxlen=MAX_DEQUE_LENGTH)
    }

    def __init__(self, db, user_list):
        self.db = db
        self._user_list = user_list

        self._room_map[0] = {
            'name': 'General',
            'owner': None,
            'id': 0,
            'members': set(self._user_list.get_all_usernames()),
            'history': deque(maxlen=MAX_DEQUE_LENGTH)
        }

        rooms = self.db.query('SELECT id, name, owner, group_concat(parasite_id) AS members '
                              'FROM rooms LEFT JOIN room_access a ON rooms.id = a.room_id and a.in_room = TRUE '
                              'GROUP BY id')
        for room in rooms:
            new_room = {}
            new_room.update(room)
            new_room['members'] = set(new_room['members'].split(','))
            new_room['history'] = deque(maxlen=MAX_DEQUE_LENGTH)
            self._room_map[room.id] = new_room

    def get_room_name(self, room_id):
        return self._room_map[room_id]['name']

    def get_room(self, room_id):
        """
        Retrieve room info from current map
        :param str room_id: parasite id
        :return dict: room info
        """
        room = self._room_map.get(room_id)
        if room is None:
            return room
        return {'id': room_id,
                'name': room['name'],
                'owner': room['owner'],
                'history': sorted([x.copy() for x in room['history']], key=lambda x: x['time']),
                'members': list(room['members'])}

    def get_room_map(self):
        # we need to return a map that is filtered down to the necessary information for a room list
        return self._room_map.copy()

    def get_room_list_for_user(self, user_id):
        return sorted([self.get_room(item) for item in self._room_map.keys() if user_id in self._room_map[item]['members']],
                      key=lambda room: room['id'])

    def get_room_participants(self, room_id):
        participant_list = []
        [participant_list.extend(self._user_list.get_user_participants(user_id))
         for user_id in self._room_map[room_id]['members']]
        return participant_list

    def create_room(self, name, owner_id):
        if not self._user_list.is_existing_user(owner_id):
            return None

        # create room in db
        room_id = self.db.insert("INSERT INTO rooms (name, owner) VALUES (%s, %s)",
                                 name, owner_id)
        # add room to owner user
        self.db.execute("INSERT INTO room_access (room_id, parasite_id, in_room) VALUES (%s, %s, TRUE) ON DUPLICATE KEY UPDATE in_room=TRUE",
                        room_id, owner_id)

        new_room = self._room_defaults.copy()
        new_room['id'] = room_id
        new_room['owner'] = owner_id
        new_room['name'] = name
        new_room['members'].add(owner_id)
        self._room_map[room_id] = new_room

        # return the participants to update
        return (room_id, self.get_room_participants(room_id))

    def remove_room(self, room_id):
        if room_id not in self._room_map.keys():
            return None

        member_participants = self.get_room_participants(room_id)

        # remove all room_access rows for the room from database
        self.db.execute("DELETE FROM room_access WHERE room_id = %s", room_id)
        # remove the room from database
        self.db.execute("DELETE FROM rooms WHERE id = %s", room_id)
        # remove room from list
        room = self._room_map.pop(room_id, None)

        # return the participants to be informed of the room's demise
        return (room['name'], member_participants)

    def grant_user_room_access(self, room_id, user_id):
        # add room to owner user
        self.db.execute("INSERT INTO room_access (room_id, parasite_id, in_room) VALUES (%s, %s, FALSE) ON DUPLICATE KEY UPDATE in_room=FALSE",
                        room_id, user_id)

    def add_user_to_member_list(self, room_id, user_id):
        self._room_map[room_id]['members'].add(user_id)

    def add_user_to_room(self, room_id, user_id):
        if not self._user_list.is_existing_user(user_id) or room_id not in self._room_map.keys():
            return None
        # grant room access in database
        self.db.execute("UPDATE room_access SET in_room = TRUE WHERE parasite_id = %s AND room_id = %s",
                        user_id, room_id)
        self._room_map[room_id]['members'].add(user_id)
        return True

    def remove_user_from_room(self, room_id, user_id):
        if not self._user_list.is_existing_user(user_id) or room_id not in self._room_map.keys():
            return None
        # revoke room access in database
        self.db.execute("UPDATE room_access SET in_room = FALSE WHERE parasite_id = %s AND room_id = %s",
                        user_id, room_id)
        self._room_map[room_id]['members'].discard(user_id)
        return True

    def add_message_to_history(self, room_id, message_data):
        if room_id not in self._room_map.keys():
            return None

        self._room_map[room_id]['history'].append(message_data.copy())

    def is_valid_invitation(self, sender_id, recipient_id, room_id):
        """
        An invitation is valid if the room exists, the recipient exists and is not in the room, and the sender exists
        and is in the room.
        :param sender_id: parasite id of sender
        :param recipient_id: parasite id of recipient
        :param room_id: id of room
        :return: True if invitation allowed, False otherwise
        """
        return self._user_list.is_existing_user(sender_id) and self._user_list.is_existing_user(recipient_id) \
               and room_id in self._room_map.keys() \
               and sender_id in self._room_map[room_id]['members'] \
               and recipient_id not in self._room_map[room_id]['members']

    def __str__(self):
        return json.dumps(sorted([{'id': self._room_map[item]['id'],
                                   'name': self._room_map[item]['name'],
                                   'owner': self._room_map[item]['owner'],
                                   'members': self._room_map[item]['members']} for item in self._room_map],
                                 key=lambda room: room['name']))

# maybe private messages can be treated as rooms with a special prefix on the key. and there is some kind of mapping to which id to access for a pair of people.
# get the id for the room, then you get the history and send it out. sending to the client, make the other user the key.
