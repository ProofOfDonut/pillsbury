import {Map} from 'immutable';
import {
  ensureArray,
  ensureEqual,
  ensureObject,
  ensurePropDate,
  ensurePropNumber,
  ensurePropObject,
  ensurePropSafeInteger,
  ensurePropString,
  ensureSafeInteger,
  ensureString,
} from '../common/ensure';
import {Account} from '../common/types/Account';
import {
  Asset, AssetName, AssetSymbol, assetSymbolFromString,
} from '../common/types/Asset';
import {Balances} from '../common/types/Balances';
import {QueuedTransaction} from '../common/types/QueuedTransaction';
import {User} from '../common/types/User';
// TODO: pod_db shouldn't import from reddit_monitor
import {DonutDelivery} from '../reddit_monitor';
import {PostgresClient, Transaction} from '../lib/postgres';
import {getTokenWithRefreshToken} from '../lib/reddit';
import {generateCsrfToken} from './csrf';
import {generateSessionToken} from './sessions';

type SessionInformation = {
  token: string;
  expiration: Date;
};
export class PodDbClient {
  private pgClient: PostgresClient;

  constructor(pgClient: PostgresClient) {
    this.pgClient = pgClient;
  }

  async getLastDeliveryId(): Promise<string> {
    const rows = await this.pgClient.query`
      SELECT reddit_message_id
          FROM deliveries
          ORDER BY sent_time DESC
          LIMIT 1;`;
    ensureArray(rows);
    if (rows.length == 0) {
      return '';
    }
    ensureEqual(rows.length, 1);
    const row = <Object> ensureObject(rows[0]);
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
          WHERE u.id = ${id} LIMIT 1;`);
    const publicId = ensurePropString(row, 'public_id');
    const username = ensurePropString(row, 'username');
    return new User(publicId, username);
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

  async getAssetContractDetails(
      id: number,
      chainId: number):
      Promise<{address: string, abi: any}> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT c.address, a.abi
          FROM assets a
          INNER JOIN contracts c
              ON c.asset_id = a.id
          WHERE a.id = ${id} AND c.chain_id = ${chainId}
          LIMIT 1;`);
    return {
      address: ensurePropString(row, 'address'),
      abi: JSON.parse(ensurePropString(row, 'abi')),
    };
  }

  async withdraw(
      userId: number,
      to: Account,
      assetId: number,
      amount: number):
      Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT withdraw(${userId}, ${to}, ${assetId}, ${amount});`);
    return ensurePropNumber(row, 'withdraw');
  }

  async updateWithdrawal(id: number, transactionId: string): Promise<void> {
    await this.pgClient.query`
      UPDATE withdrawals
          SET transaction_id = ${transactionId}
          WHERE id = ${id};`;
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
          SET transaction_id = ${transactionId}
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

  async getAvailableErc20Withdrawals(userId: number): Promise<number> {
    const row = this.ensureOne(await this.pgClient.query`
      SELECT get_available_erc20_withdrawals(${userId});`);
    return ensurePropNumber(row, 'get_available_erc20_withdrawals');
  };

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

  private ensureOne(rows: any): Object {
    const R = ensureArray(rows);
    ensureEqual(rows.length, 1);
    return ensureObject(rows[0]);
  }
}
