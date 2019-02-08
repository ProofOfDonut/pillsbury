import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {GlazeDbClient} from '../../../glaze_db';
import {getUserId} from '../../user';

export function routeUserIdentity(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user/identity',
      async (req: Request, res: Response) => {
        await handleUserIdentity(
            glazeDb,
            req,
            res);
      });
}

async function handleUserIdentity(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await getUserId(req, glazeDb);
  let user: User|null = null;
  if (userId != 0) {
    user = await glazeDb.getUser(userId);
  }
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({user}));
};
