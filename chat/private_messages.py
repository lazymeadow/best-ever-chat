class PrivateMessageMap:
    _room_map = {}
    _room_defaults = {
        "messages": []
    }

    def __init__(self, user_list):
        self._user_list = user_list

    def _generate_room_id(self, user_id1, user_id2):
        return hash(str.join('', sorted([user_id1, user_id2], key=str.lower)))

    def _create_room(self, user_id1, user_id2):
        room_id = self._generate_room_id(user_id1, user_id2)

        if room_id not in self._room_map.keys():
            room_data = self._room_defaults.copy()
            room_data["user_1"] = user_id1
            room_data["user_2"] = user_id2
            self._room_map[room_id] = room_data

        return room_id

    def get_room_map_for_user(self, user_id):
        # find all rooms that contain this user_id as user_id1 or user_id2
        return [{'id': x, 'messages': self._room_map[x]['messages']} for x in self._room_map.keys() if
                (self._room_map[x]['user_1'] == user_id) or (self._room_map[x]['user_2'] == user_id)]

    def get_room_participants(self, room_id):
        if room_id not in self._room_map.keys():
            return []

        participant_list = []
        participant_list.extend(self._user_list.get_user_participants(self._room_map[room_id]['user_1']))
        participant_list.extend(self._user_list.get_user_participants(self._room_map[room_id]['user_2']))

        return participant_list

    def add_message_to_history(self, message_data, user_id1, user_id2, room_id = None):
        checked_room_id = room_id
        if checked_room_id is None:
            checked_room_id = self._create_room(user_id1, user_id2)

        if checked_room_id == self._generate_room_id(user_id1, user_id2):
            # send message
            self._room_map[checked_room_id]['messages'].append(message_data.copy())
        else:
            return None
