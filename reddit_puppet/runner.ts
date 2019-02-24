import * as minimist from 'minimist';
import {join} from 'path';
import {ensurePropString} from '../common/ensure';
import {parseHostAndPort} from '../common/strings/host_and_port';
import {createGlazeDbClientFromConfigFile} from '../glaze_db';
import {createRedditPuppetServer} from './server';

const args = minimist(process.argv.slice(2));
const [host, port] = parseHostAndPort(
    ensurePropString(args, 'host'),
    true /* allowEmptyHost */);
const redditHubConfigFile = ensurePropString(args, 'reddit_hub_config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFile(dbConfigFile, dbName);
  const server = await createRedditPuppetServer(
      host, port, redditHubConfigFile, glazeDb);
  console.log(`Listening on port ${server.port}.`);
}

main();
