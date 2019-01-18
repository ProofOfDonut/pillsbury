import {
  ensureObject,
  ensurePropString,
  ensureSafeInteger,
} from '../../common/ensure';
import {RequestParams} from '../../common/net/request_params';
import {postJsonWithToken} from './request';

// fetch(
//   "https://meta-api.reddit.com/wallets/me/t5_37jgj/transfers",
//   {"credentials":"include",
//    "headers":{
//      "accept":"*/*",
//      "accept-language":"en-US,en;q=0.9",
//      "authorization":"Bearer 31898534-LUag3X7ulsqczJ5BQp_y9je9am4",
//      "content-type":"application/json",
//      "reddit-user_id":"desktop2x",
//      "x-reddit-loid":"0000000000000izp2e.2.1413980420590.Z0FBQUFBQmNJQTNwNUxHdWtQbVp2ZnJwQzl6cGtiQU1nU3RmQzRjUG9iaVFnTWY1M0FHZzQzck9HOUFxZEZwdXprS2hZNFdNTjM3bDdnMDdEeWYwbE9BZXpmQ0FJQnhNcE1uS3h3NVQ1Wk1sY2pUR0JTaE5vVnVoQTBTLWpIeU50UGc1ajZjV3V1aU4",
//      "x-reddit-session":"3Oq4He8DxPUpqXboQS.0.1545709754820.Z0FBQUFBQmNJYWk2MkMxclZrcVlJVmFOQTJPd0tOcGZFMHpNTnNuQW81ZzROcE9rN3NXamtZdzEzUWJzMW1IUm1pUk9ZTldEMWxqWW9leEJ5NnZZRkxzYkd2c3YtdkxpeHFSVlRLQWpQTWNhTzg5aF9wQUJYQTQyaXVLYWJYcERLd1ZPRjFyZDN4Vkc"
//     },
//     "referrer":"https://new.reddit.com/r/ethtrader/",
//     "referrerPolicy":"no-referrer-when-downgrade",
//     "body":"{\"amount\":\"10\",\"receiveUserName\":\"ProofOfDonut\"}",
//     "method":"POST",
//     "mode":"cors"
//     });

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