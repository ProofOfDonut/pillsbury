import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {PodDbClient} from '../../../pod_db';
import {getUserId} from '../../user';

export function routeUserIdentity(apiServer: ApiServer, podDb: PodDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user/identity',
      async (req: Request, res: Response) => {
        await handleUserIdentity(
            podDb,
            req,
            res);
      });
}

async function handleUserIdentity(
    podDb: PodDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await getUserId(req, podDb);
  let user: User|null = null;
  if (userId != 0) {
    user = await podDb.getUser(userId);
  }
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({user}));
};
