import {json as parseBodyJson} from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Application, Request, Response} from 'express';
import {
  GetContractAddress, readContractConfig,
} from '../common/configs/contracts';
import {
  ensure,
  ensureInEnum,
  ensureProp,
  ensurePropArrayOfType,
  ensurePropBoolean,
  ensurePropObject,
  ensurePropSafeInteger,
  ensurePropString,
  ensureSafeInteger,
} from '../common/ensure';
import {readFile} from '../common/io/files/read';
import {HttpMethod} from '../common/net/http_method';
import {EventLogType} from '../common/types/EventLogType';
import {EthereumClient, createEthereumClient} from '../lib/ethereum';
import {RedditClient} from '../lib/reddit';
import {GlazeDbClient} from '../glaze_db';
import {checkCsrfToken} from './csrf';
import {filterConfigToExpressMiddleware} from './location_filter';
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
  isRootAdmin: (username: string) => boolean;
  redditHubUsername: string;
  redditClient: RedditClient;
  ethereumClient: EthereumClient;
  getContractAddress: GetContractAddress;
};
export class ApiServer {
  ready: Promise<Ready>;
  config: Promise<Config>;

  private app: Promise<Application>;
  private glazeDb: GlazeDbClient;

  constructor(
      configFile: string,
      ethereumHubKeyFile: string,
      ethereumHubConfigFile: string,
      ethereumNodeConfigFile: string,
      redditHubConfigFile: string,
      redditLoginConfigFile: string,
      contractConfigFile: string,
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
        ethereumHubKeyFile,
        ethereumHubConfigFile,
        ethereumNodeConfigFile,
        redditHubConfigFile,
        redditLoginConfigFile,
        contractConfigFile,
        glazeDb,
        readyResolve,
        configResolve);
  }

  private async initExpressApp(
      configFile: string,
      ethereumHubKeyFile: string,
      ethereumHubConfigFile: string,
      ethereumNodeConfigFile: string,
      redditHubConfigFile: string,
      redditLoginConfigFile: string,
      contractConfigFile: string,
      glazeDb: GlazeDbClient,
      readyResolve: (value: Ready) => void,
      configResolve: (value: Config) => void):
      Promise<Application> {
    const [
      configString,
      ethereumHubKeyString,
      ethereumHubConfigString,
      ethereumNodeConfigString,
      redditHubConfigString,
      redditLoginConfigString,
      getContractAddress,
    ]:
        [string, string, string, string, string, string, GetContractAddress] =
        <[string, string, string, string, string, string, GetContractAddress]>
        await Promise.all([
      readFile(configFile, 'utf8'),
      readFile(ethereumHubKeyFile, 'utf8'),
      readFile(ethereumHubConfigFile, 'utf8'),
      readFile(ethereumNodeConfigFile, 'utf8'),
      readFile(redditHubConfigFile, 'utf8'),
      readFile(redditLoginConfigFile, 'utf8'),
      readContractConfig(
          contractConfigFile,
          glazeDb.getAssetBySymbol.bind(glazeDb)),
    ]);
    const config = JSON.parse(configString);
    const ethereumHubKey = JSON.parse(ethereumHubKeyString);
    const ethereumHubPassword =
        ensurePropString(JSON.parse(ethereumHubConfigString), 'password');
    const ethereumNodeConfig = JSON.parse(ethereumNodeConfigString);
    const redditHubConfig = JSON.parse(redditHubConfigString);
    const redditLoginConfig = JSON.parse(redditLoginConfigString);
    // The "host" property should be set to `null` if no host is provided.
    const host = ensureProp(config, 'host') || undefined;
    ensure(typeof host == 'string' || host == undefined);
    const port = ensurePropSafeInteger(config, 'port');
    const baseUri = ensurePropString(config, 'base-uri');
    const allowedOrigins =
        <string[]> ensurePropArrayOfType(config, 'allowed-origins', 'string');
    const trustProxy = ensurePropSafeInteger(config, 'trust-proxy');
    const dashboardUrl = ensurePropString(config, 'dashboard-url');
    const secureCookies = ensurePropBoolean(config, 'secure-cookies');
    const rootAdmins =
        <string[]> ensurePropArrayOfType(config, 'root-admins', 'string');
    const redditLoginId = ensurePropString(redditLoginConfig, 'id');
    const redditLoginSecret = ensurePropString(redditLoginConfig, 'secret');
    const ethereumNodeHost = ensurePropString(ethereumNodeConfig, 'host');
    const redditHubUsername = ensurePropString(redditHubConfig, 'username');
    const redditHubPassword = ensurePropString(redditHubConfig, 'password');
    const redditHubId = ensurePropString(redditHubConfig, 'id');
    const redditHubSecret = ensurePropString(redditHubConfig, 'secret');
    // The request filter is type checked elsewhere.
    const requestFilter = config['request-filter'];

    const lowercaseRootAdmins = rootAdmins.map(u => u.toLowerCase());
    configResolve({
      clientId: redditLoginId,
      secret: redditLoginSecret,
      baseUri,
      dashboardUrl,
      secureCookies,
      isRootAdmin: (username: string) =>
          lowercaseRootAdmins.includes(username.toLowerCase()),
      redditHubUsername,
      redditClient: new RedditClient(
          redditHubUsername, redditHubPassword, redditHubId, redditHubSecret),
      ethereumClient: createEthereumClient(
          ethereumNodeHost,
          ethereumHubKey,
          ethereumHubPassword),
      getContractAddress,
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

    app.use(filterConfigToExpressMiddleware(requestFilter));

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
    let onMethod =
        method == HttpMethod.GET ? app.get
        : method == HttpMethod.POST ? app.post
        : method == HttpMethod.PUT ? app.put
        : null;
    ensure(onMethod, `Unknown or unavailale method (${method})`).call(
        app,
        route,
        async (req: Request, res: Response) => {  
      try {
        await this.logApiEndpointEvent(req, route);
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
            'message': e && e.message,
            'stack': e && e.stack,
          }));
        this.logApiEndpointErrorEvent(req, route, e);
      }
    });
    }

    async logApiEndpointEvent(
        req: Request,
        route: string) {
      const data = JSON.stringify({
        'route': route,
        'params': JSON.stringify(req.params),
        'body': JSON.stringify(req.body),
      });
      await this.glazeDb.logEvent(EventLogType.API_ENDPOINT, data);
    }

    async logApiEndpointErrorEvent(
        req: Request,
        route: string,
        error: any) {
      const errorMessage =
          error && error.stack
          || error && error.message
          || String(error);
      const data = JSON.stringify({
        'route': route,
        'params': JSON.stringify(req.params),
        'body': JSON.stringify(req.body),
        'error': errorMessage,
      });
      await this.glazeDb.logEvent(EventLogType.API_ENDPOINT_ERROR, data);
    }
}

function originsToRegExp(origins: string[]): RegExp {
  const array = [];
  for (const origin of origins) {
    array.push(origin.replace(/\W/g, '\\$&'));
  }
  return new RegExp(`^(${array.join('|')})($|\\/)`);
}
