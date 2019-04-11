import Web3 from 'web3';
import {
  ensureEqual,
  ensurePropBigNumber,
  ensurePropObject,
  ensurePropSafeInteger,
  ensurePropString,
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
        depositId: string,
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
    const depositId = ensurePropString(info, 'depositId');
    const value = ensurePropBigNumber(info, 'value');
    const valueString = value.toString();
    if (valueString.slice(-decimals) == '0') {
      return;
    }
    ensureEqual(valueString.slice(-decimals), '0'.repeat(+decimals));
    callback(
        block,
        transaction,
        from,
        depositId,
        +valueString.slice(0, -decimals));
  });
}
