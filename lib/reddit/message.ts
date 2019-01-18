import {
  ensurePropEquals, ensurePropType, ensureSafePositiveInteger,
} from '../../common/ensure';

export class Message {
  id: string;
  author: string;
  subject: string;
  body: string;
  date: Date;

  constructor(info: Object) {
    ensurePropEquals(info, 'kind', 't4');
    const data = ensurePropType(info, 'data', 'object');
    this.id = ensurePropType(data, 'id', 'string');
    this.author = ensurePropType(data, 'author', 'string');
    this.subject = ensurePropType(data, 'subject', 'string');
    this.body = ensurePropType(data, 'body', 'string');
    const fromEpoch = ensurePropType(data, 'created_utc', 'number');
    ensureSafePositiveInteger(fromEpoch);
    this.date = new Date(fromEpoch * 1000);
  }
}
