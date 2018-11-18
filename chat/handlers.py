import json
from random import randint

import tornado
from itsdangerous import URLSafeTimedSerializer
from tornado import escape, gen
from tornado.escape import url_escape

from chat.custom_render import BaseHandler
from chat.emails import send_reset_email
from chat.lib import hash_password, check_password


class PageHandler(BaseHandler):
    """Regular HTTP handler to serve the chatroom page"""

    @tornado.web.authenticated
    def get(self):
        # NOTE: This will only work if the http/proxy server is attaching the query param on mobile user agent detection.
        mobile = self.get_query_argument('mobile', False)
        if mobile is not False:
            self.redirect(self.get_argument("next", "/m"))
            return
        self.set_cookie('username', url_escape(self.current_user['username'], plus=False) or '')
        self.set_cookie('color', self.current_user['color'] or '')
        self.set_cookie('volume', str(self.current_user['volume']) or '100')
        self.set_cookie('soundSet', self.current_user['soundSet'] or 'AIM')
        self.set_cookie('email', self.current_user['email'] or '')
        self.set_cookie('faction', self.current_user['faction'] or 'rebel')
        self.set_cookie('id', self.current_user['id'])
        self.render2('index.html', emoji_list=self.settings['emojis'])


class MobileHandler(BaseHandler):
    """Regular HTTP handler to serve the chatroom page"""

    @tornado.web.authenticated
    def get(self):
        self.set_cookie('volume', str(self.current_user['volume']) or '100')
        self.set_cookie('soundSet', self.current_user['soundSet'] or 'AIM')
        self.set_cookie('id', self.current_user['id'])
        self.render2('mobile.html', emoji_list=self.settings['emojis'])


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
            self.render2("create_user.html", error="Invalid username.")
            return
        if self.get_argument("password") == self.get_argument("password2"):
            hashed_password = yield hash_password(escape.utf8(self.get_argument("password")))
            username = parasite if self.user_list.is_valid_username(parasite) else '{}_{}'.format(parasite,
                                                                                                  randint(1000, 9999))
            self.db.execute(
                "INSERT INTO parasite (id, email, password, username) VALUES (%s, %s, %s, _utf8mb4%s)",
                parasite, self.get_argument("email"), hashed_password, username)
            self.user_list.load_user(parasite)
            self.room_list.add_user_to_member_list(0, parasite)
            self.render2("login.html", username=parasite, location='login')
        else:
            self.render2("create_user.html", username=parasite, email=self.get_argument("email"),
                         error="Password entries must match.")


class AuthLoginHandler(BaseHandler):
    def get(self):
        if self.get_secure_cookie("parasite"):
            self.redirect(self.get_argument("next", "/"))
        self.render2("login.html", error=self.get_argument("error", default=None))

    @gen.coroutine
    def post(self):
        parasite = self.user_list.get_user(self.get_argument('parasite'))
        try:
            if check_password(self.get_argument('password'), parasite['password']):
                self.set_secure_cookie("parasite", str(parasite['id']), expires_days=90)
                self.redirect(self.get_argument("next", "/"))
            else:
                self.render2("login.html", error="Incorrect username or password.")
        except:
            self.render2("login.html", error="Incorrect username or password.")


class AuthLogoutHandler(BaseHandler):
    def get(self):
        self.clear_all_cookies()
        self.redirect("login")


class AuthPasswordResetHandler(BaseHandler):
    def get(self):
        token = self.get_argument("token")
        try:
            from tornado_chat import SECRET_KEY
            serializer = URLSafeTimedSerializer(SECRET_KEY)
            parasite = serializer.loads(token, max_age=86400)
            parasite_record = self.db.get("SELECT reset_token FROM parasite WHERE id = %s", parasite)
            if parasite_record is not None and parasite_record.reset_token == token:
                self.render2("reset_password.html", error=None, token=token)
            else:
                self.render2("login.html", error="Invalid reset link.", location="login")
        except Exception as e:
            self.render2("login.html", error="Invalid reset link.", location="login")

    @gen.coroutine
    def post(self):
        token = self.get_argument("token")
        try:
            from tornado_chat import SECRET_KEY
            serializer = URLSafeTimedSerializer(SECRET_KEY)
            parasite = serializer.loads(token, max_age=86400)
            parasite_record = self.db.get("SELECT reset_token FROM parasite WHERE id = %s", parasite)
            if parasite_record is not None and self.get_argument("password") == self.get_argument(
                    "password2") and parasite_record.reset_token == token and self.user_list.update_user_password(
                parasite, self.get_argument("password"), check_match=False):
                self.render2("login.html", message="Password reset successful.", location="login")
            else:
                self.render2("login.html", error="Password reset failed.", location="login")
        except:
            self.render2("login.html", error="Password reset failed.", location="login")


class AuthPasswordResetRequestHandler(BaseHandler):
    def get(self):
        self.render2("forgot_password.html", error=None)

    def post(self):
        parasite = self.get_argument("parasite")
        if self.user_list.is_existing_user(parasite):
            user = self.user_list.get_user(parasite)
            # Generate a link
            from tornado_chat import SECRET_KEY
            serializer = URLSafeTimedSerializer(SECRET_KEY)
            string = serializer.dumps(parasite)
            self.db.execute("UPDATE parasite SET reset_token = %s WHERE id = %s", string, parasite)

            send_reset_email(user['email'], parasite, string)

        self.render2("login.html", location='login',
                     message="A password reset email has been sent for {}. Check your spam folder!".format(parasite),
                     username=parasite)


class Chat404Handler(BaseHandler):
    def prepare(self):
        self.set_status(404)
        self.render2("404.html")

    def get(self):
        pass

    def post(self):
        pass
