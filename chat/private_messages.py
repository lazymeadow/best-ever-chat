class PrivateMessageMap:
    _thread_map = {}

    def __init__(self, user_list):
        self._user_list = user_list

    def _generate_thread_id(self, user_id1, user_id2):
        return hash(str.join('', sorted([user_id1, user_id2], key=unicode.lower)))

    def verify_thread_id(self, thread_id, user_id1, user_id2):
        return thread_id == self._generate_thread_id(user_id1, user_id2)

    def retrieve_thread_id(self, user_id1, user_id2):
        thread_id = self._generate_thread_id(user_id1, user_id2)

        if thread_id not in self._thread_map.keys():
            self._thread_map[thread_id] = {
                'messages': [],
                'user_1': user_id1,
                'user_2': user_id2
            }

        return thread_id

    def get_thread_list_for_user(self, user_id):
        thread_list = []
        for thread_id in self._thread_map:
            thread = self._thread_map[thread_id]
            if user_id == thread['user_1'] or user_id == thread['user_2']:
                thread_list.append({
                    'recipient id':  thread['user_1'] if user_id != thread['user_1'] else thread['user_2'],
                    'messages': sorted([x.copy() for x in thread['messages']], key=lambda x: x['time'])
                })
        return thread_list

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