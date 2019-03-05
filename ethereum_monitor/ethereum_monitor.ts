import {
  ensureObject, ensurePropArray, ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {AssetSymbol} from '../common/types/Asset';
import {EthereumClient, createEthereumClient} from '../lib/ethereum';
import {GlazeDbClient} from '../glaze_db';

export async function createEthereumMonitor(
    ethereumNodeConfigFile: string,
    glazeDb: GlazeDbClient,
    getContractAddress: (chainId: number, assetId: number) => string):
    Promise<EthereumMonitor> {
  const asset = await glazeDb.getAssetBySymbol(AssetSymbol.DONUT);
  const {abi} = await glazeDb.getAssetContractDetails(asset.id);
  // TODO: Make chain ID configurable.
  const chainId = 1;
  const address = getContractAddress(chainId, asset.id);
  return new EthereumMonitor(
      await readEthereumNodeConfig(ethereumNodeConfigFile),
      glazeDb,
      asset.id,
      address,
      abi);
}

export class EthereumMonitor {
  private config: EthereumNodeConfig;
  private ethereumClient: EthereumClient;
  private glazeDb: GlazeDbClient;

  constructor(
      config: EthereumNodeConfig,
      glazeDb: GlazeDbClient,
      tokenAssetId: number,
      tokenAddress: string,
      tokenAbi: any) {
    this.config = config;
    this.ethereumClient = createEthereumClient(this.config.host);
    this.glazeDb = glazeDb;

    this.start(tokenAssetId, tokenAddress, tokenAbi);
  }

  private async start(
      tokenAssetId: number, tokenAddress: string, tokenAbi: any) {
    const lastDepositBlock = await this.glazeDb.getLastErc20DepositBlock();

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
      this.glazeDb.deposit(
          tokenAssetId, block, transaction, from, depositId, amount);
    });
  }

  get host() {
    return this.config.host;
  }
}

async function readEthereumNodeConfig(
    file: string):
    Promise<EthereumNodeConfig> {
  const info = JSON.parse(<string> await readFile(file, 'utf8'));
  return new EthereumNodeConfig(ensureObject(info));
}

class EthereumNodeConfig {
  host: string;

  constructor(info: Object) {
    this.host = ensurePropString(info, 'host');
  }
}
