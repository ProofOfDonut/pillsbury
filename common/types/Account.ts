import {
  ensure, ensureObject, ensurePropNumber, ensurePropString,
} from '../ensure';

export enum AccountType {
  ETHEREUM_ADDRESS = 0,
  REDDIT_USER = 1,
}

export class Account {
  type: AccountType;
  value: string;
  constructor(type: AccountType, value: string) {
    this.type = type;
    this.value = value;
  }

  static fromJSON(json: any) {
    const info = ensureObject(json);
    return new Account(
        accountTypeFromNumber(ensurePropNumber(info, 'type')),
        ensurePropString(info, 'value'));
  }

  toString(): string {
    if (this.type == AccountType.ETHEREUM_ADDRESS) {
      return this.value;
    }
    return `/u/${this.value}`;
  }

  toJSON() {
    return {
      'type': this.type,
      'value': this.value,
    };
  }

  toPostgres(): string {
    ensure(/^[\w\-]+$/.test(this.value));
    return `('${accountTypeToDbString(this.type)}', '${this.value}')::account`;
  }
  rawType = true;
}

export function accountTypeFromNumber(type: number): AccountType {
  switch (type) {
    case <number> AccountType.ETHEREUM_ADDRESS:
      return AccountType.ETHEREUM_ADDRESS;
    case <number> AccountType.REDDIT_USER:
      return AccountType.REDDIT_USER;
  }
  throw new Error(`Unknown account type: ${type}`);
}

function accountTypeToDbString(type: AccountType): string {
  switch (type) {
    case AccountType.ETHEREUM_ADDRESS:
      return "ethereum_address";
    case AccountType.REDDIT_USER:
      return "reddit_user";
  }
  throw new Error(`Unknown account type: ${type}`);
}
