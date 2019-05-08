import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {ensurePropObject} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {Fee} from '../../../common/types/Fee';
import {User} from '../../../common/types/User';
import {UserPermission} from '../../../common/types/UserPermission';
import {GlazeDbClient} from '../../../glaze_db';
import {requireUserId} from '../../user';

export function routeAppErc20WithdrawalFee(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/app/erc20-withdrawal-fee',
      async (req: Request, res: Response) => {
        await handleGetAppErc20WithdrawalFee(
            glazeDb,
            (await apiServer.config).isRootAdmin,
            req,
            res);
      });
  apiServer.addListener(
      HttpMethod.POST,
      '/app/erc20-withdrawal-fee',
      async (req: Request, res: Response) => {
        await handlePostAppErc20WithdrawalFee(
            glazeDb,
            (await apiServer.config).isRootAdmin,
            req,
            res);
      });
}

async function handleGetAppErc20WithdrawalFee(
    glazeDb: GlazeDbClient,
    isRootAdmin: (username: string) => boolean,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await requireUserId(req, glazeDb);
  await glazeDb.requireUserPermission(
      isRootAdmin,
      userId,
      UserPermission.EDIT_FEES);
  const fee = await glazeDb.getErc20WithdrawalFee();
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'fee': fee}));
};

async function handlePostAppErc20WithdrawalFee(
    glazeDb: GlazeDbClient,
    isRootAdmin: (username: string) => boolean,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await requireUserId(req, glazeDb);
  const fee = Fee.fromJSON(ensurePropObject(req.body, 'fee'));
  await glazeDb.setErc20WithdrawalFee(
      isRootAdmin,
      userId,
      fee);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'ok': true}));
};
