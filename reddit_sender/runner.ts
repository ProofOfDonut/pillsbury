import * as minimist from 'minimist';
import {join} from 'path';
import {ensurePropString} from '../common/ensure';
import {createRedditSenderServer} from './server';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');

async function main() {
  const server = await createRedditSenderServer(configFile);
  console.log(`Listening on port ${server.port}.`);
}

main();
