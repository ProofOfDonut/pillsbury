import {getRandomString} from '../../common/crypto/secure_random';
import {
  ensure,
  ensureEqual,
} from '../../common/ensure';
import {errorToString} from '../../common/errors';
import {formatNumber} from '../../common/numbers/format';
import {AssetSymbol} from '../../common/types/Asset';
import {EventLogType} from '../../common/types/EventLogType';
import {SignedWithdrawal} from '../../common/types/SignedWithdrawal';
import {WithdrawalType} from '../../common/types/Withdrawal';
import {GlazeDbClient} from '../../glaze_db';
import {EthereumClient} from '../../lib/ethereum';
import {RedditClient} from '../../lib/reddit';
import {RefundableError, sendRedditDonuts} from '../../reddit_puppet';
import {abi} from '../../token/BUIDL/output/Donut';

export async function withdrawAsset(
    glazeDb: GlazeDbClient,
    redditClient: RedditClient,
    redditPuppetHost: string,
    redditPuppetPort: number,
    ethereumClient: EthereumClient,
    getContractAddress: (chainId: number, assetId: number) => string,
    userId: number,
    assetId: number,
    amount: number,
    withdrawalType: WithdrawalType,
    // Pass '' if WithdrawalType is ETHEREUM.
    username: string):
    Promise<Object> {
  let erc20WithdrawalsAllowed: boolean|null = null;
  if (withdrawalType == WithdrawalType.ETHEREUM) {
    ensureEqual(username, '');
    erc20WithdrawalsAllowed = await ethereumClient.withdrawalsAllowed();
    if (!erc20WithdrawalsAllowed) {
      throw new Error(
          'ERC-20 withdrawals are currently suspended for all accounts.');
    }
  } else {
    ensure(username != '');
  }

  const updateBalanceInitially = withdrawalType != WithdrawalType.ETHEREUM;
  const withdrawalId = await glazeDb.withdraw(
      userId,
      withdrawalType,
      username,
      assetId,
      amount,
      updateBalanceInitially);
  let response: Object;
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
      ensure(erc20WithdrawalsAllowed);
      ensureEqual(withdrawalType, WithdrawalType.ETHEREUM);
      glazeDb.logEvent(
          EventLogType.SIGN_WITHDRAWAL,
          JSON.stringify({
            'withdrawal_id': withdrawalId,
          }));
      response = await signWithdrawal(
          glazeDb,
          ethereumClient,
          getContractAddress,
          withdrawalId,
          assetId,
          amount);
      glazeDb.logEvent(
          EventLogType.WITHDRAWAL_SIGNED,
          JSON.stringify({
            'withdrawal_id': withdrawalId,
          }));
    }
  } catch (err) {
    const refund = updateBalanceInitially && RefundableError.is(err);
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

  return response;
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
  glazeDb.logEvent(
      EventLogType.DEBUG,
      JSON.stringify({
        'message': 'Generating withdrawal nonce.',
        'withdrawal_id': withdrawalId,
      })); 
  const nonce = await generateWithdrawalNonce();
  // The `signWithdrawal` method has been seen failing to complete signing a
  // withdrawal, so tracking each step for now to see where it is failing.
  glazeDb.logEvent(
      EventLogType.DEBUG,
      JSON.stringify({
        'message': 'Signing withdrawal message.',
        'withdrawal_id': withdrawalId,
        'nonce': nonce,
      })); 
  signedWithdrawal = await ethereumClient.signWithdrawalMessage(
      address,
      abi,
      assetId,
      nonce,
      amount);
  glazeDb.logEvent(
      EventLogType.DEBUG,
      JSON.stringify({
        'message': 'Inserting signed withdrawal into database.',
        'withdrawal_id': withdrawalId,
      })); 
  await glazeDb.withdrawalSigned(withdrawalId, signedWithdrawal);
  return {'signed_withdrawal': signedWithdrawal};
}

async function generateWithdrawalNonce(): Promise<string> {
  const s = await getRandomString(40, '0123456789abcdef');
  return `0x${s}`;
}
