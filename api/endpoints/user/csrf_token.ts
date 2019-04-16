import {Request, Response} from 'express';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';
import {GlazeDbClient} from '../../../glaze_db';

export function routeUserCsrfToken(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user/csrf-token',
      async (req: Request, res: Response) => {
        await handleUserCsrfToken(
            glazeDb,
            req,
            res);
      },
      false);
}

async function handleUserCsrfToken(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const csrfToken = await glazeDb.createCsrfToken();
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'token': csrfToken}));
}
