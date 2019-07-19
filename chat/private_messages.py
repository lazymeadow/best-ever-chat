from collections import deque

from chat.lib import MAX_DEQUE_LENGTH
from chat.loggers import log_from_server


class PrivateMessageMap:
    _thread_map = {}

    def __init__(self, user_list):
        log_from_server('info', 'Initializing private messages...')
        self._user_list = user_list

    def _generate_thread_id(self, user_id1, user_id2):
        return hash(str.join('', sorted([user_id1, user_id2], key=unicode.lower)))

    def verify_thread_id(self, thread_id, user_id1, user_id2):
        return thread_id == self._generate_thread_id(user_id1, user_id2)

    def retrieve_thread_id(self, user_id1, user_id2):
        all_usernames = self._user_list.get_all_usernames()
        if user_id1 not in all_usernames or user_id2 not in all_usernames:
            return None

        thread_id = self._generate_thread_id(user_id1, user_id2)

        if thread_id not in self._thread_map.keys():
            self._thread_map[thread_id] = {
                'messages': deque(maxlen=MAX_DEQUE_LENGTH),
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
        # Don't need to add duplicates if they're the same user
        if self._thread_map[pm_id]['user_1'] != self._thread_map[pm_id]['user_2']:
            participant_list.extend(self._user_list.get_user_participants(self._thread_map[pm_id]['user_2']))

        return participant_list

    def add_pm_to_thread(self, message_data, user_id1, user_id2, thread_id):
        if self.verify_thread_id(thread_id, user_id1, user_id2):
            self._thread_map[thread_id]['messages'].append(message_data.copy())
        else:
            return None
