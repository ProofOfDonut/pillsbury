import {
  ensure,
  ensureHexString,
  ensurePropHexString,
  ensurePropSafeInteger,
  ensureObject,
  ensureSafeInteger,
} from '../ensure';

export class SignedWithdrawal {
  assetId: number;
  nonce: string;
  amount: number;
  r: string;
  s: string;
  v: string;

  static fromSignature(
      assetId: number,
      nonce: string,
      amount: number,
      signature: string):
      SignedWithdrawal {
    // `nonce`, `assetId`, and `amount` are validated in the constructor.
    ensure(/^0x[0-9A-Fa-f]{130}$/.test(signature),
        `Invalid signature "${signature}"`);
    const s = signature.toLowerCase();
    return new SignedWithdrawal(
        assetId,
        nonce,
        amount,
        `0x${s.slice(2, 66)}`,
        `0x${s.slice(66, 130)}`,
        `0x${s.slice(130)}`);
  }

  static fromJSON(json: any): SignedWithdrawal {
    const info = ensureObject(json);
    return new SignedWithdrawal(
        ensurePropSafeInteger(info, 'asset_id'),
        ensurePropHexString(info, 'nonce', 40),
        ensurePropSafeInteger(info, 'amount'),
        ensurePropHexString(info, 'r', 64),
        ensurePropHexString(info, 's', 64),
        ensurePropHexString(info, 'v', 2));
  }

  constructor(
      assetId: number,
      nonce: string,
      amount: number,
      r: string,
      s: string,
      v: string) {
    this.assetId = ensureSafeInteger(assetId);
    this.nonce = ensureHexString(nonce.toLowerCase(), 1, 40);
    this.amount = ensureSafeInteger(amount);
    this.r = ensureHexString(r.toLowerCase(), 64);
    this.s = ensureHexString(s.toLowerCase(), 64);
    this.v = ensureHexString(v.toLowerCase(), 2);
  }

  toJSON(): Object {
    return {
      'asset_id': this.assetId,
      'nonce': this.nonce,
      'amount': this.amount,
      'r': this.r,
      's': this.s,
      'v': this.v,
    };
  }

  getSignature(): string {
    return this.r + this.s.slice(2) + this.v.slice(2);
  }
}
