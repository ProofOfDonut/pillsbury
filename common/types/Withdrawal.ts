import {Asset} from './Asset';
import {SignedWithdrawal} from './SignedWithdrawal';

export enum WithdrawalType {
  REDDIT = 'reddit',
  ETHEREUM = 'ethereum',
}

export class Withdrawal {
  type: WithdrawalType;
  username: string;
  asset: Asset;
  amount: number;
  messageId: string;
  signedWithdrawal: SignedWithdrawal|null;
  transactionId: string;
  constructor(
      type: WithdrawalType,
      username: string,
      asset: Asset,
      amount: number,
      messageId: string = '',
      signedWithdrawal: SignedWithdrawal|null = null,
      transactionId: string = '') {
    this.type = type;
    this.username = username;
    this.asset = asset;
    this.amount = amount;
    this.messageId = messageId;
    this.signedWithdrawal = signedWithdrawal;
    this.transactionId = transactionId;
  }
}
