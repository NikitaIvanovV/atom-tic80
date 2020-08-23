'use babel';

import { MessagePanelView, PlainMessageView } from 'atom-message-panel'


export default class TerminalView extends MessagePanelView {
  constructor({clearConsole, maxHeight, position}) {

    super({
      title: "TIC-80",
      position: position,
      autoScroll: true
    });
    this.userMaxHeight = maxHeight;

  }

  setMaxHeight() {
    // When position is either "left" or "right" the set max
    // height makes some lines invisible.
    if (['left', 'right'].includes(this.position)) {
      this.maxHeight = 1E10;
    } else {
      this.maxHeight = this.userMaxHeight;
    }
  }

  attach(clear=false) {
    if (! this.enabled) { return; }
    if (clear && this.clearConsole) {
      this.clear();
    }
    if (this.visible) {
      return;
    }
    this.setMaxHeight();
    super.attach();
  }

  toggle() {
    if (! this.enabled) { return; }
    if (this.visible) {
      this.clear();
    } else {
      this.attach();
    }
  }

  reload() {
    if (! this.enabled) { return; }
    if (! this.visible) { return; }
    this.panel = undefined;
    this.attach();
  }

  get visible() {
    return this.state().attached && (! this.state().hidden) && (! this.state().folded);
  }

  add(text) {
    super.add(new PlainMessageView({
      message: text,
      className: 'tic80-terminal-output'
    }));
    this.updateScroll();
  }
}
