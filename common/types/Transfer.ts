import {Account} from './Account';
import {Asset} from './Asset';

export class Transfer {
  from: Account;
  to: Account;
  asset: Asset;
  amount: number;

  constructor(from: Account, to: Account, asset: Asset, amount: number) {
    this.from = from;
    this.to = to;
    this.asset = asset;
    this.amount = amount;
  }
}
