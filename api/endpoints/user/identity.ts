import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {UserPermission} from '../../../common/types/UserPermission';
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
            (await apiServer.config).isRootAdmin,
            req,
            res);
      });
}

async function handleUserIdentity(
    glazeDb: GlazeDbClient,
    isRootAdmin: (username: string) => boolean,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await getUserId(req, glazeDb);
  const [user, permissions]: [User|null, UserPermission[]] =
      userId
      ? await Promise.all([
        glazeDb.getUser(userId),
        glazeDb.getUserPermissions(isRootAdmin, userId)
      ])
      : [null, []];
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({user, permissions}));
};
