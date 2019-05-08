import {
  ensureInEnum,
  ensurePropInEnum,
  ensurePropSafeInteger,
  ensureSafeInteger,
} from '../ensure';

export enum FeeType {
  STATIC = 'static',
  // Relative fees are denoted as integers which represent a basis point
  // (per 10,000). So a 1% fee would be denoted as a 100 relative fee.
  RELATIVE = 'relative',
}

export class Fee {
  type: FeeType;
  value: number;

  static fromJSON(info: Object): Fee {
    return new Fee(
        ensurePropInEnum(info, 'type', FeeType),
        ensurePropSafeInteger(info, 'value'));
  }

  constructor(type: FeeType, value: number) {
    this.type = ensureInEnum(FeeType, type);
    this.value = ensureSafeInteger(value);
  }

  toJSON(): Object {
    return {
      'type': this.type,
      'value': this.value,
    };
  }
}
