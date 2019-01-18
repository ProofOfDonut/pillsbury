export enum HttpMethod {
  HEAD,
  GET,
  POST,
  PUT,
  DELETE,
  OPTIONS,
}

export function httpMethodToString(method: HttpMethod): string {
  switch (method) {
    case HttpMethod.HEAD:
      return 'HEAD';
    case HttpMethod.GET:
      return 'GET';
    case HttpMethod.POST:
      return 'POST';
    case HttpMethod.PUT:
      return 'PUT';
    case HttpMethod.DELETE:
      return 'DELETE';
    case HttpMethod.OPTIONS:
      return 'OPTIONS';
  }
  throw new Error(`Unknown HTTP method: ${method}`);
}