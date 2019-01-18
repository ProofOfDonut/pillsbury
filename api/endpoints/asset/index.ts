import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {
  ensureEqual, ensureSafeInteger, ensurePropString,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {assetSymbolFromString} from '../../../common/types/Asset';
import {User} from '../../../common/types/User';
import {PodDbClient} from '../../../pod_db';
import {requireUserId} from '../../user';

export function routeAsset(apiServer: ApiServer, podDb: PodDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/asset::id_or_symbol',
      async (req: Request, res: Response) => {
        await handleAsset(
            podDb,
            req,
            res);
      });
}

async function handleAsset(
    podDb: PodDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const unused_userId = await requireUserId(req, podDb);
  const assetIdOrSymbol = ensurePropString(req.params, 'id_or_symbol');
  if (/^\d+$/.test(assetIdOrSymbol)) {
    handleAssetId(podDb, res, ensureSafeInteger(+assetIdOrSymbol));
  } else {
    handleAssetSymbol(podDb, res, assetIdOrSymbol);
  }
}

async function handleAssetId(
    podDb: PodDbClient,
    res: Response,
    assetId: number) {
  const asset = await podDb.getAsset(assetId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({asset}));
}

async function handleAssetSymbol(
    podDb: PodDbClient,
    res: Response,
    assetSymbol: string) {
  const asset = await podDb.getAssetBySymbol(
      assetSymbolFromString(assetSymbol));
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({asset}));
}
