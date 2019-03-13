import {Request, Response} from 'express';
import {ApiServer} from '../../server';
import {
  ensure,
  ensureEqual,
  ensurePropArray,
  ensurePropBoolean,
  ensurePropString,
  ensureSafeInteger,
} from '../../../common/ensure';
import {HttpMethod} from '../../../common/net/http_method';
import {UserTerm} from '../../../common/types/UserTerm';
import {GlazeDbClient} from '../../../glaze_db';
import {requireUserId} from '../../user';

export function routeUserTerms(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user/terms::scope',
      async (req: Request, res: Response) => {
        await handleGetUserTerms(
            glazeDb,
            (await apiServer.config).isRootAdmin,
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
  apiServer.addListener(
      HttpMethod.PUT,
      '/user/terms::scope',
      async (req: Request, res: Response) => {
        await handleUpdateUserTerms(
            glazeDb,
            (await apiServer.config).isRootAdmin,
            req,
            res);
      });
}

async function handleGetUserTerms(
    glazeDb: GlazeDbClient,
    isRootAdmin: (username: string) => boolean,
    req: Request,
    res: Response):
    Promise<void> {
  const scope = ensurePropString(req.params, 'scope');
  const userId = await requireUserId(req, glazeDb);
  let terms: UserTerm[];
  if (scope == 'unaccepted') {
    terms = await glazeDb.getUnacceptedUserTerms(userId);
  } else {
    ensure(scope == 'all',
        `Expected scope "unaccepted" or "all" but found "${scope}".`);
    terms = await glazeDb.getAllUserTerms(isRootAdmin, userId);
  }
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'terms': terms}));
};

async function handleAcceptUserTerms(
    glazeDb: GlazeDbClient,
    req: Request,
    res: Response):
    Promise<void> {
  const termId = ensureSafeInteger(+ensurePropString(req.params, 'term_id'));
  const accept = ensurePropBoolean(req.body, 'accept');
  const userId = await requireUserId(req, glazeDb);
  if (accept) {
    await glazeDb.acceptUserTerm(userId, termId);
    res
      .set('Content-Type', 'application/json; charset=utf-8')
      .end(JSON.stringify({}));
  } else {
    res.status(400).end();
  }
}

async function handleUpdateUserTerms(
    glazeDb: GlazeDbClient,    
    isRootAdmin: (username: string) => boolean,
    req: Request,
    res: Response):
    Promise<void> {
  const userId = await requireUserId(req, glazeDb);
  const scope = ensurePropString(req.params, 'scope');
  ensureEqual(scope, 'all');
  const terms = ensurePropArray(req.body, 'terms').map(UserTerm.fromJSON);
  const newTermIds = await glazeDb.updateUserTerms(isRootAdmin, userId, terms);
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'new_term_ids': newTermIds}));
}
