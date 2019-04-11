import minimist from 'minimist';
import {join} from 'path';
import {ensurePropString} from '../common/ensure';
import {GlazeDbClient, createGlazeDbClientFromConfigFiles} from '../glaze_db';
import {EthereumSender, createEthereumSender} from './ethereum_sender';

const args = minimist(process.argv.slice(2));
const ethereumNodeConfigFile = ensurePropString(args, 'ethereum_node_config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbUserConfigFile = ensurePropString(args, 'db_user_config');
const dbName = ensurePropString(args, 'db_name');
const ethereumHubKeyFile = ensurePropString(args, 'ethereum_hub_key');
const ethereumHubConfigFile = ensurePropString(args, 'ethereum_hub_config');

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFiles(
      dbConfigFile, dbUserConfigFile, dbName);
  const ethereumSender = await createEthereumSender(
      ethereumNodeConfigFile,
      glazeDb,
      ethereumHubKeyFile,
      ethereumHubConfigFile);
  console.log(`Ready. Transactions will be sent on ${ethereumSender.host}.`);
}

main();
