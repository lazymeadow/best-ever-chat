import bcrypt as bcrypt
import tornado.web
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
                "INSERT INTO parasite (id, password, username) "
                "VALUES (%s, %s, %s)",
                self.get_argument("parasite"), hashed_password, self.get_argument("parasite"))
            self.set_secure_cookie("parasite", str(parasite_id), expires_days=182)
            self.redirect(self.get_argument("next", "/"))
        else:
            self.render2("create_user.html", error="incorrect password")


class AuthLoginHandler(BaseHandler):
    def get(self):
        self.render2("login.html", error=None)

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
