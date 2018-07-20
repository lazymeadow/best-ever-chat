"""
    Best chat ever now a sockjs-tornado application.
"""
import os
import random
import string

import tornado.web
import torndb
from tornado.ioloop import IOLoop

from chat.handlers import ValidateHandler, AuthLoginHandler, AuthCreateHandler, AuthLogoutHandler, \
    AuthPasswordResetHandler, AuthPasswordResetRequestHandler, PageHandler, Chat404Handler
from chat.new_chat.messages import MessageQueue
from chat.new_chat.new_chat_connection import new_chat_router
from chat.new_chat.rooms import RoomList
from chat.new_chat.users import UserList
from emoji.emoji_curation import curated_emojis

SECRET_KEY = ''.join(
    random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(32))

http_server = None


class Application(tornado.web.Application):
    def __init__(self, handlers, settings):
        super(Application, self).__init__(handlers, **settings)
        # Have one global connection to the blog DB across all handlers
        self.db = torndb.Connection(
            host='127.0.0.1:3306',
            database='bestchat',
            user='bestChat',
            password='a5e625568329d8c2216631da90efc030121400bde3bde2300fd089b738568717',
            charset='utf8mb4'
        )

        # user list
        self.user_list = UserList(self.db)

        # room list
        self.room_list = RoomList(self.db, self.user_list)

        # message queue
        self.message_queue = MessageQueue(self.db, self.user_list)


if __name__ == "__main__":
    import logging

    logging.getLogger().setLevel(logging.DEBUG)

    settings = {
        'cookie_secret': SECRET_KEY,
        'template_path': 'templates',
        'xsrf_cookies': True,
        'login_url': "/login",
        'static_path': os.path.join(os.path.dirname(__file__), 'static'),
        'emojis': curated_emojis,
        'default_handler_class': Chat404Handler
    }
    handlers = [
                   (r"/", PageHandler),
                   (r"/register", AuthCreateHandler),
                   (r"/login", AuthLoginHandler),
                   (r"/logout", AuthLogoutHandler),
                   (r"/forgot_password", AuthPasswordResetRequestHandler),
                   (r"/reset_password", AuthPasswordResetHandler),
                   ('/validate_username', ValidateHandler)
               ] + new_chat_router.urls

    http_server = Application(handlers, settings)

    http_server.listen(6969, no_keep_alive=True)

    new_chat_router.get_connection_class().http_server = http_server

    logging.info('Server starting.')
    IOLoop.instance().start()
