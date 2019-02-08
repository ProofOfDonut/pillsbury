import {Request, Response} from 'express';
import {parse as parseUrl} from 'url';
import {ApiServer} from '../../server';
import {
  ensureEqual, ensureSafeInteger, ensurePropString,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {assetSymbolFromString} from '../../../common/types/Asset';
import {User} from '../../../common/types/User';
import {GlazeDbClient} from '../../../glaze_db';
import {requireUserId} from '../../user';

export function routeAsset(apiServer: ApiServer, glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/asset::id_or_symbol',
      async (req: Request, res: Response) => {
        await handleAsset(
            glazeDb,
            req,
            res);
      });
}

async function handleAsset(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const unused_userId = await requireUserId(req, glazeDb);
  const assetIdOrSymbol = ensurePropString(req.params, 'id_or_symbol');
  if (/^\d+$/.test(assetIdOrSymbol)) {
    handleAssetId(glazeDb, res, ensureSafeInteger(+assetIdOrSymbol));
  } else {
    handleAssetSymbol(glazeDb, res, assetIdOrSymbol);
  }
}

async function handleAssetId(
    glazeDb: GlazeDbClient,
    res: Response,
    assetId: number) {
  const asset = await glazeDb.getAsset(assetId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({asset}));
}

async function handleAssetSymbol(
    glazeDb: GlazeDbClient,
    res: Response,
    assetSymbol: string) {
  const asset = await glazeDb.getAssetBySymbol(
      assetSymbolFromString(assetSymbol));
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({asset}));
}
