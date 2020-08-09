_admin_tools = ['grant mod', 'revoke mod']
_mod_tools = []

_admin_perm = 'admin'
_mod_perm = 'mod'


def can_use_tool(permission_level, tool_name):
    if permission_level == _admin_perm:
        return tool_name in (_admin_tools + _mod_tools)
    if permission_level == _mod_perm:
        return tool_name in _mod_tools
    return False
