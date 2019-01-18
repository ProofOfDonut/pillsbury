import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {ensureEqual, ensurePropString} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {PodDbClient} from '../../../pod_db';
import {requireUserId} from '../../user';

export function routeUserAvailableErc20Withdrawals(
    apiServer: ApiServer,
    podDb: PodDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user::user_id/available-erc20-withdrawals',
      async (req: Request, res: Response) => {
        await handleUserAvailableErc20Withdrawals(
            podDb,
            req,
            res);
      });
}

async function handleUserAvailableErc20Withdrawals(
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
  const available = await podDb.getAvailableErc20Withdrawals(userId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({available}));
};
