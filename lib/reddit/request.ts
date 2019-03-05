import {sleep} from '../../common/async/sleep';
import {
  HttpRequestError, Method, Response, request,
} from '../../common/net/request';
import {RequestParams} from '../../common/net/request_params';

const REDDIT_MAX_TRIES = 25;

export async function getWithToken(
    token: string,
    url: string,
    params: RequestParams = null):
    Promise<Object> {
  const response = await redditRequest(
      Method.GET,
      url + (params ? params.toString(Method.GET) : ''),
      new Map([
        ['Authorization', `Bearer ${token}`],
        ['User-Agent', 'PillsburyClient/0.1'],
      ]));
  return response.toObject();
}

export async function postWithToken(
    token: string,
    url: string,
    params: RequestParams):
    Promise<Object> {
  const data = params.toString(Method.POST);
  const response = await redditRequest(
      Method.POST,
      url,
      new Map([
        ['Authorization', `Bearer ${token}`],
        ['User-Agent', 'PillsburyClient/0.1'],
        ['Content-Type', 'application/x-www-form-urlencoded'],
      ]),
      data);
  return response.toObject();
}

export async function postJsonWithToken(
    token: string,
    url: string,
    params: RequestParams):
    Promise<Object> {
  const data = JSON.stringify(params);
  const response = await redditRequest(
      Method.POST,
      url,
      new Map([
        ['Authorization', `Bearer ${token}`],
        ['User-Agent', 'PillsburyClient/0.1'],
        ['Content-Type', 'application/json'],
      ]),
      data);
  return response.toObject();
}

async function redditRequest(
    method: Method,
    url: string,
    headers: Map<string, string> = new Map<string, string>(),
    data: string = ''):
    Promise<Response> {
  for (let i = 0; i < REDDIT_MAX_TRIES; i++) {
    try {
      // The `await` is needed so that the `try`/`catch` works.
      return await request(method, url, headers, data);
    } catch (err) {
      // Sometimes when Reddit is busy it responds with a 503 saying to try
      // again later.
      if (method == Method.GET
          && HttpRequestError.isOfType(err)
          && err.statusCode == 503) {
        await sleep(15000 * i);
      } else {
        throw err;
      }
    }
  }
}
