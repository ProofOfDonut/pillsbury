import {Request, Response} from 'express';
import {ApiServer} from '../../server';
import {
  ensurePropBoolean, ensurePropString, ensureSafeInteger,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {GlazeDbClient} from '../../../glaze_db';
import {requireUserId} from '../../user';

export function routeUserTerms(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user/terms',
      async (req: Request, res: Response) => {
        await handleGetUserTerms(
            glazeDb,
            req,
            res);
      });
  apiServer.addListener(
      HttpMethod.POST,
      '/user/terms::term_id',
      async (req: Request, res: Response) => {
        await handleAcceptUserTerms(
            glazeDb,
            req,
            res);
      });
}

async function handleGetUserTerms(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await requireUserId(req, glazeDb);
  const terms = await glazeDb.getUnacceptedUserTerms(userId);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({terms}));
};

async function handleAcceptUserTerms(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await requireUserId(req, glazeDb);
  const termId = ensureSafeInteger(+ensurePropString(req.params, 'term_id'));
  const accept = ensurePropBoolean(req.body, 'accept');
  if (accept) {
    await glazeDb.acceptUserTerm(userId, termId);
    res
      .set('Content-Type', 'application/json; charset=utf-8')
      .end(JSON.stringify({}));
  } else {
    res.status(400).end();
  }
}
