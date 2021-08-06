'use babel';

import { CompositeDisposable } from 'atom';
import electron from 'electron';

import Tic80 from './tic80';
import TerminalView from './views/terminal'
import { NotExecutableError, NotSupportedVersionError } from './errors';

import path from 'path';
import fs from 'fs';
import cson from 'cson';
import ticLanguages from './languages';
import LanguageSelectView from './views/language-select';
import utils from './utils';
import autocomplete from './autocomplete/autocomplete';
import datatips from './datatips/datatips';


const config = cson.requireCSONFile(path.join(__dirname, 'config.cson'));

const PACKAGE_NAME = 'atom-tic80';

function getConfigName(entry) {
  return `${PACKAGE_NAME}.${entry}`;
}

function getConfig(entry) {
  return atom.config.get(getConfigName(entry));
}

function editConfig(entry, value, options={}) {
  atom.config.set(getConfigName(entry), value, options)
}

function raiseProVersionRequiredError() {
  const notification = atom.notifications.addError(
    "In order to use this command, TIC-80 PRO Version is required.",
    {
      dissmissable: true,
      buttons: [{
        className: 'btn',
        text: "Read more",
        onDidClick: () => {
          electron.shell.openExternal('https://github.com/nesbox/TIC-80#pro-version');
          notification.dismiss();
        }
      }]
    }
  );
}

async function package_deps() {
  // Add entries from package-deps here manually
  // (to prevent loading atom-package-deps and package.json when the deps are already loaded)
  const deps = [
    'language-lua',
    'language-moonscript',
    'language-wren',
    'language-squirrel',
    ['atom-ide-datatip', 'atom-ide-ui']
  ];
  const shouldInstall = !deps.every(p => {
    if (! Array.isArray(p)) {
      return atom.packages.isPackageLoaded(p);
    }
    return p.some(subP => atom.packages.isPackageLoaded(subP));
  });
  if (shouldInstall) {
    // install if not installed
    require('atom-package-deps').install(PACKAGE_NAME, true);
  }
}

export default {

  subscriptions: null,
  tic80: null,
  terminal: null,

  activate(state) {
    
    this.pathsWithAddedMetadata = [];

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

    this.tic80 = new Tic80;

    atom.config.observe(getConfigName('pathToExecutable'), (newValue) => {
      this.tic80.reset();
      this.tic80.executable = newValue;
    });
    atom.config.observe(getConfigName('tic80.restart'), (newValue) => {
      this.tic80.restart = newValue;
    });
    atom.config.observe(getConfigName('tic80.arguments'), (newValue) => {
      this.tic80ManualArgs = newValue;
    });
    atom.config.observe(getConfigName('terminal.greetingMessage'), (newValue) => {
      this.showGreetingMessage = newValue;
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tic80:run': () => this.runTic80(),
      'tic80:create-project': () => this.createProject(),
      'tic80:toggle-terminal': () => this.terminal.toggle(),
      'tic80:clear-terminal': () => this.terminal.clear()
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', {
      'tic80:run-file': () => this.runFile()
    }));

    // Install language packages
    package_deps().catch((e) => {
      atom.notifications.addError(e);
    });

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

  async runTic80(params = {}, printToTerminal=true) {

    // Check if TIC-80 can be run with given path
    try {
      this.tic80.checkExistence();
    } catch (e) {
      if (e instanceof NotExecutableError) {
        const notification = atom.notifications.addError(
          `TIC-80 executable was not found in \`${e.path}\``, {
          description: `Go to the package settings and set proper path to the executable.`,
          dismissable: true,
          buttons: [{
            className: 'btn',
            text: "Open Settings",
            onDidClick: () => {
              atom.workspace.open(`atom://config/packages/${PACKAGE_NAME}`);
              notification.dismiss();
            }
          }]
        });
        return;
      } else {
        throw e;
      }
    }

    try {
      const instance = await this.tic80.run(
        getConfig('tic80.skipStartUpAnimation'),
        getConfig('tic80.fullscreen'),
        {
          ...params,
          showGreetingMessage: this.showGreetingMessage,
          additionalArgs: this.tic80ManualArgs
        }
      );

      instance.onStderr((content) => {
        atom.notifications.addError(
          "An error occured while running TIC-80",
          {description: content, dismissable: true}
        );
      });
      
      if (printToTerminal) {
        instance.onStdout((content) => {
          this.terminal.add(content);
        });
        instance.onClose(() => {
          if (getConfig('terminal.closeOnExit')) {
            this.terminal.close();
          }
        });
        this.terminal.attach(true);
      }
      
      return instance;
    } catch (e) {
      if (e instanceof NotSupportedVersionError) {
        const versionString = Tic80.makeVersionString(Tic80.minimalTicVersion);
        atom.notifications.addError(
          `This version of TIC-80 is too low. Please install ${versionString} or higher.`, {
          dismissable: true
        });
        return;
      } else {
        throw e;
      }
    }
  },

  runTic80File(cartPath) {
    const fileSystemPath = path.dirname(cartPath);
    this.runTic80({cartPath, fileSystemPath});
  },

  async runFile() {

    // Get active editor
    var editor = atom.workspace.getActiveTextEditor();
    if (editor === undefined) {
      atom.notifications.addError("Open TIC-80 cart to run it.");
      return;
    }

    // Get paths to cart
    var filePath = editor.getPath();
    
    if (filePath === undefined) {
      atom.notifications.addError("Save the file before running the command.");
      return;
    }

    var extName = path.extname(filePath);
    if (extName === Tic80.extension) {

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
      
      if (! this.pathsWithAddedMetadata.includes(filePath)) {
        const fileContent = fs.readFileSync(filePath, "ascii");
        const language = ticLanguages.fromExtension(extName);
        if (! Tic80.hasMetadata(fileContent, language)) {
          const language = ticLanguages.fromExtension(extName)
          editor.setText(Tic80.getMetadata(language) + fileContent);
        }
        this.pathsWithAddedMetadata.push(filePath);
      }
      
      // Save file in case a user forgot to
      await editor.save();
    }
    
    this.runTic80File(filePath);

  },

  createProject() {
    
    if (! this.tic80.getVersion().pro) {
      raiseProVersionRequiredError();
      return;
    }
    
    const languages = ticLanguages.getAll();
    this.createLanguagesSelectView().add((language) => {
      this.createProjectForLang(language);
    });
    
  },
  
  async createProjectForLang(lang) {
    
    function openProject(filePath, projectPath) {
      if (projectPath) {
        atom.open({pathsToOpen: projectPath, newWindow: false});
      }
      atom.open({pathsToOpen: filePath, newWindow: false});
      atom.notifications.addSuccess("Project was succesfully created! It will be opened soon.");
    }

    atom.pickFolder(async (paths) => {
      
      function getAvailableNamePath(dirPath, name, extension, index=1) {
        const numberString = index === 1 ? "" : index.toString();
        var fullName = name + numberString + extension;
        var fullPath = path.join(dirPath, fullName);

        if (fs.existsSync(fullPath)) {
            let result = getAvailableNamePath(dirPath, name, extension, index+1);
            fullName = result[0];
            fullPath = result[1];
        }
        
        return [fullName, fullPath];
      }
      
      if (paths === null) { return; }
      const folderPath = paths[0];
      
      const [cartName, cartPath] = getAvailableNamePath(folderPath, 'game', lang.extension);
      
      if (fs.existsSync(cartPath)) {
        atom.notifications.addError(`You've already created a project with this path: \`${cartPath}\``);
        return;
      }

      const instance = await this.runTic80(
        {
          fileSystemPath: folderPath,
          cli: true,
          commands: [`new ${lang.ticName}`, `save ${cartName}`]
        },
        false
      );
      
      instance.onClose((code, signal) => {
        if (code !== 0) {
          atom.addError("An error happened while creating a project");
          return;
        }
        openProject(cartPath, folderPath);
      });
    });
    
  },

  provideAutocomplete() {
    if (! getConfig('autocomplete.enabled')) { return; }
    return autocomplete();
  },
  
  consumeDatatips(datatipService) {
    if (! getConfig('datatips.enabled')) { return; }
    datatipService.addProvider(datatips());
  },

  config: config

};
