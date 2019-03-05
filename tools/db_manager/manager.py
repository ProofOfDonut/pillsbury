#!/usr/bin/env python3
"""Tool for managing database, patches, and db_schema.sql file."""

import collections
from enum import Enum
import os
import re
import shutil
import subprocess
import sys
import tempfile
from tools.db_manager import db
from tools.db_manager import db_instance
from tools.db_manager import file_reader
from tools.db_manager import patch_reader
from tools.workspace import workspace

_HOME_DIR = os.path.expanduser('~')
_WORKSPACE = workspace.get_path()
_LINE = '--------------------------------------------------'

_SqlUpgrade = collections.namedtuple(
    'SqlUpgrade',
    ['query', 'files', 'hashes', 'followups'])

_PythonUpgrade = collections.namedtuple(
    'PythonUpgrade',
    ['script', 'files', 'hashes'])

_ShellUpgrade = collections.namedtuple(
    'ShellUpgrade',
    ['script', 'files', 'hashes'])

def _should_continue(prompt):
    cont = input('{} [y/n] '.format(prompt))
    return bool(re.match(r'[yY]', cont))

def _save_current_db_schema(schema_path):
    if not _should_continue(
            'This will override changes to {}, continue?'.format(
                schema_path)):
        return
    with open(schema_path, 'wt', encoding='utf8') as schema_file:
        schema_file.write(db_instance.get_schema())

def _get_next_upgrade():
    upgrades = list(_get_next_batch_of_upgrades())
    if len(upgrades) == 0:
        return None

    # If there's only one upgrade, it may be a Python upgrade. Python upgrades
    # cannot be joined, so we don't have to worry about them when there are more
    # than one upgrade.
    if len(upgrades) == 1 and (
            isinstance(upgrades[0], _PythonUpgrade)
            or isinstance(upgrades[0], _ShellUpgrade)):
        return upgrades[0]
    return _combine_sql_upgrades(upgrades)

def _get_next_batch_of_upgrades():
    is_first = True
    for upgrade in _get_upgrades():
        if (not isinstance(upgrade, _SqlUpgrade)
                or _query_must_be_split(upgrade.query + ';')):
            if is_first:
                yield upgrade
            break
        yield upgrade
        is_first = False

def _get_upgrades():
    patches = patch_reader.get_unapplied_patches()
    for patch in patches:
        if patch.type == patch_reader.PatchType.SQL:
            yield _SqlUpgrade(
                patch.content, [patch.file_path], [patch.hash], [''])
        elif patch.type == patch_reader.PatchType.PYTHON:
            yield _PythonUpgrade(
                patch.file_path, [patch.file_path], [patch.hash])
        else:
            assert patch.type == patch_reader.PatchType.SHELL
            yield _ShellUpgrade(
                patch.file_path, [patch.file_path], [patch.hash])

def _combine_sql_upgrades(upgrades):
    out = []
    out_files = []
    out_hashes = []
    followups = []
    for upgrade in upgrades:
        assert isinstance(upgrade, _SqlUpgrade)
        out.append(
            _LINE + '\n'
            + '-- Upgrades:\n{}'.format(
                _format_file_list(upgrade.files, '--     ')))
        out.append('')
        out.append(upgrade.query.strip())
        out.append('')
        insert_hash = 'INSERT INTO db_patches (hash) VALUES {};'.format(
            _format_hashes_for_insert(upgrade.hashes))
        out.append(insert_hash)
        followups.append(insert_hash)
        out_files.extend(upgrade.files)
        out_hashes.extend(upgrade.hashes)
    if len(out) == 0:
        raise Exception('No upgrade found.')
    return _SqlUpgrade(
        '\n'.join(out), out_files, out_hashes, followups)

def _format_hashes_for_insert(hashes):
    begin = '\n    (\'\\x'
    end = '\')'
    return begin + (end + ',' + begin).join(hashes) + end

def _get_saved_schema_content_at_commit(schema_path, commit):
    saved_schema_path = schema_path
    if saved_schema_path[0:len(_WORKSPACE)] == _WORKSPACE:
        saved_schema_path = saved_schema_path[len(_WORKSPACE) + 1:]
    return _get_file_at_commit(commit, saved_schema_path)

def _get_file_at_commit(commit, file):
    return subprocess.check_output(
        [
            'git',
            'show',
            '{}:{}'.format(commit, file)
        ]).decode('utf8')

def upgrade(schema_path, force=False):
    if not force and not _do_next_batch_upgrade(force):
        print('Database is already up to date.')
    else:
        while _do_next_batch_upgrade(force):
            pass
    if not force:
        _verify_saved_schema_matches_current_schema(schema_path)
    patch_reader.verify_no_invalid_hashes()

def _do_next_batch_upgrade(force=False):
    upgrade = _get_next_upgrade()
    if upgrade is None:
        return False

    if not force:
        print('')
        print('UPGRADE TO BE APPLIED')
        print('')
        if isinstance(upgrade, _SqlUpgrade):
            print(upgrade.query)
        else:
            assert (
                isinstance(upgrade, _PythonUpgrade)
                or isinstance(upgrade, _ShellUpgrade))
            print(upgrade.script)
        print(_LINE)
        print('')
        if not _should_continue(
            'Apply upgrades from the following files?\n{}'.format(
                _format_file_list(upgrade.files, '    '))):
            sys.exit(1)

    if isinstance(upgrade, _SqlUpgrade):
        if _query_must_be_split(upgrade.query):
            _db_query(upgrade.query, force)
        else:
            assert len(upgrade.files) == len(upgrade.followups)
            for i, file in enumerate(upgrade.files):
                _db_query_file(file, force)
                _db_query(upgrade.followups[i], force)
    elif isinstance(upgrade, _PythonUpgrade):
        _execute_python(upgrade.script)
        _db_query(
            'INSERT INTO db_patches (hash) VALUES {};'.format(
                _format_hashes_for_insert(upgrade.hashes)))
    else:
        assert isinstance(upgrade, _ShellUpgrade)
        _execute_shell_script(upgrade.script)
        _db_query(
            'INSERT INTO db_patches (hash) VALUES {};'.format(
                _format_hashes_for_insert(upgrade.hashes)))

    return True

def _format_file_list(files, prefix):
    relative_files = []
    if _WORKSPACE[-1] == '/':
        root = _WORKSPACE
    else:
        root = _WORKSPACE + '/'
    root_length = len(root)
    for file in files:
        assert file[0:root_length] == root
        relative_files.append('//' + file[root_length:])
    return prefix + ('\n' + prefix).join(relative_files)

def _verify_saved_schema_matches_current_schema(schema_path):
    diff = _diff_current_schema_vs_saved_schema(schema_path)
    if diff:
        print(
            'Warning: Current schema does not match saved schema in codebase.')
        print(diff)

def _diff_current_schema_vs_saved_schema(schema_path):
    saved_schema = file_reader.read(schema_path)
    current_schema = db_instance.get_schema()
    if _schemas_equal(current_schema, saved_schema):
        return ''
    with tempfile.NamedTemporaryFile('wt', encoding='utf8') as schema_file:
        schema_file.write(current_schema)
        schema_file.flush()
        try:
            return subprocess.check_output(
                [
                    'git',
                    '--no-pager',
                    'diff',
                    '--color',
                    '--ignore-space-at-eol',
                    schema_path,
                    schema_file.name
                ]).stdout.decode('utf8')
        # `git diff` has a non-zero exit code when there is a diff, seemingly by
        # default, at least for me -- even though the docs make it sound like
        # you need to specify `--exit-code` for this behavior.
        except subprocess.CalledProcessError as err:
            return err.output.decode('utf8')

def _schemas_equal(schema_a, schema_b):
    rep = re.compile(r'\s+')
    return rep.sub('', schema_a) == rep.sub('', schema_b)

def _query_must_be_split(query):
    return (
        re.search(r'ALTER TYPE', query, flags=re.IGNORECASE)
        and re.search(r'\;(.|\n)*\;', query))

# This is not comprehensive. Any string in the query which contains a semicolon
# will break the ability to split. This is just common with functions and
# uncommon with other queries, so this is a close approximation.
# TODO: To adequately solve this issue we need to be able to appropriately parse
# PostgreSQL strings or any other expressions which may contain semicolons not
# used as a line terminator. OR we can just stop using enums, avoiding the need
# to split queries entirely.
def _query_cannot_be_split(query):
    return re.search(r'CREATE (?:OR REPLACE )?FUNCTION', query)

def _db_query(query, force=False):
    if _query_must_be_split(query):
        if _query_cannot_be_split(query):
            raise Exception(
                'Query cannot be executed due to the use of both ALTER TYPEs '
                'and CREATE FUNCTIONs. The best path forward is probably to '
                'apply ALTER TYPE statements manually and then try to rerun '
                'the upgrade again without them.')
        if not force:
            if not _should_continue(
                    'Warning: This query cannot be run as a transaction. '
                    'Split into multiple queries?'):
                sys.exit(0)
        out = []
        for part in query.split(';'):
            result = _db_query(part)
            if result != '':
                out.append(result)
        return '\n'.join(out)
    return db_instance.query(query)

def _db_query_file(file, force=False):
    return db_instance.query_file(file)

def _execute_python(script):
    with open(script, 'rb') as file:
        code = compile(file.read(), script, 'exec')
    exec(code, {
        '__file__': script,
        '__name__': '__main__',
    })

def _execute_shell_script(script):
    env = os.environ.copy()
    env['PATCHES_ROOT'] = patch_reader.get_patch_dir()
    subprocess.check_call([script], env=env)

def _write_file(filename, content):
    _mkdir_p(os.path.dirname(filename))
    with open(filename, 'wt', encoding='utf8') as file:
        file.write(content)

def _cp_f(source, destination):
    _mkdir_p(os.path.dirname(destination))
    shutil.copyfile(source, destination)

def _mkdir_p(path):
    sub_path = os.path.dirname(path)
    if not os.path.exists(sub_path):
        _mkdir_p(sub_path)
    if not os.path.exists(path):
        os.mkdir(path)

def _verify_db_up_to_date(schema_path):
    diff = _diff_current_schema_vs_saved_schema(schema_path)
    exit_with_failure = False
    if diff:
        print(diff)
        exit_with_failure = True
    patches = patch_reader.get_unapplied_patches()
    if len(patches) > 0:
        print('Missing patches:')
        for patch in patches:
            print(patch.file_path)
        exit_with_failure = True
    if exit_with_failure:
        sys.exit(1)

def _init(schema_path, dbname, force=False):
    if not force:
        if not _should_continue(
                'This will initialize your local database, continue?'):
            return
    _super_db_query('CREATE DATABASE {};'.format(db.get_db_name()))
    _super_db_query('ALTER DATABASE {} OWNER TO {}'.format(
        db.get_db_name(),
        db.get_db_user()))
    db.query(
        'CREATE TABLE db_patches ( '
            'hash bytea PRIMARY KEY NOT NULL, '
            'applied_time timestamp with time zone DEFAULT now() NOT NULL '
                'CHECK (date_part(\'timezone\', applied_time) = 0));')
    db_instance.rewind_invalid_patches()
    upgrade(schema_path, force)

def _super_db_query(query):
    return subprocess.check_output(
        [
            'sudo',
            '-u', 'postgres',
            'psql',
            '-At',
            '-c', query
        ]).decode('utf8')

def _has_arg(argv, arg):
    for u in argv[1:]:
        if u == arg:
            return True
    return False

def _get_command_from_args(argv):
    for u in argv[1:]:
        if u[0:1] != '-':
            return u
    return ''

def set_patch_dir(dir):
    patch_reader.set_patch_dir(dir)

def set_config_files(files):
    db_instance.set_config_files(files)

def main(argv):
    schema_path = None

    for arg in sys.argv[1:]:
        matches = re.search(r'^--(db_config|patches|schema)\=(.*)$', arg)
        if matches:
            if matches.group(1) == 'db_config':
                set_config_files(matches.group(2).split(','))
            elif matches.group(1) == 'patches':
                set_patch_dir(matches.group(2))
            elif matches.group(1) == 'schema':
                schema_path = matches.group(2)
            else:
                raise Exception('Unknown param "{}"'.format(matches.group(1)))

    command = _get_command_from_args(argv)
    force = _has_arg(argv, '-y')
    dev_mode = _has_arg(argv, '--dev_mode')
    db_instance.set_dev_mode(dev_mode)
    dev_mode_allowed = _has_arg(argv, '--WARNING__permit_data_loss')

    if dev_mode and not command == 'init':
        if not dev_mode_allowed:
            raise Exception(
                'In order to use dev_mode, you must pass the parameter '
                '--WARNING__permit_data_loss.')
        db_instance.rewind_invalid_patches()

    if command == 'init':
        if schema_path is None:
            raise Exception('Schema path was not provided.')
        _init(schema_path, force)
    elif command == 'upgrade':
        if schema_path is None:
            raise Exception('Schema path was not provided.')
        upgrade(schema_path, force)
    elif command == 'show_upgrade':
        next_upgrade = _get_next_upgrade()
        if next_upgrade:
            if isinstance(next_upgrade, _SqlUpgrade):
                upgrade_contents = 'SQL: ' + upgrade.query
            elif isinstance(next_upgrade, _PythonUpgrade):
                upgrade_contents = 'Python: ' + next_upgrade.script
            else:
                assert isinstance(next_upgrade, _ShellUpgrade)
                upgrade_contents = 'Shell Script: ' + next_upgrade.script
            print(upgrade_contents)
    elif command == 'show_current_schema':
        print(db_instance.get_schema())
    elif command == 'save_current_schema':
        if schema_path is None:
            raise Exception('Schema path was not provided.')
        _save_current_db_schema(schema_path)
    elif command == 'verify':
        if schema_path is None:
            raise Exception('Schema path was not provided.')
        _verify_db_up_to_date(schema_path)
    elif command == 'database_name':
        print(db_instance.get_db_name())
    elif command == 'connect':
        db_instance.connect_repl()
    elif command == 'query':
        print(db_instance.query(sys.stdin.read()))
    elif command == 'query_file':
        print(db_instance.query_file(argv[-1]))
    else:
        raise Exception('Invalid command: {}\n{}'.format(
            command,
            'Expected one of: verify, upgrade, show_upgrade, '
            'show_current_schema, save_current_schema, database_name, '
            'connect, query, query_file'))

if __name__ == '__main__':
    main(sys.argv)
