import {Map} from 'immutable';
import {
  ensure,
  ensureArray,
  ensureEqual,
  ensureObject,
  ensureProp,
  ensurePropDate,
  ensurePropInEnum,
  ensurePropNumber,
  ensurePropObject,
  ensurePropSafeInteger,
  ensurePropString,
  ensureSafeInteger,
  ensureString,
} from '../common/ensure';
import {errorToString} from '../common/errors';
import {Account} from '../common/types/Account';
import {
  Asset, AssetName, AssetSymbol, assetSymbolFromString,
} from '../common/types/Asset';
import {Balances} from '../common/types/Balances';
import {EventLogType} from '../common/types/EventLogType';
import {QueuedTransaction} from '../common/types/QueuedTransaction';
import {SignedWithdrawal} from '../common/types/SignedWithdrawal';
import {User} from '../common/types/User';
import {WithdrawalType} from '../common/types/Withdrawal';
import {
  ALL_USER_PERMISSION_VALUES, UserPermission,
} from '../common/types/UserPermission';
import {UserTerm} from '../common/types/UserTerm';
// TODO: glaze_db shouldn't import from reddit_monitor
import {DonutDelivery} from '../reddit_delivery_monitor';
import {PostgresClient, Transaction} from '../lib/postgres';
import {getTokenWithRefreshToken} from '../lib/reddit';
import {generateCsrfToken} from './csrf';
import {generateSessionToken} from './sessions';

type SessionInformation = {
  token: string;
  expiration: Date;
};
export class GlazeDbClient {
  private pgClient: PostgresClient;

  constructor(pgClient: PostgresClient) {
    this.pgClient = pgClient;
  }

  async getLastDeliveryId(): Promise<string> {
    const row = this.maybeOne(await this.pgClient.query`
      SELECT reddit_message_id
          FROM deliveries
          ORDER BY sent_time DESC
          LIMIT 1;`);
    if (!row) {
      return '';
    }
    return ensurePropString(row, 'reddit_message_id');
  }

  async addInboundDeliveries(
      deliveries: DonutDelivery[]):
      Promise<{delivery: DonutDelivery, returnAmount: number}[]> {
    const returnAmounts = await this.pgClient.transaction(tx => {
      const promises: Promise<number>[] = [];
      for (const delivery of deliveries) {
        promises.push(
            this.addInboundDelivery(tx, delivery));
      }
      return tx.batch<number>(promises);
    });
    return deliveries
      .map((delivery, i) => ({delivery, returnAmount: returnAmounts[i]}))
      .filter(u => u.returnAmount != -1);
  }

  // Returns true if the delivery is successfully added.
  // Returns false if the delivery had previously been added.
  // Throws an exception if an unexpected error occurs.
  private async addInboundDelivery(
      tx: Transaction,
      delivery: DonutDelivery):
      Promise<number> {
    const row = this.ensureOne(await tx.query`
      SELECT add_inbound_delivery(
          ${delivery.id},
          'ethtrader',
          ${delivery.from},
          ${delivery.amount},
          ${delivery.date});`);
    return ensurePropNumber(row, 'add_inbound_delivery');
  }

  async getLastErc20DepositBlock(): Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT value FROM vars WHERE key = 'last_erc20_deposit_block' LIMIT 1;`);
    return ensureSafeInteger(+ensurePropString(row, 'value'));
  }

  async getDepositId(userId: number): Promise<string> {
    const row = this.ensureOne(await this.pgClient.query`
      INSERT INTO erc20_deposit_ids
          (user_id)
          VALUES (${userId})
          RETURNING deposit_id;`);
    return ensurePropString(row, 'deposit_id');
  }

  async deposit(
      assetId: number,
      block: number,
      transaction: string,
      from: string,
      depositId: string,
      amount: number) {
    try {
      await this.pgClient.query`
        SELECT deposit_erc20(
            ${assetId},
            ${block},
            ${transaction},
            ${from},
            ${depositId},
            ${amount})`;
    } catch (err) {
      // Ignore "Invalid public user ID" errors.
      if (err && err.message && /^\[0\]/.test(err.message)) {
        console.warn(
            `WARNING: Ignoring deposit for unknown deposit ID "${depositId}".`);
      } else {
        throw err;
      }
    }
  }

  async createCsrfToken(): Promise<string> {
    const csrfToken = await generateSessionToken();
    await this.pgClient.query`
      INSERT INTO csrf_tokens (token) VALUES (${csrfToken})`;
    return csrfToken;
  }

  async checkCsrfToken(token: string): Promise<void> {
    const T = token.slice(0, 128);
    const exists = await this.pgClient.query`
      SELECT 1 FROM csrf_tokens WHERE token = ${T} LIMIT 1;`;
    if (exists.length == 0) {
      throw new Error('Failed CSRF token check.');
    }
  }

  async createSession(
      redditUsername: string,
      accessToken: string,
      refreshToken: string):
      Promise<SessionInformation> {
    const sessionToken = await generateSessionToken();
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30);
    await this.pgClient.query`
      SELECT create_session_for_reddit_user(
          ${sessionToken}::text,
          ${redditUsername}::text,
          ${accessToken}::text,
          ${refreshToken}::text,
          ${expiration}::timestamptz)`;
    return {
      token: sessionToken,
      expiration,
    };
  }

  async getUserId(sessionToken: string): Promise<number> {
    const T = sessionToken.slice(0, 128);
    const rows = await this.pgClient.query`
      SELECT user_id
          FROM sessions
          WHERE token = ${T}
              AND active
              AND expiration > ${new Date()}
          LIMIT 1;`;
    ensureArray(rows);
    if (rows.length == 0) {
      return 0;
    }
    ensureEqual(rows.length, 1);
    const row = ensureObject(rows[0]);
    return ensurePropNumber(row, 'user_id');
  }

  async publicUserIdToInternalId(publicId: string): Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT id FROM users WHERE public_id = ${publicId};`);
    return ensurePropSafeInteger(row, 'id');
  }

  async getUser(id: number): Promise<User> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT u.public_id, ra.username
          FROM users u
          INNER JOIN reddit_accounts ra ON ra.user_id = u.id
          WHERE u.id = ${id}
          LIMIT 1;`);
    const publicId = ensurePropString(row, 'public_id');
    const username = ensurePropString(row, 'username');
    return new User(publicId, username);
  }

  async getUsername(id: number): Promise<string> {
    const row = this.ensureOne(await this.pgClient.query`
        SELECT username FROM reddit_accounts WHERE user_id = ${id} LIMIT 1;`);
    return ensurePropString(row, 'username');
  }

  async getUserPermissions(
      isRootAdmin: (username: string) => boolean,
      id: number):
      Promise<UserPermission[]> {
    const [username, rows] = await Promise.all([
      this.getUsername(id),
      this.pgClient.query`
        SELECT rp.permission
            FROM role_permissions rp
            INNER JOIN user_roles ur
                ON ur.role = rp.role
            WHERE ur.user_id = ${id};`,
    ]);
    if (isRootAdmin(username)) {
      return ALL_USER_PERMISSION_VALUES;
    }
    const permissions: UserPermission[] = [];
    for (const row of rows) {
      permissions.push(
          ensurePropInEnum<UserPermission>(row, 'permission', UserPermission));
    }
    return permissions;
  }

  async logout(token: string): Promise<void> {
    await this.pgClient.query`
        UPDATE sessions SET active = FALSE WHERE token = ${token};`;
  }

  async getRedditAccessToken(
      redditClientId: string,
      redditSecret: string,
      userId: number,
      redditUsername: string):
      Promise<string> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT access_token, refresh_token, access_token_expiration
          FROM reddit_accounts
          WHERE user_id = ${userId}
              AND username = ${redditUsername};`);
    const accessToken = ensurePropString(row, 'access_token');
    const refreshToken = ensurePropString(row, 'refresh_token');
    const accessTokenExpiration =
        ensurePropDate(row, 'access_token_expiration');
    if (Date.now() + 1000 * 60 * 3 >= +accessTokenExpiration) {
      const tokenInfo = await getTokenWithRefreshToken(
          refreshToken,
          redditClientId,
          redditSecret);
      await this.pgClient.query`
        UPDATE reddit_accounts
            SET access_token = ${tokenInfo.accessToken},
                access_token_expiration = ${new Date(tokenInfo.expiration)}
            WHERE user_id = ${userId}
                AND username = ${redditUsername};`;
      return tokenInfo.accessToken;
    }
    return accessToken;
  }

  async getBalances(userId: number): Promise<Balances> {
    const rows = await this.pgClient.query`
      SELECT asset_id, balance FROM balances WHERE user_id = ${userId};`;
    ensureArray(rows);
    let map = Map<number, number>();
    for (const row of rows) {
      ensureObject(row);
      map = map.set(
          ensurePropNumber(row, 'asset_id'),
          ensurePropNumber(row, 'balance'));
    }
    return new Balances(map);
  }

  async getAsset(id: number): Promise<Asset> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT subreddit, name_singular, name_plural, symbol
          FROM assets
          WHERE id = ${id};`);
    return new Asset(
        id,
        ensurePropString(row, 'subreddit'),
        new AssetName(
            ensurePropString(row, 'name_singular'),
            ensurePropString(row, 'name_plural')),
        assetSymbolFromString(ensurePropString(row, 'symbol')));
  }

  async getAssetBySymbol(symbol: AssetSymbol): Promise<Asset> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT id, subreddit, name_singular, name_plural
          FROM assets
          WHERE symbol = ${symbol};`);
    return new Asset(
        ensurePropSafeInteger(row, 'id'),
        ensurePropString(row, 'subreddit'),
        new AssetName(
            ensurePropString(row, 'name_singular'),
            ensurePropString(row, 'name_plural')),
        symbol);
  }

  async withdraw(
      userId: number,
      type: WithdrawalType,
      username: string,
      assetId: number,
      amount: number,
      updateBalance: boolean):
      Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT withdraw(
          ${userId},
          ${type},
          ${username},
          ${assetId},
          ${amount},
          ${updateBalance});`);
    return ensurePropNumber(row, 'withdraw');
  }

  async withdrawalSigned(
      id: number,
      signedWithdrawal: SignedWithdrawal):
      Promise<void> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT from_user_id, amount, asset_id
          FROM withdrawals
          WHERE id = ${id}
          LIMIT 1;`);
    const userId = ensurePropSafeInteger(row, 'from_user_id');
    const amount = ensurePropSafeInteger(row, 'amount');
    const assetId = ensurePropSafeInteger(row, 'asset_id');

    await this.pgClient.transaction(tx => {
      const promises = [];
      promises.push(tx.query`
        UPDATE balances
            SET balance = balance - ${amount}
            WHERE user_id = ${userId}
                AND asset_id = ${assetId};`);
      promises.push(tx.query`
        UPDATE withdrawals
            SET receipt = (
                  'ethereum_signed_withdrawal',
                  ${JSON.stringify(signedWithdrawal)}
                )::withdrawal_receipt,
                needs_manual_review = FALSE,
                balance_updated = TRUE
            WHERE id = ${id};`);
      return tx.batch(promises);
    });
  }

  async redditWithdrawalSucceeded(
      id: number,
      redditId: string):
      Promise<void> {
    await this.pgClient.query`
      UPDATE withdrawals
          SET receipt = (
                'reddit_message_id',
                ${redditId}
              )::withdrawal_receipt,
              success = TRUE,
              needs_manual_review = FALSE
          WHERE id = ${id};`;
  }

  async withdrawalFailed(
      id: number,
      errorMessage: string,
      withdrawalNeedsReview: boolean,
      refundWithdrawal: boolean):
      Promise<void> {
    // We're expecting these values to be inverses. The reason we're requiring
    // both to be passed is simply to confirm that funds are actually going to
    // be refunded if `withdrawalNeedsReview` is false.
    ensure(withdrawalNeedsReview != refundWithdrawal);
    let refunded = false;
    if (refundWithdrawal) {
      try {
        await this.refundFailedWithdrawal(id);
        refunded = true;
      } catch (err) {
        console.warn(
            `WARNING: Error refunding withdrawal: ${errorToString(err)}`);
        this.logEvent(
            EventLogType.WITHDRAWAL_REFUND_ERROR,
            JSON.stringify({
              'withdrawal_id': id,
              'error': errorToString(err),
            }));
      }
    }
    await this.pgClient.query`
      UPDATE withdrawals
          SET success = FALSE,
              error = ${errorMessage},
              needs_manual_review = ${withdrawalNeedsReview},
              balance_updated = balance_updated AND ${!refunded}
          WHERE id = ${id};`;
  }

  private async refundFailedWithdrawal(id: number): Promise<void> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT from_user_id,
             asset_id,
             amount,
             success,
             error
          FROM withdrawals
          WHERE id = ${id}
          LIMIT 1;`);
    const userId = ensurePropSafeInteger(row, 'from_user_id');
    const assetId = ensurePropSafeInteger(row, 'asset_id');
    const amount = ensurePropSafeInteger(row, 'amount');
    const successRaw = ensureProp(row, 'success');
    let success: boolean|null = null;
    if (typeof successRaw == 'boolean') {
      success = <boolean> successRaw;
    } else {
      ensureEqual(successRaw, null);
    }
    const error = ensurePropString(row, 'error');
    // Sanity check to ensure that this withdrawal hasn't been refunded already.
    ensure(success == null && error == '');
    await this.pgClient.query`
      UPDATE balances
          SET balance = balance + ${amount}
          WHERE user_id = ${userId}
              AND asset_id = ${assetId};`;
  }

  async enqueueTransaction(tx: QueuedTransaction): Promise<string> {
    const row = this.ensureOne(await this.pgClient.query`
      INSERT INTO queued_transactions
          (
            _from,
            gas_limit,
            _to,
            value,
            data,
            chain_id
          )
          VALUES (
            ${tx.from},
            ${tx.gasLimit},
            ${tx.to},
            ${tx.value},
            ${tx.data},
            ${tx.chainId}
          )
          RETURNING id;`);
    const queuedTransactionId = ensurePropSafeInteger(row, 'id');
    return `queued-tx:${queuedTransactionId}`;
  }

  async setQueuedTransactionHash(
      id: number,
      transactionId: string):
      Promise<void> {
    await this.pgClient.query`
      UPDATE queued_transactions
          SET receipt = (
            'ethereum_transaction_id',
            ${transactionId}
          )::withdrawal_receipt
          WHERE id = ${id};`;
  }

  async getNextQueuedTransaction(): Promise<[QueuedTransaction, number]> {
    const rows = ensureArray(await this.pgClient.query`
        SELECT id, _from, gas_limit, _to, value, data, chain_id
            FROM queued_transactions
            WHERE NOT processed
            ORDER BY id ASC
            LIMIT 1;`);
    if (rows.length == 0) {
      return [null, 0];
    }
    ensureEqual(rows.length, 1);
    const row = ensureObject(rows[0]);
    return [
      new QueuedTransaction({
        from: ensurePropString(row, '_from'),
        gasLimit: ensurePropString(row, 'gas_limit'),
        to: ensurePropString(row, '_to'),
        value: ensurePropString(row, 'value'),
        data: ensurePropString(row, 'data'),
        chainId: ensurePropSafeInteger(row, 'chain_id'),
      }),
      ensurePropSafeInteger(row, 'id'),
    ];
  }

  async dequeueTransaction(id: number) {
    await this.pgClient.query`
        UPDATE queued_transactions
            SET processed = TRUE
            WHERE id = ${id};`
  }

  // Returns the maximum amount of allowed ERC-20 withdrawals if the provider is
  // paying gas costs. This functionality has been replaced by withdrawals that
  // are paid for by the user.
  // TODO: Remove this?
  async getAvailableErc20Withdrawals(userId: number): Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT get_available_erc20_withdrawals(${userId});`);
    return ensurePropNumber(row, 'get_available_erc20_withdrawals');
  };

  async getSignedWithdrawals(userId: number): Promise<SignedWithdrawal[]> {
    const rows = await this.pgClient.query`
      SELECT asset_id, (receipt).value AS signed_withdrawal
          FROM withdrawals
          WHERE from_user_id = ${userId}
              AND (receipt).type = 'ethereum_signed_withdrawal';`;
    return rows.map(row => {
      const info = JSON.parse(ensurePropString(row, 'signed_withdrawal'));
      return new SignedWithdrawal(
          ensurePropSafeInteger(row, 'asset_id'),
          ensurePropString(info, 'nonce'),
          ensurePropSafeInteger(info, 'amount'),
          ensurePropString(info, 'r'),
          ensurePropString(info, 's'),
          ensurePropString(info, 'v'));
    });
  }

  // TODO: Remove? I think this is unused.
  async getNextNonce(address: string): Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT get_next_nonce(${address});`);
    return ensurePropNumber(row, 'get_next_nonce');
  }

  async getNextRefund(
      assetId: number):
      Promise<{username: string, amount: number}|null> {
    const rows = await this.pgClient.query`
      SELECT to_json(get_next_refund(${assetId}));`;
    if (rows.length == 0) {
      return null;
    }
    const row = this.ensureOne(rows);
    const refund = ensurePropObject(row, 'to_json');
    return {
      username: ensurePropString(refund, 'username'),
      amount: ensurePropNumber(refund, 'amount'),
    };
  }

  async getRedditHubBearerToken(): Promise<string> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT value
          FROM vars
          WHERE key = 'reddit_hub_bearer_token';`);
    return ensurePropString(row, 'value');
  }

  async setRedditHubBearerToken(token: string) {
    await this.pgClient.query`
      UPDATE vars
          SET value = ${token}
          WHERE key = 'reddit_hub_bearer_token';`;
  }

  async deliveriesEnabled(): Promise<boolean> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT value
          FROM vars
          WHERE key = 'deliveries_enabled';`);
    const value = ensurePropString(row, 'value');
    if (value == 'true') {
      return true;
    }
    if (value == 'false') {
      return false;
    }
    throw new Error(`Unexpected deliveries_enabled value "${value}".`);
  }

  async getSubredditIdByRedditId(redditId: string): Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT id FROM subreddits WHERE reddit_id = ${redditId};`);
    return ensurePropSafeInteger(row, 'id');
  }

  // Return value indicates the number of points found in excess of what was
  // expected. If fewer points are found than expected, then the number will be
  // negative.
  async logSubredditBalance(
      subredditId: number,
      assetId: number,
      amount: number):
      Promise<number> {
    const expectedAmount = await this.getExpectedRedditHubBalance(assetId);
    // Only log when the balance changes.
    const row = this.maybeOne(await this.pgClient.query`
      SELECT amount, expected_amount
          FROM subreddit_balance_logs
          WHERE subreddit_id = ${subredditId}
          ORDER BY creation_time DESC
          LIMIT 1;`);
    let oldAmount: number = 0;
    let oldExpectedAmount: number = 0;
    if (row) {
      oldAmount = ensurePropSafeInteger(row, 'amount');
      oldExpectedAmount = ensurePropSafeInteger(row, 'expected_amount');
    }
    if (amount != oldAmount || expectedAmount != oldExpectedAmount) {
      await this.pgClient.query`
          INSERT INTO subreddit_balance_logs
              (subreddit_id, amount, expected_amount)
              VALUES (${subredditId}, ${amount}, ${expectedAmount});`;
    }
    return amount - expectedAmount;
  }

  // Returns the balance that's expected to be held in the Reddit hub accounts.
  private async getExpectedRedditHubBalance(assetId: number): Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT
          (SELECT coalesce(sum(deposited_amount), 0)
              FROM deliveries
              WHERE asset_id = ${assetId})
          - (SELECT coalesce(sum(amount), 0)
              FROM withdrawals
              WHERE asset_id = ${assetId}
                  AND (recipient).type = 'reddit_user'
                  AND (success OR success IS NULL)) AS sum;`);
    return ensureSafeInteger(+ensurePropString(row, 'sum'));
  }

  async getUnacceptedUserTerms(userId: number): Promise<UserTerm[]> {
    return this.rowsToUserTerms(await this.pgClient.query`
      SELECT ut.id, ut.title, ut.value, ut.accept_label
          FROM user_terms ut
          WHERE NOT deleted
              AND NOT EXISTS (
                  SELECT 1
                      FROM accepted_user_terms aut
                      WHERE aut.user_id = ${userId}
                          AND aut.user_term_id = ut.id
                      LIMIT 1);`);
  }

  async acceptUserTerm(userId: number, termId: number) {
    await this.pgClient.query`
      INSERT INTO accepted_user_terms (user_id, user_term_id)
          VALUES (${userId}, ${termId});`;
  }

  async getAllUserTerms(
      isRootAdmin: (username: string) => boolean,
      userId: number):
      Promise<UserTerm[]> {
    const [_, rows] = await Promise.all([
      this.requireUserPermission(
          isRootAdmin,
          userId,
          UserPermission.EDIT_USER_TERMS),
      this.pgClient.query`
        SELECT id, title, value, accept_label
            FROM user_terms
            WHERE NOT deleted;`,
    ]);
    return this.rowsToUserTerms(rows);
  }

  async updateUserTerms(
      isRootAdmin: (username: string) => boolean,
      userId: number,
      terms: UserTerm[]):
      Promise<number[]> {
    await this.requireUserPermission(
        isRootAdmin,
        userId,
        UserPermission.EDIT_USER_TERMS);
    const termIds = new Set<number>();
    const newTermIds: number[] = [];
    for (const term of terms) {
      if (term.id == 0) {
        const row = this.ensureOne(await this.pgClient.query`
          INSERT INTO user_terms (title, value, accept_label)
              VALUES (${term.title}, ${term.text}, ${term.acceptLabel})
              RETURNING id;`);
        const id = ensurePropSafeInteger(row, 'id');
        ensure(!termIds.has(id));
        termIds.add(id);
        newTermIds.push(id);
      } else {
        ensure(!termIds.has(term.id));
        termIds.add(term.id);
        await this.pgClient.query`
          UPDATE user_terms
              SET title=${term.title},
                  value = ${term.text},
                  accept_label=${term.acceptLabel}
              WHERE id = ${term.id};`;
      }
    }
    await this.pgClient.query`
      UPDATE user_terms SET deleted = TRUE WHERE id != ALL(${[...termIds]});`;
    return newTermIds;
  }

  private async requireUserPermission(
      isRootAdmin: (username: string) => boolean,
      userId: number,
      permission: UserPermission) {
    ensure(this.hasUserPermission(isRootAdmin, userId, permission),
        'Insufficient permissions');
  }

  private async hasUserPermission(
      isRootAdmin: (username: string) => boolean,
      userId: number,
      permission: UserPermission):
      Promise<boolean> {
    const permissions = await this.getUserPermissions(isRootAdmin, userId);
    return permissions.includes(permission);
  }

  private rowsToUserTerms(rows: Object[]): UserTerm[] {
    const terms: UserTerm[] = [];
    for (const row of rows) {
      const id = ensurePropSafeInteger(row, 'id');
      const title = ensurePropString(row, 'title');
      const text = ensurePropString(row, 'value');
      const acceptLabel = ensurePropString(row, 'accept_label');
      terms.push(new UserTerm(id, title, text, acceptLabel));
    }
    return terms;
  }

  async getSupportSubreddit() {
    // TODO: Make this configurable.
    return 'donuttrader';
  }

  async logEvent(type: EventLogType, data: string) {
    await this.pgClient.query`
      INSERT INTO event_logs (type, data)
          VALUES (${type}, ${data});`;
  }

  private ensureOne(rows: any): Object {
    const R = ensureArray(rows);
    ensureEqual(rows.length, 1);
    return ensureObject(rows[0]);
  }

  private maybeOne(rows: any): Object|null {
    ensureArray(rows);
    if (rows.length == 0) {
      return null;
    }
    return this.ensureOne(rows);
  }
}
