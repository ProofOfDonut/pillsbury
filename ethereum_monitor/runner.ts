import * as minimist from 'minimist';
import {join} from 'path';
import {ensurePropString} from '../common/ensure';
import {GlazeDbClient, createGlazeDbClientFromConfigFile} from '../glaze_db';
import {EthereumMonitor, createEthereumMonitor} from './ethereum_monitor';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFile(dbConfigFile, dbName);
  const ethereumMonitor = await createEthereumMonitor(configFile, glazeDb);
  console.log(`Monitoring on ${ethereumMonitor.host}.`);
}

main();
