#!/usr/bin/env python
import json
import re
import time
from collections import deque

from flask import Flask, render_template, session, request, make_response, escape
from flask_socketio import SocketIO, emit, disconnect

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = "eventlet"

# DEBUG = False
DEBUG = True

app = Flask(__name__)
app.config['SECRET_KEY'] = 'bananaPUDDINGfudgesicleFACE'
socketio = SocketIO(app, async_mode=async_mode)
thread = None

users = {}

history = deque(maxlen=100)


@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode, debug=DEBUG)
    # return "chat is down today. it's broken as fuck."


@app.route('/validate_username', methods=['POST'])
def validate_username():
    if request.form['set_name'] == request.form['username']:
        return make_response('true')
    return make_response(
        str(request.form['set_name'] not in users.keys()).lower())


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


@socketio.on('broadcast_image', namespace='/chat')
def broadcast_image(url):
    user = None
    if 'user' in session.keys():
        user = session['user']
    new_msg = {'user': user, 'data': "<img src=\"{}\" width=\"100px\" />".format(url), 'time': time.time()}
    history.append(new_msg)
    emit('chat_response', new_msg, broadcast=True)


@socketio.on('broadcast_message', namespace='/chat')
def broadcast_message(message):
    chat_msg = escape(unicode(message['data']))
    r = re.compile(r"(https?://[^ ]+)")
    new_msg = {'user': message['user'], 'data': r.sub(r'<a href="\1">\1</a>', chat_msg), 'time': time.time(),
               'color': users[message['user']]['color']}
    history.append(new_msg)
    emit('chat_response', new_msg, broadcast=True)


@socketio.on('disconnect_request', namespace='/chat')
def disconnect_request():
    disconnect(None)


@socketio.on('update_user', namespace='/chat')
def update_user(data):
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
            users.pop(data['user'], None)
            emit('update_response', {'user': 'Server', 'data': 'Name changed', 'time': time.time()})
            emit('user_list', {'data': users.keys()}, broadcast=True)


@socketio.on('connect', namespace='/chat')
def connect():
    emit('history_response', {'history': sorted(history, cmp=lambda x, y: cmp(x['time'], y['time']))})


@socketio.on('reconnect', namespace='/chat')
def reconnect():
    print('reconnect', request.sid)


@socketio.on('disconnect', namespace='/chat')
def disconnect():
    new_msg = {'user': 'Server', 'data': session['user'] + ' disconnected!', 'time': time.time()}
    emit('chat_response', new_msg, broadcast=True, include_self=False)
    users.pop(session['user'], None)
    emit('user_list', {'data': users.keys()}, broadcast=True, include_self=False)
    session.pop('user', None)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=6969, debug=DEBUG)
