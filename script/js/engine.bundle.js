// Title: Bundle engines into one json
// Usage: npm run engine-bundle
const ec = require('exit-code');
const fs = require('fs');
const path = require('path');
const finder = require('fs-finder');
const bundlePath = 'build/bundle.json';
const enginesPath = 'build/linters.json';
const requiredFiles = ['deps', 'meta'];

const folders = finder.from('build')
    .findDirectories()
    .filter(x => path.basename(path.join(x, '..')).includes('build'));

const bundle = {
    "$schema": "https://schema.linterhub.com/bundle.json"
};
const engines = {};

const results = folders.map((folder) => {
    const fc = (file) => fs.readFileSync(path.join(folder, file + '.json'));
    const name = path.basename(folder);
    engines[name] = finder.from(path.join('build', name))
        .findDirectories()
        .map(x => path.basename(x))
    bundle[name] = {};
    requiredFiles.forEach((file) => {
        bundle[name][file] = JSON.parse(fc(file));
    });
});

let formatted = JSON.stringify(bundle, null, 4);
fs.writeFileSync(bundlePath, formatted + '\n');

formatted = JSON.stringify(engines, null, 4);
fs.writeFileSync(enginesPath, formatted + '\n');

console.log(`Done! Total ${Object.keys(bundle).length - 1} engines.`);
