import cson from 'cson';
import fs from 'fs/promises';
import path from 'path';
import { APIDocs } from '../../lib/api-docs/api-docs';
import ticLanguages from '../../lib/languages';


const rootPath = path.join(__dirname, '..', '..');


class APIDocsGrammar extends APIDocs {
  get objects() {
    if (this._objects !== undefined) {
      return this._objects;
    }
    
    const objects = super.objects.filter(value => value.type === 'function');
    this._objects = objects;
    return this._objects;
  }
}

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

function getFunctionMatchObject(apiObject, language) {
  var object = {};
  switch (language) {
    case ticLanguages.Lua:
      object.match = String.raw`\b(${apiObject.name})\b(?=\s*(?:[({"\']|\[\[))`;
      break;
    case ticLanguages.JavaScript:
    case ticLanguages.Squirrel:
      object.match = String.raw`(?<!\.)(\b${apiObject.name})(?=\s*\()`
      break;
    case ticLanguages.Moon:
      object.match = String.raw`@?${apiObject.name}(?=\(|!|[ ]+("|'|\{|-?(?!if|then|else|elseif|export|import|from|and|or|not|with|for|in|while|return|unless|continue|break|local)\w+))`;
      break;
    case ticLanguages.Wren:
      object.match = String.raw`(${apiObject.name})(?=\s*\()`;
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
    case ticLanguages.Moon:
    case ticLanguages.Squirrel:
    case ticLanguages.Wren:
      for (const apiObject of apiDocs.objects) {
        patterns.push({
          name: `support.function.library.${language.ticName}.tic80.${apiObject.name}`,
          ...getFunctionMatchObject(apiObject, language)
        });
      }
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

  const apiDocs = new APIDocsGrammar;

  const grammarTemplatesDir = path.join(__dirname, 'grammars');
  const files = await fs.readdir(grammarTemplatesDir);
  
  try {
    await Promise.all(files.map(file => generateGrammar(apiDocs, file, grammarTemplatesDir)));
  } catch (e) {
    throw new Error(e);
  }
}

if (require.main === module) {
  console.log("Generating grammars...");
  main().then(() => console.log("Done!"));
}
