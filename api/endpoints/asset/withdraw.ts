import {Request, Response} from 'express';
import {
  ensurePropInEnum,
  ensurePropString,
  ensureSafeInteger,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {WithdrawalType} from '../../../common/types/Withdrawal';
import {GlazeDbClient} from '../../../glaze_db';
import {EthereumClient} from '../../../lib/ethereum';
import {RedditClient} from '../../../lib/reddit';
import {withdrawAsset} from '../../common/withdrawals';
import {ApiServer} from '../../server';
import {requireUserId} from '../../user';

export function routeAssetWithdraw(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient,
    redditClient: RedditClient,
    redditPuppetHost: string,
    redditPuppetPort: number,
    getContractAddress: (chainId: number, assetId: number) => string) {
  apiServer.addListener(
      HttpMethod.POST,
      '/asset::asset_id/withdraw::amount',
      async (req: Request, res: Response) => {
        const apiServerConfig = await apiServer.config;
        await handleAssetWithdraw(
            glazeDb,
            redditClient,
            redditPuppetHost,
            redditPuppetPort,
            apiServerConfig.ethereumClient,
            getContractAddress,
            req,
            res);
      });
}

async function handleAssetWithdraw(
    glazeDb: GlazeDbClient,
    redditClient: RedditClient,
    redditPuppetHost: string,
    redditPuppetPort: number,
    ethereumClient: EthereumClient,
    getContractAddress: (chainId: number, assetId: number) => string,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await requireUserId(req, glazeDb);
  const assetId = ensureSafeInteger(+ensurePropString(req.params, 'asset_id'));
  const amount = ensureSafeInteger(+ensurePropString(req.params, 'amount'));
  const withdrawalType =
      ensurePropInEnum<WithdrawalType>(
          req.body,
          'type',
          WithdrawalType);
  const username =
      withdrawalType == WithdrawalType.REDDIT
          ? ensurePropString(req.body, 'username')
          : '';

  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify(
        await withdrawAsset(
            glazeDb,
            redditClient,
            redditPuppetHost,
            redditPuppetPort,
            ethereumClient,
            getContractAddress,
            userId,
            assetId,
            amount,
            withdrawalType,
            username)));
}
