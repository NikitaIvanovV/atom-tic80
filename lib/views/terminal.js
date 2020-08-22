'use babel';

import { MessagePanelView, PlainMessageView } from 'atom-message-panel'


export default class TerminalView extends MessagePanelView {
  constructor({clearConsole, maxHeight, position}) {
    // When position is either "left" or "right" the set max
    // height makes some lines invisible.
    if (['left', 'right'].includes(position)) {
      maxHeight = 8000;
    }

    super({
      title: "TIC-80",
      maxHeight: maxHeight,
      position: position,
      autoScroll: true
    });

  }

  attach(clear=false) {
    if (clear && this.clearConsole) {
      this.clear();
    }
    if (this.visible) {
      return;
    }
    super.attach();
  }

  get visible() {
    return this.state().attached && (! this.state().hidden) && (! this.state().folded);
  }

  add(text) {
    super.add(new PlainMessageView({
      message: text,
      className: 'tic80-terminal-output'
    }));
  }
}
