'use babel';

class Tic80RunError extends Error {
  constructor(message) {
    super(message || "TIC-80 could not run");
    this.name = 'Tic80RunError';
  }
}

class NotExecutableError extends Error {
  constructor(path, message) {
    super(message || `'${path}' is not executable`);
    this.name = 'NotExecutableError';
    this.path = path;
  }
}

export { Tic80RunError, NotExecutableError };
