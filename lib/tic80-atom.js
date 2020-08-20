'use babel';

import { CompositeDisposable } from 'atom';
import Tic80 from './tic80';

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
    try {
      this.tic80.run(
        getConfig('pathToExecutable'),
        skip=getConfig('skipStartUpAnimation')
      );
    } catch (e) {
      atom.notifications.addWarning(e.message);
      console.log("TIC run error caught")
    }
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
