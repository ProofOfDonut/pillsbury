import {Request, Response} from 'express';
import {HttpMethod} from '../../../common/net/http_method';
import {SignedWithdrawal} from '../../../common/types/SignedWithdrawal';
import {GlazeDbClient} from '../../../glaze_db';
import {ApiServer} from '../../server';
import {requireUserId} from '../../user';

export function routeUserSignedWithdrawals(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user/signed-withdrawals',
      async (req: Request, res: Response) => {
        await handleUserGetSignedWithdrawals(
            glazeDb,
            req,
            res);
      },
      false);
}

async function handleUserGetSignedWithdrawals(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response) {
  const userId = await requireUserId(req, glazeDb);
  const signedWithdrawals = await glazeDb.getSignedWithdrawals(userId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify(signedWithdrawals));
}
