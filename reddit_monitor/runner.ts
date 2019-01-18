import * as minimist from 'minimist';
import {join} from 'path';
import {sleep} from  '../common/async/sleep';
import {
  ensure, ensurePropNumber, ensurePropObject, ensurePropString,
} from '../common/ensure';
import {formatNumber} from '../common/numbers/format';
import {readFile} from '../common/io/files/read';
import {RedditClient} from '../lib/reddit';
import {PodDbClient, createPodDbClientFromConfigFile} from '../pod_db';
import {sendRedditDonuts} from '../reddit_sender';
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
  const redditClient = new RedditClient(configFile);
  const podDbClient =
      await createPodDbClientFromConfigFile(dbConfigFile, dbName);
  const [redditSenderHost, redditSenderPort] =
      await getRedditSenderInfo(configFile);

  let lastKnownDelivery: string = await podDbClient.getLastDeliveryId();
  while (true) {
    console.log('last delivery:', lastKnownDelivery); // DEBUG
    lastKnownDelivery =
        await checkInboundDeliveries(
            redditClient,
            podDbClient,
            redditSenderHost,
            redditSenderPort,
            lastKnownDelivery);
    await sleep(15000);
  }
}

async function checkInboundDeliveries(
    redditClient: RedditClient,
    podDbClient: PodDbClient,
    redditSenderHost: string,
    redditSenderPort: number,
    lastKnownDelivery: string):
    Promise<string> {
  console.log('--- getInboundDonuts'); // DEBUG
  const deliveries = await getInboundDonuts(redditClient, lastKnownDelivery);
  if (deliveries.length > 0) {
    console.log('--- addInboundDeliveries'); // DEBUG
    const successfulDeliveries =
        await podDbClient.addInboundDeliveries(deliveries);
    // The cient doesn't care whether messages are marked as read or not. It
    // always retrieved based on the last message it has in the database.
    // However, we mark them as read here to make it easier for a human to sign
    // into the account and check other messages the client isn't interested in.
    if (successfulDeliveries.length > 0) {
      console.log('--- markMessagesRead'); // DEBUG
      await redditClient.markMessagesRead(
          successfulDeliveries.map(u => u.delivery.id));
      console.log('--- notifyOfReceivedDeliveries'); // DEBUG
      await notifyOfReceivedDeliveries(
          redditClient,
          redditSenderHost,
          redditSenderPort,
          successfulDeliveries);
    }
    return deliveries[0].id;
  }
  return lastKnownDelivery;
}

async function notifyOfReceivedDeliveries(
    redditClient: RedditClient,
    redditSenderHost: string,
    redditSenderPort: number,
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
    const formattedReturnTotal = formatNumber(returnTotal);
    const extraInfo =
        returnTotal > 0
        ? `\n\n${formattedReturnTotal} donuts are being returned to you `
            + 'because you deposited in excess of the deposit limit.'
        : '';
    promises.push(
        redditClient.sendMessage(
            from,
            'Credited donuts',
            `Your account has been credited with ${formattedAmount} donuts. `
            + `For more information see https://donut.dance`
            + extraInfo));
    if (returnTotal > 0) {
      promises.push(
          sendRedditDonuts(
              redditSenderHost,
              redditSenderPort,
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

async function getRedditSenderInfo(
    configFile: string):
    Promise<[string, number]> {
  const info = JSON.parse(<string> await readFile(configFile, 'utf8'));
  const redditSenderConfig = ensurePropObject(info, 'reddit-sender');
  return [
    ensurePropString(redditSenderConfig, 'host'),
    ensurePropNumber(redditSenderConfig, 'port'),
  ];
}

main();
