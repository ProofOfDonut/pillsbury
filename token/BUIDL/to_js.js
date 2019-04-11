const {readFileSync} = require('fs');

const filename = process.argv[2];

const info = JSON.parse(readFileSync(filename));

process.stdout.write('export const abi = <any> ');
process.stdout.write(JSON.stringify(info['abi']));
process.stdout.write(';\n');

process.stdout.write('export const bytecode = ');
process.stdout.write(JSON.stringify(info['bytecode']));
process.stdout.write(';\n');
