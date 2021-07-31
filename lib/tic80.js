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
    'wren': '.wren',
    'squirrel': '.nut'
  };

  static codeExtensions = ['.lua', '.js', '.moon', '.fnl', '.wren', '.nut'];
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

  async run(skip=true, fullscreen=false, {cartPath, fileSystemPath, commands, cli}, {onStdout, onStderr, onClose}) {

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

  kill(code='SIGHUP') {
    this.process.kill(code);
    this.process = undefined;
  }

}

Tic80.supportedFormats = [Tic80.ext].concat(Tic80.codeExtensions);

module.exports = Tic80;
