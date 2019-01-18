import {Request} from 'express';
import {PodDbClient} from '../pod_db';
import {getSessionToken} from './request';

export async function getUserId(
    req: Request,
    podDb: PodDbClient):
    Promise<number> {
  const token = getSessionToken(req);
  if (!token) {
    return 0;
  }
  return podDb.getUserId(token);
}

export async function requireUserId(
    req: Request,
    podDb: PodDbClient):
    Promise<number> {
  const userId = await getUserId(req, podDb);
  if (userId == 0) {
    throw new Error('Missing session token.');
  }
  return userId;
}
