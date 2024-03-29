import base64
import re
from hashlib import sha256
from urlparse import urlparse

import bcrypt
import tornado
from requests import get, post
from tornado.escape import linkify, to_unicode, xhtml_escape

from chat.custom_render import executor
from chat.loggers import log_from_server, LogLevel
from emoji.emojipy import Emoji

MAX_DEQUE_LENGTH = 200

emoji = Emoji()

def is_gorilla_groove_url(text):
    parsed_url = urlparse(text)
    return (parsed_url.scheme == 'https') and (parsed_url.hostname == 'gorillagroove.net') and (parsed_url.path.startswith('/track-link'))

def is_image_url(text):
    parsed_url = urlparse(text)
    return bool(parsed_url.scheme) and (len(re.findall(r"\.(jpg|jpeg|gif|png|bmp)", parsed_url.path.lower())) > 0)


def preprocess_message(message, emoji_processor):
    message_text = message

    # first linkify
    message_text = linkify(to_unicode(message_text), extra_params='target="_blank"', require_protocol=False)
    # last find shortcode emojis
    message_text = emoji_processor.shortcode_to_unicode(message_text)
    # then find ascii emojis
    message_text = emoji_processor.ascii_to_unicode(message_text)
    # remove any raw script, audio, or video tags that are left
    if message.find('<script') >= 0 or message.find('<audio') >= 0 or message.find('<video') >= 0 or message.find(
            '<iframe') >= 0 or message.find('<img') >= 0:
        message_text = xhtml_escape(message_text)

    return message_text


def get_matching_participants(participant_list, matcher, match_attr='id'):
    return [x for x in participant_list if x.current_user[match_attr] == matcher]


def upload_to_s3(image_data, image_type, bucket):
    s3_key = 'images/uploads/' + sha256(image_data).hexdigest()
    try:
        exists = list(bucket.objects.filter(Prefix=s3_key))
        log_from_server(LogLevel.info, 'Found object in S3: {}'.format(exists))
        if len(exists) <= 0:
            decoded_image = base64.decodestring(image_data[image_data.find(',')+1:])

            # Do the actual upload to s3
            bucket.put_object(Key=s3_key, Body=decoded_image, ContentEncoding='base64', ContentType=image_type,
                              ACL='public-read')
        return 'https://images.bestevarchat.com/' + s3_key
    except Exception as e:
        log_from_server(LogLevel.error, 'Exception during image upload: ' + str(e))
        log_from_server(LogLevel.debug, 'Image failed to upload to S3 bucket: UPLOAD({}) KEY({})'.format(image_type, s3_key))
        raise e


def retrieve_image_in_s3(image_url, bucket):
    s3_key = 'images/' + sha256(image_url).hexdigest()
    try:
        exists = list(bucket.objects.filter(Prefix=s3_key))
        log_from_server('info', 'Found object in S3: {}'.format(exists))
        if len(exists) <= 0:
            req_for_image = get(image_url, stream=True)
            file_object_from_req = req_for_image.raw
            req_data = file_object_from_req.read()
            if len(req_data) == 0:
                raise Exception('empty data, response code:{}'.format(req_for_image.status_code))

            # Do the actual upload to s3
            bucket.put_object(Key=s3_key, Body=req_data, ACL='public-read')
        return 'https://images.bestevarchat.com/' + s3_key
    except Exception as e:
        log_from_server(LogLevel.error, 'Exception during image transfer: ' + str(e))
        log_from_server(LogLevel.debug, 'Image failed to transfer to S3 bucket: URL({}) KEY({})'.format(image_url, s3_key))
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


def search_emoji(query):
    '''

    :param query:
    :return: all the matching unicode chars
    '''
    return emoji.search(query)

