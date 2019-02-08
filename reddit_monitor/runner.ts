import * as minimist from 'minimist';
import {join} from 'path';
import {sleep} from  '../common/async/sleep';
import {
  ensure, ensurePropNumber, ensurePropObject, ensurePropString,
} from '../common/ensure';
import {formatNumber} from '../common/numbers/format';
import {readFile} from '../common/io/files/read';
import {RedditClient, createRedditClientFromConfigFile} from '../lib/reddit';
import {GlazeDbClient, createGlazeDbClientFromConfigFile} from '../glaze_db';
import {sendRedditDonuts} from '../reddit_puppet';
import {DonutDelivery} from './donut_delivery';
import {getInboundDonuts} from './inbound_donuts';

type DonutReceipt = {
  delivery: DonutDelivery;
  returnAmount: number;
};

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

async function checkInboundDeliveries(
    redditClient: RedditClient,
    glazeDb: GlazeDbClient,
    redditPuppetHost: string,
    redditPuppetPort: number,
    lastKnownDelivery: string):
    Promise<string> {
  const deliveries = await getInboundDonuts(redditClient, lastKnownDelivery);
  if (deliveries.length > 0) {
    const successfulDeliveries =
        await glazeDb.addInboundDeliveries(deliveries);
    // The cient doesn't care whether messages are marked as read or not. It
    // always retrieved based on the last message it has in the database.
    // However, we mark them as read here to make it easier for a human to sign
    // into the account and check other messages the client isn't interested in.
    if (successfulDeliveries.length > 0) {
      await redditClient.markMessagesRead(
          successfulDeliveries.map(u => u.delivery.id));
      await notifyOfReceivedDeliveries(
          redditClient,
          glazeDb,
          redditPuppetHost,
          redditPuppetPort,
          successfulDeliveries);
    }
    return deliveries[0].id;
  }
  return lastKnownDelivery;
}

async function notifyOfReceivedDeliveries(
    redditClient: RedditClient,
    glazeDb: GlazeDbClient,
    redditPuppetHost: string,
    redditPuppetPort: number,
    deliveries: DonutReceipt[]):
    Promise<void> {
  const promises: Promise<void>[] = [];
  for (const group of groupDeliveriesBySource(deliveries)) {
    ensure(group.length > 0);
    const from = group[0].delivery.from;
    const amount = group.reduce(
        (acc: number, u: DonutReceipt): number =>
            acc + u.delivery.amount - u.returnAmount,
        0);
    const returnTotal = group.reduce(
        (acc: number, u: DonutReceipt): number =>
            acc + u.returnAmount,
        0);
    const formattedAmount = formatNumber(amount);
    const formattedAmountWithUnit =
        amount == 1 ? `${formattedAmount} donut` : `${formattedAmount} donuts`;
    const formattedReturnTotal = formatNumber(returnTotal);
    const formattedReturnTotalWithUnit =
        returnTotal == 1
            ? `${formattedReturnTotal} donut`
            : `${formattedReturnTotal} donuts`;
    const deliveriesEnabled = amount > 0 || await glazeDb.deliveriesEnabled();
    const extraInfo =
        returnTotal > 0
        ? `\n\n${formattedReturnTotalWithUnit} are being returned to you `
            + 'because you deposited in excess of the deposit limit.'
        : '';
    if (deliveriesEnabled) {
      promises.push(
          redditClient.sendMessage(
              from,
              'Deposited donuts',
              `Your account has been credited with ${formattedAmountWithUnit}. `
              + `For more information see https://donut.dance`
              + extraInfo));
    } else {
      promises.push(
          redditClient.sendMessage(
              from,
              'Deposited donuts',
              `You attempted to deposit ${formattedReturnTotalWithUnit} but `
                  + 'the bridge is currently closed. Your '
                  + (returnTotal == 1 ? 'donut has ' : 'donuts have ')
                  + 'been returned.'));
    }
    if (returnTotal > 0) {
      promises.push(
          sendRedditDonuts(
              glazeDb,
              redditPuppetHost,
              redditPuppetPort,
              from,
              returnTotal));
    }
  }
  await Promise.all(promises);
}

function groupDeliveriesBySource(
    deliveries: DonutReceipt[]):
    DonutReceipt[][] {
  const groups = new Map<string, DonutReceipt[]>();
  for (const {delivery, returnAmount} of deliveries) {
    let group: DonutReceipt[];
    if (groups.has(delivery.from)) {
      group = groups.get(delivery.from);
      group.push({delivery, returnAmount});
    } else {
      group = [{delivery, returnAmount}];
      groups.set(delivery.from, group);
    }
  }
  return [...groups.values()];
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
