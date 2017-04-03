const express = require('express');
const router = express.Router();
const solc = require('../helpers/solc');
const errors = require('../helpers/errors');
const errorHandler = require('../helpers/errorHandler');
const logger = require('../helpers/logger');

router.get('/versions', (request, response) => {
  response.status(200).json({
    versions: solc.getVersions()
  });
});

router.post('/compile', async(request, response) => {
  try {
    request.check({
      'source': { in: 'body',
        notEmpty: true
      },
      'version': { in: 'body',
        notEmpty: true
      },
      'optimized': { in: 'body',
        notEmpty: true
      }
    });
    const validationResult = await request.getValidationResult();
    if (!validationResult.isEmpty()) {
      throw new errors.RequestError(validationResult.array());
    }
    logger.debug({
      at: 'solidity/compile',
      message: "Compiling contract"
    });
    const optNum = request.body.optimized ? 1 : 0;
    let compileResult = await solc.compile(
      request.body.source,
      request.body.version,
      optNum,
      request.body.libraries
    );

    // Not sure why it sometimes returns the contract
    // name starting with : like :ContractName
    let renamedContracts = {};
    const keys = Object.keys(compileResult.contracts);
    for (let i=0; i < keys.length; i++) {
      const renamed = keys[i].replace(/^:/, "");
      renamedContracts[renamed] = compileResult.contracts[keys[i]];
    }
    compileResult.contracts = renamedContracts;

    for (const contractName in compileResult.contracts) {
      // sometimes this throws errors... :(
      try {
        compileResult.contracts[contractName].interface =
          solc.getUpdatedAbi(request.body.version, compileResult.contracts[contractName].interface);
      } catch (err) {
        logger.error({
          at: 'solidity#compile',
          message: 'getUpdatedAbi threw error',
          error: err.toString()
        });
      }
    }
    response.status(200).json(compileResult);
  } catch (e) {
    errorHandler.handle(e, response);
  }
});

module.exports = router;
