import {Request} from 'express';
import {GlazeDbClient} from '../glaze_db';
import {getSessionToken} from './request';

export async function getUserId(
    req: Request,
    glazeDb: GlazeDbClient):
    Promise<number> {
  const token = getSessionToken(req);
  if (!token) {
    return 0;
  }
  return glazeDb.getUserId(token);
}

export async function requireUserId(
    req: Request,
    glazeDb: GlazeDbClient):
    Promise<number> {
  const userId = await getUserId(req, glazeDb);
  if (userId == 0) {
    throw new Error('Missing session token.');
  }
  return userId;
}
