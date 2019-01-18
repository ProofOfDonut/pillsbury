import {List} from 'immutable';
import {Deposit} from './Deposit';
import {Transfer} from './Transfer';
import {Withdrawal} from './Withdrawal';

export class History {
  events: List<Deposit|Withdrawal|Transfer>;

  constructor(events: List<Deposit|Withdrawal|Transfer>) {
    this.events = events;
  }
}
