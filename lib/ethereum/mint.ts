import Transaction from 'ethereumjs-tx';
import Web3 from 'web3';
import {request} from '../../common/net/request';
import {Asset} from '../../common/types/Asset';
import {QueuedTransaction} from '../../common/types/QueuedTransaction';
import {getGasPrice} from './gas';
import {PendingTransaction} from './pending_transaction';

export async function getMintTokenTransaction(
    web3: Web3,
    tokenAddress: string,
    tokenAbi: any,
    minter: Buffer,
    recipient: string,
    amount: number):
  Promise<QueuedTransaction> {
  const contract = new web3.eth.Contract(
      tokenAbi,
      tokenAddress);
  const decimals = await contract.methods.decimals().call();
  return new QueuedTransaction({
    from: hex(minter),
    gasLimit: hex(70000),
    to: tokenAddress,
    value: hex(0),
    data: contract.methods.mint(
        recipient,
        amount + '0'.repeat(decimals))
      .encodeABI(),
    chainId: 1,
  });
}

export async function sendTransaction(
    web3: Web3,
    privateKey: Buffer,
    minter: Buffer,
    queuedTx: QueuedTransaction):
  Promise<PendingTransaction> {
  const [nonce, gasPrice] = await Promise.all([
    web3.eth.getTransactionCount(hex(minter)),
    getGasPrice(),
  ]);
  const tx = new Transaction(queuedTx.toTransactionParams({
    nonce: hex(nonce),
    gasPrice: gweiToHex(gasPrice),
  }));
  tx.sign(privateKey);
  const serializedTx = tx.serialize();
  return new PendingTransaction(
      hex(tx.hash()),
      web3.eth.sendSignedTransaction(hex(serializedTx)));
}

function hex(n: number|Buffer): string {
  if (typeof n == 'number') {
    return '0x' + n.toString(16);
  }
  return '0x' + n.toString('hex');
}

function gweiToHex(n: number): string {
  return hex(n * 1000000000);
}
