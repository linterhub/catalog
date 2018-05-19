'use strict';

const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const request = require('request');

module.exports = class {

    constructor(buildFolder) {
        this.buildFolder = buildFolder
        this.managerName = "gem"
        this.url = "rubygems.org"
    }

    parseVersion(linter, jsonBasic, jsonVersion){
        mkdirp.sync(path.join(this.buildFolder, linter.name));
        mkdirp.sync(path.join(this.buildFolder, linter.name, jsonVersion.number));

        const meta = {
            '$schema': 'https://schema.linterhub.com/meta.json',
            name: linter.name,
            description: jsonVersion.description,
            url: jsonBasic.homepage_uri,
            languages: linter.languages,
            extensions: linter.extensions,
            configs: linter.configs,
            license: jsonBasic.licenses ? jsonBasic.licenses[0] : "UNKNOWN"
        }
        let formatted = JSON.stringify(meta, null, 4);
        let metaPath = path.join(this.buildFolder, linter.name, jsonVersion.number, 'meta.json')
        fs.writeFileSync(metaPath, formatted + '\n');
        if (jsonVersion.number == jsonBasic.version) {
            metaPath = path.join(this.buildFolder, linter.name, 'meta.json')
            fs.writeFileSync(metaPath, formatted + '\n');
        }

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

        for (var key in jsonBasic.dependencies.runtime) {
            deps.dependencies[0].push({
                manager: this.managerName,
                package: jsonBasic.dependencies.runtime[key].name,
                version: jsonBasic.dependencies.runtime[key].requirements
            });
        }

        deps.dependencies[0].push({
            manager: this.managerName,
            package: jsonBasic.name,
            version: jsonVersion.number,
            target: true
        });

        formatted = JSON.stringify(deps, null, 4);
        let depsPath = path.join(this.buildFolder, linter.name, jsonVersion.number, 'deps.json')
        fs.writeFileSync(depsPath, formatted + '\n');
        if (jsonVersion.number == jsonBasic.version) {
            depsPath = path.join(this.buildFolder, linter.name, 'deps.json')
            fs.writeFileSync(depsPath, formatted + '\n');
        }

        console.log(`OK: ${linter.name} ${jsonVersion.number}`);
    }

    run(linter) {
        const parsed = linter.package.match(/.*rubygems\.org\/gems\/([A-Z0-9a-z]+).*/)
        if (parsed.length > 1){
            const packageName = parsed[1]
            const urlBasic = `https://rubygems.org/api/v1/gems/${packageName}.json`
            const buildFolder = this.buildFolder
            const managerName = this.managerName
            const that = this

            request(urlBasic, function (error, response, body) {
                if (error){
                    console.log(`Fail: ${linter.name}`);
                    console.log(error.errors);
                    process.exitCode = 1;
                } else {
                    const jsonBasic = JSON.parse(body)
                    const versionsUrl = `https://rubygems.org/api/v1/versions/${packageName}.json`
                    request(versionsUrl, function (error, response, body) {
                        if (error){
                            console.log(`Fail: ${linter.name}`);
                            console.log(error.errors);
                            process.exitCode = 1;
                        } else {
                            const jsonVersions = JSON.parse(body)
                            jsonVersions.forEach(version => that.parseVersion(linter, jsonBasic, version))
                        }
                    });
                }
            });
        }
    }
}