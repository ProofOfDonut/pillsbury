import {Request, Response} from 'express';
import {ApiServer} from '../../server';
import {HttpMethod} from '../../../common/net/http_method';

export function routeUserTestGeoAccess(apiServer: ApiServer) {
  apiServer.addListener(
      HttpMethod.GET,
      '/user/test-geo-access',
      async (req: Request, res: Response) => {
        await handleUserTestGeoAccess(
            req,
            res);
      });
}

async function handleUserTestGeoAccess(
    req: Request,
    res: Response):
    Promise<void> {
  res
    .set('Content-Type', 'application/json; charset=utf-8')
    .end(JSON.stringify({'ok': true}));
};
