#!/usr/bin/env python
# -*- coding: utf-8 -*-
import re
import time
from collections import deque

from flask import Flask, render_template, session, request, make_response, escape
from flask_socketio import SocketIO, emit, disconnect, send

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = 'eventlet'

# DEBUG = False
DEBUG = True

client_version = 42

app = Flask(__name__)
app.config['SECRET_KEY'] = 'bananaPUDDINGfudgesicleFACE'
socketio = SocketIO(app, async_mode=async_mode)

users = {}

history = deque(maxlen=75)

available_emojis = [u'💩', u'😀', u'😁', u'😂', u'😃', u'😄', u'😅', u'😆', u'😉', u'😊', u'😋', u'😌', u'😍', u'😎',
                    u'😏', u'😐', u'😑', u'😒', u'😓', u'😔', u'😕', u'😖', u'😗', u'😘', u'😙', u'😚', u'😛', u'😜',
                    u'😝', u'😞', u'😟', u'😠', u'😡', u'😢', u'😣', u'😤', u'😥', u'😦', u'😧', u'😨', u'😩', u'😪',
                    u'😫', u'😬', u'😭', u'😮', u'😯', u'😰', u'😱', u'😲', u'😳', u'😴', u'😵', u'😶', u'😷', u'🙁',
                    u'🙂', u'🙃', u'🙄', u'🤖', u'🖳', u'💩', u'🚽', u'🚲', u'🐢', u'🐉', u'🐅', u'🐄', u'🐐', u'🐑',
                    u'🐬', u'🐳', u'💩', u'🖕', u'🖖', u'✌', u'🤘', u'🤙', u'🤚', u'🤛', u'🤜', u'🤝', u'🤞', u'💪',
                    u'🚀', u'🥓', u'🥒', u'🥞', u'🥔', u'🍌', u'🍍', u'🦄', u'🦈', u'💩']


@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode, debug=DEBUG, emoji_list=available_emojis)


@app.route('/validate_username', methods=['POST'])
def validate_username():
    new_name = request.form['set_name'].strip()
    if new_name == '':
        return make_response('false')
    if new_name == request.form['username']:
        return make_response('true')
    return make_response(
        str(new_name not in users.keys()).lower())


@socketio.on('connect_message', namespace='/chat')
def connect_message(message):
    if 'user' in message.keys():
        session['user'] = message['user']
    else:
        emit('chat_response', {'user': 'Server', 'data': 'Connection made but no username found', 'time': time.time()})
        return

    if message['user'] not in users:
        users[message['user']] = {'color': message['color']}
    new_msg = {'user': 'Server', 'data': message['user'] + ' has connected!', 'time': time.time()}
    emit('chat_response', new_msg, broadcast=True)
    emit('user_list', {'data': users.keys()}, broadcast=True)
    if 'version' not in message.keys() or client_version > message['version']:
        emit('chat_response',
             {'user': 'Server', 'data': 'Your client is out of date. Please refresh your page if you ' +
                                        'want to see the new hotness.', 'time': time.time()})


@socketio.on('broadcast_image', namespace='/chat')
def broadcast_image(url):
    try:
        if 'user' in session.keys():
            user = session['user']
            new_msg = {'user': user, 'color': users[user]['color'],
                       'data': "<img src=\"{}\" width=\"100px\" />".format(escape(url)), 'time': time.time()}
            history.append(new_msg)
            emit('chat_response', new_msg, broadcast=True)
    except KeyError:
        emit('session_error', {})


@socketio.on('broadcast_message', namespace='/chat')
def broadcast_message(message):
    try:
        if 'user' in session.keys():
            user = session['user']
            chat_msg = unicode(escape(message['data']))
            r = re.compile(r"(https?://[^ ]+)")
            new_msg = {'user': user, 'data': r.sub(r'<a href="\1">\1</a>', chat_msg), 'time': time.time(),
                       'color': users[user]['color']}
            history.append(new_msg)
            emit('chat_response', new_msg, broadcast=True)
    except KeyError:
        emit('session_error', {})


@socketio.on('disconnect_request', namespace='/chat')
def disconnect_request():
    disconnect(None)


@socketio.on('update_user', namespace='/chat')
def update_user(data):
    try:
        if 'newColor' in data['data'].keys():
            users[data['user']]['color'] = data['data']['newColor']
            emit('update_response', {'user': 'Server', 'data': 'Color updated', 'time': time.time()})

        if 'newUser' in data['data'].keys():
            if data['data']['newUser'] in users.keys():
                emit('update_response',
                     {'user': 'Server', 'data': 'Name taken', 'revertName': data['user'],
                      'time': time.time()})
            else:
                users[data['data']['newUser']] = users[data['user']]
                session['user'] = data['data']['newUser']
                emit('chat_response',
                     {'user': 'Server', 'data': data['user'] + ' is now ' + data['data']['newUser'],
                      'time': time.time()},
                     include_self=False, broadcast=True)
                if data['user'] in users:
                    users.pop(data['user'], None)
                emit('update_response', {'user': 'Server', 'data': 'Name changed', 'time': time.time()})
                emit('user_list', {'data': users.keys()}, broadcast=True)
    except KeyError:
        emit('session_error', {})


@socketio.on('connect', namespace='/chat')
def connect():
    emit('history_response', {'history': sorted(history, cmp=lambda x, y: cmp(x['time'], y['time']))})


@socketio.on('reconnect', namespace='/chat')
def reconnect():
    print('reconnect', request.sid)


@socketio.on('disconnect', namespace='/chat')
def disconnect():
    try:
        new_msg = {'user': 'Server', 'data': session['user'] + ' disconnected!', 'time': time.time()}
        emit('chat_response', new_msg, broadcast=True, include_self=False)
        if session['user'] in users:
            users.pop(session['user'], None)
        session.pop('user', None)
        emit('user_list', {'data': users.keys()}, broadcast=True, include_self=False)
    except KeyError:
        emit('session_error', {})


@socketio.on_error('/chat')  # handles the '/chat' namespace
def error_handler_chat(e):
    print 'well that\s bad'


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=6969, debug=DEBUG)
