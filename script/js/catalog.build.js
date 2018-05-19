const packageJson = require('package-json');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const finder = require('fs-finder');
const ncp = require('ncp');

const catalog = require('../../src/catalog.json').linters;
const buildFolder = './build';

const npmParser = require('./parsers/npm.parser.js');
const pipParser = require('./parsers/pip.parser.js');
const gemParser = require('./parsers/gem.parser.js');

const parsers = [
    {
        name: "npm",
        instance: new npmParser(buildFolder)
    },
    {
        name: "pip",
        instance: new pipParser(buildFolder)
    },
    {
        name: "gem",
        instance: new gemParser(buildFolder)
    }/*,
    {
        name: "composer",
        url: "packagist.org"
    },
    {
        name: "chocolatey",
        url: "chocolatey.org"
    }*/
]

mkdirp.sync(path.join(buildFolder));

const folders = finder.from('./src').findDirectories();
folders.forEach(linter => ncp(linter, path.join('./build', path.basename(linter)), function (err) {
    const name = path.basename(linter);
    if (err) {
        console.log(`Fail: ${name}`);
        console.log(err);
        process.exitCode = 1;
    } else {
        console.log(`OK: ${name}`)
    }
}));

catalog.forEach((linter) => {
    const parser = parsers.find(parser => linter.package.includes(parser.instance.url));
    if (parser) {
        parser.instance.run(linter)
    }
})