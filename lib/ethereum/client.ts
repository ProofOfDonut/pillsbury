import {fromV3} from 'ethereumjs-wallet';
import Web3 = require('web3');
import {ensure, ensurePropString} from '../../common/ensure';
import {QueuedTransaction} from '../../common/types/QueuedTransaction';
import {
  getMintTokenTransaction as _getMintTokenTransaction,
  sendTransaction as _sendTransaction,
} from './mint';
import {onDeposit as _onDeposit} from './on_deposit';
import {PendingTransaction} from './pending_transaction';

export function createEthereumClient(
    host: string,
    v3Wallet: any = null,
    v3WalletPassword: string = ''):
    EthereumClient {
  const web3 = new Web3(host);
  const wallet = v3Wallet ? fromV3(v3Wallet, v3WalletPassword) : null;
  return new EthereumClient(
      web3,
      wallet ? wallet.getPrivateKey() : null,
      wallet ? wallet.getAddress() : null);
}

export class EthereumClient {
  private web3: Web3;
  private privateKey: Buffer|null;
  private address: Buffer|null;

  constructor(
      web3: Web3,
      privateKey: Buffer|null,
      address: Buffer|null) {
    this.web3 = web3;
    this.privateKey = privateKey;
    this.address = address;
  }

  get minter(): Buffer {
    return ensure(this.address);
  }

  getMintTokenTransaction(
      tokenAddress: string,
      tokenAbi: any,
      to: string,
      amount: number):
      Promise<QueuedTransaction> {
    return _getMintTokenTransaction(
        this.web3,
        tokenAddress,
        tokenAbi,
        this.minter,
        to,
        amount);
  }

  sendTransaction(tx: QueuedTransaction): Promise<PendingTransaction> {
    return _sendTransaction(
        this.web3,
        this.privateKey,
        this.minter,
        tx);
  }

  async transactionSent(txHash: string): Promise<boolean> {
    const tx = await this.web3.eth.getTransaction(txHash);
    return tx.blockNumber != null;
  }

  onDeposit(
      tokenAddress: string,
      tokenAbi: any,
      fromBlock: number,
      callback: (
          block: number,
          transaction: string,
          from: string,
          accountId: string,
          amount: number)
          => void) {
    _onDeposit(this.web3, tokenAddress, tokenAbi, fromBlock, callback);
  };

  async withdrawalsAllowed(): Promise<boolean> {
    return true;
  }
}
