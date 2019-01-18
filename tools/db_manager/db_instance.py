from tools.db_manager import db
from tools.db_manager import patch_reader
import functools
import hashlib
import re

_dev_mode = False

def set_config_file(file):
    db.set_config_file(file)

def set_dev_mode(value):
    global _dev_mode
    if value and not db.is_host_local():
        raise Exception(
            'Dev mode is currently only allowed when working with a local '
            'database.')
    _dev_mode = value

def connect_repl():
    db.connect_repl(db_name=_get_db_name(_dev_mode))

def query(text):
    return db.query(text, db_name=_get_db_name(_dev_mode))

def query_to_json(text):
    return db.query_to_json(text, db_name=_get_db_name(_dev_mode))

def query_file(file):
    return db.query_file(file, db_name=_get_db_name(_dev_mode))

def rewind_invalid_patches():
    """Unapplies patches that no longer exist by rewinding the database."""
    if not _db_exists():
        db_name = _get_db_name(_dev_mode)
        copy_from = _get_closest_db_name()
        db.query('CREATE DATABASE {} TEMPLATE {}'.format(db_name, copy_from))

def _get_closest_db_name():
    """Tries to find an existing database to base a new one on.

    Drops patches one at a time, starting with the last, until it finds a
    pre-existing database."""
    skip = 0
    patches = patch_reader.get_patches()
    while skip <= len(patches):
        name = _get_db_name(_dev_mode, skip)
        if _db_exists(name):
            return name
        skip += 1
    raise Exception('Existing database could not be found.')

def get_schema():
    schema = db.call_with_params(
        [
            'pg_dump',
            '--schema-only'
        ],
        db_name=_get_db_name(_dev_mode))
    return _normalize_schema(schema)

def _normalize_schema(schema):
    schema = re.sub(r' +\n', '\n', schema)
    return schema

def get_db_name():
    return _get_db_name(_dev_mode)

@functools.lru_cache(maxsize=128)
def _get_db_name(dev_mode, skip_patches=0):
    if not dev_mode:
        return db.get_db_name()
    hash = _get_db_version_hash(skip_patches)
    if hash == '':
        return db.get_db_name()
    name = db.get_db_name() + '_' + hash
    # PostreSQL truncates database names to 63 characters.
    return name[0:63]

# TOD: Should this also take into account the initial schema used to
# get the database started?
@functools.lru_cache(maxsize=128)
def _get_db_version_hash(skip_patches=0):
    patches = patch_reader.get_patches()
    assert skip_patches <= len(patches)
    if skip_patches == len(patches):
        return ''
    use_patches = patches[0:len(patches) - skip_patches]
    all_patch_content = '\n'.join(p.content for p in use_patches)
    return _compute_hash(all_patch_content)

def _compute_hash(content):
    return hashlib.sha224(content.encode('utf-8')).hexdigest()

def _db_exists(db_name=None):
    if db_name is None:
        db_name = _get_db_name(_dev_mode)
    rows = db.query_to_json(
        'SELECT 1 AS exists FROM pg_database WHERE datname=\'{}\''.format(
            db_name),
        db_name='postgres')
    if rows is None or len(rows) == 0:
        return False
    assert len(rows) == 1
    row = rows[0]
    assert 'exists' in row
    return row['exists'] == 1
