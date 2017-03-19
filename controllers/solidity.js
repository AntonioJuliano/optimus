'use strict';

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

router.post('/compile', async (request, response) => {
  try {
    request.check({
      'source': {
        in: 'body',
        notEmpty: true
      },
      'version': {
        in: 'body',
        notEmpty: true
      },
      'optimized': {
        in: 'body',
        notEmpty: true
      }
    });
    const validationResult = await request.getValidationResult();
    if (!validationResult.isEmpty()) {
      throw new errors.RequestError(result.array());
    }
    logger.debug({
        at: 'solidity/compile',
        message: "Compiling contract"
    });
    const optNum = request.body.optimized ? 1 : 0;
    const compileResult = await solc.compile(
        request.body.source,
        request.body.version,
        optNum,
        request.body.libraries
      );

    for (const contractName in compileResult.contracts) {
      // Not sure why it sometimes returns the contract
      // name starting with : like :ContractName
      sanitizedContractName = contractName.replace(/^:/, '');
      toReturn.contracts[sanitizedContractName] = result.contracts[contractName];

      // sometimes this throws errors... :(
      try {
        toReturn.contracts[sanitizedContractName].interface =
          solc.getUpdatedAbi(request.body.version, result.contracts[contractName].interface);
      } catch (err)  {
        logger.error({
          at: 'solidity#compile',
          message: 'getUpdatedAbi threw error',
          error: err
        });
      }
    }
    response.status(200).json(compileResult);
  } catch (e) {
    errorHandler.handle(e, response);
  }
});

module.exports = router;
