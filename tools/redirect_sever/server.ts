import {IncomingMessage, ServerResponse, createServer} from 'http';

export function createRedirectServer(
    port: number,
    getLocation: (host: string, url: string) => string):
    Promise<void> {
  return new Promise((resolve: () => void) => {
    createServer((req: IncomingMessage, res: ServerResponse) => {
      const host = req.headers['host'];
      if (host) {
        res.writeHead(301, {
          'Location': `${getLocation(host, req.url)}`,
        });
      } else {
        res.writeHead(400);
      }
      res.end();
    })
      .listen(port, resolve);
  });
}
