import json

ADMIN_PERM = 'admin'
MOD_PERM = 'mod'
USER_PERM = 'user'

_tool_defs = {
    'grant mod': {
        'perm level': ADMIN_PERM,
        'tool type': 'grant',
        'grant': MOD_PERM,
        'display name': 'Grant moderator',
        'tool text': 'Choose a new moderator',
        'tool description': 'Gives chosen user moderator permissions.',
        'no data': 'Everyone\'s already a moderator.',
        'success alert': {
            'type': 'dismiss',
            'message': 'You are now a moderator. You have access to the moderator tools. For great justice.',
            'dismissText': 'What you say !!'
        },
        'tool confirm': lambda parasite: "{} is now a moderator".format(parasite)
    },
    'revoke mod': {
        'perm level': ADMIN_PERM,
        'tool type': 'grant',
        'grant': USER_PERM,
        'display name': 'Revoke moderator',
        'tool description': 'Removes chosen user\'s moderator permissions, making them a normal parasite again.',
        'tool text': 'Choose a moderator to remove',
        'no data': 'Nobody is a moderator.',
        'success alert': {
            'type': 'dismiss',
            'message': 'You are no longer a moderator.',
            'dismissText': 'Oh no.'
        },
        'tool confirm': lambda parasite: "{} is no longer a moderator".format(parasite)
    },
    'grant admin': {
        'perm level': ADMIN_PERM,
        'tool type': 'grant',
        'grant': ADMIN_PERM,
        'display name': 'Grant administrator',
        'tool description': 'Gives chosen user administrator permissions.',
        'tool text': 'Choose a new admin',
        'no data': 'Everyone\'s already an admin.',
        'success alert': {
            'type': 'dismiss',
            'message': 'You are now an admin. You have access to the admin and moderator tools.',
            'dismissText': 'I accept.'
        },
        'tool confirm': lambda parasite: "{} is now an admin".format(parasite)
    },
    'revoke admin': {
        'perm level': ADMIN_PERM,
        'tool type': 'grant',
        'grant': USER_PERM,
        'display name': 'Revoke administrator',
        'tool description': 'Removes chosen user\'s administrator permissions, making them a normal parasite again.',
        'tool text': 'Choose an admin to remove',
        'no data': 'Nobody is an admin.',
        'success alert': {
            'type': 'dismiss',
            'message': 'You are no longer an admin.',
            'dismissText': 'Oh, fiddlesticks.'
        },
        'tool confirm': lambda parasite: "{} is no longer an admin".format(parasite)
    },
    'empty room log': {
        'perm level': MOD_PERM,
        'tool type': 'room',
        'display name': 'Empty room log',
        'tool description': 'Clears the log for a given room. All connected clients are immediately updated. '
                            'Mods can only use this tool for rooms they are in.',
        'tool text': 'Choose room to empty',
        'no data': 'That\'s weird.',
        'tool confirm': lambda room: "{} log is empty now.".format(room),
    },
    'delete empty room': {
        'perm level': MOD_PERM,
        'tool type': 'room',
        'display name': 'Delete room with no members',
        'tool description': 'Removes a room that no longer has any members. ¡ATTN: This is a hard delete!',
        'tool text': 'Choose room to delete',
        'no data': 'Wow, there aren\'t any rooms!',
        'tool confirm': lambda room: "{} is gone forever!".format(room),
    },
    'set new room owner': {
        'perm level': MOD_PERM,
        'tool type': 'room',
        'display name': 'Set new room owner',
        'tool description': 'Set the owner of a room to a different member of the room (they must be in the room).',
        'no data': 'There aren\'t any rooms you walnut.',
        'tool confirm': lambda parasite, room: "The new owner of {} is {}.".format(parasite, room)
    },
    'deactivate parasite': {
        'perm level': ADMIN_PERM,
        'tool type': 'parasite',
        'display name': 'Deactivate parasite',
        'tool description': 'Set the chosen parasite to inactive. Removes all alerts and invitations, removes them '
                            'from all rooms, resets their display name to their id, and empties their reset token. '
                            'Inactive parasites are blocked from logging in, and must re-request access from an admin.',
        'tool text': 'Go away',
        'no data': 'I guess you\'re the only one here.',
        'tool confirm': lambda parasite: 'Deactivated parasite: {}'.format(parasite),
    },
    'reactivate parasite': {
        'perm level': ADMIN_PERM,
        'tool type': 'parasite',
        'display name': 'Reactivate parasite',
        'tool description': 'Sets a parasite back to active. Restores nothing. They can do that when they log in.',
        'tool text': 'Perform necromancy',
        'no data': 'No candidates for zombification.',
        'tool confirm': lambda parasite: "You've resurrected {}. Now you must live with that choice.".format(parasite),
    },
    'view parasite data': {
        'perm level': ADMIN_PERM,
        'tool type': 'parasite',
        'display name': 'View parasite data',
        'tool description': 'View whatever a user\'s current data looks like.',
        'tool text': 'Plz',
        'no data': 'There is nobody else to view. Get some friends.',
        'tool confirm': lambda data: json.dumps(data, indent=4),
    },
}

_admin_tools = [tool_key for tool_key in _tool_defs if _tool_defs[tool_key]['perm level'] == ADMIN_PERM]
_mod_tools = [tool_key for tool_key in _tool_defs if _tool_defs[tool_key]['perm level'] == MOD_PERM]


def user_perm_has_access(user_perm_level, perm_level):
    if perm_level == ADMIN_PERM:
        return user_perm_level == ADMIN_PERM
    if perm_level == MOD_PERM:
        return user_perm_level in (ADMIN_PERM, MOD_PERM)
    return False

def can_use_tool(permission_level, tool_name):
    if permission_level == ADMIN_PERM:
        return tool_name in (_admin_tools + _mod_tools)
    if permission_level == MOD_PERM:
        return tool_name in _mod_tools
    return False

def get_tool_list(permission_level):
    tool_key_list = []
    if permission_level == ADMIN_PERM:
        tool_key_list = _admin_tools
    elif permission_level == MOD_PERM:
        tool_key_list = _mod_tools
    return [{'key': tool_key, 'name': _tool_defs[tool_key]['display name']} for tool_key in tool_key_list]

def get_tool_data(tool_key):
    tool_def = _tool_defs[tool_key].copy()
    del tool_def['perm level']
    del tool_def['tool confirm']
    if 'success alert' in tool_def:
        del tool_def['success alert']
    return tool_def

def get_tool_def(tool_key):
    tool_def = _tool_defs[tool_key].copy()
    tool_def['tool key'] = tool_key
    return tool_def
