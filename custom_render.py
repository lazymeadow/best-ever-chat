from email.mime.text import MIMEText
from smtplib import SMTP

import bcrypt as bcrypt
import tornado.web
from itsdangerous import URLSafeTimedSerializer
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from tornado import gen, concurrent

executor = concurrent.futures.ThreadPoolExecutor(2)


class TemplateRendering:
    """
    A simple class to hold methods for rendering templates.
    """

    def render_template(self, template_name, **kwargs):
        template_dirs = []
        if self.settings.get('template_path', ''):
            template_dirs.append(
                self.settings["template_path"]
            )

        env = Environment(loader=FileSystemLoader(template_dirs))

        try:
            template = env.get_template(template_name)
        except TemplateNotFound:
            raise TemplateNotFound(template_name)
        content = template.render(kwargs)
        return content


class BaseHandler(tornado.web.RequestHandler, TemplateRendering):
    @property
    def db(self):
        return self.application.db

    def get_current_user(self):
        user_id = self.get_secure_cookie("parasite")
        if not user_id: return None
        return self.db.get("SELECT * FROM parasite WHERE id = %s", str(user_id))

    def check_unique_user(self, user_id):
        return self.db.get("SELECT id FROM parasite LIMIT 1") is None

    """
    RequestHandler already has a `render()` method. I'm writing another
    method `render2()` and keeping the API almost same.
    """

    def render2(self, template_name, **kwargs):
        """
        This is for making some extra context variables available to
        the template
        """
        kwargs.update({
            'settings': self.settings,
            'STATIC_URL': self.settings.get('static_url_prefix', '/static/'),
            'request': self.request,
            'xsrf_token': self.xsrf_token,
            'xsrf_form_html': self.xsrf_form_html
        })
        content = self.render_template(template_name, **kwargs)
        self.write(content)


class AuthCreateHandler(BaseHandler):
    def get(self):
        self.render2("create_user.html", error=None)

    @gen.coroutine
    def post(self):
        if not self.check_unique_user(self.get_argument("parasite")):
            self.render2("create_user.html")
        if self.get_argument("password") == self.get_argument("password2"):
            hashed_password = yield executor.submit(
                bcrypt.hashpw, tornado.escape.utf8(self.get_argument("password")),
                bcrypt.gensalt())
            parasite_id = self.db.execute(
                "INSERT INTO parasite (id, email, password, username) "
                "VALUES (%s, %s, %s, %s)",
                self.get_argument("parasite"), self.get_argument("email"), hashed_password,
                self.get_argument("parasite"))
            self.set_secure_cookie("parasite", str(parasite_id), expires_days=182)
            self.redirect(self.get_argument("next", "/"))
        else:
            self.render2("create_user.html", error="incorrect password")


class AuthLoginHandler(BaseHandler):
    def get(self):
        self.render2("login.html", error=self.get_argument("error", default=None))

    @gen.coroutine
    def post(self):
        parasite = self.db.get("SELECT * FROM parasite WHERE id = %s", self.get_argument("parasite"))
        if not parasite:
            self.render2("login.html", error="user not found")
            return
        hashed_password = yield executor.submit(
            bcrypt.hashpw, tornado.escape.utf8(self.get_argument("password")),
            tornado.escape.utf8(parasite.password))
        if hashed_password == parasite.password:
            self.set_secure_cookie("parasite", str(parasite.id))
            self.redirect(self.get_argument("next", "/"))
        else:
            self.render2("login.html", error="incorrect password")


class AuthLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("parasite")
        self.clear_cookie("username")
        self.clear_cookie("color")
        self.clear_cookie("sounds")
        self.clear_cookie("soundSet")
        self.redirect(self.get_argument("next", "/"))


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
                self.redirect("login?error=Invalid reset link.")
        except:
            self.redirect("login?error=Invalid reset link.")

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
                self.redirect("login?error=Password reset. Please login.")
            else:
                self.redirect("login?error=Password reset failed.")
        except:
            self.redirect("login?error=Password reset failed.")


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

            link = 'http://bestevarchat.com/reset_password?token=' + string
            # Create a text/plain message
            msg = 'Well, someone has requested as password reset for {}.\n\n'
                           'If it wasn\'t you, then please, let me know. '
                           'Otherwise, here\'s a link for you...'
                           'You\'d better hurry, it\'ll only be good for 24 hours. \n\n'
                           '{}'.format(parasite, link)

            # me == the sender's email address
            me = 'server@bestevarchat.com'
            # you == the recipient's email address
            you = parasite_email

            msg['Subject'] = '[Best Evar Chat] You appear to have forgotten your password'
            msg['From'] = me
            msg['To'] = you

            # Send the message via our own SMTP server, but don't include the
            # envelope header.

            s = SMTP('localhost')
            s.sendmail(me, [you], msg.as_string())
            s.quit()

        self.redirect(
            "login?error=A password reset email has been sent for {}. Check your spam folder!".format(parasite))
