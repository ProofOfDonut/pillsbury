import {getRandomString} from '../common/crypto/secure_random';

export function generateSessionToken():
    Promise<string> {
  return getRandomString(128);
}
