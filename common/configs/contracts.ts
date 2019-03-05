import {
  ensure,
  ensureInEnum,
  ensurePropObject,
  ensurePropString,
  ensureSafeInteger,
} from '../ensure';
import {readFile} from '../io/files/read';
import {Asset, AssetSymbol} from '../types/Asset';

export type GetContractAddress = (chainId: number, assetId: number) => string;

export async function readContractConfig(
    file: string,
    getAssetBySymbol: (symbol: AssetSymbol) => Promise<Asset>):
    Promise<GetContractAddress> {
  const s = <string> await readFile(file, 'utf8');
  const contractConfig = JSON.parse(s);

  const contractAddresses = new Map<number, Map<number, string>>();
  for (const key of Object.keys(contractConfig)) {
    const chainId = ensureSafeInteger(+key);
    let addresses = contractAddresses.get(chainId);
    if (!addresses) {
      addresses = new Map<number, string>();
      contractAddresses.set(chainId, addresses);
    }
    const addressInfo = ensurePropObject(contractConfig, key);
    const assetPromises: Promise<{asset: Asset, address: string}>[] = [];
    for (const symbol of Object.keys(addressInfo)) {
      const address = ensurePropString(addressInfo, symbol);
      assetPromises.push(
          getAssetBySymbol(ensureInEnum(AssetSymbol, symbol))
            .then((asset: Asset) => ({asset, address})));
    }
    const assets = await Promise.all(assetPromises);
    for (const {asset, address} of assets) {
      addresses.set(asset.id, address);
    }
  }

  return (chainId: number, assetId: number): string => {
    const chainAddresses =
      ensure(
          contractAddresses.get(chainId),
          `Missing contract configuraton for chain ID (${chainId}).`);
    return ensure(
        chainAddresses.get(assetId),
        `Missing contract configuraton for chain ID (${chainId}) and `
        + `asset ID (${assetId}).`);
  };
}
