import {ensureType} from '../../common/ensure';
import {readFile} from '../../common/io/files/read';
import {Config} from './config';
import {PostgresClient} from './client';
import {Transaction} from './transaction';

export {PostgresClient, Transaction};

export async function createPostgresClientFromConfigFile(
    configFile: string,
    dbname: string = ''):
    Promise<PostgresClient> {
  const config = await readConfig(configFile, dbname);
  return new PostgresClient(config);
}

async function readConfig(file: string, dbname: string = ''): Promise<Config> {
  const info = JSON.parse(<string> await readFile(file, 'utf8'));
  return new Config(<Object> ensureType(info, 'object'), dbname);
}
