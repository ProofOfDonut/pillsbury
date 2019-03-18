import {ensureNotEqual, ensureSafePositiveInteger} from '../common/ensure';
import {Message, RedditClient} from '../lib/reddit';
import {DonutDelivery} from './donut_delivery';

const BODY_RE =
    /^\n\/u\/([\w\-]+) sent you (\d+) Donuts in \/r\/ethtrader. Enjoy!$/;

export async function getInboundDonuts(
    redditClient: RedditClient,
    lastKnownMessage: string,
    logMessages: (messages: Message[]) => Promise<void>):
    Promise<Array<DonutDelivery>> {
  const messages = await redditClient.getMessages(lastKnownMessage);
  if (messages.length > 0) {
    await logMessages(messages);
  }
  const deliveries: Array<DonutDelivery> = [];
  for (const message of messages) {
    if (message.author == 'CommunityPoints'
        && message.subject == 'You\'ve got some Donuts in ethtrader!') {
      const m = ensureNotEqual(BODY_RE.exec(message.body), null);
      const amount = ensureSafePositiveInteger(+m[2]);
      deliveries.push(
          new DonutDelivery(message.id, m[1], amount, message.date));
    }
  }
  return deliveries;
}
