import collections
from enum import Enum
import functools
import hashlib
import os
import re
from tools.db_manager import db_instance
from tools.db_manager import file_reader
from tools.workspace import workspace

 # TODO: Create this patch.
_INIT_PATCH = workspace.resolve('0000.sql')

_patch_path = None

_Patch = collections.namedtuple(
    'Patch',
    ['hash', 'content', 'file_path', 'type'])

class PatchType(Enum):
    SQL = 1
    PYTHON = 2
    SHELL = 3

def get_patch_dir():
    if _patch_path is None:
        raise Exception('Patch directory has not been configured.')
    return _patch_path

def set_patch_dir(dir):
    global _patch_path
    _patch_path = dir

def get_unapplied_patches():
    patches, _ = _get_unapplied_patches_and_invalid_hashes()
    return patches

def _get_unapplied_patches_and_invalid_hashes():
    patches = get_patches()
    applied_hashes = _get_applied_patch_hashes()
    unapplied_patches = list()
    for patch in patches:
        if patch.hash in applied_hashes:
            applied_hashes.remove(patch.hash)
        else:
            unapplied_patches.append(patch)
    return unapplied_patches, applied_hashes

def _get_applied_patch_hashes():
    patches = db_instance.query_to_json('SELECT hash FROM db_patches')
    if patches is None:
        return list()
    return {_process_hash_from_db(p['hash']) for p in patches}

@functools.lru_cache(maxsize=1)
def get_patches():
    patches = set()
    seen_patch_hashes = set()
    file_re = re.compile(r'(?:(\d+)(\.sql|\.py|\.sh))$')
    dir_re = re.compile(r'^\d+$')
    for file in os.listdir(get_patch_dir()):
        # Directories named after patch numbers may be used to supply assets for
        # a patch, but they are ignored by db manager.
        if dir_re.match(file):
            continue
        matches = file_re.search(file)
        if matches is None:
            raise Exception('Invalid patch file name "{}".'.format(file))

        file_full_path = os.path.join(get_patch_dir(), file)
        if matches.group(2) == '.sql':
            patch_type = PatchType.SQL
        elif matches.group(2) == '.py':
            patch_type = PatchType.PYTHON
        else:
            assert matches.group(2) == '.sh'
            patch_type = PatchType.SHELL

        file_content = file_reader.read(file_full_path)
        hash = _compute_hash(file_content)
        if hash in seen_patch_hashes:
            raise Exception(
                'Duplicate patch hash found "{}" for file "{}".'.format(
                    hash, file_full_path))
        seen_patch_hashes.add(hash)

        patches.add(_Patch(hash, file_content, file_full_path, patch_type))
    return sorted(patches, key=lambda p: p.file_path)

def verify_no_invalid_hashes():
    _, hashes = _get_unapplied_patches_and_invalid_hashes()
    if len(hashes) > 0:
        print('Warning: This database has {} invalid hashes applied.'.format(
            len(hashes)))

def _compute_hash(content):
    return hashlib.sha384(content.encode('utf-8')).hexdigest()

def _process_hash_from_db(hash):
    assert hash[0:2] == '\\x'
    return hash[2:]
