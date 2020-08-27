"""
    Best chat ever now a sockjs-tornado application.
"""
import logging
import os
from configparser import ConfigParser

import tornado.web
import pymysql
from tornado.ioloop import IOLoop

from chat.handlers import ValidateHandler, AuthLoginHandler, AuthCreateHandler, AuthLogoutHandler, \
    AuthPasswordResetHandler, AuthPasswordResetRequestHandler, PageHandler, Chat404Handler, MobileHandler
from chat.loggers import log_from_server, LogLevel
from chat.message_queue import MessageQueue
from chat.new_chat_connection import new_chat_router
from chat.private_messages import PrivateMessageMap
from chat.rooms import RoomList
from chat.users import UserList
from emoji.emoji_curation import curated_emojis

logging.getLogger().setLevel(logging.DEBUG)

config_parser = ConfigParser()
current_dir = os.path.dirname(os.path.realpath(__file__))

config_parser.read(current_dir + '/install/chat.cfg')

config_section = os.environ.get('BEC_ENV') if os.environ.get('BEC_ENV') is not None else 'local'

log_from_server(LogLevel.info, "Loading config: [{}]".format(config_section))

SECRET_KEY = config_parser.get(config_section, 'BEC_SECRET_KEY')
DB_USER = config_parser.get(config_section, 'BEC_DB_USER')
DB_PASSWORD = config_parser.get(config_section, 'BEC_DB_PASSWORD')
DB_HOST = config_parser.get(config_section, 'BEC_DB_HOST')
DB_PORT = config_parser.get(config_section, 'BEC_DB_PORT')
DB_SCHEMA = config_parser.get(config_section, 'BEC_DB_SCHEMA')
GITHUB_USERNAME = config_parser.get(config_section, 'GITHUB_USERNAME')
GITHUB_TOKEN = config_parser.get(config_section, 'GITHUB_TOKEN')
ADMIN_EMAIL = config_parser.get(config_section, 'ADMIN_EMAIL')

http_server = None


class Application(tornado.web.Application):
    def __init__(self, handlers, settings):
        super(Application, self).__init__(handlers, **settings)

        log_from_server(LogLevel.info, 'Initializing DB connection...')
        # Have one global connection to the blog DB across all handlers
        self.db = pymysql.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            user=DB_USER,
            password=DB_PASSWORD,
            db=DB_SCHEMA,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )

        # Save the github auth data for making issues
        self.github_username = GITHUB_USERNAME
        self.github_token = GITHUB_TOKEN

        # Save the server admin email for sending very critical alerts
        self.admin_email = ADMIN_EMAIL

        # user list
        self.user_list = UserList(self.db)

        # room list
        self.room_list = RoomList(self.db, self.user_list)

        # private messages
        self.private_message_map = PrivateMessageMap(self.user_list)

        # message queue
        self.message_queue = MessageQueue(self.db, self.user_list)


if __name__ == "__main__":
    settings = {
        'cookie_secret': SECRET_KEY,
        'template_path': 'templates',
        'xsrf_cookies': False,
        'login_url': "/login",
        'static_path': os.path.join(os.path.dirname(__file__), 'static/dist'),
        'emojis': curated_emojis,
        'default_handler_class': Chat404Handler
    }
    handlers = [
                   (r"/", PageHandler),
                   (r"/m", MobileHandler),
                   (r"/register", AuthCreateHandler),
                   (r"/login", AuthLoginHandler),
                   (r"/logout", AuthLogoutHandler),
                   (r"/forgot_password", AuthPasswordResetRequestHandler),
                   (r"/reset_password", AuthPasswordResetHandler),
                   ('/validate_username', ValidateHandler)
               ] + new_chat_router.urls

    http_server = Application(handlers, settings)

    http_server.listen(6969)

    new_chat_router.get_connection_class().http_server = http_server

    log_from_server(LogLevel.info, 'Complete. Starting server!')
    IOLoop.instance().start()
