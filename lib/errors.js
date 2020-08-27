'use babel';

class Tic80RunError extends Error {
  constructor(message) {
    super(message || "TIC-80 could not run");
    this.name = 'Tic80RunError';
  }
}

class NotExecutableError extends Tic80RunError {
  constructor(path, message) {
    super(message || `'${path}' is not executable`);
    this.name = 'NotExecutableError';
    this.path = path;
  }
}

class GetCodeError extends Error {
  constructor(message) {
    super(message || "Failed to get code from cart");
    this.name = 'GetCodeError';
  }
}

export { Tic80RunError, NotExecutableError, GetCodeError };
