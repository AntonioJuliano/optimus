/**
 * Created by antonio on 1/16/17.
 */
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

router.post('/compile', (request, response) => {
    request.check({
        'source': {
          in: 'body',
          notEmpty: true
        },
        'version': {
          in: 'body',
          optional: true,
          matches: {
            options: solc.getVersions()
          }
        },
        'optimized': {
          in: 'body',
          notEmpty: true
        }
    });
    request.getValidationResult().then(function(result) {
        if (!result.isEmpty()) {
            return Promise.reject(new errors.RequestError(result.array()));
        }
    }).then(function(result) {
        logger.debug({
            at: 'solidity/compile',
            message: "Compiling contract",
            source: request.body.source
        });
        const optNum = request.body.optimized ? 1 : 0;
        return solc.compile(
          request.body.source,
          request.body.version,
          optNum
        );
    }).catch(function(error) {
      response.status(400).json({
          error: 'Compilation Error',
          errorCode: errors.errorCodes.compilationError
      })
    }).then(function(results) {
      response.status(200).json({
      });
    }).catch(function(error) {
        errorHandler.handle(error, response);
    });
});

module.exports = router;
