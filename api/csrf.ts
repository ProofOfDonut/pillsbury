import {Request} from 'express';
import {PodDbClient} from '../pod_db';
import {getHeader} from './request';

export async function checkCsrfToken(
    req: Request,
    podDb: PodDbClient):
    Promise<void> {
  const token = getHeader(req, 'X-CSRF-Token');
  if (!token) {
    throw new Error('Missing CSRF token.');
  }
  await podDb.checkCsrfToken(token);
}