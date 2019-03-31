import {
  ensureObject, ensurePropSafeInteger, ensurePropString,
} from '../ensure';
import {formatNumber} from '../numbers/format';

export enum AssetSymbol {
  DONUT = 'DONUT',
}

export class AssetName {
  singular: string;
  plural: string;
  constructor(singular: string, plural: string) {
    this.singular = singular;
    this.plural = plural;
  }
  toString(assetCount: number = 0): string {
    return assetCount == 1 ? this.singular : this.plural;
  }
  format(assetCount: number = 0): string {
    return `${formatNumber(assetCount)} ${this.toString(assetCount)}`;
  }
}

export class Asset {
  id: number;
  subreddit: string;
  name: AssetName;
  symbol: AssetSymbol;

  static fromJSON(json: any): Asset {
    const info = ensureObject(json);
    return new Asset(
        ensurePropSafeInteger(info, 'id'),
        ensurePropString(info, 'subreddit'),
        new AssetName(
            ensurePropString(info, 'name_singular'),
            ensurePropString(info, 'name_plural')),
        assetSymbolFromString(ensurePropString(info, 'symbol')));
  }

  constructor(
      id: number,
      subreddit: string,
      name: AssetName,
      symbol: AssetSymbol) {
    this.id = id;
    this.subreddit = subreddit;
    this.name = name;
    this.symbol = symbol;
  }

  toJSON(): Object {
    return {
      'id': this.id,
      'subreddit': this.subreddit,
      'name_singular': this.name.singular,
      'name_plural': this.name.plural,
      'symbol': <string> this.symbol,
    };
  }
}

export function assetSymbolFromString(name: string): AssetSymbol {
  switch (name) {
    case 'DONUT':
      return AssetSymbol.DONUT;
  }
  throw new Error(`Unknown asset symbol "${name}".`);
}
