import {ClientRequest, IncomingMessage, request as requestHttp} from 'http';
import {request as requestHttps} from 'https';
import {UrlWithStringQuery, parse as parseUrl} from 'url';
import {mapToObject} from '../maps/to_object';
import {HttpMethod} from './http_method';

// Deprecated. Use HttpMethod instead.
export {HttpMethod as Method};

const MAX_REMEMBERED_REDIRECTS = 1024;
const MAX_REDIRECT_ATTEMPTS = 6;

const permanentRedirects = new Map<string, string>();

export function request(
    method: HttpMethod,
    url: string,
    headers: Map<string, string> = new Map<string, string>(),
    data: string = ''):
    Promise<Response|null> {
  return _request(method, url, headers, data);
}

function _request(
    method: HttpMethod,
    url: string,
    headers: Map<string, string> = new Map<string, string>(),
    data: string = '',
    redirectAttempt: number = 0):
    Promise<Response|null> {
  return new Promise<Response|null>((
      resolve: (response: Response|null) => void,
      reject: (response: Error) => void) => {
    const _url = permanentRedirects.get(url) || url;
    let u: UrlWithStringQuery;
    try {
      u = parseUrl(_url);
    } catch (e) {
      reject(e);
      return;
    }
    const sendRequest = getRequestFunction(u.protocol);
    const fullHeaders =
        Object.assign({}, headers ? mapToObject(headers) : null, {
          'Content-Length': Buffer.byteLength(data, 'utf8'),
        });
    sendRequest(
        {
          'method': methodToString(method),
          'auth': u.auth,
          'host': u.hostname,
          'port': u.port,
          'path': u.path,
          'headers': fullHeaders,
        },
        (response: IncomingMessage) => {
          const result = <Buffer[]> [];
          switch (response.statusCode) {
            case 200:
            case 201:
            case 202:
            case 203:
            case 206:
              response.on('data', (data: Buffer) => {
                result.push(data);
              });
              response.on(
                  'end',
                  () => resolve(new Response(
                      <number> response.statusCode,
                      response.headers['content-type'] || '',
                      result)));
              break;
            case 204: // No Content
            case 205: // Reset Content
              resolve(null);
              break;
            case 301: // Moved Permanently
            case 302: // Found
            case 303: // See Other
            case 307: // Temporary Redirect
            case 308: // Permanent Redirect
              if (redirectAttempt >= MAX_REDIRECT_ATTEMPTS) {
                reject(new Error(
                    'Maximum number of redirect attempts reached for URL "'
                    + url + '".'));
                return;
              }
              const location = response.headers['location'];
              if (typeof location != 'string') {
                reject(new Error(
                  'Expected "Location" header to be a string but found "'
                  + typeof location + '".'));
                return;
              }
              handleRedirect(
                  method,
                  url,
                  headers,
                  data,
                  response.statusCode,
                  <string> location,
                  redirectAttempt)
                .then(resolve);
              break;
            case 400: // Bad Request
            case 401: // Unauthorized
            case 403: // Forbidden
            case 404: // Not Found
            case 422: // Unprocessable Entity
            case 500: // Internal Server Error
            case 503: // Service Not Available
              response.on('data', (data: Buffer) => {
                result.push(data);
              });
              response.on(
                  'end',
                  () => reject(new HttpRequestError(
                      url,
                      <number> response.statusCode,
                      response.headers['content-type'] || '',
                      result)));
              break;
            default:
              reject(new Error(
                  `Unknown response status (${response.statusCode}).`));
          }
        })
      .on('error', reject)
      .end(data);
   });
}

// Note, even though this function doesn't `yield`, it does have to return a
// promise because the caller expects a promise to be returned (so that `throw`s
// are handled correctly).
async function handleRedirect(
    originalMethod: HttpMethod,
    originalUrl: string,
    originalHeaders: Map<string, string>,
    originalData: string,
    statusCode: number,
    location: string,
    redirectAttempt: number):
    Promise<Response|null> {
  if (!/^https\:\/\/?/.test(location)) {
    throw new Error(
      'Expected "Location" header URL to begin with "http" or "https" but found'
      + '"' + location + '".');
  }
  // Permanent redirect.
  if (statusCode == 301 || statusCode == 308
      && permanentRedirects.size < MAX_REMEMBERED_REDIRECTS) {
    permanentRedirects.set(originalUrl, location);
  }
  // Only 307 and 308 allow methods other than GET and HEAD to be
  // passed through in a redirect. All other redirect status codes should change
  // the method to GET.
  let newMethod: HttpMethod;
  let newData: string;
  if (statusCode == 307 || statusCode == 308) {
    newMethod = originalMethod;
    newData = originalData;
  } else {
    if (originalMethod == HttpMethod.HEAD) {
      newMethod = HttpMethod.HEAD;
    } else {
      newMethod = HttpMethod.GET;
    }
    newData = '';
  }
  return _request(
      newMethod, location, originalHeaders, newData, redirectAttempt + 1);
}

function getRequestFunction(
    protocol: string|undefined):
    (options: Object, callback: (response: IncomingMessage) => void) => ClientRequest {
  switch (protocol) {
    case 'http:':
      return requestHttp;
    case 'https:':
      return requestHttps;
  }
  throw new Error(`Unknown protocol "${protocol}".`);
}

function methodToString(method: HttpMethod): string {
  switch (method) {
    case HttpMethod.HEAD:
      return 'HEAD';
    case HttpMethod.GET:
      return 'GET';
    case HttpMethod.POST:
      return 'POST';
    case HttpMethod.PUT:
      return 'PUT';
    case HttpMethod.DELETE:
      return 'DELETE';
    case HttpMethod.OPTIONS:
      return 'OPTIONS';
  }
  throw new Error(`Unknown method (${method}).`);
}

export class Response {
  private statusCode: number;
  private contentType: string;
  private data: Buffer;

  constructor(
      statusCode: number,
      contentType: string,
      data: Buffer[]) {
    this.statusCode = statusCode;
    this.contentType = contentType;
    this.data = Buffer.concat(data);
  }

  getStatusCode() {
    return this.statusCode;
  }

  getContentType() {
    return this.contentType;
  }

  getData() {
    return this.data;
  }

  toObject(): Object {
    if (!/^application\/json(\;|$)/.test(this.contentType)) {
      throw new Error(
          `Cannot convert content type "${this.contentType}" to an object.`);
    }
    return JSON.parse(this.data.toString(this.getEncoding()));
  }

  toText(): string {
    return this.data.toString(this.getEncoding());
  }

  private getEncoding() {
    const parts = this.contentType.split(';');
    if (parts.length < 2) {
      return 'utf8';
    }
    const m = /encoding\=([\w\-]+)/.exec(parts[1]);
    return m && m[1] ? m[1] : 'utf8';
  }
}

const httpResponseErrorTag = Symbol('HttpRequestError');
export class HttpRequestError extends Error {
  [httpResponseErrorTag]: boolean;
  statusCode: number;
  contentType: string;
  data: Buffer;
  url: string;

  static isOfType(value: any): boolean {
    return !!value && httpResponseErrorTag in value;
  }

  constructor(
      url: string,
      statusCode: number,
      contentType: string,
      data: Buffer[]) {
    const dataBuffer = Buffer.concat(data);
    super(
        `HTTP response contained status code ${statusCode} for resource "`
        + url + '".\n' + dataBuffer.toString('utf8'));
    this[httpResponseErrorTag] = true;
    this.url = url;
    this.statusCode = statusCode;
    this.contentType = contentType;
    this.data = dataBuffer;
  }
}
