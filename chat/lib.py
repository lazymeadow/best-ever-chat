import logging
# from _sha256 import sha256
import re
from hashlib import sha256
from urlparse import urlparse

from requests import get
from tornado.escape import linkify, to_unicode, xhtml_escape

from emoji.emojipy import Emoji

MAX_DEQUE_LENGTH = 75

client_log = logging.getLogger('bestevarchat.client')
client_log.setLevel(logging.DEBUG)
file_handler = logging.FileHandler('log/client.log')
formatter = logging.Formatter('%(asctime)s %(levelname)-8s %(message)s')
file_handler.setFormatter(formatter)
client_log.addHandler(file_handler)

emoji = Emoji()


def log_from_client(level, message, parasite_id, session_id):
    level = level.upper()
    log_message = '({}:{}) {}'.format(parasite_id, session_id, message)
    if level == 'DEBUG':
        client_log.debug(log_message)
    elif level == 'INFO':
        client_log.info(log_message)
    elif level == 'WARNING':
        client_log.warning(log_message)
    elif level == 'ERROR':
        client_log.error(log_message)
    elif level == 'CRITICAL':
        client_log.critical(log_message)


def is_image_url(text):
    parsed_url = urlparse(text)
    return (bool(parsed_url.scheme) and (len(re.findall(r"\.(jpg|jpeg|gif|png)", parsed_url.path)) > 0))


def preprocess_message(message, emoji_processor):
    # remove any raw script tags before continuing
    message_text = message.replace('<script>', xhtml_escape('<script>')).replace('</script>', xhtml_escape('</script>'))

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
        logging.info('Found object in S3: {}'.format(exists))
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
        logging.info(e.message)
        logging.info('Image failed to transfer to S3 bucket: URL({}) KEY({})'.format(image_url, s3_key))
        return image_url
