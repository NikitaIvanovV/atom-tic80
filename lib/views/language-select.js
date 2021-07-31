'use babel';

import SelectListView from 'atom-select-list';
import ticLanguages from '../languages';


export default class LanguageSelectView {

  constructor() {
    this.selectListView = new SelectListView({
      items: ticLanguages.getAll(),
      elementForItem: this.elementForItem.bind(this),
      filterKeyForItem: (item) => item.name,
      didChangeSelection: (lang) => {this.didChangeSelection.bind(this)(lang);},
      didConfirmSelection: this.didConfirmSelection.bind(this),
      didConfirmEmptySelection: this.didConfirmEmptySelection.bind(this),
      didCancelSelection: this.didCancelSelection.bind(this),
    });
    this.element = this.selectListView.element;
    this.element.classList.add('tic-languages-view');
    this.panel = atom.workspace.addModalPanel({item: this, visible: false});
  }
  
  elementForItem(lang) {
    const li = document.createElement('li');

    const line = document.createElement('div');
    line.classList.add('primary-line');
    line.textContent = lang.name;
    li.appendChild(line);

    return li;
  }

  async cancel() {
   if (!this.isCanceling) {
     this.isCanceling = true;
     await this.selectListView.update({items: []});
     this.panel.hide();
     if (this.previouslyFocusedElement) {
       this.previouslyFocusedElement.focus();
       this.previouslyFocusedElement = null;
     }
     this.isCanceling = false;
   }
  }

  async destroy() {
    await this.cancel();
    this.panel.destroy();
    return this.selectListView.destroy();
  }

  getFilterKey() {
    return 'name';
  }

  async cancel() {
    if (!this.isCanceling) {
      this.isCanceling = true;
      this.panel.hide();
      this.onConfirmSelection = undefined;
      if (this.previouslyFocusedElement) {
        this.previouslyFocusedElement.focus();
        this.previouslyFocusedElement = null;
      }
      this.isCanceling = false;
    }
  }

  didCancelSelection() {
    this.cancel();
  }

  didConfirmEmptySelection() {
    this.cancel();
  }

  async didConfirmSelection(language) {
    const callback = this.onConfirmSelection;
    await this.cancel();
    if (callback) {
      callback(language);
    }
  }

  didChangeSelection(language) {
    // no-op
  }

  attach() {
    this.previouslyFocusedElement = document.activeElement;
    this.panel.show();
    this.selectListView.reset();
    this.selectListView.focus();
  }
  
  add(onConfirmSelection) {
    this.onConfirmSelection = onConfirmSelection;
    this.attach();
  }

}
