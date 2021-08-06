'use babel';

import ticLanguages from '../languages'
import {APIDocs, APIFunction, APIObject} from '../api-docs/api-docs';


function convertFields(apiObject) {
  const convertedProperties = {
    'version': 'rightLabel',
    'returns': 'leftLabel'
  };
  
  // Convert API object propetries to completion ones
  for (const [from, to] of Object.entries(convertedProperties)) {
    if (apiObject._fields[from]) {
      apiObject._fields[to] = apiObject._fields[from];
      delete apiObject._fields[from];
    }
  }
  
  apiObject._fields.type = 'function';
  apiObject._fields.descriptionMoreURL = apiObject.apiDocs.constructor.wikiUrl + name;
}

class OtherCompletion extends APIObject {
  
  constructor(...args) {
    super(...args);
    convertFields(this);
  }
  
}

class FunctionCompletion extends APIFunction {
  
  constructor(...args) {
    super(...args);
    convertFields(this);
  }
  
  static getSnippetArgumentArray(argNames) {
    const args = [];
    var argCount = 1;
    for (const name of argNames) {
      args.push(`\${${argCount}:${name}}`);
      argCount++;
    }
    return args;
  }
  
}

class APICompletions extends APIDocs {
  static apiObjectConstructors = {
    function: FunctionCompletion,
    other: OtherCompletion
  };
}

const LANGUAGES = APIDocs.languages;

function getCompletions() {
  const completions = {};
  for (const lang of LANGUAGES) {
    completions[lang.scope] = [];
  }
  
  const apiDocs = new APICompletions();
   
  for (const apiObject of apiDocs.objects) {
    for (const scope of Object.keys(completions)) {
      const language = ticLanguages.fromScope(scope);
      const data = apiObject.getFields(language);
      completions[scope].push(data);
    }
  }

  return completions;
}

const provider = {
  selector: LANGUAGES.map((lang) => '.' + lang.scope).join(', '),
  disableForSelector: '.comment, .string',

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

export default function provide() {
  provider.completions = getCompletions();
  return provider;
}
