'use babel';

import { exec, spawn } from 'child_process';
import { sync as commandExists } from 'command-exists';
import { Tic80RunError, NotExecutableError } from './errors';


/**
* Execute simple shell command (async wrapper).
* @param {String} cmd
* @return {Object} { stdout: String, stderr: String }
*/
async function shell(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err)
        // throw Error(stderr);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export default class Tic80 {

  constructor(executable, {onStdout, onStderr, onClose}) {
    this.executable;
    this.onStdout = onStdout;
    this.onStderr = onStderr;
    this.onClose = onClose;

    this.isRunning = false;
    this.codeExtensions = ['.lua', '.js', '.moon', '.fnl', '.wren'];
  }

  /**
  * Check function to check if it's possible to run TIC-80.
  * Throws NotExecutableError if it's not.
  */
  checkExistence() {
    if (! commandExists(this.executable)) {
      throw new NotExecutableError(this.executable);
    }
  }

  async run(skip=true, fullscreen=false, cartPath, codePath) {

    function processPath(string) {
      return string;
      // return`"${string}"`;
    }

    this.checkExistence();

    var args = [];
    if (skip) {
      args.push('-skip');
    }
    if (fullscreen) {
      args.push('-fullscreen');
    }
    if (cartPath) {
      args.push(processPath(cartPath));
    }
    if (codePath) {
      args.push('-code', processPath(codePath));
    }

    var cmd_list = [];
    cmd_list.push(this.executable, ...args);

    var cmd = cmd_list.join(" ");
    console.log(cmd);

    function convertBuffer(buffer) {
      return buffer.toString();
    }

    try {
      const tic80Process = spawn(this.executable, args);

      tic80Process.stdout.on('data', (data) => {
        if (this.onStdout) { this.onStdout(convertBuffer(data)) }
      });
      tic80Process.stderr.on('data', (data) => {
        if (this.onStderr) { this.onStdout(convertBuffer(data)) }
      });
      tic80Process.on('close', (code, signal) => {
        if (this.onClose) { this.onClose(code, signal) }
      });
    } catch (e) {
      throw new Tic80RunError;
    } finally {
      this.isRunning = false;
    }

  }

}
