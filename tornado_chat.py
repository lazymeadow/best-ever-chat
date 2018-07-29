"""
    Best chat ever now a sockjs-tornado application.
"""
import logging
import os
from ConfigParser import SafeConfigParser

import tornado.web
import torndb
from tornado.ioloop import IOLoop

from chat.handlers import ValidateHandler, AuthLoginHandler, AuthCreateHandler, AuthLogoutHandler, \
    AuthPasswordResetHandler, AuthPasswordResetRequestHandler, PageHandler, Chat404Handler
from chat.loggers import log_from_server
from chat.new_chat.messages import MessageQueue
from chat.new_chat.new_chat_connection import new_chat_router
from chat.new_chat.rooms import RoomList
from chat.new_chat.users import UserList
from emoji.emoji_curation import curated_emojis

logging.getLogger().setLevel(logging.DEBUG)

config_parser = SafeConfigParser()
current_dir = os.path.dirname(os.path.realpath(__file__))
with open('install/chat.cfg', 'r+') as cfg:
    config_parser.readfp(cfg)
    config_section = os.environ['BEC_ENV'] if os.environ.has_key('BEC_ENV') else 'local'

    log_from_server('info', "Loading config: [{}]".format(config_section))

    SECRET_KEY = config_parser.get(config_section, 'BEC_SECRET_KEY')
    DB_USER = config_parser.get(config_section, 'BEC_DB_USER')
    DB_PASSWORD = config_parser.get(config_section, 'BEC_DB_PASSWORD')
    DB_HOST = config_parser.get(config_section, 'BEC_DB_HOST')
    DB_SCHEMA = config_parser.get(config_section, 'BEC_DB_SCHEMA')

http_server = None


class Application(tornado.web.Application):
    def __init__(self, handlers, settings):
        super(Application, self).__init__(handlers, **settings)
        # Have one global connection to the blog DB across all handlers
        self.db = torndb.Connection(
            host=DB_HOST,
            database=DB_SCHEMA,
            user=DB_USER,
            password=DB_PASSWORD,
            charset='utf8mb4'
        )

        # user list
        self.user_list = UserList(self.db)

        # room list
        self.room_list = RoomList(self.db, self.user_list)

        # message queue
        self.message_queue = MessageQueue(self.db, self.user_list)


if __name__ == "__main__":
    settings = {
        'cookie_secret': SECRET_KEY,
        'template_path': 'templates',
        'xsrf_cookies': True,
        'login_url': "/login",
        'static_path': os.path.join(os.path.dirname(__file__), 'static/dist'),
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

    log_from_server('info', 'Server starting.')
    IOLoop.instance().start()
