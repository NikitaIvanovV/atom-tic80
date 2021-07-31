'use babel';

class Language {}

// All the objects below have .name property by default

class Lua extends Language {
  static ticName = 'lua';
  static extension = '.lua';
  static comment = '--';
}

class JavaScript extends Language {
  static ticName = 'js';
  static extension = '.js';
  static comment = '//';
}

class Moon extends Lua {
  static ticName = 'moon';
  static extension = '.moon';
}

class Fennel extends Language {
  static ticName = 'fennel';
  static extension = '.fnl';
  static comment = ';;';
}

class Wren extends JavaScript {
  static ticName = 'wren';
  static extension = '.wren';
}
 
class Squirrel extends JavaScript {
  static ticName = 'squirrel';
  static extension = '.nut';
}

const all = [
  Lua,
  JavaScript,
  Moon,
  Fennel,
  Wren,
  Squirrel
];

export default {
  fromExtension(extension) {
    for (var i = 0; i < all.length; i++) {
      if (extension === all[i].extension) {
        return all[i];
      }
    }
    
    // Not found
    return null;
  },
  
  getAll() {
    return all;
  }
}
