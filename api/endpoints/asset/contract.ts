import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {
  ensureSafeInteger, ensurePropString,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {assetSymbolFromString} from '../../../common/types/Asset';
import {PodDbClient} from '../../../pod_db';
import {requireUserId} from '../../user';

export function routeAssetContract(apiServer: ApiServer, podDb: PodDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/asset::asset_id/contract',
      async (req: Request, res: Response) => {
        await handleAssetContract(
            podDb,
            req,
            res);
      });
}

async function handleAssetContract(
    podDb: PodDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const unused_userId = await requireUserId(req, podDb);
  const assetId = ensureSafeInteger(+ensurePropString(req.params, 'asset_id'));
  const contract = await podDb.getAssetContractDetails(assetId, 1);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({contract}));
}
