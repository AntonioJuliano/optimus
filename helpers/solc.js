const solc = require('solc');
const Promise = require("bluebird");
const logger = require('./logger');
const fetch = require('node-fetch');
const fs = require('fs');
const errors = require('./errors');

Promise.promisifyAll(solc);
Promise.promisifyAll(fs);

let versionedSolcs = {};

let versionList = [];

const path = 'https://ethereum.github.io/solc-bin/bin';

function setup() {
  const listName = '/list.json';

  logger.info({
    at: 'solc#setup',
    message: 'Loading soljson versions...',
    path: path + listName
  });

  return fetch(path + listName)
    .then(function(res) {
      return res.json();
    }).then(function(json) {
      let versions = {};
      let debugReleases = {};
      debugReleases['0.2.1'] = 'soljson-v0.2.1+commit.91a6b35.js';
      for (const key in json.releases) {
        const version = json.releases[key];
        versions[key] = version;
        versionList.push(key);
      }
      logger.info({
        at: 'solc#setup',
        message: 'Fetched soljson version list',
        versions: versions
      });

      let promises = [];
      let i = 1;
      for (version in versions) {
        logger.debug({
          at: 'solc#setup',
          message: 'Loading... (' + i++ + '/' + versionList.length + ')'
        });
        promises.push(load(versions[version]));
      }
      return Promise.all(promises);
    }).then(function(results) {
      logger.info({
        at: 'solc#setup',
        message: 'Loaded solcs',
      });
      let promises = [];
      for (let i = 0; i < results.length; i++) {
        promises.push(
          solc.setupMethods(results[i])
        );
      }
      return Promise.all(promises);
    }).then(function(results) {
      logger.info({
        at: 'solc#setup',
        message: 'Finished initializing solcs',
      });
      let i = 0;
      for (let i = 0; i < results.length; i++) {
        Promise.promisifyAll(results[i]);
        versionedSolcs[versionList[i]] = results[i];
      }
      return Promise.resolve(true);
    }).catch(function(err) {
      console.error(err);
      logger.error({
        at: 'solc#setup',
        message: 'Failed to setup solc versions',
        error: err
      })
    });
}

const load = function(version) {
  const requirePath = '../bin/soljson/' + version.replace('.js', '');
  try {
    return require(requirePath);
  } catch (e) {
    logger.info({
      at: 'solc#setup',
      message: 'soljson version not found locally, requesting from remote',
      version: version
    });
    return fetch(path + "/" + version)
    .then(function(result) {
      return result.text();
    }).then(function(result) {
      // console.log("version: " + result);
      const path = __dirname + '/../bin/soljson/' + version;
      return fs.writeFileAsync(path, result);
    }).then(function() {
      console.log('requiring ' + version);
      return require(requirePath);
    });
  }
}

setup();

function getVersions() {
  return versionList;
}

function compile(source, version, optNum) {
  if (versionedSolcs[version] === undefined) {
    return Promise.reject(
      new errors.ClientError("Invalid version", errors.errorCodes.invalidVersion)
    );
  }
  logger.info({
    at: 'solc#compile',
    message: 'Compiling contract...',
    version: version
  });
  const timerStart = new Date();
  return Promise.resolve(versionedSolcs[version].compile(source, optNum))
    .then(function(result) {
      const timeTaken = new Date() - timerStart;
      logger.info({
        at: 'solc#compile',
        message: 'Finished compiling contract',
        version: version,
        time: timeTaken
      });
      if (result.errors !== undefined) {
        return Promise.reject(new errors.CompilationError(result.errors));
      }
      return result;
    }).catch(function(err) {
      return Promise.reject(new errors.CompilationError(err));
    });
}

module.exports.getVersions = getVersions;
module.exports.compile = compile;
