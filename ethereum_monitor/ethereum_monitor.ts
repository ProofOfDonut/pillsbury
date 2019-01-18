import {
  ensureObject, ensurePropArray, ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {AssetSymbol} from '../common/types/Asset';
import {EthereumClient, createEthereumClient} from '../lib/ethereum';
import {PodDbClient} from '../pod_db';

export async function createEthereumMonitor(
    configFile: string,
    podDb: PodDbClient):
    Promise<EthereumMonitor> {
  const asset = await podDb.getAssetBySymbol(AssetSymbol.DONUT);
  const contract = await podDb.getAssetContractDetails(asset.id, 1);
  return new EthereumMonitor(
      await readConfig(configFile),
      podDb,
      asset.id,
      contract.address,
      contract.abi);
}

export class EthereumMonitor {
  private config: Config;
  private ethereumClient: EthereumClient;
  private podDb: PodDbClient;

  constructor(
      config: Config,
      podDb: PodDbClient,
      tokenAssetId: number,
      tokenAddress: string,
      tokenAbi: any) {
    this.config = config;
    this.ethereumClient = createEthereumClient(this.config.host);
    this.podDb = podDb;

    this.start(tokenAssetId, tokenAddress, tokenAbi);
  }

  private async start(
      tokenAssetId: number, tokenAddress: string, tokenAbi: any) {
    const lastDepositBlock = await this.podDb.getLastErc20DepositBlock();

    this.ethereumClient.onDeposit(
        tokenAddress,
        tokenAbi,
        // Adding 1 to the last block is a shortcut that's not entirely correct.
        // Multiple deposit transactions can be included in the same block and
        // if for some reason the process died between transactions in the same
        // block, we could lose deposits. A good solution is made more difficult
        // by the fact that (I think) multiple deposits could be sent in the
        // same transaction (through another contract method), so we can't
        // simply ignore transactions that we've seen deposits from already.
        lastDepositBlock + 1,
        (block: number,
         transaction: string,
         from: string,
         depositId: string,
         amount: number) => {
      this.podDb.deposit(
          tokenAssetId, block, transaction, from, depositId, amount);
    });
  }

  get host() {
    return this.config.host;
  }
}

async function readConfig(file: string): Promise<Config> {
  const info = JSON.parse(<string> await readFile(file, 'utf8'));
  return new Config(ensureObject(info));
}

class Config {
  host: string;

  constructor(info: Object) {
    this.host = ensurePropString(info, 'host');
  }
}
