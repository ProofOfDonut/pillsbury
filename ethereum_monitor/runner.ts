import minimist from 'minimist';
import {join} from 'path';
import {readContractConfig} from '../common/configs/contracts';
import {ensure, ensurePropString} from '../common/ensure';
import {GlazeDbClient, createGlazeDbClientFromConfigFiles} from '../glaze_db';
import {EthereumMonitor, createEthereumMonitor} from './ethereum_monitor';

const args = minimist(process.argv.slice(2));
const ethereumNodeConfigFile = ensurePropString(args, 'ethereum_node_config');
const contractConfigFile = ensurePropString(args, 'contract_config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbUserConfigFile = ensurePropString(args, 'db_user_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFiles(
      dbConfigFile, dbUserConfigFile, dbName);
  const getContractAddress =
      await readContractConfig(
          contractConfigFile,
          glazeDb.getAssetBySymbol.bind(glazeDb));
  const ethereumMonitor = await createEthereumMonitor(
      ethereumNodeConfigFile,
      glazeDb,
      getContractAddress);
  console.log(`Monitoring on ${hidePath(ethereumMonitor.host)}.`);
}

// We hide the path from the log because it may contain sensitive information
// like an Infura key.
function hidePath(host: string): string {
  const m = /^(\w+\:\/\/[\w\.\-]+)/.exec(host);
  if (m) {
    return m[1];
  }
  return '(unknown)';
}

main();
