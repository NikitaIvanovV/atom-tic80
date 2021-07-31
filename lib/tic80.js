'use babel';

import { exec, spawn } from 'child_process';
import { sync as commandExists } from 'command-exists';
import { Tic80RunError, NotExecutableError, GetCodeError } from './errors';
import ticLanguages from './languages';

import fs from 'fs';
import path from 'path';
import utils from './utils'



class Tic80 {
  
  static languages = ticLanguages.getAll();
  static extension = '.tic';

  constructor(executable, {onStdout, onStderr, onClose, greetingMessage}) {
    this.executable = executable;
    this.onStdout = onStdout;
    this.onStderr = onStderr;
    this.onClose = onClose;
    this.greetingMessage = greetingMessage;
  }
  
  static isValidExtension(extensions) {
    return this.codeExtensions.includes(extensions);
  }

  get isRunning() {
    return this.process !== undefined;
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

  async run(skip=true, fullscreen=false, {cartPath, fileSystemPath, commands, cli}, {onStdout, onStderr, onClose}) {

    this.checkExistence();

    if (this.restart && this.process !== undefined) {
      this.kill('SIGHUP');
    }

    var args = [];
    if (cartPath) {
      args.push(cartPath);
    }
    if (skip) {
      args.push('--skip');
    }
    if (fullscreen) {
      args.push('--fullscreen');
    }
    if (cli) {
      args.push('--cli');
    }
    if (fileSystemPath) {
      args.push("--fs", fileSystemPath);
    }
    if (commands) {
      let cmd_string = commands.join(' & ');
      args.push("--cmd", cmd_string);
    }

    // var cmd_list = [];
    // cmd_list.push(this.executable, ...args);
    // var cmd = cmd_list.join(" ");
    // console.log(cmd);

    function convertBuffer(buffer) {
      return buffer.toString();
    }

    var sessionStarted = false;
    try {
      this.process = spawn(this.executable, args);

      this.process.stdout.on('data', (data) => {
        let message = convertBuffer(data);
        if (onStdout) {
          onStdout(message);
        }
        if (this.onStdout) {
          if (sessionStarted || this.greetingMessage) {
            this.onStdout(message);
          }
          sessionStarted = sessionStarted || data.toString().includes(">");
        }
      });
      this.process.stderr.on('data', (data) => {
        let message = convertBuffer(data);
        if (onStderr) {
          onStderr(message);
        }
        if (this.onStderr) {
          this.onStderr(message);
        }
      });
      this.process.on('close', (code, signal) => {
        if (onClose){
          onClose(code, signal);
        }
        if (this.onClose) {
          this.process = undefined;
          this.onClose(code, signal);
        }
      });
    } catch (e) {
      throw new Tic80RunError;
    }

  }

  kill(signal='SIGHUP') {
    this.process.kill(signal);
    this.process = undefined;
  }

}

Tic80.codeExtensions = Tic80.languages.map((lang) => lang.extension);

module.exports = Tic80;
