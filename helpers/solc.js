const solc = require('solc');
const bluebirdPromise = require("bluebird");
const logger = require('./logger');
const fetch = require('node-fetch');
const fs = require('fs-promise');
const asyncEval = require('async-eval');

bluebirdPromise.promisifyAll(solc);
bluebirdPromise.promisifyAll(asyncEval);

let versions = {};

let versionedSolcs = {};

let versionList = [];

const setup = function() {
  const path = 'https://ethereum.github.io/solc-bin/bin';
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
        promises.push(fetch(path + "/" + versions[version]));
      }
      return Promise.all(promises);
    }).then(function(results) {
      let promises = [];
      for (let i = 0; i < results.length; i++) {
        promises.push(results[i].text());
      }
      return Promise.all(promises);
    }).then(function(results) {
      logger.info({
        at: 'solc#setup',
        message: 'Fetched solcs',
      });
      let promises = [];
      for (let i = 0; i < results.length; i++) {
        console.log(i);
        promises.push(
          asyncEvalAsync(results[i])
        );
      }
      return Promise.all(promises);
    }).then(function(results) {
      logger.info({
        at: 'solc#setup',
        message: 'Evaluated solcs',
      });
      let promises = [];
      for (let i = 0; i < results.length; i++) {
        console.log(i);
        promises.push(
          solc.setupMethodsAsync(results[i])
        );
      }
      return Promise.all(promises);
    }).then(function(results) {
      logger.info({
        at: 'solc#setup',
        message: 'Finished loading solcs',
      });
      let i = 0;
      for (let i = 0; i < results.length; i++) {
        versionedSolcs[versionList[i]] = r;
      }
    }).catch(function(err) {
      console.error(err);
      logger.error({
        at: 'solc#setup',
        message: 'Failed to setup solc versions',
        error: err
      })
    });
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
