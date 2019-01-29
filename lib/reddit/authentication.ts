import {
  ensurePropEquals, ensurePropNumber, ensurePropString, ensureString,
} from '../../common/ensure';
import {Method, request} from '../../common/net/request';
import {getWithToken} from './request';

export type TokenInfo = {
  accessToken: string;
  refreshToken: string;
  expiration: number;
};

export async function getTokenWithPassword(
    username: string,
    password: string,
    clientId: string,
    secret: string):
    Promise<TokenInfo> {
  const response = await request(
      Method.POST,
      'https://'
          + encodeURIComponent(clientId)
          + ':'
          + encodeURIComponent(secret)
          + '@www.reddit.com/api/v1/access_token',
      undefined /* headers */,
      'grant_type=password&username='
          + encodeURIComponent(username)
          + '&password='
          + encodeURIComponent(password)
          + '&duration=permanent');
  const info = response.toObject();
  ensurePropEquals(info, 'token_type', 'bearer');
  return {
    accessToken: ensurePropString(info, 'access_token'),
    refreshToken: ensurePropString(info, 'refresh_token'),
    expiration:
        Date.now()
        + ensurePropNumber(info, 'expires_in') * 1000
        - 2 * 60 * 1000,
  };
}

export async function getTokenWithCode(
    code: string,
    redirectUri: string,
    clientId: string,
    secret: string):
    Promise<{accessToken: string; refreshToken: string;}> {
  const response = await request(
      Method.POST,
      'https://www.reddit.com/api/v1/access_token',
      new Map<string, string>([
        ['Authorization', encodeAuthorizationHeader(clientId, secret)],
      ]),
      'grant_type=authorization_code&code='
          + encodeURIComponent(code)
          + '&redirect_uri='
          + encodeURIComponent(redirectUri));
  const info = response.toObject();
  // TODO: Deal with expiration.
  ensurePropEquals(info, 'token_type', 'bearer');
  const accessToken = ensurePropString(info, 'access_token');
  let refreshToken = ensurePropString(info, 'refresh_token');
  return {accessToken, refreshToken};
}

export async function getTokenWithRefreshToken(
    refreshToken: string,
    clientId: string,
    secret: string):
    Promise<TokenInfo> {
  const response = await request(
      Method.POST,
      'https://www.reddit.com/api/v1/access_token',
      new Map<string, string>([
        ['Authorization', encodeAuthorizationHeader(clientId, secret)],
      ]),
      `grant_type=refresh_token&refresh_token=${refreshToken}`);
  const info = response.toObject();
  ensurePropEquals(info, 'token_type', 'bearer');
  return {
    accessToken: ensurePropString(info, 'access_token'),
    refreshToken,
    expiration:
        Date.now()
        + ensurePropNumber(info, 'expires_in') * 1000
        - 3 * 60 * 1000,
  };
}

function encodeAuthorizationHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}
