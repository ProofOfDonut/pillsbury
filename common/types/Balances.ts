import {Map} from 'immutable';
import {
  ensureArray, ensureNumber, ensureObject, ensurePropArray,
} from '../ensure';
import {arrayToMap} from '../maps/from_array';

export class Balances {
  // Map from asset ID to amount.
  private platformValues: Map<number, number>;

  static empty = new Balances(Map());

  static fromJSON(json: any): Balances {
    ensureObject(json);
    const platformValues = arrayToMap(
        ensurePropArray(json, 'platform_values'),
        ensureNumber,
        ensureNumber);
    return new Balances(platformValues);
  }

  constructor(
      platformValues: Map<number, number>) {
    this.platformValues = platformValues;
    Object.freeze(this);
  }

  getAssetIds(): number[] {
    return [...this.platformValues.keys()];
  }

  getPlatformValue(assetId: number): number|undefined {
    return this.platformValues.get(assetId);
  }

  toJSON() {
    return {
      'platform_values': [...this.platformValues.entries()],
    };
  }
}
