'use babel';

import { exec, spawn } from 'child_process';
import { sync as commandExists } from 'command-exists';
import { Tic80RunError, NotExecutableError, NotSupportedVersionError } from './errors';
import ticLanguages from './languages';

import fs from 'fs';
import path from 'path';
import utils from './utils'

const metadataTemplate = fs.readFileSync(path.join(utils.getPath(), 'code', 'metadata.txt'), 'ascii');


class Tic80 {
  
  static minimalTicVersion = {major: 0, minor: 90, patch: 1706};
  static languages = ticLanguages.getAll();
  static extension = '.tic';
  
  static getMetadata(language) {
    var metadata = metadataTemplate;
    metadata = metadata.replace(/{comment}/gm, language.comment);
    metadata = metadata.replace(/{language}/gm, language.ticName);
    return metadata;
  }

  constructor(executable) {
    this.executable = executable;
    this.reset();
  }
  
  reset() {
    this.process = null;
    this.version = null;
  }
  
  static isValidExtension(extensions) {
    return this.codeExtensions.includes(extensions);
  }
  
  static hasMetadata(fileContent, language) {
    const comment = language.comment;
    const patternString = `^${comment} title:.+$\n^${comment} author:.+$\n^${comment} desc:.+$\n^${comment} script:.+$`;
    const pattern = RegExp(patternString, 'm');
    return pattern.test(fileContent);
  }
  
  static parseVersionString(string) {
    const match = string.trim().match(/^(\d+)\.(\d+)\.(\d+)( Pro)? \((\w+)\)$/);
    if (match === null) {
      return null;
    }
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      pro: Boolean(match[4]),
      hash: match[5]
    };
  }
  
  static makeVersionString(version) {
    var string = `${version.major}.${version.minor}.${version.patch}`;
    if (version.pro) {
      string += " Pro";
    }
    if (version.hash) {
      string += ` (${version.hash})`;
    }
    return string;
  }
  
  getVersion() {
    return new Promise((resolve, reject) => {
      if (this.version !== null) {
        resolve(this.version);
      } else {
        this.run(
          false, false,
          {
            cli: true,
            showGreetingMessage: true,  // it won't be shown anyway, but disable the check just in case
            commands: ['help version'],
            checkVersion: false
          }
        ).then((process) => {
          process.onStdout((string) => {
            this.version = Tic80.parseVersionString(string);
            process.kill();
            resolve(this.version);
          });
        }).catch((e) => reject(e));
      }
    });
  }

  get isRunning() {
    return this.process !== null;
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
  
  static isSupportedVersion(version) {
    return version && version.major >= this.minimalTicVersion.major && version.minor >= this.minimalTicVersion.minor && version.patch >= this.minimalTicVersion.patch;
  }

  async run(skip=true, fullscreen=false, {cartPath, fileSystemPath, commands, cli, showGreetingMessage, checkVersion}) {
    
    if (checkVersion === undefined) {
      checkVersion = true;
    }
    
    if (checkVersion) {
      const version = await this.getVersion();
      if (! Tic80.isSupportedVersion(version)) {
        throw new NotSupportedVersionError(version);
      }
    }
    
    this.checkExistence();

    if (this.restart && this.process !== null) {
      this.killProcess();
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

    this.process = spawn(this.executable, args);
    this.instance = new Tic80Instance(this.process, {showGreetingMessage});
    
    this.instance.onClose((code, signal) => {
      this.process = null;
    });
    
    return this.instance;

  }
  
  killProcess(signal) {
    this.process.kill();
    this.process = null;
  }

}

Tic80.codeExtensions = Tic80.languages.map((lang) => lang.extension);


class Tic80Instance {
  
  constructor(instance, params) {
    this.process = instance;
    this.showGreetingMessage = params.showGreetingMessage;
    
    this.sessionStarted = false;
  }
  
  static convertBuffer(buffer) {
    return buffer.toString();
  }
  
  static isGreetingMessage(string) {
    return /^\n+ (TIC-80 tiny computer\n version|hello! type help for help)/.test(string);
  }
  
  static isSessionMessage(string) {
    return /^>/m.test(string);
  }
  
  static isErrorMessage(string) {
    return /^error:/m.test(string);
  }
  
  static getOnlySessionMessage(message) {
    const lines = message.split('\n').filter(message => Tic80Instance.isSessionMessage(message) && !Tic80Instance.isGreetingMessage(message));
    
    if (lines.length === 0) {
      return null;
    }
    
    return lines.join('\n');
  }
  
  onStdout(callback) {
    
    this.process.stdout.on('data', (data) => {
      var message = Tic80Instance.convertBuffer(data);
      
      if (!this.showGreetingMessage && !this.sessionStarted) {
        message = Tic80Instance.getOnlySessionMessage(message);
        if (message !== null) {
          callback(message);
          this.sessionStarted = true;
        }
      } else {
        callback(message);
      }
    });
  }
  
  onStderr(callback) {
    this.process.stdout.on('data', (data) => {
      const message = Tic80Instance.convertBuffer(data);
      if (Tic80Instance.isSessionMessage(message)) { return; }
      if (! Tic80Instance.isErrorMessage(message)) { return; }
      callback(message);
    });
    this.process.stderr.on('data', (data) => {
      const message = Tic80Instance.convertBuffer(data);
      callback(message);
    });
  }
  
  onClose(callback) {
    this.process.on('close', (code, signal) => {
      callback(code, signal);
    });
  }
  
  kill(signal='SIGTERM') {
    this.process.kill(signal);
  }
  
}

module.exports = Tic80;
