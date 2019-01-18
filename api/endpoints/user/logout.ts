import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {PodDbClient} from '../../../pod_db';
import {getSessionToken} from '../../request';
import {getUserId} from '../../user';

export function routeUserLogout(apiServer: ApiServer, podDb: PodDbClient) {
  apiServer.addListener(
      HttpMethod.POST,
      '/user/logout',
      async (req: Request, res: Response) => {
        await handleUserLogout(
            podDb,
            req,
            res);
      });
}

async function handleUserLogout(
    podDb: PodDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  await podDb.logout(getSessionToken(req));
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
