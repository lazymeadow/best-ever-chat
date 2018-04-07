import json
from email.mime.text import MIMEText
from random import randint
from smtplib import SMTP

import bcrypt
import tornado
from itsdangerous import URLSafeTimedSerializer
from tornado import escape, gen

from chat.custom_render import BaseHandler, executor


class PageHandler(BaseHandler):
    """Regular HTTP handler to serve the chatroom page"""

    @tornado.web.authenticated
    def get(self):
        self.set_cookie('username', self.current_user.username.replace(' ', '%20') or '')
        self.set_cookie('color', self.current_user.color or '')
        self.set_cookie('sounds', str(self.current_user.sound) or '100')
        self.set_cookie('sound_set', self.current_user.soundSet or 'AIM')
        self.set_cookie('email', self.current_user.email or '')
        self.set_cookie('faction', self.current_user.faction or 'rebel')
        self.set_cookie('id', self.current_user.id)
        self.render2('index.html', emoji_list=self.settings['emojis'])


class ValidateHandler(BaseHandler):
    @tornado.web.authenticated
    def post(self):
        new_name = self.get_argument('set_name', default=None, strip=True)
        if new_name is None or new_name == '':
            self.write(json.dumps(False))
            return
        if new_name == self.get_argument('username', default=None, strip=True) or new_name == self.get_argument('id',
                                                                                                                default=None,
                                                                                                                strip=True):
            self.write(json.dumps(True))
            return
        self.write(json.dumps(self.user_list.is_valid_username(new_name)))


class AuthCreateHandler(BaseHandler):
    def get(self):
        self.render2("create_user.html", error=None)

    @gen.coroutine
    def post(self):
        parasite = self.get_argument("parasite")

        if self.user_list.is_existing_user(parasite):
            self.render2("create_user.html", error="This name is taken.")
            return
        if self.get_argument("password") == self.get_argument("password2"):
            hashed_password = yield executor.submit(
                bcrypt.hashpw, escape.utf8(self.get_argument("password")),
                bcrypt.gensalt())
            username = parasite if self.user_list.is_valid_username(parasite) else '{}_{}'.format(parasite,
                                                                                                  randint(1000, 9999))
            self.db.execute(
                "INSERT INTO parasite (id, email, password, username) VALUES (%s, %s, %s, %s)",
                parasite, self.get_argument("email"), hashed_password, username)
            self.user_list.load_user(parasite)
            self.set_secure_cookie("parasite", parasite, expires_days=182)
            self.render2("login.html", username=parasite, location='login')
        else:
            self.render2("create_user.html", username=parasite, email=self.get_argument("email"),
                         error="Incorrect password.")


class AuthLoginHandler(BaseHandler):
    def get(self):
        self.render2("login.html", error=self.get_argument("error", default=None))

    @gen.coroutine
    def post(self):
        parasite = self.db.get("SELECT * FROM parasite WHERE id = %s", self.get_argument("parasite"))
        if not parasite:
            self.render2("login.html", error="Incorrect username or password.")
            return
        hashed_password = yield executor.submit(
            bcrypt.hashpw, tornado.escape.utf8(self.get_argument("password")),
            tornado.escape.utf8(parasite.password))
        if hashed_password == parasite.password:
            self.set_secure_cookie("parasite", str(parasite.id))
            self.redirect(self.get_argument("next", "/"))
        else:
            self.render2("login.html", error="Incorrect username or password.")


class AuthLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("parasite")
        self.clear_cookie("username")
        self.clear_cookie("color")
        self.clear_cookie("sounds")
        self.clear_cookie("soundSet")
        self.redirect("login")


class AuthPasswordResetHandler(BaseHandler):
    def get(self):
        token = self.get_argument("token")
        try:
            from tornado_chat import SECRET_KEY
            serializer = URLSafeTimedSerializer(SECRET_KEY)
            parasite = serializer.loads(token, max_age=86400)  # do i really have to do 24hrs in secs?
            parasiteId = self.db.get("SELECT id, reset_token FROM parasite WHERE id = %s", parasite)
            if parasiteId is not None and parasiteId.reset_token == token:
                self.render2("reset_password.html", error=None, token=token)
            else:
                self.render2("login.html", error="Invalid reset link.", location="login")
        except:
            self.render2("login.html", error="Invalid reset link.", location="login")

    @gen.coroutine
    def post(self):
        token = self.get_argument("token")
        try:
            from tornado_chat import SECRET_KEY
            serializer = URLSafeTimedSerializer(SECRET_KEY)
            parasite = serializer.loads(token, max_age=86400)  # do i really have to do 24hrs in secs?
            parasiteId = self.db.get("SELECT id, reset_token FROM parasite WHERE id = %s", parasite)
            if parasiteId is not None and self.get_argument("password") == self.get_argument(
                    "password2") and parasiteId.reset_token == token:
                hashed_password = yield executor.submit(
                    bcrypt.hashpw, tornado.escape.utf8(self.get_argument("password")),
                    bcrypt.gensalt())
                self.db.execute("UPDATE parasite SET password = %s, reset_token='' WHERE id = %s", hashed_password,
                                parasite)
                self.render2("login.html", message="Password reset successful. Please login.", location="login")
            else:
                self.render2("login.html", error="Password reset failed.", location="login")
        except:
            self.render2("login.html", error="Password reset failed.", location="login")


class AuthPasswordResetRequestHandler(BaseHandler):
    def get(self):
        self.render2("forgot_password.html", error=None)

    def post(self):
        parasite = self.get_argument("parasite")
        parasite_email = self.db.get("SELECT email FROM parasite WHERE id = %s", parasite)
        if parasite_email is not None:
            # Generate a link
            from tornado_chat import SECRET_KEY
            serializer = URLSafeTimedSerializer(SECRET_KEY)
            string = serializer.dumps(parasite)
            self.db.execute("UPDATE parasite SET reset_token = %s WHERE id = %s", string, parasite)

            send_email(parasite_email.email, parasite, string)

        self.render2("login.html", location='login',
                     message="A password reset email has been sent for {}. Check your spam folder!".format(parasite))


class Chat404Handler(BaseHandler):
    def prepare(self):
        self.set_status(404)
        self.render2("404.html")

    def get(self):
        pass

    def post(self):
        pass


def send_email(email, user, token):
    link = 'https://bestevarchat.com/reset_password?token=' + token
    # Create a text/plain message
    msg = MIMEText('Well, someone has requested as password reset for {}.\n\n'
                   'If it wasn\'t you, then please, let me know. '
                   'Otherwise, here\'s a link for you...'
                   'You\'d better hurry, it\'ll only be good for 24 hours. \n\n'
                   '{}'.format(user, link))

    # me == the sender's email address
    me = 'server@bestevarchat.com'
    # you == the recipient's email address
    you = email

    msg['Subject'] = '[Best Evar Chat] Maybe you got amnesia?'
    msg['From'] = me
    msg['To'] = you

    # Send the message via our own SMTP server, but don't include the
    # envelope header.
    s = SMTP('localhost')
    s.sendmail(me, you, msg.as_string())
    s.quit()
