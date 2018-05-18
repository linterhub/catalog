const packageJson = require('package-json');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const finder = require('fs-finder');
const ncp = require('ncp');

const catalog = require('../../src/catalog.json').linters;
const managers = require('./catalog/managers.json');
const buildFolder = './build';

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

catalog.forEach((linter, index) => {
    let manager = managers.find(manager => linter.package.includes(manager.url));
    switch (manager.name) {
        case 'npm':
            packageJson(linter.name, { version: 'latest', fullMetadata: true }).then(json => {
                mkdirp.sync(path.join(buildFolder, linter.name));
                const meta = {
                    '$schema': 'https://schema.linterhub.com/meta.json',
                    name: json.name,
                    description: json.description,
                    url: json.homepage,
                    languages: linter.languages,
                    extensions: linter.extensions,
                    configs: linter.configs,
                    license: json.license
                }
                let formatted = JSON.stringify(meta, null, 4);
                const metaPath = path.join(buildFolder, linter.name, 'meta.json')
                fs.writeFileSync(metaPath, formatted + '\n');

                const deps = {
                    '$schema': 'https://schema.linterhub.com/deps.json',
                    name: json.name,
                    dependencies: [
                        {
                            manager: "platform",
                            package: manager.name
                        }
                    ]
                }

                for (var key in json.dependencies) {
                    if (json.dependencies.hasOwnProperty(key)) {
                        deps.dependencies.push({
                            manager: manager.name,
                            package: key,
                            version: json.dependencies[key]
                        });
                    }
                }

                deps.dependencies.push({
                    manager: manager.name,
                    package: linter.name,
                    version: json.version,
                    linter: true
                });

                formatted = JSON.stringify(deps, null, 4);
                const depsPath = path.join(buildFolder, linter.name, 'deps.json')
                fs.writeFileSync(depsPath, formatted + '\n');

                console.log(`OK: ${linter.name}`);
            })
                .catch((error) => {
                    console.log(`Fail: ${linter.name}`);
                    console.log(error.errors);
                    process.exitCode = 1;
                });
            break;
    }
})