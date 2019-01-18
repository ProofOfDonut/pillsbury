import {ensure, ensureProp, ensurePropType} from '../../common/ensure';

export class Config {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: any;

  constructor(info: Object, dbname: string = '') {
    this.host = ensurePropType(info, 'host', 'string');
    this.port = ensurePropType(info, 'port', 'number');
    this.database = dbname || ensurePropType(info, 'database', 'string');
    this.username = ensurePropType(info, 'username', 'string');
    this.password = ensurePropType(info, 'password', 'string');
    this.ssl = ensureProp(info, 'ssl');
    ensure(
        typeof this.ssl == 'object'
            && this.ssl != null
            || typeof this.ssl == 'boolean',
        'Expected type "object" or "boolean" for property "ssl", '
        + `but found "${typeof this.ssl}".`);
  }

  toConnectionParams(): Object {
    return {
      'host': this.host,
      'port': this.port,
      'database': this.database,
      'user': this.username,
      'password': this.password,
      'ssl': this.ssl,
    };
  }
}
