'use babel';

import { exec, spawn } from 'child_process';
import { sync as commandExists } from 'command-exists';
import { Tic80RunError, NotExecutableError, GetCodeError } from './errors';

import fs from 'fs';
import path from 'path';
import utils from './utils'


class Tic80 {

  static langNameToExtension = {
    'lua': '.lua',
    'js': '.js',
    'moon': '.moon',
    'fennel': '.fnl',
    'wren': '.wren'
  };

  static codeExtensions = ['.lua', '.js', '.moon', '.fnl', '.wren'];
  static ext = '.tic';

  static defaultCode = {
    lua: fs.readFileSync(path.join(utils.getPath(), 'code', 'default.lua'), 'utf8')
  };

  constructor(executable, {onStdout, onStderr, onClose, greetingMessage}) {
    this.executable = executable;
    this.onStdout = onStdout;
    this.onStderr = onStderr;
    this.onClose = onClose;
    this.greetingMessage = greetingMessage;
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

  static getCodeFromCart(path) {

    function getCodeString(buffer, start) {
      const size = getSize(buffer, start);
      var string = buffer.toString('ascii', start, start+size);

      try {
        Tic80.getCodeExtension(string);
      } catch (e) {
        throw new GetCodeError;
      }
      console.log(string);
      return string;
    }

    function getSize(buffer, start) {
      var start = start-3;
      return buffer[start] | (buffer[start+1] << 8);
    }

    var buffer = fs.readFileSync(path, undefined);

    var start, code;
    try {
      // TIC-80 >=0.80.0
      start = 850;
      code = getCodeString(buffer, start);
    } catch (e) {
      // TIC-80 <0.80.0
      if (! e instanceof GetCodeError) {
        throw e;
      }
      start = 680;
      code = getCodeString(buffer, start);
    }

    return code;

  }

  static getCodeExtension(code) {
    const pattern = /(?<comment>[-\/;]{2}\ )title:[\w ]+\n\k<comment>author:[\w ]+\n\k<comment>desc:[\w ]+\n\k<comment>script:\ +(lua|js|moon|fennel|wren)/;

    const match = code.match(pattern);
    if (match === null) {
      throw new Error("Didn't manage to get code extension from code");
    }
    return Tic80.langNameToExtension[match[2]];
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

    if (this.restart && this.process !== undefined) {
      this.kill('SIGHUP');
    }

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
      let arg = '-code';
      if (this.watch) {
        arg += '-watch';
      }
      args.push(arg, processPath(codePath));
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
        if (this.onClose) {
          this.process = undefined;
          if (signal === 'SIGHUP') { return; }

          this.onClose(code, signal);
        }
      });
    } catch (e) {
      throw new Tic80RunError;
    }

  }

  kill(code=0) {
    this.process.kill(code);
    this.process = undefined;
  }

}

Tic80.supportedFormats = [Tic80.ext].concat(Tic80.codeExtensions);

module.exports = Tic80;
