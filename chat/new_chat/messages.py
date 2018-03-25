class MessageQueue:
    def __init__(self, db, user_list):
        self.db = db
        self._user_list = user_list

    def add_message(self, user_id, type, content):
        self.db.insert("INSERT INTO messages (parasite_id, type, content) VALUES (%s, %s, %s)",
                       user_id, type, content)

    def get_messages(self, user_id):
        return self.db.query('SELECT id, type, content FROM messages WHERE parasite_id = %s', user_id)

    def remove_message(self, msg_id):
        self.db.execute("DELETE FROM messages WHERE id = %s", msg_id)
