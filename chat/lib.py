import re
from hashlib import sha256
from urlparse import urlparse

import bcrypt
import tornado
from requests import get, post
from tornado.escape import linkify, to_unicode, xhtml_escape

from chat.custom_render import executor
from chat.loggers import log_from_server
from emoji.emojipy import Emoji

MAX_DEQUE_LENGTH = 75

emoji = Emoji()


def is_image_url(text):
    parsed_url = urlparse(text)
    return (bool(parsed_url.scheme) and (len(re.findall(r"\.(jpg|jpeg|gif|png)", parsed_url.path)) > 0))


def preprocess_message(message, emoji_processor):
    message_text = message
    # remove any raw script, audio, or video tags before continuing
    if message.find('<script>') >= 0 or message.find('<audio') >= 0 or message.find('<video') >= 0 or message.find(
            '<iframe'):
        message_text = xhtml_escape(message)

    # first linkify
    message_text = linkify(to_unicode(message_text), extra_params='target="_blank"', require_protocol=False)
    # last find shortcode emojis
    message_text = emoji_processor.shortcode_to_unicode(message_text)
    # then find ascii emojis
    message_text = emoji_processor.ascii_to_unicode(message_text)

    return message_text


def get_matching_participants(participant_list, matcher, match_attr='id'):
    return [x for x in participant_list if x.current_user[match_attr] == matcher]


def retrieve_image_in_s3(image_url, bucket):
    s3_key = 'images/' + sha256(image_url).hexdigest()
    try:
        exists = filter(lambda x: x.key == s3_key, list(bucket.objects.all()))
        log_from_server('info', 'Found object in S3: {}'.format(exists))
        if len(exists) <= 0:
            req_for_image = get(image_url, stream=True)
            file_object_from_req = req_for_image.raw
            req_data = file_object_from_req.read()
            if len(req_data) == 0:
                raise Exception('empty data, response code:{}'.format(req_for_image.status_code))

            # Do the actual upload to s3
            bucket.put_object(Key=s3_key, Body=req_data, ACL='public-read')
        return 'https://s3-us-west-2.amazonaws.com/best-ever-chat-image-cache/' + s3_key
    except Exception as e:
        log_from_server('debug', e.message)
        log_from_server('debug', 'Image failed to transfer to S3 bucket: URL({}) KEY({})'.format(image_url, s3_key))
        return image_url


def check_password(new_password, hashed_password):
    return bcrypt.checkpw(tornado.escape.utf8(new_password), tornado.escape.utf8(hashed_password))


def hash_password(password):
    return executor.submit(
        bcrypt.hashpw, tornado.escape.utf8(password),
        bcrypt.gensalt())


def create_github_issue(username, token, title, body, issue_type):
    return post('https://api.github.com/repos/lazymeadow/best-ever-chat/issues',
                json={
                    'title': title,
                    'body': body,
                    'labels': [issue_type]
                },
                headers={'Accept': 'application/vnd.github.v3+json'},
                auth=(username, token))
