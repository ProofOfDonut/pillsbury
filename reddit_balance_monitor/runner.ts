import * as minimist from 'minimist';
import {sleep} from  '../common/async/sleep';
import {ensure, ensurePropString} from '../common/ensure';
import {formatNumber} from '../common/numbers/format';
import {parseHostAndPort} from '../common/strings/host_and_port';
import {EventLogType} from '../common/types/EventLogType';
import {AssetSymbol} from '../common/types/Asset';
import {GlazeDbClient, createGlazeDbClientFromConfigFiles} from '../glaze_db';
import {
  getCommunityPointBalance,
} from '../reddit_puppet/call_helpers/get_balance';

const ASSET_SYMBOL = AssetSymbol.DONUT;
const SUBREDDIT_REDDIT_ID = 't5_37jgj';

const args = minimist(process.argv.slice(2));
const [redditPuppetHost, redditPuppetPort] =
    parseHostAndPort(ensurePropString(args, 'reddit_puppet'));
const dbConfigFile = ensurePropString(args, 'db_config');
const dbUserConfigFile = ensurePropString(args, 'db_user_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFiles(
      dbConfigFile, dbUserConfigFile, dbName);
  ensure(/^t5_/.test(SUBREDDIT_REDDIT_ID));
  const redditId = SUBREDDIT_REDDIT_ID.slice(3);
  const subredditId =
      await glazeDb.getSubredditIdByRedditId(redditId);
  const asset = await glazeDb.getAssetBySymbol(ASSET_SYMBOL);
  const assetId = asset.id;

  console.log(`Monitoring subreddit ID "${redditId}".`);

  let lastDiff: number = 0;
  while (true) {
    const diff = await checkDonutBalance(glazeDb, subredditId, assetId);
    if (diff != lastDiff) {
      if (diff == 0) {
        console.log(`${getFormattedDate()} - Balance ok`);
        await glazeDb.logEvent(
            EventLogType.BALANCE_OK,
            JSON.stringify({'asset_id': assetId}));
      } else {
        console.warn(
            `${getFormattedDate()} - Balance mismatch!: ${formatNumber(diff)}`);
        await glazeDb.logEvent(
            EventLogType.BALANCE_MISMATCH,
            JSON.stringify({
              'asset_id': assetId,
              'delta': diff,
            }));
      }
      lastDiff = diff;
    }
    await sleep(5 * 60 * 1000);
  }
}

async function checkDonutBalance(
    glazeDb: GlazeDbClient,
    subredditId: number,
    assetId: number):
    Promise<number> {
  const redditBalance = await getCommunityPointBalance(
      glazeDb,
      redditPuppetHost,
      redditPuppetPort,
      SUBREDDIT_REDDIT_ID);
  return glazeDb.logSubredditBalance(subredditId, assetId, redditBalance);
}

function getFormattedDate(): string {
  const d = new Date();
  const date = [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  ].map(padDate).join('/');
  const time = [
    d.getHours(),
    d.getMinutes(),
  ].map(padDate).join(':');
  return `${date} ${time}`;
}

function padDate(n: number): string {
  if (n < 10) {
    return `0${n}`;
  }
  return String(n);
}

main();
