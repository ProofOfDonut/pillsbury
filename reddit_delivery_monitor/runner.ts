import * as minimist from 'minimist';
import {sleep} from  '../common/async/sleep';
import {
  ensurePropNumber, ensurePropObject, ensurePropString,
} from '../common/ensure';
import {parseHostAndPort} from '../common/strings/host_and_port';
import {RedditClient, createRedditClientFromConfigFile} from '../lib/reddit';
import {GlazeDbClient, createGlazeDbClientFromConfigFile} from '../glaze_db';
import {checkInboundDeliveries} from './check_inbound_deliveries';

const args = minimist(process.argv.slice(2));
const [redditPuppetHost, redditPuppetPort] =
    parseHostAndPort(ensurePropString(args, 'reddit_puppet'));
const redditHubConfigFile = ensurePropString(args, 'reddit_hub_config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const [redditClient, glazeDb]:
      [RedditClient, GlazeDbClient] =
      await Promise.all([
        createRedditClientFromConfigFile(redditHubConfigFile),
        createGlazeDbClientFromConfigFile(dbConfigFile, dbName),
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

main();
