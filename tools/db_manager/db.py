"""Provides access to a database for Python scripts.

This is intended for lightweight use -- one-time use scripts, jobs that run
infrequently, etc."""

import functools
import json
import os
import re
import subprocess

_HOME_DIR = os.path.expanduser('~')

_config_info_paths = []

def set_config_files(files):
    global _config_info_paths
    _config_info_paths = files

def connect_repl(db_name=None):
    env, params = _get_subprocess_params(db_name=db_name)
    subprocess.check_call(
        ['psql'] + params,
        env=env)

def query(text, db_name=None):
    """Send a SQL query to the database and get the response as text."""
    return call_with_params(
        [
            'psql',
            '-At',
            '-c', text
        ],
        db_name=db_name)

def query_to_json(text, db_name=None):
    """Send a SQL query to the database and get the response as JSON."""
    query_return = query(
        'SELECT array_to_json(array_agg(t)) FROM ({}) t;'.format(text),
        db_name)
    if query_return.strip() == '':
        return None
    return json.loads(query_return)

def query_file(file, db_name=None):
    """Send a file as a SQL query to the database and get the response text."""
    return call_with_params(
        [
            'psql',
            '-At',
            '-v', 'ON_ERROR_STOP=1',
            '--single-transaction',
            '-f', file
        ],
        db_name=db_name)

def get_db_name():
    """Get the database name."""
    config, _env = _get_db_config()
    return config['database']

def get_db_user():
    """Get the database name."""
    config, _env = _get_db_config()
    return config['username']

def is_host_local():
    config, _env = _get_db_config()
    return config['host'] == '127.0.0.1' or config['host'] == 'localhost'

def call_with_params(before_params, after_params=[], db_name=None):
    """Execute a PostgreSQL command in a subprocess."""
    env, params = _get_subprocess_params(db_name=db_name)
    return subprocess.check_output(
        before_params
        + params
        + after_params,
        env=env).decode('utf8')

def _get_subprocess_params(db_name=None):
    config, env = _get_db_config()
    return env, [
        '-h', config['host'],
        '-p', str(config['port']),
        '-U', config['username'],
        '-d', db_name if db_name is not None else config['database']
    ]

@functools.lru_cache(maxsize=1)
def _get_db_config():
    config = _get_db_config_object()
    env = os.environ.copy()
    env['PGPASSWORD'] = config['password']
    return config, env

def _get_db_config_object():
    if len(_config_info_paths) == 0:
        raise Exception('Config file location has not been configured.')
    obj = dict()
    for file in _config_info_paths:
        with open(file) as info:
            obj.update(json.load(info))
    return obj
