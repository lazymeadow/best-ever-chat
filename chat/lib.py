import base64
import re
from hashlib import sha256
from urllib.parse import urlparse

import bcrypt
import tornado
from requests import get, post
from tornado.escape import linkify, to_unicode, xhtml_escape

from chat.custom_render import executor
from chat.loggers import log_from_server, LogLevel
from emoji.emojipy import Emoji

MAX_DEQUE_LENGTH = 200

emoji = Emoji()

def _verify_db_conn(db):
    if not db.open:
        db.ping()


def db_select(db, query, *query_params):
    _verify_db_conn(db)
    with db.cursor() as cursor:
        cursor.execute(query, query_params)
        # fetchall will return a TUPLE if there's no matching rows, what on earth
        result = cursor.fetchall()
        return result if type(result) != tuple else []

def db_select_one(db, query, *query_params):
    _verify_db_conn(db)
    with db.cursor() as cursor:
        cursor.execute(query, query_params)
        return cursor.fetchone()

def db_upsert(db, query, *query_params):
    _verify_db_conn(db)
    with db.cursor() as cursor:
        cursor.execute(query, query_params)
        entity_id = cursor.lastrowid
        db.commit()
        return entity_id

def db_delete(db, query, *query_params):
    _verify_db_conn(db)
    db.cursor().execute(query, query_params)
    db.commit()



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
    s3_key = 'images/uploads/' + sha256(image_data.encode('utf-8')).hexdigest()
    try:
        exists = list(bucket.objects.filter(Prefix=s3_key))
        log_from_server(LogLevel.info, 'Found object in S3: {}'.format(exists))
        if len(exists) <= 0:
            decoded_image = base64.b64decode(image_data[image_data.find(',')+1:])

            # Do the actual upload to s3
            executor.submit(bucket.put_object(Key=s3_key, Body=decoded_image, ContentEncoding='base64', ContentType=image_type,
                              ACL='public-read'))
        return 'https://s3-us-west-2.amazonaws.com/best-ever-chat-image-cache/' + s3_key
    except Exception as e:
        log_from_server(LogLevel.error, 'Exception during image upload: ' + str(e))
        log_from_server(LogLevel.debug, 'Image failed to upload to S3 bucket: UPLOAD({}) KEY({})'.format(image_type, s3_key))
        raise e


def retrieve_image_in_s3(image_url, bucket):
    s3_key = 'images/' + sha256(image_url.encode('utf-8')).hexdigest()
    try:
        exists = list(bucket.objects.filter(Prefix=s3_key))
        log_from_server('info', 'Found object in S3: {}'.format(exists))
        if len(exists) <= 0:
            future_for_image = executor.submit(get, image_url, stream=True)
            req_for_image = future_for_image.result(60)
            file_object_from_req = req_for_image.raw
            req_data = file_object_from_req.read()
            if len(req_data) == 0:
                raise Exception('empty data, response code:{}'.format(req_for_image.status_code))

            # Do the actual upload to s3
            executor.submit(bucket.put_object(Key=s3_key, Body=req_data, ACL='public-read'))
        return 'https://s3-us-west-2.amazonaws.com/best-ever-chat-image-cache/' + s3_key
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
