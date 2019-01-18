import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {ensureEqual, ensurePropString} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {PodDbClient} from '../../../pod_db';
import {requireUserId} from '../../user';

export function routeUserDepositId(
    apiServer: ApiServer,
    podDb: PodDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user::user_id/deposit-id',
      async (req: Request, res: Response) => {
        await handleUserDepositId(
            podDb,
            req,
            res);
      });
}

async function handleUserDepositId(
    podDb: PodDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const requestedPublicUserId = ensurePropString(req.params, 'user_id');
  const [userId, requestedUserId] = await Promise.all([
    requireUserId(req, podDb),
    podDb.publicUserIdToInternalId(requestedPublicUserId),
  ]);
  ensureEqual(userId, requestedUserId, 'Permission denied.');
  const depositId = await podDb.getDepositId(userId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'deposit_id': depositId}));
};
