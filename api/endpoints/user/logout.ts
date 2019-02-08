import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {GlazeDbClient} from '../../../glaze_db';
import {getSessionToken} from '../../request';
import {getUserId} from '../../user';

export function routeUserLogout(apiServer: ApiServer, glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.POST,
      '/user/logout',
      async (req: Request, res: Response) => {
        await handleUserLogout(
            glazeDb,
            req,
            res);
      });
}

async function handleUserLogout(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  await glazeDb.logout(getSessionToken(req));
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .clearCookie('session')
    .end(JSON.stringify({'done': true}));
};

function toSubdomainWildcard(host: string): string {
  if (/^[\d\.]*$|^\w+$/.test(host)) {
    return host;
  }
  return `.${host}`;
}
