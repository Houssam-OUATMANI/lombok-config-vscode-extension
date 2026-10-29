const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const modelPath = path.join(root, 'src', 'model', 'lombokProperties.ts');
const bundledModel = esbuild.buildSync({
  entryPoints: [modelPath],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false
}).outputFiles[0].text;

const modelModule = new Module(modelPath, module);
modelModule.filename = modelPath;
modelModule.paths = Module._nodeModulePaths(path.dirname(modelPath));
modelModule._compile(bundledModel, modelPath);

const schema = modelModule.exports.createLombokPropertiesJsonSchema();
const outputPath = path.join(root, 'schemas', 'lombok-config.schema.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
console.log(`Generated ${path.relative(root, outputPath)}`);
