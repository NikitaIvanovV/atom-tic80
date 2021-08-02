'use babel';

import cson from 'cson';
import ticLanguages from '../languages'


const languages = [
  ticLanguages.Lua,
  ticLanguages.JavaScript,
  ticLanguages.Moon,
  ticLanguages.Wren,
  ticLanguages.Squirrel
];

provider = {
  disableForSelector: 'comment',

  // This will take priority over the default provider, which has an inclusionPriority of 0.
  inclusionPriority: 0,

  // This will be suggested before the default provider, which has a suggestionPriority of 1.
  suggestionPriority: 1,

  // Let autocomplete+ filter and sort the suggestions you provide.
  filterSuggestions: true,

  getSuggestions({editor, bufferPosition, scopeDescriptor, prefix}) {
    // Don't return suggestions if user doesn't type
    if (! prefix) { return; }

    scope = scopeDescriptor.scopes[0];
    return this.completions[scope];
  }

}

provider.selector = languages.map((lang) => '.' + lang.scope).join(', ');

function makeFunctionSnippet(name, argNames, leftBlock, rightBlock, separator, prefix) {
  const args = [];
  
  var argCount = 1;
  for (const name of argNames) {
    args.push(`\${${argCount}:${name}}`);
    argCount++;
  }
  
  const argsString = args.join(separator);
  
  var string = name + leftBlock + argsString + rightBlock;
  if (prefix) {
    string = prefix + string;
  }
  return string;
}

function getFunctionSnippet(language, name, {args}) {
  var snippet;
  switch (language) {
    case ticLanguages.Lua:
    case ticLanguages.JavaScript:
    case ticLanguages.Squirrel:
      snippet = makeFunctionSnippet(name, args, '(', ')', ', ');
      break;
    case ticLanguages.Moon:
      snippet = makeFunctionSnippet(name, args, ' ', '', ', ');
      break;
    case ticLanguages.Wren:
      snippet = makeFunctionSnippet(name, args, '(', ')', ', ', 'TIC.');
      break;
    default:
      throw new Error("Uknown language");
  }
  
  return snippet;
}

function getCompletions() {
  
  const completions = {};
  for (const lang of languages) {
    completions[lang.scope] = [];
  }

  const convertedProperties = {
    'version': 'rightLabel',
    'returns': 'leftLabel'
  };

  const wikiUrl = 'https://github.com/nesbox/TIC-80/wiki/';

  const apiDocs = cson.requireCSONFile(`${__dirname}/api-docs.cson`);
  
  if (apiDocs instanceof Error) {
    throw new Error(apiDocs);
  }
   
  for (const [name, apiEntry] of Object.entries(apiDocs)) {
    apiEntry.text = apiEntry.text || name;
    apiEntry.type = apiEntry.type || 'function';
    apiEntry.descriptionMoreURL = wikiUrl + name;
    
    // Make snippet if function API provides a list of args
    if (apiEntry.type === 'function' && apiEntry.args && apiEntry.snippet === undefined) {
      apiEntry.snippet = {};
      for (const lang of languages) {
        apiEntry.snippet[lang.ticName] = getFunctionSnippet(lang, name, apiEntry);
      }
      delete apiEntry.args;
    }

    // Convert API object propetries to completion ones
    for (const [from, to] of Object.entries(convertedProperties)) {
      if (apiEntry[from]) {
        apiEntry[to] = apiEntry[from];
        delete apiEntry[from];
      }
    }

    // Find out if API Docs differ depending on language
    let differ = false;
    for (const value of Object.values(apiEntry)) {
      if (typeof value == 'object') {
        const ticNames = ticLanguages.getAll().map(lang => lang.ticName);
        for (const key of Object.keys(value)) {
          if (! ticNames.includes(key)) {
            throw new Error("Uknown snippet language specifier: " + key);
          }
        }
        differ = true;
        break;
      }
    }

    // Store completions data
    let data;
    if (! differ) {
      data = apiEntry;
    }
    for (const scope of Object.keys(completions)) {
      const language = ticLanguages.fromScope(scope);
      if (differ) {
        data = Object.assign({}, apiEntry);
        for (const [field, value] of Object.entries(data)) {
          if (typeof value === 'object') {
            data[field] = value[language.ticName];
            if (data[field] === undefined) {
              throw new Error(`Language not specified. API name: ${name}, language: ${language.name}`);
            }
          }
        }
      }
      completions[scope].push(data);
    }
  }

  return completions;
}

export default function provide() {
  provider.completions = getCompletions();
  return provider;
}
