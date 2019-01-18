import {Method, request} from '../../common/net/request';
import {RequestParams} from '../../common/net/request_params';

export async function getWithToken(
    token: string,
    url: string,
    params: RequestParams = null):
    Promise<Object> {
  const response = await request(
      Method.GET,
      url + (params ? params.toString(Method.GET) : ''),
      new Map([
        ['Authorization', `Bearer ${token}`],
        ['User-Agent', 'ProofOfDonutClient/0.1 by ProofOfDonut'],
      ]));
  return response.toObject();
}

export async function postWithToken(
    token: string,
    url: string,
    params: RequestParams):
    Promise<Object> {
  const data = params.toString(Method.POST);
  const response = await request(
      Method.POST,
      url,
      new Map([
        ['Authorization', `Bearer ${token}`],
        ['User-Agent', 'ProofOfDonutClient/0.1 by ProofOfDonut'],
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
  const response = await request(
      Method.POST,
      url,
      new Map([
        ['Authorization', `Bearer ${token}`],
        ['User-Agent', 'ProofOfDonutClient/0.1 by ProofOfDonut'],
        ['Content-Type', 'application/json'],
      ]),
      data);
  return response.toObject();
}
