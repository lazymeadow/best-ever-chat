from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from smtplib import SMTP

from chat.loggers import log_from_server


def send_reset_email(email_address, user, token):
    reset_link = 'https://bestevarchat.com/reset_password?token=' + token

    send_email(email_address, subject='Maybe you got amnesia?', title='Password reqest requested',
               text_content='Well, someone has requested as password reset for {}.\n\n'
                            'You\'d better hurry, this link below will only be good for 24 hours. \n\n'
                            '{}\n\n\n'
                            'If you did not request a password reset, you should probably change your password.'.format(
                   user, reset_link),
               html_content='<p>Well, someone has requested as password reset for {}.</p>'
                            '<p><a href="{}">You\'d better hurry, this link\'ll only be good for 24 hours.</a></p>'
                            '<p>If you did not request a password reset, you should probably change your password.</p>'.format(
                   user, reset_link),
               image='cat_laptop')


def send_password_changed_email(email_address, user):
    send_email(email_address, subject='Your password has been changed!', title='Password changed',
               text_content='Your password for {} was changed. If you did not do this, let the admin know!\n\n'.format(
                   user),
               html_content='<p>Your password for {} was changed.</p><p>If you did not do this, let the admin know!</p>'.format(
                   user),
               image='cat_rascal')


def send_email(email_address, subject, title, text_content, html_content, image=None):
    sender = 'server@bestevarchat.com'
    recipient = email_address

    msgRoot = MIMEMultipart('related')
    msgRoot['Subject'] = '[Best Evar Chat] {}'.format(subject)
    msgRoot['From'] = sender
    msgRoot['To'] = recipient

    msg = MIMEMultipart('alternative')
    msgRoot.attach(msg)

    text_part = MIMEText('{}\n\n\n'
                         '-- The Best Evar Chat Server <3'.format(text_content), 'plain')
    msg.attach(text_part)

    if image is not None:
        with open('./static/dist/iconka_cat_power/{}.png'.format(image), 'rb') as image_file:
            img = MIMEImage(image_file.read())
            img.add_header('Content-ID', '<{}>'.format(image))
            msgRoot.attach(img)
    with open('./static/dist/emojione/assets/2665.png', 'rb') as heart_image:
        img = MIMEImage(heart_image.read())
        img.add_header('Content-ID', '<heart>')
        msgRoot.attach(img)

    html_part = MIMEText('<div style="text-align: center">'
                         '<h1>{}</h1>'
                         '<img src="cid:{}">'
                         '{}'
                         '<div>'
                         '<h2>The Best Evar Chat Server <img src="cid:heart" style="width: 18px"></h2>'
                         '</div>'
                         '</div>'.format(title, image, html_content), 'html')
    msg.attach(html_part)

    try:
        s = SMTP('localhost')
        s.sendmail(sender, recipient, msgRoot.as_string())
        s.quit()
    except Exception as e:
        log_from_server('error', 'Failed to send email:' + msg.as_string())

def send_admin_email(admin_email, message):
    log_from_server('critical', message)
    send_email(admin_email, 'CRITICAL ERROR', 'Critical error logged in Best Evar Chat',
               message, message)
