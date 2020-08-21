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
        'tool text': 'Choose an admin to remove',
        'no data': 'Nobody is an admin.',
        'success alert': {
            'type': 'dismiss',
            'message': 'You are no longer an admin.',
            'dismissText': 'Oh, fiddlesticks.'
        },
        'tool confirm': lambda parasite: "{} is no longer an admin".format(parasite)
    }
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


def get_tool_data(tool_key, parasite):
    tool_def = _tool_defs[tool_key].copy()
    tool_def['tool confirm'] = tool_def['tool confirm'](parasite)
    return tool_def
