'use babel';

import { exec } from 'child_process';

/**
* Execute simple shell command (async wrapper).
* @param {String} cmd
* @return {Object} { stdout: String, stderr: String }
*/
async function shell(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        //reject(err)
        throw Error(stderr);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export default class Tic80 {

  constructor(pathToFile) {
    this.codeFile = pathToFile;
    this.isRunning = false;
  }

  async run(pathToExecutable, codeFile, cartFile, skip) {

    var args = [];
    if (skip) {
      args.push('-skip')
    }

    var cmd_list = [];
    cmd_list.push(pathToExecutable, ...args);

    var cmd = cmd_list.join(" ");
    this.isRunning = true;
    try {
      await shell(cmd);
    } finally {
      this.isRunning = false;
    }

  }

}
