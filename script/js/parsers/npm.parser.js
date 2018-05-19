'use strict';

const packageJson = require('package-json');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');

module.exports = class {

    constructor(buildFolder) {
        this.buildFolder = buildFolder
        this.managerName = "npm"
        this.url = "npmjs.com"
    }

    parseVersion(linter, json, version = null){
        mkdirp.sync(path.join(this.buildFolder, linter.name));
        if (version) {
            mkdirp.sync(path.join(this.buildFolder, linter.name, version));
        }
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
        let metaPath = path.join(this.buildFolder, linter.name, 'meta.json')
        if (version) {
            metaPath = path.join(this.buildFolder, linter.name, version, 'meta.json')
        }
        fs.writeFileSync(metaPath, formatted + '\n');

        const deps = {
            '$schema': 'https://schema.linterhub.com/deps.json',
            name: json.name,
            dependencies: [
                {
                    manager: "platform",
                    package: this.managerName
                }
            ]
        }

        for (var key in json.dependencies) {
            if (json.dependencies.hasOwnProperty(key)) {
                deps.dependencies.push({
                    manager: this.managerName,
                    package: key,
                    version: json.dependencies[key]
                });
            }
        }

        deps.dependencies.push({
            manager: this.managerName,
            package: linter.name,
            version: json.version,
            linter: true
        });

        formatted = JSON.stringify(deps, null, 4);
        let depsPath = path.join(this.buildFolder, linter.name, 'deps.json')
        if (version) {
            depsPath = path.join(this.buildFolder, linter.name, version, 'deps.json')
        }
        fs.writeFileSync(depsPath, formatted + '\n');

        console.log(`OK: ${linter.name} ${version}`);
    }

    run(linter) {
        packageJson(linter.name, { version: 'latest', fullMetadata: true, allVersions: true})
            .then(json => {
                this.parseVersion(linter, json)
                for (var key in json.versions) {
                    if (json.versions.hasOwnProperty(key)) {
                        this.parseVersion(linter, json, key)
                    }
                }
            })
            .catch((error) => {
                console.log(`Fail: ${linter.name}`);
                console.log(error.errors);
                process.exitCode = 1;
            });
    }
}