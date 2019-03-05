import {ensureObject} from '../../common/ensure';
import {readFile} from '../../common/io/files/read';
import {Config} from './config';
import {PostgresClient} from './client';
import {Transaction} from './transaction';

export {PostgresClient, Transaction};

export async function createPostgresClientFromConfigFiles(
    configFile: string,
    userConfigFile: string,
    dbname: string = ''):
    Promise<PostgresClient> {
  const config = await readConfig(configFile, userConfigFile, dbname);
  return new PostgresClient(config);
}

async function readConfig(
    file: string,
    userFile: string,
    dbname: string = ''):
    Promise<Config> {
  const [infoString, userInfoString]:
      [string, string] =
      <[string, string]> await Promise.all([
    readFile(file, 'utf8'),
    readFile(userFile, 'utf8')
  ]);
  const info = ensureObject(JSON.parse(infoString));
  const userInfo = ensureObject(JSON.parse(userInfoString));
  return new Config(Object.assign({}, info, userInfo), dbname);
}
