import {ensure, ensureSafeInteger} from '../../common/ensure';
import {Method, request} from '../../common/net/request';
import {GlazeDbClient} from '../../glaze_db';
import {withToken} from './token';

const SUBREDDIT_ID = 't5_37jgj';
const TRANSFER_URL =
    `https://meta-api.reddit.com/wallets/me/${SUBREDDIT_ID}/transfers`;

export async function sendRedditDonuts(
    glazeDb: GlazeDbClient,
    puppetHost: string,
    puppetPort: number,
    recipient: string,
    amount: number) {
  // Reddit usernames can currently be 3 to 20 characters long. We'll allow 1
  // to 30 characters in case this changes.
  ensure(/^[\w\-]{1,30}$/.test(recipient), `Invalid recipient "${recipient}".`);
  ensureSafeInteger(amount);

  await withToken(
      glazeDb,
      puppetHost,
      puppetPort,
      (token: string) => callTransferEndpoint(token, recipient, amount));
}

async function callTransferEndpoint(
    token: string,
    recipient: string,
    amount: number) {
  await request(
      Method.POST,
      TRANSFER_URL,
      new Map<string, string>([
        ['Authorization', `Bearer ${token}`],
        ['Content-Type', 'application/json'],
      ]),
      JSON.stringify({
        'amount': String(amount),
        'receiveUserName': recipient,
      }));
}
