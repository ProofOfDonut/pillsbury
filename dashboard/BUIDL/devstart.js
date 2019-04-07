const fs = require('fs');
const minimist = require('minimist');
const {ensurePropString} = require('../../common/ensure');

const args = minimist(process.argv.slice(2));
const keyFile = ensurePropString(args, 'key');
const certFile = ensurePropString(args, 'cert');

const devServerConfigPath = 'react-scripts/config/webpackDevServer.config';
const devServerConfig = require(devServerConfigPath);
const cacheKey = require.resolve(devServerConfigPath);
require.cache[cacheKey].exports = (proxy, allowedHost) => {
  const conf = devServerConfig(proxy, allowedHost);
  conf.https = {
    key: fs.readFileSync(keyFile, 'utf8'),
    cert: fs.readFileSync(certFile, 'utf8'),
  };
  return conf;
};

require('react-scripts/scripts/start');
