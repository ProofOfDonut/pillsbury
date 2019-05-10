import {Request, Response} from 'express';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';
import {GlazeDbClient} from '../../../glaze_db';

export function routeRedditSupportSub(
    apiServer: ApiServer,
    glazeDb: GlazeDbClient) {
  apiServer.addListener(
      HttpMethod.GET,
      '/reddit/support-sub',
      async (unused_req: Request, res: Response) => {
        await handleRedditSupportSub(
            glazeDb,
            res);
      },
      false);
}

async function handleRedditSupportSub(
    glazeDb: GlazeDbClient,
    res: Response):
    Promise<void> {
  const subreddit = await glazeDb.getSupportSubreddit();
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({
      'subreddit': subreddit,
    }));
};
