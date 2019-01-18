import * as minimist from 'minimist';
import {join} from 'path';
import {ensurePropString} from '../common/ensure';
import {PodDbClient, createPodDbClientFromConfigFile} from '../pod_db';
import {EthereumSender, createEthereumSender} from './ethereum_sender';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');
const masterKeyFile = ensurePropString(args, 'master_key');
const masterKeyPwFile = ensurePropString(args, 'master_key_pw');

async function main() {
  const podDb = await createPodDbClientFromConfigFile(dbConfigFile, dbName);
  const ethereumSender = await createEthereumSender(
      configFile, podDb, masterKeyFile, masterKeyPwFile);
  console.log(`Ready. Transactions will be sent on ${ethereumSender.host}.`);
}

main();
