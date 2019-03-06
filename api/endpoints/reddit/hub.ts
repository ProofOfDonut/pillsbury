import {Request, Response} from 'express';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';

export function routeRedditHub(
    apiServer: ApiServer) {
  apiServer.addListener(
      HttpMethod.GET,
      '/reddit/hub',
      async (unused_req: Request, res: Response) => {
        const redditHub = (await apiServer.config).redditHubUsername;
        await handleRedditHub(
            redditHub,
            res);
      },
      false);
}

async function handleRedditHub(
    redditHub: string,
    res: Response):
    Promise<void> {
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({
      'username': redditHub,
    }));
};
