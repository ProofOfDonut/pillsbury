#!/usr/bin/env python3
"""Git workspace utility functions."""

import os
import re

def get_path():
    """Get the path of the workspace the current directory is in."""
    cur = os.getcwd()
    while not os.path.isfile(os.path.join(cur, 'package.json')):
        if cur == '/':
            raise Exception('Could not find workspace directory.')
        cur = os.path.dirname(cur)
    return cur

def resolve(relative):
    """Resolve a path relative to the current workspace.

    The `relative` path may or may not begin with leading slashes '//'."""
    return os.path.join(
        get_path(),
        re.sub(r'^\/{2}', '', relative))

def resolve_no_veil(relative):
    """Removes veil from relative path."""
    resolved = resolve(relative)
    if resolved[0:10] == '/tmp/veil/':
        return resolved[9:]
    return resolved

def ensure_veil():
    """Ensures the relative path is veiled."""
    if os.getcwd()[0:10] != '/tmp/veil/':
        raise Exception(
            'This script is intended to be run as part of a veil build.')

def _main():
    print(get_path())

if __name__ == '__main__':
    _main()
