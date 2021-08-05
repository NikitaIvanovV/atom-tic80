import cson from 'cson';
import fs from 'fs/promises';
import path from 'path';
import ticLanguages from '../../lib/languages';
import { APIDocs } from '../../lib/api-docs/api-docs';


const rootPath = path.join(__dirname, '..', '..');


function changeExtension(file, extension) {
  const basename = path.basename(file, path.extname(file))
  return path.join(path.dirname(file), basename + extension)
}

function getCSONFile(path) {
  const object = cson.requireCSONFile(path);
  if (object instanceof Error) {
    throw new Error(object);
  }
  return object;
}

async function saveSnippetsFile(object, snippetsFilePath) {
  var string = JSON.stringify(object);
  await fs.writeFile(snippetsFilePath, string);
  return string;
}

function addMetadataSnippets(languageSnippets, language) {
  const string = dedent`
    ${language.comment} title:  \${1:game title}
    ${language.comment} author: \${2:game developer}
    ${language.comment} desc:   \${3:short description}
    ${language.comment} script: ${language.ticName}
    \${4}`;

  languageSnippets['Cart tags'] = makeSnippetObject('tags', string);
}

function makeSnippetObject(prefix, body) {
  return {prefix, body};
}

function generateSnippetsForLanguage(snippets, language) {
  const langKey = '.' + language.scope;
  
  if (snippets[langKey] === undefined) {
    snippets[langKey] = {};
  }
  
  addMetadataSnippets(snippets[langKey], language);
}

async function generateSnippets(snippetsPath, snippetsTemplatePath) {
  var snippets = getCSONFile(snippetsTemplatePath);
  
  for (const language of APIDocs.languages) {
    generateSnippetsForLanguage(snippets, language);
  }
  
  await saveSnippetsFile(snippets, snippetsPath);
}

async function main() {
  const snippetsPath = path.join(rootPath, 'snippets', 'atom-tic80.json');
  const snippetsTemplatePath = path.join(__dirname, 'snippets.cson');
  await generateSnippets(snippetsPath, snippetsTemplatePath);
}

if (require.main === module) {
  console.log("Generating snippets...");
  main().then(() => console.log("Done!"));
}
