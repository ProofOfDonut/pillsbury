import * as minimist from 'minimist';
import {
  ensurePropObject, ensurePropSafeInteger, ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {formatNumber} from '../common/numbers/format';
import {AssetSymbol} from '../common/types/Asset';
import {RedditClient} from '../lib/reddit';
import {GlazeDbClient, createGlazeDbClientFromConfigFile} from '../glaze_db';
import {sendRedditDonuts} from '../reddit_puppet';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const [{redditPuppetHost, redditPuppetPort, redditClient}, glazeDb]:
      [Config, GlazeDbClient] =
      await Promise.all([
    readConfigFile(configFile),
    createGlazeDbClientFromConfigFile(dbConfigFile, dbName),
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

type Config = {
  redditPuppetHost: string;
  redditPuppetPort: number;
  redditClient: RedditClient;
};

async function readConfigFile(file: string): Promise<Config> {
  const config = JSON.parse(<string> await readFile(file, 'utf8'));
  const redditPuppetConfig = ensurePropObject(config, 'reddit-puppet');
  const redditConfig = ensurePropObject(config, 'reddit');
  const redditUsername = ensurePropString(redditConfig, 'username');
  const redditPassword = ensurePropString(redditConfig, 'password');
  const redditId = ensurePropString(redditConfig, 'id');
  const redditSecret = ensurePropString(redditConfig, 'secret');
  return {
    redditPuppetHost: ensurePropString(redditPuppetConfig, 'host'),
    redditPuppetPort: ensurePropSafeInteger(redditPuppetConfig, 'port'),
    redditClient: new RedditClient(
        redditUsername, redditPassword, redditId, redditSecret),
  };
}

main();
