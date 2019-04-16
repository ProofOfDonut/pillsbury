import Web3 from 'web3';
import {SignedWithdrawal} from '../../common/types/SignedWithdrawal';

export async function signWithdrawalMessage(
    web3: Web3,
    tokenAddress: string,
    tokenAbi: any,
    privateKey: Buffer,
    assetId: number,
    nonce: string,
    amount: number):
    Promise<SignedWithdrawal> {
  const contract = new web3.eth.Contract(
      tokenAbi,
      tokenAddress);
  const decimals = await contract.methods.decimals().call();
  const message =
      await contract.methods.getWithdrawalMessage(
          nonce,
          amount + '0'.repeat(decimals)).call();
  const ms =
      await web3.eth.accounts.sign(message, '0x' + privateKey.toString('hex'));
  return SignedWithdrawal.fromSignature(assetId, nonce, amount, ms.signature);
}
