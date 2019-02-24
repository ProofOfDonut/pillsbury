import {
  ensureEqual, ensureObject, ensurePropArray, ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {AccountType} from '../common/types/Account';
import {AssetSymbol} from '../common/types/Asset';
import {QueuedTransaction} from '../common/types/QueuedTransaction';
import {
  EthereumClient, PendingTransaction, createEthereumClient,
} from '../lib/ethereum';
import {GlazeDbClient} from '../glaze_db';

export async function createEthereumSender(
    ethereumNodeConfigFile: string,
    glazeDb: GlazeDbClient,
    ethereumHubKeyFile: string,
    ethereumHubConfigFile: string):
    Promise<EthereumSender> {
  return new EthereumSender(
      await readConfig(
          ethereumNodeConfigFile,
          ethereumHubKeyFile,
          ethereumHubConfigFile),
      glazeDb);
}

export class EthereumSender {
  private config: Config;
  private ethereumClient: EthereumClient;
  private glazeDb: GlazeDbClient;

  constructor(
      config: Config,
      glazeDb: GlazeDbClient) {
    this.config = config;
    this.ethereumClient = createEthereumClient(
        this.config.host,
        this.config.ethereumHubKey,
        this.config.ethereumHubPassword);
    this.glazeDb = glazeDb;

    this.start();
  }

  private async start() {
    while (true) {
      const [tx, queuedTxId] = await this.glazeDb.getNextQueuedTransaction();
      if (tx) {
        await this.processTransaction(tx, queuedTxId);
      }
      await this.sleep(30000);
    }
  }

  private async processTransaction(tx: QueuedTransaction, queuedTxId: number) {
    const pendingTx = await this.ethereumClient.sendTransaction(tx);
    await this.glazeDb.setQueuedTransactionHash(queuedTxId, pendingTx.hash);
    await this.transactionSent(pendingTx);
    await this.glazeDb.dequeueTransaction(queuedTxId);
  }

  private async transactionSent(pendingTx: PendingTransaction) {
    while (true) {
      await this.sleep(20000);
      if (await this.ethereumClient.transactionSent(pendingTx.hash)) {
        return;
      }
    }
  }

  private async sleep(interval: number) {
    return new Promise(resolve => setTimeout(resolve, interval));
  }

  get host() {
    return this.config.host;
  }
}

async function readConfig(
    ethereumNodeConfigFile: string,
    ethereumHubKeyFile: string,
    ethereumHubConfigFile: string):
    Promise<Config> {
  const [
    ethereumNodeConfigString,
    ethereumHubKeyString,
    ethereumHubConfigString,
  ]: [string, string, string] = <[string, string, string]> await Promise.all([
    readFile(ethereumNodeConfigFile, 'utf8'),
    readFile(ethereumHubKeyFile, 'utf8'),
    readFile(ethereumHubConfigFile, 'utf8'),
  ]);
  const ethereumNodeConfig = JSON.parse(ethereumNodeConfigString);
  const ethereumHubKey = JSON.parse(ethereumHubKeyString);
  const ethereumHubPassword =
      ensurePropString(JSON.parse(ethereumHubConfigString), 'password');
  return new Config(
      ensureObject(ethereumNodeConfig),
      ensureObject(ethereumHubKey),
      ethereumHubPassword);
}

class Config {
  host: string;
  ethereumHubKey: Object;
  ethereumHubPassword: string;

  constructor(
      nodeConfig: Object,
      ethereumHubKey: Object,
      ethereumHubPassword: string) {
    this.host = ensurePropString(nodeConfig, 'host');
    this.ethereumHubKey = ethereumHubKey;
    this.ethereumHubPassword = ethereumHubPassword;
  }
}
