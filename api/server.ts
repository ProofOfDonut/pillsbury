import {json as parseBodyJson} from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Application, Request, Response} from 'express';
import {
  ensure,
  ensureProp,
  ensurePropArrayOfType,
  ensurePropBoolean,
  ensurePropObject,
  ensurePropSafeInteger,
  ensurePropString,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {HttpMethod} from '../common/net/http_method';
import {EthereumClient, createEthereumClient} from '../lib/ethereum';
import {RedditClient} from '../lib/reddit';
import {GlazeDbClient} from '../glaze_db';
import {checkCsrfToken} from './csrf';
import {getHeader} from './request';

type Ready = {
  host: string|undefined;
  port: number;
};
type Config = {
  clientId: string;
  secret: string;
  baseUri: string;
  dashboardUrl: string;
  secureCookies: boolean;
  redditClient: RedditClient;
  redditPuppetHost: string;
  redditPuppetPort: number;
  ethereumClient: EthereumClient;
};
export class ApiServer {
  ready: Promise<Ready>;
  config: Promise<Config>;

  private app: Promise<Application>;
  private glazeDb: GlazeDbClient;

  constructor(
      configFile: string,
      masterKeyFile: string,
      masterKeyPwFile: string,
      glazeDb: GlazeDbClient) {
    this.glazeDb = glazeDb;
    let readyResolve: (value: Ready) => void;
    let configResolve: (value: Config) => void;
    this.ready = new Promise((resolve: (value: Ready) => void) => {
      readyResolve = resolve;
    });
    this.config = new Promise((resolve: (value: Config) => void) => {
      configResolve = resolve;
    });
    this.app = this.initExpressApp(
        configFile,
        masterKeyFile,
        masterKeyPwFile,
        readyResolve,
        configResolve);
  }

  private async initExpressApp(
      configFile: string,
      masterKeyFile: string,
      masterKeyPwFile: string,
      readyResolve: (value: Ready) => void,
      configResolve: (value: Config) => void):
      Promise<Application> {
    const [
      configString,
      masterKeyString,
      masterKeyPwString,
    ]: [string, string, string] = <[string, string, string]> await Promise.all([
      readFile(configFile, 'utf8'),
      readFile(masterKeyFile, 'utf8'),
      readFile(masterKeyPwFile, 'utf8'),
    ]);
    const config = JSON.parse(configString);
    const masterKey = JSON.parse(masterKeyString);
    const masterKeyPw =
        ensurePropString(JSON.parse(masterKeyPwString), 'password');
    // The "host" property should be set to `null` if no host is provided.
    const host = ensureProp(config, 'host') || undefined;
    ensure(typeof host == 'string' || host == undefined);
    const port = ensurePropSafeInteger(config, 'port');
    const baseUri = ensurePropString(config, 'base-uri');
    const allowedOrigins =
        <string[]> ensurePropArrayOfType(config, 'allowed-origins', 'string');
    const trustProxy = ensurePropSafeInteger(config, 'trust-proxy');
    const clientId = ensurePropString(config, 'reddit-client-id');
    const secret = ensurePropString(config, 'reddit-secret');
    const dashboardUrl = ensurePropString(config, 'dashboard-url');
    const secureCookies = ensurePropBoolean(config, 'secure-cookies');
    const redditHubConfig = ensurePropObject(config, 'reddit-hub');
    const redditHubUsername = ensurePropString(redditHubConfig, 'username');
    const redditHubPassword = ensurePropString(redditHubConfig, 'password');
    const redditHubId = ensurePropString(redditHubConfig, 'id');
    const redditHubSecret = ensurePropString(redditHubConfig, 'secret');
    const redditPuppetConfig = ensurePropObject(config, 'reddit-puppet');
    const redditPuppetHost =
        ensurePropString(redditPuppetConfig, 'host');
    const redditPuppetPort =
        ensurePropSafeInteger(redditPuppetConfig, 'port');
    const ethereumClientConfig = ensurePropObject(config, 'ethereum-client');

    configResolve({
      clientId,
      secret,
      baseUri,
      dashboardUrl,
      secureCookies,
      redditClient: new RedditClient(
          redditHubUsername, redditHubPassword, redditHubId, redditHubSecret),
      redditPuppetHost,
      redditPuppetPort,
      ethereumClient: createEthereumClient(
          ensurePropString(ethereumClientConfig, 'host'),
          masterKey,
          masterKeyPw),
    });

    const originRegExp = originsToRegExp(allowedOrigins);

    const app = express();
    if (trustProxy > 0) {
      app.set('trust proxy', trustProxy);
    }
    app.use(parseBodyJson({
      'type': 'application/json',
      'limit': '100kb',
    }));
    app.use(cookieParser(
        'S54BwtcJjbKoDsBS4mQry49oPy1IFAwEd67e47BDqxpVixKeZpwwCujdZcJBmwz6fChIaR'
        + 'fmU73uE33f5cPbQpQkP6VubACgKKIA'));

    app.get('/status', (unused_req: Request, res: Response) => {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.end('Ok');
    });

    app.use((req: Request, res: Response, next: () => void) => {
      const originHeader = getHeader(req, 'origin');
      const refererHeader = getHeader(req, 'referer');
      const origin = originHeader || refererHeader;

      if (originRegExp.exec(origin)) {
        if (originHeader) {
          res.header(
              'Access-Control-Allow-Origin',
              originHeader);
          res.header(
              'Access-Control-Allow-Methods',
              'GET, PUT, POST, DELETE');
          res.header(
              'Access-Control-Allow-Headers',
              'Content-Type, X-CSRF-Token');
          res.header(
              'Access-Control-Expose-Headers',
              'Content-Type, X-CSRF-Token');
          res.header(
              'Access-Control-Allow-Credentials',
              'true');
        }
      } else {
        res
          .status(400)
          .set('Content-Type', 'application/json; charset=utf-8')
          .end(JSON.stringify({
            'message': 'Invalid operation.',
          }));
        return;
      }

      next();
    });

    app.listen(port, host, () => readyResolve({host, port}));

    return app;
  }

  async addListener(
      method: HttpMethod,
      route: string,
      callback: (
          req: Request,
          res: Response)
          => Promise<void>,
      doCsrfTokenCheck: boolean = true) {
    const app = await this.app;
    let onMethod = method == HttpMethod.GET ? app.get : app.post;
    onMethod.call(
        app,
        route,
        async (req: Request, res: Response) => {
      try {
        if (doCsrfTokenCheck) {
          await checkCsrfToken(req, this.glazeDb);
        }
        await callback(req, res);
      } catch (e) {
        res
          .status(500)
          .set('Content-Type', 'application/json; charset=utf-8')
          .end(JSON.stringify({
            'success': false,
            'message': e.message,
            'stack': e.stack,
          }));
      }
    });
  }
}

function originsToRegExp(origins: string[]): RegExp {
  const array = [];
  for (const origin of origins) {
    array.push(origin.replace(/\W/g, '\\$&'));
  }
  return new RegExp(`^(${array.join('|')})($|\\/)`);
}
