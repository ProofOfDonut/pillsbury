import {Request, Response} from 'express';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';

export function routeRedditConfig(
    apiServer: ApiServer) {
  apiServer.addListener(
      HttpMethod.GET,
      '/reddit/config',
      async (unused_req: Request, res: Response) => {
        const {clientId, baseUri} = await apiServer.config;
        await handleRedditConfig(
            clientId,
            baseUri,
            res);
      },
      false);
}

async function handleRedditConfig(
    clientId: string,
    baseUri: string,
    res: Response):
    Promise<void> {
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({
      'client_id': clientId,
      'redirect_uri': `${baseUri}/reddit/login`,
    }));
};
