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
    configFile: string,
    glazeDb: GlazeDbClient,
    masterKeyFile: string,
    masterKeyPwFile: string):
    Promise<EthereumSender> {
  return new EthereumSender(
      await readConfig(configFile, masterKeyFile, masterKeyPwFile),
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
        this.config.masterKey,
        this.config.masterKeyPw);
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
    configFile: string,
    masterKeyFile: string,
    masterKeyPwFile: string):
    Promise<Config> {
  const [
    configString,
    masterKeyString,
    masterKeyPwString,
  ]: [string, string, string] = <[string, string, string]> await Promise.all([
    readFile(configFile, 'utf8'),
    readFile(masterKeyFile, 'utf8'),
    readFile(masterKeyPwFile, 'utf8'),
  ]);
  const config = JSON.parse(configString);
  const masterKey = JSON.parse(masterKeyString);
  const masterKeyPw =
      ensurePropString(JSON.parse(masterKeyPwString), 'password');
  return new Config(ensureObject(config), ensureObject(masterKey), masterKeyPw);
}

class Config {
  host: string;
  masterKey: Object;
  masterKeyPw: string;

  constructor(info: Object, masterKey: Object, masterKeyPw: string) {
    this.host = ensurePropString(info, 'host');
    this.masterKey = masterKey;
    this.masterKeyPw = masterKeyPw;
  }
}
