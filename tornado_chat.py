"""
    Best chat ever now a sockjs-tornado application.
"""
import os
import random
import string
# from subprocess import Popen

import tornado.web
import torndb

from chat.chat_core import chat_router
from chat.handlers import ValidateHandler, AuthLoginHandler, AuthCreateHandler, AuthLogoutHandler, \
    AuthPasswordResetHandler, AuthPasswordResetRequestHandler, PageHandler
from emoji.emoji_curation import curated_emojis

SECRET_KEY = ''.join(
    random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(32))

http_server = None

# less_process = Popen(['lessc', 'static/less/chat.less', 'static/dist/chat.css'])
# (result, err) = less_process.communicate()
# if err: print err


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


if __name__ == "__main__":
    import logging

    logging.getLogger().setLevel(logging.DEBUG)

    settings = {
        'cookie_secret': SECRET_KEY,
        'template_path': 'templates',
        'xsrf_cookies': True,
        'login_url': "/login",
        'static_path': os.path.join(os.path.dirname(__file__), 'static'),
        'emojis': curated_emojis
    }
    handlers = [
                   (r"/", PageHandler),
                   (r"/register", AuthCreateHandler),
                   (r"/login", AuthLoginHandler),
                   (r"/logout", AuthLogoutHandler),
                   (r"/forgot_password", AuthPasswordResetRequestHandler),
                   (r"/reset_password", AuthPasswordResetHandler),
                   (r'/static/(.*)', {'path': settings['static_path']}),
                   ('/validate_username', ValidateHandler)
               ] + chat_router.urls

    http_server = Application(handlers, settings)
    http_server.listen(6969, no_keep_alive=True)

    chat_router.get_connection_class().http_server = http_server

    tornado.ioloop.IOLoop.instance().start()
