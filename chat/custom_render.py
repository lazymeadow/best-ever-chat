import tornado.web
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from tornado import concurrent

executor = concurrent.futures.ThreadPoolExecutor(2)


class BaseHandler(tornado.web.RequestHandler):
    @property
    def db(self):
        return self.application.db

    @property
    def user_list(self):
        return self.application.user_list

    @property
    def room_list(self):
        return self.application.room_list

    def get_current_user(self):
        user_id = self.get_secure_cookie("parasite")
        if not user_id: return None
        return self.user_list.get_user(user_id.decode("utf-8"))

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
