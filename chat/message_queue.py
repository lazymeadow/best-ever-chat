from chat.lib import db_upsert, db_select, db_delete
from chat.loggers import log_from_server


class MessageQueue:
    def __init__(self, db, user_list):
        log_from_server('info', 'Initializing message queue...')
        self.db = db
        self._user_list = user_list

    def add_invitation(self, user_id, room_id, content):
        db_upsert(self.db, "INSERT INTO invitations (parasite_id, room_id, content) VALUES (%s, %s, %s)",
                       user_id, room_id, content)

    def get_invitations(self, user_id):
        return db_select(self.db,
            "SELECT room_id as 'room id', parasite_id as 'user id', content, 'invitation' as 'type' FROM invitations WHERE parasite_id = %s", user_id)

    def remove_invitation(self, user_id, room_id):
        db_delete(self.db, "DELETE FROM invitations WHERE parasite_id = %s AND room_id = %s", user_id, room_id)
