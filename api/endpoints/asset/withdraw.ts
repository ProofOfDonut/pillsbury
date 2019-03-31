import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {getRandomString} from '../../../common/crypto/secure_random';
import {
  ensure,
  ensureEqual,
  ensurePropInEnum,
  ensurePropObject,
  ensurePropString,
  ensureSafeInteger,
} from '../../../common/ensure';
import {errorToString} from '../../../common/errors';
import {HttpMethod} from '../../../common/net/http_method';
import {formatNumber} from '../../../common/numbers/format';
import {AssetSymbol, assetSymbolFromString} from '../../../common/types/Asset';
import {EventLogType} from '../../../common/types/EventLogType';
import {SignedWithdrawal} from '../../../common/types/SignedWithdrawal';
import {WithdrawalType} from '../../../common/types/Withdrawal';
import {GlazeDbClient} from '../../../glaze_db';
import {EthereumClient} from '../../../lib/ethereum';
import {RedditClient} from '../../../lib/reddit';
import {RefundableError, sendRedditDonuts} from '../../../reddit_puppet';
import {abi} from '../../../token/BUIDL/output/Donut';
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
          ? req.body['username']
          : '';

  let erc20WithdrawalsAllowed: boolean|null = null;
  if (withdrawalType == WithdrawalType.ETHEREUM) {
    erc20WithdrawalsAllowed = await ethereumClient.withdrawalsAllowed();
    if (!erc20WithdrawalsAllowed) {
      throw new Error(
          'ERC-20 withdrawals are currently suspended for all accounts.');
    }
  }

  const withdrawalId = await glazeDb.withdraw(
      userId,
      withdrawalType,
      username,
      assetId,
      amount);
  let response: Object;
  let refundFailedWithdrawal = false;
  try {
    if (withdrawalType == WithdrawalType.REDDIT) {
      response = await sendToRedditUser(
          glazeDb,
          redditClient,
          redditPuppetHost,
          redditPuppetPort,
          withdrawalId,
          assetId,
          amount,
          username);
    } else {
      // If the call to `signWithdrawal` fails, we can assume that the
      // signed withdrawal was not successfully inserted into the database and
      // will not be returned to the user.
      refundFailedWithdrawal = true;
      ensure(erc20WithdrawalsAllowed);
      ensureEqual(withdrawalType, WithdrawalType.ETHEREUM);
      response = await signWithdrawal(
          glazeDb,
          ethereumClient,
          getContractAddress,
          withdrawalId,
          assetId,
          amount);
    }
  } catch (err) {
    const refund = refundFailedWithdrawal || RefundableError.is(err);
    const needsReview = !refund;
    glazeDb.withdrawalFailed(
        withdrawalId,
        String(err),
        needsReview,
        refund);
    glazeDb.logEvent(
        EventLogType.WITHDRAWAL_ERROR,
        JSON.stringify({
          'withdrawal_id': withdrawalId,
          'error': err,
          'needs_review': needsReview,
          'refunded': refund,
        }));
    throw err;
  }
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify(response));
}

async function sendToRedditUser(
    glazeDb: GlazeDbClient,
    redditClient: RedditClient,
    redditPuppetHost: string,
    redditPuppetPort: number,
    withdrawalId: number,
    assetId: number,
    amount: number,
    username: string):
    Promise<Object> {
  ensureEqual((await glazeDb.getAsset(assetId)).symbol, AssetSymbol.DONUT);
  // If this fails, we need to check the error. Some errors may tell us for
  // certain that the withdrawal wasn't executed, such as a failure to update
  // the authorization token from Reddit Puppet. In such cases, we can refund
  // the user's wallet in the DB. Otherwise, we'll still want to withdraw from
  // the DB since Reddit might send an error message for some reason even
  // though the donuts are actually sent. Any errors which can be refunded will
  // be thrown as `RefundableError`s.
  await sendRedditDonuts(
      glazeDb, redditPuppetHost, redditPuppetPort, username, amount);
  const formattedAmount = formatNumber(amount);
  // TODO: Retrieve reddit ID.
  const redditId = '';
  // If this fails, we can still consider the withdrawal itself a success.
  try {
    await redditClient.sendMessage(
        username,
        'Withdrawn donuts',
        `You have withdrawn ${formattedAmount} donuts to your Reddit account.`);
  } catch (err) {
    glazeDb.logEvent(
        EventLogType.REDDIT_WITHDRAWAL_CONFIRMATION_ERROR,
        JSON.stringify({
          'withdrawal_id': withdrawalId,
          'error': errorToString(err),
        }));
  }
  await glazeDb.redditWithdrawalSucceeded(withdrawalId, redditId);
  return {'message_id': redditId};
}

async function signWithdrawal(
    glazeDb: GlazeDbClient,
    ethereumClient: EthereumClient,
    getContractAddress: (chainId: number, assetId: number) => string,
    withdrawalId: number,
    assetId: number,
    amount: number):
    Promise<Object> {
  // TODO: Make chain ID a parameter?
  const chainId = 1;
  const address = getContractAddress(chainId, assetId);
  let signedWithdrawal: SignedWithdrawal = null;
  const nonce = await generateWithdrawalNonce();
  signedWithdrawal = await ethereumClient.signWithdrawalMessage(
      address,
      abi,
      nonce,
      amount);
  // This needs to be the last thing that's done in this function which could
  // possibly throw an exception. We're assuming that `signWithdrawal` will only
  // throw an exception if the withdrawal was not successfully inserted in the
  // database.
  await glazeDb.withdrawalSigned(withdrawalId, signedWithdrawal);
  return {'signed_withdrawal': signedWithdrawal};
}

async function generateWithdrawalNonce(): Promise<string> {
  const s = await getRandomString(40, '0123456789abcdef');
  return `0x${s}`;
}
