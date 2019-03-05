import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {
  ensure, ensureEqual, ensurePropObject, ensurePropString, ensureSafeInteger,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {formatNumber} from '../../../common/numbers/format';
import {AssetSymbol, assetSymbolFromString} from '../../../common/types/Asset';
import {Account, AccountType} from '../../../common/types/Account';
import {GlazeDbClient} from '../../../glaze_db';
import {EthereumClient} from '../../../lib/ethereum';
import {RedditClient} from '../../../lib/reddit';
import {sendRedditDonuts} from '../../../reddit_puppet';
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
  const to = Account.fromJSON(ensurePropObject(req.body, 'to'));

  let erc20WithdrawalsAllowed: boolean|null = null;
  if (to.type == AccountType.ETHEREUM_ADDRESS) {
    erc20WithdrawalsAllowed = await ethereumClient.withdrawalsAllowed();
    if (!erc20WithdrawalsAllowed) {
      throw new Error(
          'ERC-20 withdrawals are currently suspended for all accounts.');
    }
  }

  const withdrawalId = await glazeDb.withdraw(
      userId,
      to,
      assetId,
      amount);
  let response: Object = {};
  if (to.type == AccountType.REDDIT_USER) {
    ensureEqual((await glazeDb.getAsset(assetId)).symbol, AssetSymbol.DONUT);
    // If this fails, we still want to withdraw from the DB since Reddit might
    // send an error message for some reason even though the donuts are actually
    // sent.
    await sendRedditDonuts(
        glazeDb, redditPuppetHost, redditPuppetPort, to.value, amount);
    const formattedAmount = formatNumber(amount);
    await redditClient.sendMessage(
        to.value,
        'Withdrawn donuts',
        `You have withdrawn ${formattedAmount} donuts to your Reddit account.`);
    // TODO: Retrieve reddit ID.
    const redditId = '';
    await glazeDb.updateWithdrawal(withdrawalId, redditId);
    response = {'transaction_id': redditId};
  } else {
    ensure(erc20WithdrawalsAllowed);
    ensureEqual(to.type, AccountType.ETHEREUM_ADDRESS);
    // TODO: Make chain ID a parameter?
    const chainId = 1;
    const address = getContractAddress(chainId, assetId);
    const {abi} = await glazeDb.getAssetContractDetails(assetId);
    const tx = await ethereumClient.getMintTokenTransaction(
        address,
        abi,
        to.value,
        amount);
    const queuedTransactionId = await glazeDb.enqueueTransaction(tx);
    await glazeDb.updateWithdrawal(withdrawalId, queuedTransactionId);
    response = {'transaction_id': queuedTransactionId};
  }
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify(response));
}
