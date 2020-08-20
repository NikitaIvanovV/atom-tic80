'use babel';

import Tic80AtomView from './tic80-atom-view';
import { CompositeDisposable } from 'atom';

export default {

  tic80AtomView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.tic80AtomView = new Tic80AtomView(state.tic80AtomViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.tic80AtomView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tic80-atom:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.tic80AtomView.destroy();
  },

  serialize() {
    return {
      tic80AtomViewState: this.tic80AtomView.serialize()
    };
  },

  toggle() {
    console.log('Tic80Atom was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
