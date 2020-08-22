'use babel';

import { MessagePanelView, PlainMessageView } from 'atom-message-panel'


export default class TerminalView extends MessagePanelView {
  constructor({clearConsole, maxHeight, position}) {
    // When position is either "left" or "right" the set max
    // height makes some lines invisible.
    if (['left', 'right'].includes(position)) {
      maxHeight = 1E10;
    }

    super({
      title: "TIC-80",
      maxHeight: maxHeight,
      position: position,
      autoScroll: true
    });
    this.attachedOnce = false;

  }

  attach(clear=false) {
    if (! this.enabled) { return; }
    if (clear && this.clearConsole) {
      this.clear();
    }
    if (this.visible) {
      return;
    }
    super.attach();
    this.attachedOnce = true;
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
    if (! this.attachedOnce) { return; }
    this.panel = undefined;
    if (['left', 'right'].includes(this.position)) {
      maxHeight = 1E10;
    }
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
