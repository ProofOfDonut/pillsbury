import * as minimist from 'minimist';
import {
  ensurePropObject, ensurePropSafeInteger, ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {formatNumber} from '../common/numbers/format';
import {AssetSymbol} from '../common/types/Asset';
import {RedditClient} from '../lib/reddit';
import {PodDbClient, createPodDbClientFromConfigFile} from '../pod_db';
import {sendRedditDonuts} from '../reddit_puppet';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const [{redditPuppetHost, redditPuppetPort, redditClient}, podDb]:
      [Config, PodDbClient] =
      await Promise.all([
    readConfigFile(configFile),
    createPodDbClientFromConfigFile(dbConfigFile, dbName),
  ]);
  const asset = await podDb.getAssetBySymbol(AssetSymbol.DONUT);
  while (true) {
    const refund = await podDb.getNextRefund(asset.id);
    if (!refund) {
      break;
    }
    console.log(
        `Refunding ${refund.username} ${asset.name.format(refund.amount)}`);
    await sendRedditDonuts(
        podDb,
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
