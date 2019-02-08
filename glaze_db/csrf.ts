import {getRandomString} from '../common/crypto/secure_random';

export function generateCsrfToken():
    Promise<string> {
  return getRandomString(128);
}
