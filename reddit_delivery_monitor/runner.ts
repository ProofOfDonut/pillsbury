import * as minimist from 'minimist';
import {sleep} from  '../common/async/sleep';
import {
  ensurePropNumber, ensurePropObject, ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {RedditClient, createRedditClientFromConfigFile} from '../lib/reddit';
import {GlazeDbClient, createGlazeDbClientFromConfigFile} from '../glaze_db';
import {checkInboundDeliveries} from './check_inbound_deliveries';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const [redditClient, glazeDb, [redditPuppetHost, redditPuppetPort]]:
      [RedditClient, GlazeDbClient, [string, number]] =
      await Promise.all([
        createRedditClientFromConfigFile(configFile),
        createGlazeDbClientFromConfigFile(dbConfigFile, dbName),
        getRedditPuppetInfo(configFile),
      ]);

  let lastKnownDelivery: string = await glazeDb.getLastDeliveryId();
  while (true) {
    lastKnownDelivery =
        await checkInboundDeliveries(
            redditClient,
            glazeDb,
            redditPuppetHost,
            redditPuppetPort,
            lastKnownDelivery);
    await sleep(15000);
  }
}

async function getRedditPuppetInfo(
    configFile: string):
    Promise<[string, number]> {
  const info = JSON.parse(<string> await readFile(configFile, 'utf8'));
  const redditPuppetConfig = ensurePropObject(info, 'reddit-puppet');
  return [
    ensurePropString(redditPuppetConfig, 'host'),
    ensurePropNumber(redditPuppetConfig, 'port'),
  ];
}

main();
