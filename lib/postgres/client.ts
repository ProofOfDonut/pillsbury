import pgPromise from 'pg-promise';
import {IDatabase} from 'pg-promise';
import {Config} from './config';
import {Transaction} from './transaction';
import {queryOn} from './query';

const pgp = pgPromise();

export class PostgresClient {
  private db: IDatabase<void>;

  constructor(config: Config) {
    this.db = pgp(config.toConnectionParams());
  }

  query(
      strings: TemplateStringsArray,
      ...values: any[]):
      Promise<any> {
    return queryOn(this.db, strings, values);
  }

  transaction<T>(
      callback: (tx: Transaction) => Promise<T>):
      Promise<T> {
    return this.db.tx(t => callback(new Transaction(t)));
  }
}
