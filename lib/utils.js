'use babel';

import pathlib from 'path';

export default {

  getPathWithoutExt(path) {
    var parsed = pathlib.parse(path);
    return pathlib.join(parsed.dir, parsed.name);
  },

  pickFile() {
    const remote = require('electron').remote;
    var files = remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      {properties: ['openFile']}
    );
    if (files && files.length) {
      return files[0];
    }
    return null;
  },

  getPath() {
    var packagesPath = atom.packages.getPackageDirPaths()[0];
    return path = pathlib.join(packagesPath, 'atom-tic80', 'lib');
  }

};
