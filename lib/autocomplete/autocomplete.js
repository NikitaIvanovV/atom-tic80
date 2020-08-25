'use babel';

const cson = require('cson');


provider = {
  selector: '.source.js, .source.lua',
  disableForSelector: '.source.lua .comment, .source.js .comment',

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

function getCompletions() {
  var completions = {
    'source.lua': [],
    'source.js': []
  };

  var convertedProperties = {
    'version': 'rightLabel',
    'returns': 'leftLabel'
  };

  var wikiUrl = 'https://github.com/nesbox/TIC-80/wiki/';

  const apiDocs = cson.requireFile(`${__dirname}/api-docs.cson`);
  for (const [name, apiEntry] of Object.entries(apiDocs)) {
    apiEntry.text = apiEntry.text || name;
    apiEntry.type = apiEntry.type || 'function';
    apiEntry.descriptionMoreURL = wikiUrl + name;

    // Convert API object propetries to completion ones
    for (const [from, to] of Object.entries(convertedProperties)) {
      if (apiEntry[from]) {
        apiEntry[to] = apiEntry[from];
        delete apiEntry[from];
      }
    }

    // Find out if API Docs differs depending on language
    let differ = false;
    for (const value of Object.values(apiEntry)) {
      if (typeof value == 'object') {
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
      if (differ) {
        data = Object.assign({}, apiEntry);
        for (const [field, value] of Object.entries(data)) {
          if (typeof value == 'object') {
            data[field] = value[scope];
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
