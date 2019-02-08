import {ensure, ensureSafeInteger} from '../../common/ensure';
import {Method, request} from '../../common/net/request';
import {GlazeDbClient} from '../../glaze_db';

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

  let token = await glazeDb.getRedditHubBearerToken();
  let fetchedNewToken = false;
  if (!token) {
    token = await fetchNewToken(glazeDb, puppetHost, puppetPort);
    fetchedNewToken = true;
  }
  try {
    await callTransferEndpoint(token, recipient, amount);
  } catch (err) {
    // If we didn't just update the token, try again with a new token because
    // the old one may have expired.
    if (!fetchedNewToken) {
      token = await fetchNewToken(glazeDb, puppetHost, puppetPort);
      await callTransferEndpoint(token, recipient, amount);
    } else {
      throw err;
    }
  }
}

async function fetchNewToken(
    glazeDb: GlazeDbClient,
    host: string,
    port: number):
    Promise<string> {
  await request(
      Method.POST,
      `http://${host}:${port}/update-reddit-hub-bearer-token`);
  return ensure(await glazeDb.getRedditHubBearerToken());
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
