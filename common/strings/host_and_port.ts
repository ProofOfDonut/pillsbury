import {ensure, ensureEqual, ensureSafeInteger} from '../ensure';

// Note: This doesn't currently work with IPv6.
export function parseHostAndPort(
    s: string,
    allowEmptyHost: boolean = false):
    [string, number] {
  const parts = s.split(':');
  ensureEqual(parts.length, 2,
      `Invalid host and port string "${s}".`);
  if (!allowEmptyHost) {
    ensure(parts[0], 'Empty host is not allowed.');
  }
  return [ensureHost(parts[0]), ensurePort(parts[1])];
}

function ensureHost(host: string): string {
  ensure(/^[\w\-\.]+$/.test(host),
      `Invalid host "${host}".`);
  return host;
}

function ensurePort(port: string): number {
  return ensureSafeInteger(+port,
      `Invalid port "${port}".`);
}
