export class PendingTransaction {
  hash: string;
  done: Promise<void>;

  constructor(hash: string, promise: Promise<any>) {
    this.hash = hash;
    this.done = promise.then(() => null);
  }
}
