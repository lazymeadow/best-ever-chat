class PrivateMessageMap:
    _thread_map = {}
    _thread_defaults = {
        "messages": []
    }

    def __init__(self, user_list):
        self._user_list = user_list

    def _generate_thread_id(self, user_id1, user_id2):
        return hash(str.join('', sorted([user_id1, user_id2], key=unicode.lower)))


    def verify_thread_id(self, thread_id, user_id1, user_id2):
        return thread_id == self._generate_thread_id(user_id1, user_id2)

    def retrieve_thread_id(self, user_id1, user_id2):
        thread_id = self._generate_thread_id(user_id1, user_id2)

        if thread_id not in self._thread_map.keys():
            thread_data = self._thread_defaults.copy()
            thread_data["user_1"] = user_id1
            thread_data["user_2"] = user_id2
            self._thread_map[thread_id] = thread_data

        return thread_id

    def get_thread_list_for_user(self, user_id):
        # find all pms that contain this user_id as user_id1 or user_id2
        return [{'id': x, 'messages': self._thread_map[x]['messages']} for x in self._thread_map.keys() if
                (self._thread_map[x]['user_1'] == user_id) or (self._thread_map[x]['user_2'] == user_id)]

    def get_thread_participants(self, pm_id):
        if pm_id not in self._thread_map.keys():
            return []

        participant_list = []
        participant_list.extend(self._user_list.get_user_participants(self._thread_map[pm_id]['user_1']))
        participant_list.extend(self._user_list.get_user_participants(self._thread_map[pm_id]['user_2']))

        return participant_list

    def add_pm_to_thread(self, message_data, user_id1, user_id2, thread_id):
        if self.verify_thread_id(thread_id, user_id1, user_id2):
            self._thread_map[thread_id]['messages'].append(message_data.copy())
        else:
            return None
