import Web3 from 'web3';
import {
  ensureEqual, ensurePropObject, ensurePropSafeInteger, ensurePropString,
} from '../../common/ensure';

export async function onDeposit(
    web3: Web3,
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
  const contract = new web3.eth.Contract(
      tokenAbi,
      tokenAddress);
  const decimals = await contract.methods.decimals().call();
  contract.events.Deposit(
      {'fromBlock': fromBlock},
      (err: Error|null|undefined, event: Object) => {
    if (err) {
      throw err;
    }
    const block = ensurePropSafeInteger(event, 'blockNumber');
    const transaction = ensurePropString(event, 'transactionHash');
    const info = ensurePropObject(event, 'returnValues');
    const from = ensurePropString(info, 'from');
    const accountId = ensurePropString(info, 'accountId');
    const value = ensurePropString(info, 'value');
    if (value.slice(-decimals) == '0') {
      return;
    }
    ensureEqual(value.slice(-decimals), '0'.repeat(+decimals));
    callback(block, transaction, from, accountId, +value.slice(0, -decimals));
  });
}
