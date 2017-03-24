const errorCodes = {
  invalidArguments: 1000,
  serverError: 1003,
  compilationError: 1004,
  invalidVersion: 1005
};

class ClientError {
  constructor(message, code) {
    this.code = code;
    this.message = message;
  }
}

class CompilationError {
  constructor(cause) {
    this.code = errorCodes.compilationError;
    this.cause = cause;
  }
}

class RequestError {
  constructor(errors) {
    this.errors = errors;
  }
}

module.exports.errorCodes = errorCodes;
module.exports.ClientError = ClientError;
module.exports.RequestError = RequestError;
module.exports.CompilationError = CompilationError;
