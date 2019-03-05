import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {
  ensure, ensureSafeInteger, ensurePropString,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {assetSymbolFromString} from '../../../common/types/Asset';
import {GlazeDbClient} from '../../../glaze_db';
import {requireUserId} from '../../user';

export function routeAssetContract(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient,
    getContractAddress: (chainId: number, assetId: number) => string) {
  apiServer.addListener(
      HttpMethod.GET,
      '/asset::asset_id/contract',
      async (req: Request, res: Response) => {
        await handleAssetContract(
            glazeDb,
            getContractAddress,
            req,
            res);
      });
}

async function handleAssetContract(
    glazeDb: GlazeDbClient,
    getContractAddress: (chainId: number, assetId: number) => string,
    req: Request,
    res: Response):
    Promise<void> {
  const unused_userId = await requireUserId(req, glazeDb);
  const assetId = ensureSafeInteger(+ensurePropString(req.params, 'asset_id'));
  const {abi} = await glazeDb.getAssetContractDetails(assetId);
  // TODO: Make this an argument passed to the endpoint?
  const chainId = 1;
  const address = getContractAddress(chainId, assetId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({address, abi}));
}
