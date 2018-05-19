'use strict';

const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const request = require('request');

module.exports = class {

    constructor(buildFolder) {
        this.buildFolder = buildFolder
        this.managerName = "composer"
        this.url = "packagist.org"
    }

    parseVersion(linter, json) {
        mkdirp.sync(path.join(this.buildFolder, linter.name));
        mkdirp.sync(path.join(this.buildFolder, linter.name, json.version));

        const meta = {
            '$schema': 'https://schema.linterhub.com/meta.json',
            name: linter.name,
            description: json.description,
            url: json.homepage,
            languages: linter.languages,
            extensions: linter.extensions,
            configs: linter.configs,
            license: json.license ? json.license[0] : "UNKNOWN"
        }

        let formatted = JSON.stringify(meta, null, 4);
        let metaPath = path.join(this.buildFolder, linter.name, json.version, 'meta.json')
        fs.writeFileSync(metaPath, formatted + '\n');
        metaPath = path.join(this.buildFolder, linter.name, 'meta.json')
        fs.writeFileSync(metaPath, formatted + '\n');

        const deps = {
            '$schema': 'https://schema.linterhub.com/deps.json',
            name: linter.name,
            dependencies: [[
                {
                    manager: "platform",
                    package: this.managerName
                }
            ]]
        }

        const requirements = 
            Object.keys(json.require)
                .map(x => {
                    return {
                        manager: this.managerName,
                        package: x,
                        version: json.require[x]
                    }
                })

        for (var i in requirements) {
            deps.dependencies[0].push(requirements[i])
        }

        deps.dependencies[0].push({
            manager: this.managerName,
            package: json.name,
            version: json.version,
            target: true
        });

        formatted = JSON.stringify(deps, null, 4);
        let depsPath = path.join(this.buildFolder, linter.name, json.version, 'deps.json')
        fs.writeFileSync(depsPath, formatted + '\n');
        depsPath = path.join(this.buildFolder, linter.name, 'deps.json')
        fs.writeFileSync(depsPath, formatted + '\n');


        console.log(`OK: ${linter.name} ${json.version}`);
    }

    run(linter, version = null) {
        const url = `${linter.package}.json`
        const buildFolder = this.buildFolder
        const managerName = this.managerName
        const that = this

        request(url, function (error, response, body) {
            if (error) {
                console.log(`Fail: ${linter.name}`);
                console.log(error.errors);
                process.exitCode = 1;
            } else {
                const json = JSON.parse(body)
                Object.keys(json.package.versions)
                    .filter(x => x.includes('.'))
                    .map(x => json.package.versions[x])
                    .sort((a, b) => new Date(a.time) - new Date(b.time))
                    .forEach(x => that.parseVersion(linter, x));
            }
        });
    }

}