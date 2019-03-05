import * as minimist from 'minimist';
import {
  ensurePropObject, ensurePropSafeInteger, ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {formatNumber} from '../common/numbers/format';
import {parseHostAndPort} from '../common/strings/host_and_port';
import {AssetSymbol} from '../common/types/Asset';
import {RedditClient, createRedditClientFromConfigFile} from '../lib/reddit';
import {GlazeDbClient, createGlazeDbClientFromConfigFiles} from '../glaze_db';
import {sendRedditDonuts} from '../reddit_puppet';

const args = minimist(process.argv.slice(2));
const [redditPuppetHost, redditPuppetPort] =
    parseHostAndPort(ensurePropString(args, 'reddit_puppet'));
const redditHubConfigFile = ensurePropString(args, 'reddit_hub_config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbUserConfigFile = ensurePropString(args, 'db_user_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const [redditClient, glazeDb]:
      [RedditClient, GlazeDbClient] =
      await Promise.all([
    createRedditClientFromConfigFile(redditHubConfigFile),
    createGlazeDbClientFromConfigFiles(
        dbConfigFile, dbUserConfigFile, dbName),
  ]);
  const asset = await glazeDb.getAssetBySymbol(AssetSymbol.DONUT);
  while (true) {
    const refund = await glazeDb.getNextRefund(asset.id);
    if (!refund) {
      break;
    }
    console.log(
        `Refunding ${refund.username} ${asset.name.format(refund.amount)}`);
    await sendRedditDonuts(
        glazeDb,
        redditPuppetHost,
        redditPuppetPort,
        refund.username,
        refund.amount);
    await redditClient.sendMessage(
        refund.username,
        'Refunded donuts',
        `You have been refunded ${asset.name.format(refund.amount)} to your `
        + 'Reddit account.');
  }
}

main();
