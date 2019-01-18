import {ensureEqual} from '../ensure';
import {HttpMethod} from './http_method';

export class RequestParams {
  entries: Entry[];

  constructor(entries: string[][]) {
    this.entries = [];
    for (const entry of entries) {
      ensureEqual(entry.length, 2);
      this.entries.push(new Entry(entry[0], entry[1]));
    }
  }

  add(key: string, value: string) {
    this.entries.push(new Entry(key, value));
  }

  toString(method: HttpMethod = HttpMethod.GET): string {
    return (method == HttpMethod.GET ? '?' : '') + this.entries.join('&');
  }

  toJSON() {
    const obj: any = {};
    for (const {key, value} of this.entries) {
      ensureEqual(obj[key], undefined);
      obj[key] = value;
    }
    return obj;
  }
}

class Entry {
  key: string;
  value: string;

  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }

  toString(): string {
    return `${encodeURIComponent(this.key)}=${encodeURIComponent(this.value)}`;
  }
}
