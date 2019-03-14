export function errorToString(error: any): string {
  return error && error.stack
      || error && error.message
      || String(error);
}
