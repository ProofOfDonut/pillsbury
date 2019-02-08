import {Request} from 'express';
import {GlazeDbClient} from '../glaze_db';
import {getHeader} from './request';

export async function checkCsrfToken(
    req: Request,
    glazeDb: GlazeDbClient):
    Promise<void> {
  const token = getHeader(req, 'X-CSRF-Token');
  if (!token) {
    throw new Error('Missing CSRF token.');
  }
  await glazeDb.checkCsrfToken(token);
}