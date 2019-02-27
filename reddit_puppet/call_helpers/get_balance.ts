import {
  ensurePropObject, ensureSafeInteger, ensurePropString,
} from '../../common/ensure';
import {Method, request} from '../../common/net/request';
import {GlazeDbClient} from '../../glaze_db';
import {withToken} from './token';

export function getCommunityPointBalance(
    glazeDb: GlazeDbClient,
    puppetHost: string,
    puppetPort: number,
    subredditId: string):
    Promise<number> {
  return withToken(
      glazeDb,
      puppetHost,
      puppetPort,
      (token: string) => requestBalance(token, subredditId));
}

async function requestBalance(
    token: string,
    subredditId: string):
    Promise<number> {
  const response = await request(
      Method.GET,
      getCurrentUserInfoUrl(subredditId),
      new Map<string, string>([
        ['Authorization', `Bearer ${token}`],
      ]));
  const info = response.toObject();
  const wallet = ensurePropObject(info, 'wallet');
  const amounts = ensurePropObject(wallet, 'amounts');
  const unlocked = ensurePropObject(amounts, 'unlocked');
  const amount = ensurePropString(unlocked, 'amount');
  return ensureSafeInteger(+amount);
}

function getCurrentUserInfoUrl(subredditId: string): string {
  return `https://meta-api.reddit.com/communities/${subredditId}/me`;
}
