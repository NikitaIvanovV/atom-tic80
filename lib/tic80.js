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

  constructor(executable, {onStdout, onStderr, onClose, greetingMessage}) {
    this.executable = executable;
    this.onStdout = onStdout;
    this.onStderr = onStderr;
    this.onClose = onClose;
    this.greetingMessage = greetingMessage;

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
      const tic80Process = spawn(this.executable, args);

      tic80Process.stdout.on('data', (data) => {
        if (this.onStdout) {
          if (sessionStarted || this.greetingMessage) {
            this.onStdout(convertBuffer(data));
          }
          sessionStarted = sessionStarted || data.toString().includes(">");
        }
      });
      tic80Process.stderr.on('data', (data) => {
        if (this.onStderr) { this.onStdout(convertBuffer(data)); }
      });
      tic80Process.on('close', (code, signal) => {
        if (this.onClose) { this.onClose(code, signal); }
      });
    } catch (e) {
      throw new Tic80RunError;
    } finally {
      this.isRunning = false;
    }

  }

}
