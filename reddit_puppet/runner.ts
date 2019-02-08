import * as minimist from 'minimist';
import {join} from 'path';
import {ensurePropString} from '../common/ensure';
import {createGlazeDbClientFromConfigFile} from '../glaze_db';
import {createRedditSenderServer} from './server';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFile(dbConfigFile, dbName);
  const server = await createRedditSenderServer(configFile, glazeDb);
  console.log(`Listening on port ${server.port}.`);
}

main();
