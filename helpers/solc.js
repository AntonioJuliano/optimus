const solc = require('solc');
const Promise = require("bluebird");
const logger = require('./logger');
const fetch = require('node-fetch');
const fs = require('fs');

Promise.promisifyAll(solc);
Promise.promisifyAll(fs);

let versions = {};

let versionedSolcs = {};

let versionList = [];

const path = 'https://ethereum.github.io/solc-bin/bin';

const setup = function() {
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
      tempVersions = {};
      for (const key in json.releases) {
        const version = json.releases[key];
        tempVersions[key] = version;
        versionList.push(key);
      }
      logger.info({
        at: 'solc#setup',
        message: 'Fetched soljson version list',
        versions: tempVersions
      });
      versions = tempVersions;

      let promises = [];
      for (version in versions) {
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
      const path = __dirname + '/../bin/soljson/' + version;
      return fs.writeFileAsync(path, result);
    }).then(function() {
      return require(requirePath);
    });
  }
}

setup();

class SolcImpl {
  getVersions() {
    return versions;
  }

  compile(source, version, optNum) {
    if (versions[version] === undefined) {
      return Promise.reject(new Error("Invalid version"));
    }
    return Promise.resolve(
      solc.setupMethods(require("../bin/soljson/" + versions[version] + ".js"))
    ).then(function(versionedSolc) {
      bluebirdPromise.promisifyAll(versionedSolc);
      // const compileAsync = bluebirdPromise.promisify(versionedSolc.compile);
      // console.log(compileAsync);
      return versionedSolc.compileAsync(source, optNum);
    }).then(function(result) {
      return {
        compiled: result,
        version: version
      };
    })
  }
}

module.exports = SolcImpl;
