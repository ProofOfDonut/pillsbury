import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {ensureEqual, ensurePropString} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {GlazeDbClient} from '../../../glaze_db';
import {requireUserId} from '../../user';

export function routeUserDepositId(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user::user_id/deposit-id',
      async (req: Request, res: Response) => {
        await handleUserDepositId(
            glazeDb,
            req,
            res);
      });
}

async function handleUserDepositId(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const requestedPublicUserId = ensurePropString(req.params, 'user_id');
  const [userId, requestedUserId] = await Promise.all([
    requireUserId(req, glazeDb),
    glazeDb.publicUserIdToInternalId(requestedPublicUserId),
  ]);
  ensureEqual(userId, requestedUserId, 'Permission denied.');
  const depositId = await glazeDb.getDepositId(userId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'deposit_id': depositId}));
};
