import {Account} from './Account';
import {Asset} from './Asset';

export class Deposit {
  amount: number;
  constructor(from: Account, asset: Asset, amount: number) {
    this.amount = amount;
  }
}
