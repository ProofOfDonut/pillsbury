import {Account} from './Account';
import {Asset} from './Asset';

export class Withdrawal {
  to: Account;
  asset: Asset;
  amount: number;
  // Either a transaction hash (if `to` is an Ethereum address) or a Reddit
  // message ID (if `to` is a Reddit account).
  transactionId: string;
  constructor(
      to: Account,
      asset: Asset,
      amount: number,
      transactionId: string = '') {
    this.to = to;
    this.asset = asset;
    this.amount = amount;
    this.transactionId = transactionId;
  }
}
