import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {ensurePropString} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {GlazeDbClient} from '../../../glaze_db';
import {getTokenWithCode, getUsername} from '../../../lib/reddit';

export function routeRedditLogin(apiServer: ApiServer, glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/reddit/login',
      async (req: Request, res: Response) => {
        const {clientId, secret, baseUri, dashboardUrl, secureCookies} =
            await apiServer.config;
        await handleRedditLogin(
            clientId,
            secret,
            baseUri,
            dashboardUrl,
            secureCookies,
            glazeDb,
            req,
            res);
      },
      false);
}

async function handleRedditLogin(
    clientId: string,
    secret: string,  
    baseUri: string,
    dashboardUrl: string,
    secureCookies: boolean,
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const url = parseUrl(req.url, true);
  const state = ensurePropString(url.query, 'state');
  const code = ensurePropString(url.query, 'code');

  await glazeDb.checkCsrfToken(state);
  const {accessToken, refreshToken} =
      await getTokenWithCode(
          code,
          baseUri + url.pathname,
          clientId,
          secret);
  const username = await getUsername(accessToken);
  const sessionInfo =
      await glazeDb.createSession(username, accessToken, refreshToken);
  res
    .status(303)
    .set('Location', dashboardUrl)
    .cookie('session', sessionInfo.token, {
      'secure': secureCookies,
      'expires': sessionInfo.expiration,
      'domain': toSubdomainWildcard(req.hostname),
      'signed': true,
    })
    .end();
};

function toSubdomainWildcard(host: string): string {
  if (/^[\d\.]*$|^\w+$/.test(host)) {
    return host;
  }
  return `.${host}`;
}
