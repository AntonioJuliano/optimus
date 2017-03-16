'use strict';

const solc = require('solc');
const Promise = require("bluebird");
const logger = require('./logger');
const fetch = require('node-fetch');
const fs = require('fs');
const errors = require('./errors');
const abi = require('solc/abi');

Promise.promisifyAll(solc);
Promise.promisifyAll(fs);

let versionedSolcs = {};

let versionList = [];

const path = 'https://ethereum.github.io/solc-bin/bin';

async function setup() {
  const listName = '/list.json';

  logger.info({
    at: 'solc#setup',
    message: 'Loading soljson versions...',
    path: path + listName
  });

  try {
    const fetchResult = await fetch(path + listName);
    const json = await fetchResult.json();
    let versions = {};
    // let debugReleases = {};
    // debugReleases['0.2.1'] = 'soljson-v0.2.1+commit.91a6b35.js';
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
    for (const version in versions) {
      logger.debug({
        at: 'solc#setup',
        message: 'Loading... (' + i++ + '/' + versionList.length + ')'
      });
      promises.push(load(versions[version]));
    }
    const solcs = await Promise.all(promises);

    logger.info({
      at: 'solc#setup',
      message: 'Loaded solcs',
    });

    promises = [];
    for (let i = 0; i < solcs.length; i++) {
      promises.push(
        solc.setupMethods(solcs[i])
      );
    }
    const initializedSolcs = await Promise.all(promises);

    logger.info({
      at: 'solc#setup',
      message: 'Finished initializing solcs',
    });
    for (let i = 0; i < initializedSolcs.length; i++) {
      Promise.promisifyAll(initializedSolcs[i]);
      versionedSolcs[versionList[i]] = initializedSolcs[i];
    }
    return true;
  } catch (e) {
    console.error(e);
    logger.error({
      at: 'solc#setup',
      message: 'Failed to setup solc versions',
      error: e
    });
  }
}

const load = async function(version) {
  const requirePath = '../bin/soljson/' + version.replace('.js', '');
  try {
    return require(requirePath);
  } catch (e) {
    logger.info({
      at: 'solc#setup',
      message: 'soljson version not found locally, requesting from remote',
      version: version
    });
    const fetchResult = await fetch(path + "/" + version);
    const fetchedText = await fetchResult.text();
    const filePath = __dirname + '/../bin/soljson/' + version;
    const writeFileResult = await fs.writeFileAsync(filePath, fetchedText);
    return require(filePath);
  }
}

setup();

function getVersions() {
  return versionList;
}

async function compile(source, version, optNum, libraries) {
  if (versionedSolcs[version] === undefined) {
    throw new errors.ClientError("Invalid version", errors.errorCodes.invalidVersion);
  }

  logger.info({
    at: 'solc#compile',
    message: 'Compiling contract...',
    version: version
  });
  const timerStart = new Date();
  let compileResult;
  try {
    compileResult = await versionedSolcs[version].compile(source, optNum);
  } catch (e) {
    throw new errors.CompilationError(e);
  }
  const timeTaken = new Date() - timerStart;
  logger.info({
    at: 'solc#compile',
    message: 'Finished compiling contract',
    version: version,
    time: timeTaken
  });
  if (compileResult.errors !== undefined && compileResult.contracts === undefined) {
    throw new errors.CompilationError(result.errors);
  }
  if (libraries !== null && libraries !== undefined) {
    for (const library in libraries) {
      for (const contractName in compileResult.contracts) {
        compileResult.contracts[contractName].bytecode = solc.linkBytecode(
          compileResult.contracts[contractName].bytecode,
          library
        );
        compileResult.contracts[contractName].runtimeBytecode = solc.linkBytecode(
          compileResult.contracts[contractName].runtimeBytecode,
          library
        );
      }
    }
  }
  return compileResult;
}

function getUpdatedAbi(version, oldAbi) {
  return abi.update(version, oldAbi);
}

module.exports.getVersions = getVersions;
module.exports.compile = compile;
module.exports.getUpdatedAbi = getUpdatedAbi;
