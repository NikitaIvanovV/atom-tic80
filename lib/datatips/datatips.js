'use babel';

import { Range } from 'atom';
import cson from 'cson';
import path from 'path';
import ticLanguages from '../languages'
import {APIDocs, APIFunction, APIObject} from '../api-docs/api-docs';


// Add datatips only for these because they have their language packages for Atom
const LANGUAGES = APIDocs.languages;

const API_DOCS = new APIDocs;

const API_FUNCTION_SCOPE_REGEX = (() => {
  const langScopes = LANGUAGES.map(lang => lang.ticName);
  const string = String.raw`support\.function\.library\.(?:${langScopes.join('|')})\.tic80\.(\w+)`;
  return new RegExp(string);
})();

function escapeRegExp(string) {
  // From atom/atom-languageclient. But they took it from somewhere else...
  // From atom/underscore-plus.
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function _getRegexpRangeAtPosition(buffer, position, wordRegex) {
  const { row, column } = position;
  const rowRange = buffer.rangeForRow(row, false);
  let matchData;
  // Extract the expression from the row text.
  buffer.scanInRange(wordRegex, rowRange, (data) => {
    const { range } = data;
    if (
      position.isGreaterThanOrEqual(range.start) &&
      // Range endpoints are exclusive.
      position.isLessThan(range.end)
    ) {
      matchData = data;
      data.stop();
      return;
    }
    // Stop the scan if the scanner has passed our position.
    if (range.end.column > column) {
      data.stop();
    }
  });
  return matchData == null ? null : matchData.range;
}

function getWordAtPosition(editor, position) {
  const nonWordCharacters = escapeRegExp(editor.getNonWordCharacters(position));
  const range = _getRegexpRangeAtPosition(
    editor.getBuffer(),
    position,
    new RegExp(`^[\t ]*$|[^\\s${nonWordCharacters}]+`, 'g'),
  );
  if (range == null) {
    return new Range(position, position);
  }
  return range;
}

function getApiObject(functionName) {
  return API_DOCS.dictionary[functionName];
}

function makeMarkDownMarkedString(functionName, language) {
  const apiObject = getApiObject(functionName);
  const value = apiObject.getField('description', language);
  return {
    type: 'markdown',
    value: value
  };
}

function makeSnippetMarkedString(functionName, grammar, language) {
  const apiObject = getApiObject(functionName);
  const value = apiObject.getField('snippet', language);
  return {
    type: 'snippet',
    grammar: grammar,
    value: value
  }
}

function getHover(editor, point) {
  const [grammarScope, bufferScope] = editor.scopeDescriptorForBufferPosition(point).getScopesArray();
  
  if (bufferScope === undefined) {
    return null;
  }
  
  const match = bufferScope.match(API_FUNCTION_SCOPE_REGEX);
  if (match === null) {
    return null;
  }
  
  const functionName = match[1];
  const grammar = editor.getGrammar();
  const language = ticLanguages.fromScope(grammar.id);
  return {
    contents: [
      makeSnippetMarkedString(functionName, grammar, language),
      makeMarkDownMarkedString(functionName, language)
    ]
  };
}

function isEmptyHover(hover) {
  return hover === null || hover.contents.length === 0;
}

function convertMarkedString(markedString) {
  return markedString;
}

function getDatatip(editor, point) {
  const hover = getHover(editor, point);
  
  if (isEmptyHover(hover)) {
    return null;
  }

  const markedStrings = hover.contents;
  const range = getWordAtPosition(editor, point);
  return makeDatatip(markedStrings, range);
}

function makeDatatip(strings, range) {
  return {
    markedStrings: strings,
    pinnable: false,
    range: range,
  };
}

const provider = {
  priority: 2,
  
  grammarScopes: LANGUAGES.map((lang) => lang.scope),
  
  async datatip(editor, point) {
    // Datatip service seems to just "swallow" error but I think they still should be printed.
    try {
      return getDatatip(editor, point);
    } catch (e) {
      console.error(e);
    }
  }
}

export default function provide() {
  return provider;
}
