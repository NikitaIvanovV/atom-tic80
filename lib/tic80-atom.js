'use babel';

import { CompositeDisposable } from 'atom';
import Tic80 from './tic80';
import path from 'path';
import fs from 'fs';

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
      'tic80-atom:run': () => this.run()
    }));
  },

  deactivate() {
    // this.modalPanel.destroy();
    // this.subscriptions.dispose();
    // this.tic80AtomView.destroy();
  },

  run() {
    // Disallow multiple instances of TIC-80
    // if (this.tic80.isRunning) {
    //   atom.notifications.addWarning("TIC-80 is already running.");
    //   return;
    // }

    // Get active error editor
    // Warn if there is no one
    var editor = atom.workspace.getActiveTextEditor();
    if (editor === undefined) {
      return;
    }

    // Get paths to cart and code
    var cartPath, codePath;
    var filePath = editor.getPath();
    if (path.extname(filePath) == '.tic') {
      atom.notifications.addWarning("Note that only running `.tic` carts is supported. Editing this file will very likely corrupt it.");
      // This will be commented out before 0.80 releases
      // cartPath = filePath
    } else {
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
      getConfig('pathToExecutable'),
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
