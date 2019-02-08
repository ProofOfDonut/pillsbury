ort * as minimist from 'minimist';
import {join} from 'path';
import {ensurePropString} from '../common/ensure';
import {createGlazeDbClientFromConfigFile} from '../glaze_db';
import {ApiServer} from './server';
import {routeAsset} from './endpoints/asset';
import {routeAssetContract} from './endpoints/asset/contract';
import {routeAssetWithdraw} from './endpoints/asset/withdraw';
import {routeRedditLogin} from './endpoints/reddit/login';
import {
  routeUserAvailableErc20Withdrawals,
} from './endpoints/user/available_erc20_withdrawals';
import {routeUserBalances} from './endpoints/user/balances';
import {routeUserCsrfToken} from './endpoints/user/csrf_token';
import {routeUserDepositId} from './endpoints/user/deposit_id';
import {routeUserIdentity} from './endpoints/user/identity';
import {routeUserLogout} from './endpoints/user/logout';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const masterKeyFile = ensurePropString(args, 'master_key');
const masterKeyPwFile = ensurePropString(args, 'master_key_pw');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbName = ensurePropString(args, 'db_name');

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFile(dbConfigFile, dbName);
  const apiServer = new ApiServer(
      configFile,
      masterKeyFile,
      masterKeyPwFile,
      glazeDb);
  const apiConfig = await apiServer.config;

  routeAsset(apiServer, glazeDb);
  routeAssetContract(apiServer, glazeDb);
  routeAssetWithdraw(
      apiServer,
      glazeDb,
      apiConfig.redditClient,
      apiConfig.redditPuppetHost,
      apiConfig.redditPuppetPort);
  routeRedditLogin(apiServer, glazeDb);
  routeUserAvailableErc20Withdrawals(apiServer, glazeDb);
  routeUserBalances(apiServer, glazeDb);
  routeUserDepositId(apiServer, glazeDb);
  routeUserLogout(apiServer, glazeDb);
  routeUserCsrfToken(apiServer, glazeDb);
  routeUserIdentity(apiServer, glazeDb);

  const {host, port} = await apiServer.ready;
  if (host) {
    console.log(`Listening on ${host}:${port}.`);
  } else {
    console.log(`Listening on port ${port}.`);
  }
}

main();
