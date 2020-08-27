'use babel';

import { CompositeDisposable } from 'atom';

import Tic80 from './tic80';
import TerminalView from './views/terminal'
import { NotExecutableError } from './errors';

import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import cson from 'cson';
import utils from './utils';
import autocomplete from './autocomplete/autocomplete';

const config = cson.requireFile(`${__dirname}/config.cson`);


var packageName = 'atom-tic80';

function getConfigName(entry) {
  return `${packageName}.${entry}`;
}

function getConfig(entry) {
  return atom.config.get(getConfigName(entry));
}

function editConfig(entry, value, options={}) {
  atom.config.set(getConfigName(entry), value, options)
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
    atom.config.observe(getConfigName('terminal.fontSize'), (newValue) => {
      this.terminal.fontSize = newValue;
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
    atom.config.observe(getConfigName('tic80.watch'), (newValue) => {
      this.tic80.watch = newValue;
    });
    atom.config.observe(getConfigName('terminal.greetingMessage'), (newValue) => {
      this.tic80.greetingMessage = newValue;
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tic80:run': () => this.runTic80(),
      'tic80:create-project': () => this.createProject(),
      'tic80:show-terminal': () => this.terminal.attach()
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', {
      'tic80:run-file': () => this.runFile()
    }));

    // Install language-lua Atom package
    require('atom-package-deps').install(packageName);

  },

  deactivate() {
    this.terminal.destroy();
    this.subscriptions.dispose();
  },

  runTic80(params = {}, hideTerminal=false) {

    // Check if TIC-80 can be run with given path
    try {
      this.tic80.checkExistence();
    } catch (e) {
      if (e instanceof NotExecutableError) {
        const notification = atom.notifications.addError(
          `TIC-80 executable was not found in \`${e.path}\`.`, {
          description: `Go to the package settings and set proper path to the executable.`,
          dismissable: true,
          buttons: [{
            className: 'btn',
            text: "Open Settings",
            onDidClick: () => {
              atom.workspace.open(`atom://config/packages/${packageName}`);
              notification.dismiss();
            }
          }]
        });
        return;
      }
      throw e;
    }

    this.tic80.run(
      getConfig('tic80.skipStartUpAnimation'),
      getConfig('tic80.fullscreen'),
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

  runFile() {

    // Get active editor
    var editor = atom.workspace.getActiveTextEditor();
    if (editor === undefined) {
      atom.notifications.addError("Open TIC-80 cart or code file to run it.");
      return;
    }

    // Get paths to cart and code
    var cartPath, codePath;
    var filePath = editor.getPath();
    var extName = path.extname(filePath);
    if (extName == '.tic') {

      // This dash in the config path is not a typo
      // It was made to prevent the config from appearing in the settings
      let hasSeenConfig = 'atom-tic80-.has-seen-do-not-edit-message';

      if (! atom.config.get(hasSeenConfig)) {
        atom.notifications.addWarning(
          "Although you can run a cart file, it's not recommended to edit it using Atom or any other external text editor because doing so may corrupt the cart.", {
          dismissable: true
        });
        atom.config.set(hasSeenConfig, true);
      }

      cartPath = filePath;
    } else {
      if (! Tic80.codeExtensions.includes(extName)) {
        atom.notifications.addError(`
TIC-80 doesn't support \`${extName}\`.
Following file extensions are supported:
${Tic80.codeExtensions.map(ext => `\`${ext}\``).join(', ')}
          `,
          {dismissable: true}
        );
        return;
      }

      // Save file in case a user forgot to
      editor.save();

      codePath = filePath;
      cartPath = utils.getPathWithoutExt(codePath) + '.tic';

      // Warn if cart file is not found
      if (! fs.existsSync(cartPath)) {
        atom.notifications.addWarning(
          "Using default cart...", {
          description: `Cart \`${path.basename(cartPath)}\` was not found in the directory:\n\`${path.dirname(codePath)}\``
        });
        cartPath = undefined;
      }
    }
    this.runTic80File(cartPath, codePath);

  },

  createProject() {

    function openProject(filePath, projectPath) {
      if (projectPath) {
        atom.open({pathsToOpen: projectPath, newWindow: false});
      }
      atom.open({pathsToOpen: filePath, newWindow: false});
      atom.notifications.addSuccess("Project was succesfully created!");
    }

    atom.pickFolder((paths) => {
      if (paths === null) { return; }
      let folderPath = paths[0];

      this.runTic80({
        cartPath: folderPath },
        true
      );

      const watcher = chokidar.watch(folderPath, {
        ignored: /.+\.(?!(tic|lua|js|moon|wren|fnl))/, // e.g. ignore text.txt
        persistent: true,
        ignoreInitial: true,
        depth: 0
      });

      // Stop waiting for cart addition in 10 minutes
      var createdCart = false;
      setTimeout(() => watcher.close().then(() =>
        {
          if (createdCart) { return; }
          atom.notifications.addError(
            "A cart has not been created for 3 minutes. Aborting...", {
            dismissable: true
          });
          this.tic80.kill();
        }),
        1000 * 60 * 3
      );

      watcher.on('add', cartPath => { watcher.close().then(() => {
        createdCart = true;
        this.tic80.kill();

        let cartPathExt = path.extname(cartPath);

        if (! Tic80.supportedFormats.includes(cartPathExt)) {
          atom.notifications.addError(
            `Invalid file has been created: \`${cartPath}\``, {
            dismissable: true
          });
          return;
        }
        if (cartPathExt !== Tic80.ext) {
          openProject(cartPath, folderPath);
          return;
        }

        var code, langExtension;
        try {
          code = Tic80.getCodeFromCart(cartPath);
          langExtension = Tic80.getCodeExtension(code);
        } catch (e) {
          code = Tic80.defaultCode.lua;
          langExtension = '.lua';

          atom.notifications.addInfo("Reading `.tic` file failed, writing default `.lua` code...");
        }

        let codePath = utils.getPathWithoutExt(cartPath) + langExtension;
        fs.writeFile(codePath, code, (err, data) => {
          if (err) {
            throw err;
          }
          openProject(codePath, folderPath);
        });

      })});
    });
  },

  provideAutocomplete() {
    if (! getConfig('autocomplete.enabled')) { return; }
    return autocomplete();
  },

  config: config

};
