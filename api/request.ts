import {ensure, ensureString} from '../common/ensure';
import {Request} from 'express';

export function getHeader(req: Request, name: string): string|undefined {
  return getProperty(req.headers, name.toLowerCase());
}

export function getCookie(req: Request, name: string): string|undefined {
  return getProperty(req.signedCookies, name);
}

export function getSessionToken(req: Request): string|null {
  return getCookie(req, 'session');
}

function getProperty(obj: Object, name: string): string|undefined {
  const value = obj[name];
  if (Array.isArray(value)) {
    ensure(value.length > 0);
    return <string> ensureString(value[0]);
  }
  if (value == undefined) {
    return <undefined> value;
  }
  return <string> ensureString(value);
}
