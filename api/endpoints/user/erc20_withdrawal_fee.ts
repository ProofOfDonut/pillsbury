import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {ensureEqual, ensurePropString} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {User} from '../../../common/types/User';
import {GlazeDbClient} from '../../../glaze_db';
import {requireUserId} from '../../user';

export function routeUserErc20WithdrawalFee(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user::user_id/erc20-withdrawal-fee',
      async (req: Request, res: Response) => {
        await handleUserErc20WithdrawalFee(
            glazeDb,
            req,
            res);
      });
}

async function handleUserErc20WithdrawalFee(
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
  // Currently all users have the same withdrawal fee.
  const fee = await glazeDb.getErc20WithdrawalFee();
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'fee': fee}));
};
