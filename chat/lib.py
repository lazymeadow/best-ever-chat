import logging
from hashlib import sha256

from requests import get
from tornado.escape import linkify, to_unicode


def preprocess_message(message, emoji_processor):
    # first linkify
    message_text = linkify(to_unicode(message), extra_params='target="_blank"', require_protocol=False)
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
