import {
  ensure, ensurePropString, ensureSafeInteger,
} from '../../common/ensure';
import {HttpMethod} from '../../common/net/http_method';
import {request} from '../../common/net/request';

const DEFAULT_GAS_PRICE = 50;

// Returns a recommended fast gas price in gwei.
export async function getGasPrice(): Promise<number> {
  let recommended: number = DEFAULT_GAS_PRICE;
  try {
    recommended = await getGasPriceFromEtherChain();
  } catch (e) {
    console.warn(e);
    console.warn(
        'Failed to load gas price from etherchain.org. Using default.');
  }
  return recommended;
}

async function getGasPriceFromEtherChain(): Promise<number> {
  const response = ensure(await request(
      HttpMethod.GET,
      'https://www.etherchain.org/api/gasPriceOracle',
      new Map<string, string>([
        ['User-Agent', 'ProofOfDonutClient/0.1'],
      ])));
  const fast = ensureSafeDecimal(
      +ensurePropString(response.toObject(), 'fast'));
  const standard = ensureSafeDecimal(
      +ensurePropString(response.toObject(), 'standard'));
  return Math.min(standard * 2, fast);
}

function ensureSafeDecimal(value: number): number {
  ensureSafeInteger(value * 100);
  return value;
}
