'use babel';

import { CompositeDisposable } from 'atom';
import path from 'path';
import fs from 'fs';
import Tic80 from './tic80';
import { NotExecutableError } from './errors';


var packageName = 'tic80-atom';

function getConfig(entry) {
  return atom.config.get(`${packageName}.${entry}`);
}

export default {

  subscriptions: null,

  activate(state) {
    this.tic80 = new Tic80();

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tic80:run-file': () => this.runFile(),
      'tic80:run': () => this.run(),
    }));
  },

  deactivate() {
    // this.modalPanel.destroy();
    // this.subscriptions.dispose();
    // this.tic80AtomView.destroy();
  },

  getExecutble() {
    var tic80Executable = getConfig('pathToExecutable');

    // Check if TIC-80 can be run with given path
    try {
      this.tic80.checkExistence(tic80Executable);
    } catch (e) {
      if (e instanceof NotExecutableError) {
        atom.notifications.addError(`
TIC-80 executable was not found in \`${e.path}\`.

Go to Settings > Packages > tic80-atom and set proper path to the executable.
          `, {dismissable: true}
        );
      }
      throw e;
    }
    return tic80Executable;
  },

  run() {
    // Run TIC-80
    this.tic80.run(
      this.getExecutble(),
      getConfig('skipStartUpAnimation')
    );
  },

  runFile() {
    var tic80Executable = this.getExecutble();

    // Get active error editor
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
      if (! this.tic80.codeTypes.includes(extName)) {
        atom.notifications.addError(`
TIC-80 doesn't support \`${extName}\`.
Following file extensions are supported:
${this.tic80.codeTypes.map(ext => `\`${ext}\``).join(', ')}
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

    // Run TIC-80
    this.tic80.run(
      tic80Executable,
      getConfig('skipStartUpAnimation'),
      cartPath,
      codePath
    );
  },

  config: {
    pathToExecutable: {
      title: 'Executable',
      description: 'Path to TIC-80 executable.',
      type: 'string',
      default: 'tic80'
    },
    skipStartUpAnimation: {
      title: 'Skip Start Up animation',
      type: 'boolean',
      default: true
    }
  }

};
