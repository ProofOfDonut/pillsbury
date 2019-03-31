import {json as parseBodyJson} from 'body-parser';
import * as express from 'express';
import {Application, Request, Response} from 'express';
import {
  ensure,
  ensureObject,
  ensureProp,
  ensurePropNumber,
  ensurePropString,
  ensureSafeInteger,
} from '../common/ensure';
import {errorToString} from '../common/errors';
import {readFile} from '../common/io/files/read';
import {EventLogType} from '../common/types/EventLogType';
import {GlazeDbClient} from '../glaze_db';
import {RedditPuppetEngine, createRedditPuppetEngine} from './engine';

export async function createRedditPuppetServer(
    host: string,
    port: number,
    redditHubConfigFile: string,
    glazeDb: GlazeDbClient) {
  const redditHubConfig = await readConfig(redditHubConfigFile);
  const engine =
      await createRedditPuppetEngine(
          redditHubConfig.username,
          redditHubConfig.password,
          glazeDb);
  const app = await initExpress(host, port);
  return new RedditPuppetServer(engine, glazeDb, app, port);
}

export class RedditPuppetServer {
  private engine: RedditPuppetEngine;
  private app: Application;
  private glazeDb: GlazeDbClient;
  port: number;

  constructor(
      engine: RedditPuppetEngine,
      glazeDb: GlazeDbClient,
      app: Application,
      port: number) {
    this.engine = engine;
    this.app = app;
    this.port = port;
    this.glazeDb = glazeDb;

    this.post('/send::to::amount', async (req: Request, res: Response) => {
      res.status(400).type('json').end(JSON.stringify({
        'message': 'Endpoint disabled.',
      }));
      return;

      // const recipient = ensurePropString(req.params, 'to');
      // const amount =
      //     ensureSafeInteger(+ensurePropString(req.params, 'amount'));
      //
      // // TODO: Maybe before actually sending, it should check with the DB to
      // // ensure the recipient actually does have that many donuts in his
      // // account.
      // await this.engine.sendDonuts(recipient, amount);
      // res.end();
    });

    this.post(
        '/update-reddit-hub-bearer-token',
        async (req: Request, res: Response) => {
      await this.engine.updateRedditHubBearerToken();
      res.end();
    });
  }

  private post(
      route: string,
      callback: (req: Request, res: Response) => Promise<void>) {
    this.app.post(route, async (req: Request, res: Response) => {
      this.glazeDb.logEvent(
          EventLogType.REDDIT_PUPPET_ENDPOINT,
          JSON.stringify({
            'method': req.method,
            'route': route,
            'params': req.params,
            'body': req.body,
          }));
      try {
        await callback(req, res);
      } catch (err) {
        this.handleError(req, res, err, route);
      }
    });
  }

  private handleError(req: Request, res: Response, err: Error, route: string) {
    console.error(
        '---- '
        + new Date().toLocaleString('en-US', {timeZone: 'America/New_York'})
        + ' ----');
    console.error(`Error for route ${route}:`);
    console.error(errorToString(err));
    this.glazeDb.logEvent(
        EventLogType.REDDIT_PUPPET_ENDPOINT_ERROR,
        JSON.stringify({
          'method': req.method,
          'route': route,
          'params': req.params,
          'body': req.body,
          'error': errorToString(err),
        }));
    res.status(500).type('json').end(JSON.stringify({
      'message': err && err.message,
      'stack': err && err.stack,
    }));
  }
}

async function readConfig(file: string): Promise<Config> {
  const info = JSON.parse(<string> await readFile(file, 'utf8'));
  return new Config(ensureObject(info));
}

class Config {
  username: string;
  password: string;

  constructor(info: Object) {
    this.username = ensurePropString(info, 'username');
    this.password = ensurePropString(info, 'password');
  }
}

function initExpress(host: string, port: number): Promise<Application> {
  const app = express();
  app.use(parseBodyJson({
    'type': 'application/json',
    'limit': '100kb',
  }));
  return new Promise(resolve => {
    app.listen(port, host == '' ? undefined : host, () => resolve(app));
  });
}
