from chat.loggers import log_from_server


class MessageQueue:
    def __init__(self, db, user_list):
        log_from_server('info', 'Initializing message queue...')
        self.db = db
        self._user_list = user_list

    def add_invitation(self, user_id, room_id, content):
        self.db.insert("INSERT INTO invitations (parasite_id, room_id, content) VALUES (%s, %s, %s)",
                       user_id, room_id, content)

    def get_invitations(self, user_id):
        return self.db.query(
            "SELECT room_id as 'room id', parasite_id as 'user id', content, 'invitation' as 'type' FROM invitations WHERE parasite_id = %s", user_id)

    def remove_invitation(self, user_id, room_id):
        self.db.execute("DELETE FROM invitations WHERE parasite_id = %s AND room_id = %s", user_id, room_id)
