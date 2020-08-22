'use babel';

import { exec } from 'child_process';
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

  constructor() {
    this.isRunning = false;
    this.codeExtensions = ['.lua', '.js', '.moon', '.fnl', '.wren'];
  }

  checkExistence(pathToExecutable) {
    if (! commandExists(pathToExecutable)) {
      throw new NotExecutableError(pathToExecutable);
    }
  }

  async run(pathToExecutable, skip=true, fullscreen=false, cartPath, codePath) {

    function processPath(string) {
      return`"${string}"`;
    }

    this.checkExistence(pathToExecutable);

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
      args.push('-code ' + processPath(codePath));
    }

    var cmd_list = [];
    cmd_list.push(pathToExecutable, ...args);

    var cmd = cmd_list.join(" ");
    this.isRunning = true;
    try {
      console.log(cmd);
      await shell(cmd);
    } catch(e) {
      throw new Tic80RunError;
    } finally {
      this.isRunning = false;
    }

  }

}
