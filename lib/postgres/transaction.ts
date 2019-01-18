import {ITask} from 'pg-promise';
import {queryOn} from './query';

export class Transaction {
  t: ITask<void>;

  constructor(t: ITask<void>) {
    this.t = t;
  }

  query(
      strings: TemplateStringsArray,
      ...values: any[]):
      Promise<any> {
    return queryOn(this.t, strings, values);
  }

  async batch<T>(promises: Promise<T>[]): Promise<T[]> {
    return this.t.batch(promises);
  }
}
