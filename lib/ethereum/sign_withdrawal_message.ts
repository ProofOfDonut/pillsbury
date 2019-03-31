import Web3 = require('web3');
import {SignedWithdrawal} from '../../common/types/SignedWithdrawal';

export async function signWithdrawalMessage(
    web3: Web3,
    tokenAddress: string,
    tokenAbi: any,
    privateKey: Buffer,
    nonce: string,
    amount: number):
    Promise<SignedWithdrawal> {
  const contract = new web3.eth.Contract(
      tokenAbi,
      tokenAddress);
  const message =
      await contract.methods.getWithdrawalMessage(nonce, amount).call();
  const ms =
      await web3.eth.accounts.sign(message, privateKey.toString('hex'));
  return SignedWithdrawal.fromSignature(nonce, amount, ms.signature);
}
