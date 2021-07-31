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

  constructor(executable, {onStdout, onStderr, onClose}) {
    this.executable = executable;
    this.onStdout = onStdout;
    this.onStderr = onStderr;
    this.onClose = onClose;
  }
  
  reset() {
    this.process = undefined;
    this.version = undefined;
  }
  
  static isValidExtension(extensions) {
    return this.codeExtensions.includes(extensions);
  }
  
  static parseVersionString(string) {
    const match = string.trim().match(/^(\d+)\.(\d+)\.(\d+)( Pro)? (\(\w+\))$/);
    if (match === null) {
      return null;
    }
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
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
  
  async getVersion() {
    return new Promise((resolve, reject) => {
      if (this.version !== undefined) {
        resolve(this.version);
      } else {
        this.run(
          false, false,
          {
            cli: true,
            showGreetingMessage: false,
            commands: ['help version'],
            checkVersion: false
          },
          {
            onStdout: (string) => {
              const version = Tic80.parseVersionString(string);
              this.kill();
              resolve(version);
            }
          }
        ).catch((e) => reject(e));
      }
    });
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
  
  static isSupportedVersion(version) {
    return version && version.major >= this.minimalTicVersion.major && version.minor >= this.minimalTicVersion.minor && version.patch >= this.minimalTicVersion.patch;
  }

  async run(skip=true, fullscreen=false, {cartPath, fileSystemPath, commands, cli, showGreetingMessage, checkVersion}, {onStdout, onStderr, onClose}) {
    
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
          if (sessionStarted || showGreetingMessage) {
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
    if (this.process !== undefined) {
      this.process.kill(signal);
    }
    this.process = undefined;
  }

}

Tic80.codeExtensions = Tic80.languages.map((lang) => lang.extension);

module.exports = Tic80;
