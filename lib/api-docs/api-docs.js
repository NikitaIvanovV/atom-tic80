'use babel';

import cson from 'cson';
import path from 'path';
import utils from '../utils';
import ticLanguages from '../languages';


class APIObject {
  
  constructor(apiDocs, name, fields) {
    this.apiDocs = apiDocs;
    this.name = name;
    this._fields = fields;
    
    this.type = utils.popFromObject(fields, 'type');
  }
  
  getField(fieldName, language) {
    var value = this._fields[fieldName];
    
    if (typeof value === 'object') {
      value = value[language.ticName];
      if (value === undefined) {
        throw new Error(`Field name "${fieldName}" for language "${language.ticName}" was not found`);
      }
    }
    
    return value;
  }
  
  getFields(language) {
    const fields = {};
    for (const fieldName of Object.keys(this._fields)) {
      fields[fieldName] = this.getField(fieldName, language);
    }
    return fields;
  }
  
}

class APIFunction extends APIObject {
  
  constructor(...args) {
    super(...args)
    
    this.args = utils.popFromObject(this._fields, 'args');
    if (this.args === undefined) {
      this.args = [];
    }
    
    this._fields.snippet = {};
    for (const lang of this.apiDocs.languages) {
      this.setFunctionSnippet(this.name, lang);
    }
  }
  
  static getSnippetArgumentArray(argNames) {
    return argNames;
  }
  
  static makeFunctionSnippet(name, argNames, leftBlock, rightBlock, separator, {prefix, emptyArgsSuffix} = {}) {
    const args = this.getSnippetArgumentArray(argNames);
    
    var string;
    if (argNames.length === 0 && emptyArgsSuffix) {
      string = name + emptyArgsSuffix;
    } else {
      const argsString = args.join(separator);
      string = name + leftBlock + argsString + rightBlock;
    }

    if (prefix) {
      string = prefix + string;
    }
    return string;
  }

  setFunctionSnippet(name, language) {
    const args = this.args;
    var snippet;
    switch (language) {
      case ticLanguages.Lua:
      case ticLanguages.JavaScript:
      case ticLanguages.Squirrel:
        snippet = this.constructor.makeFunctionSnippet(name, args, '(', ')', ', ');
        break;
      case ticLanguages.Moon:
        snippet = this.constructor.makeFunctionSnippet(name, args, ' ', '', ', ', {emptyArgsSuffix: '!'});
        break;
      case ticLanguages.Wren:
        snippet = this.constructor.makeFunctionSnippet(name, args, '(', ')', ', ', {prefix: 'TIC.'});
        break;
      default:
        throw new Error("Uknown language: " + language.name);
    }
    this._fields.snippet[language.ticName] = snippet;
  }
  
}

class APIDocs {
  
  // Add API Docs only for these because they have their language packages for Atom
  static languages = [
    ticLanguages.Lua,
    ticLanguages.JavaScript,
    ticLanguages.Moon,
    ticLanguages.Wren,
    ticLanguages.Squirrel
  ];
  
  static path = path.join(__dirname, 'api-docs.cson');
  static wikiUrl = 'https://github.com/nesbox/TIC-80/wiki/';
  
  static apiObjectConstructors = {
    function: APIFunction,
    other: APIObject
  };
  
  constructor(path) {
    if (path === undefined) {
      path = APIDocs.path;
    }
    this.path = path;
  }
  
  getDocs() {
    if (this.docs !== undefined) {
      return this.docs;
    }
    
    const docs = cson.requireCSONFile(this.path);
    if (docs instanceof Error) {
      throw new Error(docs);
    }
    
    this.docs = docs;
    return docs;
  }
  
  static makeAPIObject(name, object) {
    const type = object.type;
    if (! ['function', 'other'].includes(type)) {
      throw new Error(`Unrecognized API object type: ${object.type}`);
    }
    
    const constructor = this.apiObjectConstructors[type];
    return new constructor(this, name, object);
  }
  
  static getDictionaryValue(object) {
    return object;
  }
  
  get dictionary() {
    if (this._dictionary !== undefined) {
      return this._dictionary;
    }
    
    const dictionary = {};
    for (const object of this.objects) {
      dictionary[object.name] = this.constructor.getDictionaryValue(object);
    }
    
    this._dictionary = dictionary;
    return dictionary;
  }
  
  get objects() {
    if (this._objects !== undefined) {
      return this._objects;
    }
    
    const docs = this.getDocs();
    
    this._objects = [];
    for (const [name, object] of Object.entries(docs)) {
      if (object.type === undefined) {
        object.type = 'function';
      }
      this._objects.push(this.constructor.makeAPIObject(name, object));
    }
    
    return this._objects;
  }
  
}

export {
  APIDocs,
  APIObject,
  APIFunction
};
