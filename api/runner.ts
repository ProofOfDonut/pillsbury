import minimist from 'minimist';
import {join} from 'path';
import {ensure, ensurePropString} from '../common/ensure';
import {parseHostAndPort} from '../common/strings/host_and_port';
import {createGlazeDbClientFromConfigFiles} from '../glaze_db';
import {ApiServer} from './server';
import {routeAsset} from './endpoints/asset';
import {routeAssetContract} from './endpoints/asset/contract';
import {routeAssetWithdraw} from './endpoints/asset/withdraw';
import {routeRedditConfig} from './endpoints/reddit/config';
import {routeRedditHub} from './endpoints/reddit/hub';
import {routeRedditLogin} from './endpoints/reddit/login';
import {routeRedditSupportSub} from './endpoints/reddit/support-sub';
import {
  routeUserAvailableErc20Withdrawals,
} from './endpoints/user/available_erc20_withdrawals';
import {routeUserBalances} from './endpoints/user/balances';
import {routeUserCsrfToken} from './endpoints/user/csrf_token';
import {routeUserDepositId} from './endpoints/user/deposit_id';
import {routeUserIdentity} from './endpoints/user/identity';
import {routeUserLogout} from './endpoints/user/logout';
import {
  routeUserSignedWithdrawals,
} from './endpoints/user/signed_withdrawals';
import {routeUserTerms} from './endpoints/user/terms';

const args = minimist(process.argv.slice(2));
const configFile = ensurePropString(args, 'config');
const ethereumNodeConfigFile = ensurePropString(args, 'ethereum_node_config');
const ethereumHubKeyFile = ensurePropString(args, 'ethereum_hub_key');
const ethereumHubConfigFile = ensurePropString(args, 'ethereum_hub_config');
const redditHubConfigFile = ensurePropString(args, 'reddit_hub_config');
const redditLoginConfigFile = ensurePropString(args, 'reddit_login_config');
const contractConfigFile = ensurePropString(args, 'contract_config');
const dbConfigFile = ensurePropString(args, 'db_config');
const dbUserConfigFile = ensurePropString(args, 'db_user_config');
const dbName = ensurePropString(args, 'db_name');
const [redditPuppetHost, redditPuppetPort] =
    parseHostAndPort(ensurePropString(args, 'reddit_puppet'));

async function main() {
  const glazeDb = await createGlazeDbClientFromConfigFiles(
      dbConfigFile, dbUserConfigFile, dbName);
  const apiServer = new ApiServer(
      configFile,
      ethereumHubKeyFile,
      ethereumHubConfigFile,
      ethereumNodeConfigFile,
      redditHubConfigFile,
      redditLoginConfigFile,
      contractConfigFile,
      glazeDb);
  const apiConfig = await apiServer.config;

  routeAsset(apiServer, glazeDb);
  routeAssetContract(apiServer, glazeDb, apiConfig.getContractAddress);
  routeAssetWithdraw(
      apiServer,
      glazeDb,
      apiConfig.redditClient,
      redditPuppetHost,
      redditPuppetPort,
      apiConfig.getContractAddress);
  routeRedditConfig(apiServer);
  routeRedditHub(apiServer);
  routeRedditLogin(apiServer, glazeDb);
  routeRedditSupportSub(apiServer, glazeDb);
  routeUserAvailableErc20Withdrawals(apiServer, glazeDb);
  routeUserBalances(apiServer, glazeDb);
  routeUserDepositId(apiServer, glazeDb);
  routeUserLogout(apiServer, glazeDb);
  routeUserCsrfToken(apiServer, glazeDb);
  routeUserIdentity(apiServer, glazeDb);
  routeUserSignedWithdrawals(apiServer, glazeDb);
  routeUserTerms(apiServer, glazeDb);

  const {host, port} = await apiServer.ready;
  if (host) {
    console.log(`Listening on ${host}:${port}.`);
  } else {
    console.log(`Listening on port ${port}.`);
  }
}

main();
