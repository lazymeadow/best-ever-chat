import logging
import os
from enum import Enum
from logging.handlers import RotatingFileHandler

from tornado.log import LogFormatter

if not os.path.exists('log'):
    # create the log dir
    os.mkdir('log')

    # create all the log files
    with open('log/server.log', 'w+') as f:
        f.close()
    with open('log/client.log', 'w+') as f:
        f.close()
    with open('log/access.log', 'w+') as f:
        f.close()

bec_logger = logging.getLogger('bestevarchat')

bec_logger.propagate = False
bec_logger.setLevel(logging.DEBUG)


class ClientLoggerAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        return '(%s:%s) %s' % (self.extra['parasite_id'], self.extra['session_id'], msg), kwargs


# BEC client logs
client_logger = logging.getLogger('bestevarchat.client')
formatter = logging.Formatter('[%(asctime)s] %(name)s %(levelname)-8s %(message)s', "%Y-%m-%d %H:%M:%S")
file_handler = RotatingFileHandler('log/client.log', maxBytes=(1048576 * 5), backupCount=7)
file_handler.setFormatter(formatter)
client_logger.addHandler(file_handler)
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
client_logger.addHandler(stream_handler)

# BEC server logs
server_logger = logging.getLogger('bestevarchat.server')
file_handler = RotatingFileHandler('log/server.log', maxBytes=(1048576 * 5), backupCount=7)
formatter = logging.Formatter('[%(asctime)s] %(name)s %(levelname)-8s (%(processName)s:%(process)d) %(message)s',
                              "%Y-%m-%d %H:%M:%S")
file_handler.setFormatter(formatter)
server_logger.addHandler(file_handler)
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
server_logger.addHandler(stream_handler)

# Tornado access logs
access_logger = logging.getLogger('tornado.access')
file_handler = RotatingFileHandler('log/access.log', maxBytes=(1048576 * 5), backupCount=7)
formatter = LogFormatter()
file_handler.setFormatter(formatter)
access_logger.addHandler(file_handler)
access_logger.propagate = False

# Boto (AWS) logs
boto_formatter = logging.Formatter('[%(asctime)s] %(name)-32s %(levelname)-8s %(message)s', "%Y-%m-%d %H:%M:%S")
boto_file_handler = RotatingFileHandler('log/boto.log', maxBytes=(1048576 * 5), backupCount=7)
boto_file_handler.setFormatter(boto_formatter)

botocore_logger = logging.getLogger('botocore')
botocore_logger.addHandler(boto_file_handler)
botocore_logger.propagate = False

boto3_logger = logging.getLogger('boto3')
boto3_logger.addHandler(boto_file_handler)
boto3_logger.propagate = False

class LogLevel(Enum):
    debug = 'DEBUG'
    info = 'INFO'
    warning = 'WARNING'
    error = 'ERROR'
    critical = 'CRITICAL'

def log_from_client(level, message, parasite_id, session_id):
    client_logger_adapter = ClientLoggerAdapter(client_logger, {'parasite_id': parasite_id, 'session_id': session_id})
    level = level.upper()  # client sends a string
    if level == LogLevel.debug:
        client_logger_adapter.debug(message)
    elif level == LogLevel.info:
        client_logger_adapter.info(message)
    elif level == LogLevel.warning:
        client_logger_adapter.warning(message)
    elif level == LogLevel.error:
        client_logger_adapter.error(message)
    elif level == LogLevel.critical:
        client_logger_adapter.critical(message)


def log_from_server(level, message):
    if level == LogLevel.debug:
        server_logger.debug(message)
    elif level == LogLevel.info:
        server_logger.info(message)
    elif level == LogLevel.warning:
        server_logger.warning(message)
    elif level == LogLevel.error:
        server_logger.error(message)
    elif level == LogLevel.critical:
        server_logger.critical(message)
