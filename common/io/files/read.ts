import {
  readFile as nodeReadFile,
  readFileSync as _readFileSync,
} from 'fs';

export function readFile(
    filename: string,
    encoding: string = 'buffer'):
    Promise<Buffer|string> {
  return new Promise<Buffer|string>(
      (resolve: (data: Buffer|string) => void,
       reject: (err: Error) => void) => {
    nodeReadFile(
        filename,
        {
          'encoding': encoding,
        },
        (err: Error, result: Buffer|string) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

export function readFileSync(
    filename: string,
    encoding: string = 'buffer'):
    Buffer|string {
  return _readFileSync(filename, {
    'encoding': encoding,
  });
}
