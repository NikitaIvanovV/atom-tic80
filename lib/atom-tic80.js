'use babel';

import { CompositeDisposable } from 'atom';

import Tic80 from './tic80';
import TerminalView from './views/terminal'
import { NotExecutableError } from './errors';

import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import utils from './utils'


var packageName = 'atom-tic80';

function getConfigName(entry) {
  return `${packageName}.${entry}`;
}

function getConfig(entry) {
  return atom.config.get(getConfigName(entry));
}

export default {

  subscriptions: null,
  tic80: null,
  terminal: null,

  activate(state) {

    this.terminal = new TerminalView({
      position: getConfig('terminal.position'),
      maxHeight: getConfig('terminal.maxHeight')
    });

    atom.config.observe(getConfigName('terminal.enabled'), (newValue) => {
      this.terminal.enabled = newValue;
    });
    atom.config.observe(getConfigName('terminal.clearConsole'), (newValue) => {
      this.terminal.clearConsole = newValue;
    });
    atom.config.observe(getConfigName('terminal.position'), (newValue) => {
      this.terminal.position = newValue;
      this.terminal.reload();
    });

    this.tic80 = new Tic80(
      undefined, {
      onStdout: (content) => {
        this.terminal.add(content);
      },
      onClose: () => {
        if (getConfig('terminal.closeOnExit')) { this.terminal.close(); }
      }
    });

    atom.config.observe(getConfigName('pathToExecutable'), (newValue) => {
      this.tic80.executable = newValue;
    });
    atom.config.observe(getConfigName('terminal.greetingMessage'), (newValue) => {
      this.tic80.greetingMessage = newValue;
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tic80:run-file': () => this.runFile(),
      'tic80:run': () => this.run(),
      'tic80:create-project': () => this.createProject(),
      'tic80:toggle-terminal': () => this.terminal.toggle()
    }));

  },

  deactivate() {
    this.terminal.closeMethod = 'destroy';
    this.terminal.close();
  },

  runTic80(params = {}, hideTerminal=false) {

    // Check if TIC-80 can be run with given path
    try {
      this.tic80.checkExistence();
    } catch (e) {
      if (e instanceof NotExecutableError) {
        atom.notifications.addError(`
TIC-80 executable was not found in \`${e.path}\`.

Go to \`Settings > Packages > atom-tic80\` and set proper path to the executable.
          `, {dismissable: true}
        );
        return;
      }
      throw e;
    }

    this.tic80.run(
      getConfig('startUp.skipStartUpAnimation'),
      getConfig('startUp.fullscreen'),
      params
    );
    if (! hideTerminal) {
      this.terminal.attach(true);
    }
  },

  runTic80File(cartPath, codePath) {
    this.runTic80({
      cartPath: cartPath,
      codePath: codePath
    });
  },

  run() {
    this.runTic80();
  },

  runFile() {

    // Get active editor
    var editor = atom.workspace.getActiveTextEditor();
    if (editor === undefined) {
      atom.notifications.addError("Open TIC-80 cart or code file to run it.");
      return;
    }

    // Disallow multiple instances of TIC-80
    // if (this.tic80.isRunning) {
    //   atom.notifications.addError("TIC-80 is already running.");
    //   return;
    // }

    // Get paths to cart and code
    var cartPath, codePath;
    var filePath = editor.getPath();
    var extName = path.extname(filePath);
    if (extName == '.tic') {
      // Comment out when 0.80 releases
      atom.notifications.addWarning(`
Although you can run a cart file, it's not recommended to edit
it using Atom Editor or any other external text editor because
doing so may corrupt the cart.

A feature to edit \`.tic\` files in external editors may be
added in TIC-80 v0.80.
      `, {dismissable: true});

      cartPath = filePath
    } else {
      if (! this.tic80.codeExtensions.includes(extName)) {
        atom.notifications.addError(`
TIC-80 doesn't support \`${extName}\`.
Following file extensions are supported:
${this.tic80.codeExtensions.map(ext => `\`${ext}\``).join(', ')}
          `,
          {dismissable: true}
        );
        return;
      }
      // Save file in case a user forgot to
      editor.save();

      codePath = filePath
      var directory = path.dirname(codePath);
      var fileName = path.basename(codePath).match('(\.?[^\s.]+)(\.)?')[1];  // https://regex101.com/r/P2vcFn/1
      var cartName = fileName + '.tic'
      cartPath = path.join(directory, cartName);

      // Warn if cart file is not found
      if (! fs.existsSync(cartPath)) {
        cartPath = undefined;
        atom.notifications.addWarning(`
Cart \`${cartName}\` was not found in the directory:
\`${directory}\`

Default cart will be used.
        `);
      }
    }

    this.runTic80File(cartPath, codePath);
  },

  generateCode() {

    const file = utils.pickFile();
    if (file === null) {
      return;
    }
    console.log(file);

  },

  createProject() {

    // const choice = atom.confirm({
    //   message: 'Are you sure you want to force push?',
    //   detailedMessage: 'This operation could result in losing data on the remote.',
    //   buttons: ['Force Push', 'Cancel'],
    // });
    //
    // if (choice === 0) { return; }

    atom.pickFolder((paths) => {
      if (paths === null) { return; }
      let folderPath = paths[0];

      this.runTic80({
        cartPath: folderPath },
        true
      );

      const watcher = chokidar.watch(folderPath, {
        ignored: /.+\.(?!tic)/, // ignore non-.tic
        persistent: true,
        ignoreInitial: true,
        depth: 0
      });

      // Stop waiting for cart addition in 10 minutes
      setTimeout(() => watcher.close().then(() =>
        atom.notifications.addError(
          "A cart has not been created for 10 minutes. Aborting...", {
          dismissable: true
        })),
        1000 * 60 * 10
      );

      watcher.on('add', cartPath => { watcher.close().then(() => {
        this.tic80.kill();
        if (path.extname(cartPath) !== this.tic80.ext) {
          atom.notifications.addError(
            `Invalid file has been created: \`${cartPath}\``, {
            dismissable: true
          });
          return;
        }

        this.tic80.getCodeFromCart(cartPath, (code) => {
          try {
            var extension = this.tic80.getCodeExtension(code);
          } catch (e) {
            var extension = '.lua'
            code = this.tic80.defaultCode.lua;
            atom.notifications.addInfo("Reading `.tic` file failed, writing default `.lua` code...");
          }
          let codePath = utils.getPathWithoutExt(cartPath) + extension;
          atom.open({
            pathsToOpen: folderPath,
            newWindow: false
          });
          fs.writeFile(codePath, code, function (err, data) {
            if (err) {
              throw err;
            }
          });

        });
      })});

    });

  },

  config: {
    pathToExecutable: {
      title: "Executable",
      description: "Path to TIC-80 executable.",
      type: 'string',
      default: 'tic80',
      order: 1
    },
    startUp: {
      type: 'object',
      order: 2,
      properties: {
        fullscreen: {
          title: "Start in fullscreen mode",
          type: 'boolean',
          default: false
        },
        skipStartUpAnimation: {
          title: "Skip Start Up animation",
          description: "Note that running cart and code files always skips it.",
          type: 'boolean',
          default: true
        }
      }
    },
    terminal: {
      type: 'object',
      order: 3,
      properties: {
        enabled: {
          title: "Enable terminal",
          description: "TIC-80 console content will be printed to a terminal right in the Atom.",
          type: 'boolean',
          default: true,
          order: 1
        },
        clearConsole: {
          title: "Clear console",
          description: "Clear console from the old content on start up.",
          type: 'boolean',
          default: true
        },
        closeOnExit: {
          title: "Close terminal",
          description: "Close terminal when TIC-80 is exitted.",
          type: 'boolean',
          default: false
        },
        greetingMessage: {
          title: "Greeting message",
          description: "Print TIC-80 greeting message to terminal.",
          type: 'boolean',
          default: true
        },
        position: {
          description: "Where to attach the terminal panel.",
          type: 'string',
          default: 'bottom',
          enum: ['top', 'bottom', 'left', 'right']
        },
        maxHeight: {
          title: "Initial height",
          description: "Initial height of terminal panel in px.",
          type: 'integer',
          default: 220,
          minimum: 170
        }
      }
    }
  }

};
