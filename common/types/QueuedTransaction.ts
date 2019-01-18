import {ensurePropNumber, ensurePropString} from '../ensure';

type QueuedTransactionParams = {
  from: string;
  gasLimit: string;
  to: string;
  value: string;
  data: string;
  chainId: number;
};

type Web3TransactionParams = {
  from: string;
  nonce: string;
  gasPrice: string;
  gasLimit: string;
  to: string;
  value: string;
  data: string;
  chainId: number;
};

export class QueuedTransaction {
  from: string;
  gasLimit: string;
  to: string;
  value: string;
  data: string;
  chainId: number;

  constructor(info: QueuedTransactionParams) {
    this.from = info.from;
    this.gasLimit = info.gasLimit;
    this.to = info.to;
    this.value = info.value;
    this.data = info.data;
    this.chainId = info.chainId;
  }

  toTransactionParams(
      info: {nonce: string, gasPrice: string}):
      Web3TransactionParams {
    return {
      'from': this.from,
      'nonce': info.nonce,
      'gasPrice': info.gasPrice,
      'gasLimit': this.gasLimit,
      'to': this.to,
      'value': this.value,
      'data': this.data,
      'chainId': this.chainId,
    };
  }

  toJSON(): Object {
    return {
      'from': this.from,
      'gasLimit': this.gasLimit,
      'to': this.to,
      'value': this.value,
      'data': this.data,
      'chainId': this.chainId,
    };
  }

  fromJSON(info: Object) {
    return new QueuedTransaction({
      from: ensurePropString(info, 'from'),
      gasLimit: ensurePropString(info, 'gasLimit'),
      to: ensurePropString(info, 'to'),
      value: ensurePropString(info, 'value'),
      data: ensurePropString(info, 'data'),
      chainId: ensurePropNumber(info, 'chainId'),
    });
  }
}
