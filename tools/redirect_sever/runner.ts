import * as http from 'http';
import * as minimist from 'minimist'
import {basename} from 'path';
import {createRedirectServer} from './server';

const port = +process.argv[2];
const host = process.argv[3];
if (!port || !host) {
  throw new Error(`Usage: ${basename(process.argv[1])} port host`);
}

async function main() {
  await createRedirectServer(port, (_, path) => `${host}${path}`);
  process.stdout.write(`Redirect server listening on port ${port}.\n`);
}

main();
