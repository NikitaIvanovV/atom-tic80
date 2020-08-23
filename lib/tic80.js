'use babel';

import { exec, spawn } from 'child_process';
import { sync as commandExists } from 'command-exists';
import { Tic80RunError, NotExecutableError } from './errors';

import fs from 'fs';
import path from 'path';
import utils from './utils'


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

  constructor(executable, {onStdout, onStderr, onClose, greetingMessage}) {
    this.executable = executable;
    this.onStdout = onStdout;
    this.onStderr = onStderr;
    this.onClose = onClose;
    this.greetingMessage = greetingMessage;

    this.isRunning = false;

    this.codeExtensions = ['.lua', '.js', '.moon', '.fnl', '.wren'];
    this.langNameToExtension = {
      'lua': '.lua',
      'js': '.js',
      'moon': '.moon',
      'fennel': '.fnl',
      'wren': '.wren'
    };
    this.ext = '.tic';

    this.defaultCode = {};
    this.getDefaultCode((text) => {
      this.defaultCode.lua = text;
    });
  }

  getDefaultCode(callback) {
    var _path = path.join(utils.getPath(), 'code', 'default-code.lua');
    fs.readFile(_path, 'utf8', (err, text) => {
      if (err) {
        throw err;
      }
      callback(text);
    });
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

  /**
  * It was made to get default code from the default cart.
  * It's not guaranteed that it will work with any other cart.
  */
  getCodeFromCart(cartPath, callback) {

    callback(this.defaultCode.lua);

    // Commented out until TIC-80 0.80 releases

    // fs.readFile(cartPath, undefined, (err, buffer) => {
    //   if (err != null) {
    //     throw err;
    //   }
    //
    //   // These magic numbers were discovered by trial and error.
    //   // Again, not guaranteed to work in other cases.
    //   var start = 680, end = buffer.length-170;
    //
    //   callback(buffer.toString('ascii', start, end));
    // });

  }

  getCodeExtension(code) {
    var pattern = /[-\/;]{2}\ title:[\w ]+\n[-\/;]{2}\ author:[\w ]+\n[-\/;]{2}\ desc:[\w ]+\n[-\/;]{2}\ script: +(lua|js|moon|fennel|wren)/
    var match = code.match(pattern);
    if (match === null) {
      throw new Error("Didn't manage to get code extension from code");
    }
    return this.langNameToExtension[match[1]];
  }

  /**
   * Run TIC-80.
   @param {Array} commands TIC-80 console commands to run on start up.
   */
  async run(skip=true, fullscreen=false, {cartPath, codePath, commands}) {

    function processPath(string) {
      return string;
      // return`"${string}"`;
    }

    this.checkExistence();

    var args = [];
    if (cartPath) {
      args.push(processPath(cartPath));
    }
    if (skip) {
      args.push('-skip');
    }
    if (fullscreen) {
      args.push('-fullscreen');
    }
    if (codePath) {
      args.push('-code', processPath(codePath));
    }
    if (commands) {
      for (var i = 0; i < commands.length; i++) {
        if (commands[i].split(' ').length > 1) {
          commands[i] = `"${commands[i]}"`;
        }
      }
      args.push(...commands);
    }

    var cmd_list = [];
    cmd_list.push(this.executable, ...args);

    var cmd = cmd_list.join(" ");
    console.log(cmd);

    function convertBuffer(buffer) {
      return buffer.toString();
    }

    var sessionStarted = false;
    try {
      this.process = spawn(this.executable, args);

      this.process.stdout.on('data', (data) => {
        if (this.onStdout) {
          if (sessionStarted || this.greetingMessage) {
            this.onStdout(convertBuffer(data));
          }
          sessionStarted = sessionStarted || data.toString().includes(">");
        }
      });
      this.process.stderr.on('data', (data) => {
        if (this.onStderr) { this.onStdout(convertBuffer(data)); }
      });
      this.process.on('close', (code, signal) => {
        if (this.onClose) { this.onClose(code, signal); }
      });
    } catch (e) {
      throw new Tic80RunError;
    } finally {
      this.isRunning = false;
    }

  }

  kill() {
    this.process.kill();
    this.process = undefined;
  }

}
