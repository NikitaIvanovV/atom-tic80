'use babel';

import Tic80Atom from '../lib/tic80-atom';

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('Tic80Atom', () => {
  let workspaceElement, activationPromise;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('tic80-atom');
  });

  describe('when the tic80-atom:toggle event is triggered', () => {
    it('hides and shows the modal panel', () => {
      // Before the activation event the view is not on the DOM, and no panel
      // has been created
      expect(workspaceElement.querySelector('.tic80-atom')).not.toExist();

      // This is an activation event, triggering it will cause the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'tic80-atom:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        expect(workspaceElement.querySelector('.tic80-atom')).toExist();

        let tic80AtomElement = workspaceElement.querySelector('.tic80-atom');
        expect(tic80AtomElement).toExist();

        let tic80AtomPanel = atom.workspace.panelForItem(tic80AtomElement);
        expect(tic80AtomPanel.isVisible()).toBe(true);
        atom.commands.dispatch(workspaceElement, 'tic80-atom:toggle');
        expect(tic80AtomPanel.isVisible()).toBe(false);
      });
    });

    it('hides and shows the view', () => {
      // This test shows you an integration test testing at the view level.

      // Attaching the workspaceElement to the DOM is required to allow the
      // `toBeVisible()` matchers to work. Anything testing visibility or focus
      // requires that the workspaceElement is on the DOM. Tests that attach the
      // workspaceElement to the DOM are generally slower than those off DOM.
      jasmine.attachToDOM(workspaceElement);

      expect(workspaceElement.querySelector('.tic80-atom')).not.toExist();

      // This is an activation event, triggering it causes the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'tic80-atom:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        // Now we can test for view visibility
        let tic80AtomElement = workspaceElement.querySelector('.tic80-atom');
        expect(tic80AtomElement).toBeVisible();
        atom.commands.dispatch(workspaceElement, 'tic80-atom:toggle');
        expect(tic80AtomElement).not.toBeVisible();
      });
    });
  });
});
