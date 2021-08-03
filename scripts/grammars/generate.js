import cson from 'cson';
import fs from 'fs/promises';
import path from 'path';
import ticLanguages from '../../lib/languages';


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

function getApiDocs(path) {
  const apiDocs = getCSONFile(path);
  
  var entries = Object.entries(apiDocs);
  for (const [key, entry] of entries) {
    if (entry.type === undefined) {
      entry.type = 'function';
      continue;
    }
    if (entry.type !== 'function') {
      delete apiDocs[key];
    }
  }
  
  return apiDocs;
}

function getLanguageFromGrammarFile(fileName) {
  const match = fileName.match(/^(\w+)\.tic80\.cson$/);
  if (match === null) {
    throw new Error("File not recognized: " + fileName);
  }
  const lang = ticLanguages.fromTicName(match[1]);
  if (lang === null) {
    throw new Error("Language not recognized: " + fileName);
  }
  return lang;
}

async function saveGrammarFile(object, grammarPath) {
  const string = JSON.stringify(object);
  await fs.writeFile(changeExtension(grammarPath, '.json'), string);
  return string;
}

function getFunctionMatchObject(name, apiEntry, language) {
  var object = {};
  switch (language) {
    case ticLanguages.Lua:
      object.match = String.raw`\b(${name})\b(?=\s*(?:[({"\']|\[\[))`;
      break;
    case ticLanguages.JavaScript:
    case ticLanguages.Squirrel:
      object.match = String.raw`(?<!\.)(\b${name})(?=\s*\()`
      break;
    default:
      throw new Error("Unsupported language: " + language.name);
  }
  return object;
}

function generateAPIFunctionsGrammar(patterns, apiDocs, language) {
  switch (language) {
    case ticLanguages.Lua:
    case ticLanguages.JavaScript:
    case ticLanguages.Squirrel:
      for (const [name, apiEntry] of Object.entries(apiDocs)) {
        patterns.push({
          name: `support.function.library.${language.ticName}.tic80`,
          ...getFunctionMatchObject(name, apiEntry, language)
        });
      }
      break;
    case ticLanguages.Moon:
    case ticLanguages.Wren:
      // Don't add API highlightings to Moon and Wren
      break;
    default:
      throw new Error("Unsupported language: " + language.name);
  }
}

function generateMetadataGrammar(patterns, lang) {
  patterns.push({
    name: `entity.name.tag.${lang.ticName}.tic80.metadata`,
    match: getMetadataMatchString(lang),
    captures: {
      '2': {name: 'string.unquoted.tic80.metadata.data'}
    }
  });
}

function getMetadataMatchString(language) {
  return String.raw`^${language.comment}\s+(title|author|desc|script|input|saveid):\s+(.+)$`;
}

async function generateGrammar(apiDocs, fileName, dir) {
  const lang = getLanguageFromGrammarFile(fileName);
  var grammar = getCSONFile(path.join(dir, fileName));
  
  grammar.repository = {
    api: { patterns: [] },
    other: { patterns: [] }
  };
  
  // Add API functions grammar
  generateAPIFunctionsGrammar(grammar.repository.api.patterns, apiDocs, lang);
  
  // Add metadata grammar
  generateMetadataGrammar(grammar.repository.other.patterns, lang);
  
  const grammarPath = path.join(rootPath, 'grammars', fileName);
  await saveGrammarFile(grammar, grammarPath);
}

async function main() {
  const apiDocsPath = path.join(rootPath, 'lib', 'api-docs.cson');

  const apiDocs = getApiDocs(apiDocsPath);

  const grammarTemplatesDir = path.join(__dirname, 'grammars');
  const files = await fs.readdir(grammarTemplatesDir);
  var file = files[1];
  for (const file of files) {
    await generateGrammar(apiDocs, file, grammarTemplatesDir);
  }
}

if (require.main === module) {
  console.log("Generating grammars...");
  main();
  console.log("Done!");
}
