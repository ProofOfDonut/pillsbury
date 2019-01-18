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
import {readFile} from '../common/io/files/read';
import {RedditSenderEngine, createRedditSenderEngine} from './engine';

export async function createRedditSenderServer(configFile: string) {
  const config = await readConfig(configFile);
  const engine =
      await createRedditSenderEngine(config.username, config.password);
  const app = await initExpress(config.host, config.port);
  return new RedditSenderServer(engine, app, config.port);
}

export class RedditSenderServer {
  private engine: RedditSenderEngine;
  private app: Application;
  port: number;

  constructor(engine: RedditSenderEngine, app: Application, port: number) {
    this.engine = engine;
    this.app = app;
    this.port = port;

    this.app.post('/send::to::amount', async (req: Request, res: Response) => {
      const recipient = ensurePropString(req.params, 'to');
      const amount = ensureSafeInteger(+ensurePropString(req.params, 'amount'));
      try {
        // TODO: Maybe before actually sending, it should check with the DB to
        // ensure the recipient actually does have that many donuts in his
        // account.
        await this.engine.sendDonuts(recipient, amount);
      } catch (err) {
        console.error(
            '---- '
            + new Date().toLocaleString('en-US', {timeZone: 'America/New_York'})
            + ' ----');
        console.error(`When sending ${amount} donuts to ${recipient}:`);
        console.error(err ? err.stack || err.message || err : err);
        res.status(500).type('json').end(JSON.stringify({
          message: err && err.message,
          stack: err && err.stack,
        }));
        return;
      }
      res.end();
    });
  }
}

async function readConfig(file: string): Promise<Config> {
  const info = JSON.parse(<string> await readFile(file, 'utf8'));
  return new Config(ensureObject(info));
}

class Config {
  host: string|null;
  port: number;
  username: string;
  password: string;

  constructor(info: Object) {
    const host = ensureProp(info, 'host');
    ensure(typeof host == 'string' || host == null,
        'Expected property "host" to be a string or null.');
    this.host = <string|null> host;
    this.port = ensurePropNumber(info, 'port');
    this.username = ensurePropString(info, 'username');
    this.password = ensurePropString(info, 'password');
  }
}

function initExpress(host: string|null, port: number): Promise<Application> {
  const app = express();
  app.use(parseBodyJson({
    'type': 'application/json',
    'limit': '100kb',
  }));
  return new Promise(resolve => {
    app.listen(port, host == null ? undefined : host, () => resolve(app));
  });
}
