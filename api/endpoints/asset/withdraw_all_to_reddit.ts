import {Request, Response} from 'express';
import {ensurePropString} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {WithdrawalType} from '../../../common/types/Withdrawal';
import {GlazeDbClient} from '../../../glaze_db';
import {EthereumClient} from '../../../lib/ethereum';
import {RedditClient} from '../../../lib/reddit';
import {withdrawAsset} from '../../common/withdrawals';
import {ApiServer} from '../../server';
import {requireUserId} from '../../user';

export function routeAssetWithdrawAllToReddit(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient,
    redditClient: RedditClient,
    redditPuppetHost: string,
    redditPuppetPort: number,
    getContractAddress: (chainId: number, assetId: number) => string) {
  apiServer.addListener(
      HttpMethod.POST,
      '/asset/withdraw-all-to-reddit',
      async (req: Request, res: Response) => {
        const apiServerConfig = await apiServer.config;
        await handleAssetWithdrawAllToReddit(
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

async function handleAssetWithdrawAllToReddit(
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
  const username = ensurePropString(req.body, 'username');

  const balances = await glazeDb.getBalances(userId);
  for (const assetId of balances.getAssetIds()) {
    const amount = balances.getPlatformValue(assetId);
    if (amount > 0) {
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
          WithdrawalType.REDDIT,
          username);
    }
  }
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'ok': true}));
};
