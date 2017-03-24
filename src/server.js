const dotenv = require('dotenv');
dotenv.load();

const express = require('express');
const app = express();
const port = 3002;
const expressValidator = require('express-validator');
const bodyParser = require('body-parser');
const errors = require('./helpers/errors');
const logger = require('./helpers/logger');

app.use(bodyParser.json());
app.use(function(error, request, response, _next) {
  response.status(400).json({
    error: 'Invalid Request',
    errorCode: errors.errorCodes.invalidArguments
  });
});
app.use(expressValidator());

app.use('/api/v1/solidity', require('./controllers/solidity'));

// Error handler
app.use((error, request, response, _next) => {
  logger.error({
    at: 'server#errorHandler',
    message: 'Unhandled Error thrown',
    error: error
  });

  response.status(500).json({
    error: 'Server Error',
    errorCode: errors.errorCodes.serverError
  });
});

app.use(function(req, res) {
  res.status(404).json({
    error: "Not Found",
    errorCode: errors.errorCodes.notFound
  });
});

app.listen(port, (error) => {
  if (error) {
    logger.error({
      at: 'server#start',
      message: 'Server failed to start',
      error: error
    });
  }

  logger.info({
    at: 'server#start',
    message: `server is listening on ${port}`
  })
});
