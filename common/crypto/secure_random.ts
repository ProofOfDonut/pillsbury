import {randomBytes as nodeRandomBytes} from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function getRandomArrayBuffer(length: number): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>(
      (resolve: (value: ArrayBuffer) => void,
        reject: (err: Error) => void) => {
    nodeRandomBytes(length, (err: Error|null, buffer: Buffer) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(bufferToArrayBuffer(buffer));
    });
  });
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; i++) {
    view[i] = buffer[i];
  }
  return ab;
}

export async function getRandomString(
    length: number,
    chars: string = CHARS):
    Promise<string> {
  const randomArray = await getRandomUint32Array(length);
  const out: Array<string> = [];
  for (const u of randomArray) {
    out.push(await chars[u % chars.length]);
  }
  return out.join('');
}

async function getRandomUint32Array(length: number): Promise<Uint32Array> {
  return new Uint32Array(await getRandomArrayBuffer(length * 4));
};
