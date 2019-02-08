import {
  ensureObject,
  ensurePropString,
  ensureSafeInteger,
} from '../../common/ensure';
import {RequestParams} from '../../common/net/request_params';
import {postJsonWithToken} from './request';

export async function transferDonuts(
    token: string,
    to: string,
    amount: number):
    Promise<string> {
  const response = ensureObject(await postJsonWithToken(
      token,
      'https://meta-api.reddit.com/wallets/me/t5_37jgj/transfers',
      new RequestParams([
        ['amount', String(ensureSafeInteger(amount))],
        ['receiveUserName', to],
      ])));
  return ensurePropString(response, 'id');
}