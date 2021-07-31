'use babel';

import { CompositeDisposable } from 'atom';

import Tic80 from './tic80';
import TerminalView from './views/terminal'
import { NotExecutableError } from './errors';

import ticLanguages from './languages';
import path from 'path';
import fs from 'fs';
import cson from 'cson';
import LanguageSelectView from './views/language-select';
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
      onStderr: (content) => {
        atom.notifications.addError(
          "An error occured while running TIC-80", {
          description: content,
          dismissable: true
        });
      },
      onClose: () => {
        if (getConfig('terminal.closeOnExit')) {
          this.terminal.close();
        }
      }
    });

    atom.config.observe(getConfigName('pathToExecutable'), (newValue) => {
      this.tic80.executable = newValue;
    });
    atom.config.observe(getConfigName('tic80.restart'), (newValue) => {
      this.tic80.restart = newValue;
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
  
  createLanguagesSelectView() {
    if (this.languageSelectView) {
      return this.languageSelectView;
    }
    this.languageSelectView = new LanguageSelectView;
    return this.languageSelectView;
  },

  runTic80(params = {}, hideTerminal=false, events = {}) {

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
      params,
      events
    );
    if (! hideTerminal) {
      this.terminal.attach(true);
    }
  },

  runTic80File(cartPath) {
    this.runTic80({
      cartPath: cartPath
    });
  },

  runFile() {

    // Get active editor
    var editor = atom.workspace.getActiveTextEditor();
    if (editor === undefined) {
      atom.notifications.addError("Open TIC-80 cart to run it.");
      return;
    }

    // Get paths to cart
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
    } else {
      if (! Tic80.isValidExtension(extName)) {
        atom.notifications.addError(`
TIC-80 doesn't support \`${extName}\`.
Following file extensions are supported:
${Tic80.languages.map(lang => `\`${lang.extension}\``).join(', ')}
          `,
          {dismissable: true}
        );
        return;
      }

      // Save file in case a user forgot to
      editor.save();
    }
    this.runTic80File(filePath);

  },

  createProject() {
    
    const languages = ticLanguages.getAll();
    this.createLanguagesSelectView().add((language) => {
      this.createProjectForLang(language);
    });
    
  },
  
  createProjectForLang(lang) {
    
    function openProject(filePath, projectPath) {
      if (projectPath) {
        atom.open({pathsToOpen: projectPath, newWindow: false});
      }
      atom.open({pathsToOpen: filePath, newWindow: false});
      atom.notifications.addSuccess("Project was succesfully created! It will be opened soon.");
    }

    atom.pickFolder((paths) => {
      if (paths === null) { return; }
      const folderPath = paths[0];
      
      const cartName = `game${lang.extension}`;
      const cartPath = path.join(folderPath, cartName);
      
      if (fs.existsSync(cartPath)) {
        atom.notifications.addError(`You've already created a project with this path: \`${cartPath}\``);
        return;
      }

      this.runTic80(
        {
          fileSystemPath: folderPath,
          cli: true,
          commands: [`new ${lang.ticName}`, `save ${cartName}`]
        },
        true,
        {
          onClose: (code, signal) => {
            if (code !== 0) {
              atom.addError("An error happened while creating a project");
              return;
            }
            openProject(cartPath, folderPath);
          }
        }
      );
    });
    
  },

  provideAutocomplete() {
    if (! getConfig('autocomplete.enabled')) { return; }
    return autocomplete();
  },

  config: config

};
