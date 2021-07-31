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

class NotSupportedVersionError extends Error {
  constructor(version, message) {
    super(message || "Not supported version of TIC-80");
    this.name = 'NotSupportedVersionError';
    this.version = version;
  }
}

export { Tic80RunError, NotExecutableError, NotSupportedVersionError };
