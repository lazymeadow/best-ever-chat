from chat.loggers import log_from_server, LogLevel


class MessageQueue:
    def __init__(self, db, user_list):
        log_from_server(LogLevel.info, 'Initializing message queue...')
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

    def add_alert(self, user_id, content):
        self.db.insert("INSERT INTO alerts (parasite_id, content) VALUES (%s, %s)",
                       user_id, content)

    def get_alerts(self, user_id):
        return self.db.query(
            "SELECT id, parasite_id as 'user id', content, 'alert' as 'type' FROM alerts WHERE parasite_id = %s", user_id)

    def remove_alert(self, user_id, alert_id):
        self.db.execute("DELETE FROM alerts WHERE parasite_id = %s AND id = %s", user_id, alert_id)

    def get_all(self, user_id):
        return self.get_invitations(user_id) + self.get_alerts(user_id)

    def remove_all(self, user_id):
        self.db.execute("DELETE FROM alerts WHERE parasite_id = %s", user_id)
        self.db.execute("DELETE FROM invitations WHERE parasite_id = %s", user_id)

