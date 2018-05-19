'use strict';

const packageJson = require('package-json');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const request = require('request')

module.exports = class {

    constructor(buildFolder) {
        this.buildFolder = buildFolder
        this.managerName = "pip"
        this.url = "pypi.org"
    }

    run(linter, version = null) {
        let parsed = linter.package.match(/.*pypi\.org\/project\/([A-Z0-9a-z]+).*/)
        if (parsed.length > 1){
            let packageName = parsed[1]
            if (version) {
                packageName += `/${version}`
            }
            const url = `https://pypi.org/pypi/${packageName}/json`
            
            const buildFolder = this.buildFolder
            const managerName = this.managerName
            const that = this

            request(url, function (error, response, body) {
                if (error){
                    console.log(`Fail: ${linter.name}`);
                    console.log(error.errors);
                    process.exitCode = 1;
                } else {
                    const json = JSON.parse(body)

                    if (!version){
                        for (var key in json.releases) {
                            if (key) {
                                that.run(linter, key)
                            }
                        }
                    }

                    mkdirp.sync(path.join(buildFolder, linter.name));
                    if (version) {
                        mkdirp.sync(path.join(buildFolder, linter.name, version));
                    }

                    const meta = {
                        '$schema': 'https://schema.linterhub.com/meta.json',
                        name: json.info.name,
                        description: json.info.summary,
                        url: json.info.home_page,
                        languages: linter.languages,
                        extensions: linter.extensions,
                        configs: linter.configs,
                        license: json.info.license
                    }
                    let formatted = JSON.stringify(meta, null, 4);
                    let metaPath = path.join(buildFolder, linter.name, 'meta.json')
                    if (version) {
                        metaPath = path.join(buildFolder, linter.name, version, 'meta.json')
                    }
                    fs.writeFileSync(metaPath, formatted + '\n');

                    const deps = {
                        '$schema': 'https://schema.linterhub.com/deps.json',
                        name: json.name,
                        dependencies: [
                            {
                                manager: "platform",
                                package: managerName
                            }
                        ]
                    }

                    if (json.info.requires_dist) {
                        for (var index in json.info.requires_dist) {
                            let parsed = json.info.requires_dist[index].match(/([^\s]+)\s\((.+)\).*/)
                            if (parsed ? parsed.length > 1 : false) {
                                deps.dependencies.push({
                                    manager: managerName,
                                    package: parsed[1],
                                    version: parsed[2]
                                });
                            } else {
                                parsed = json.info.requires_dist[index].match(/([a-z0-9]+).*/)
                                if (parsed ? parsed.length > 1 : false) {
                                    deps.dependencies.push({
                                        manager: managerName,
                                        package: parsed[1]
                                    }); 
                                }
                            }
                        }
                    }

                    deps.dependencies.push({
                        manager: managerName,
                        package: linter.name,
                        version: json.version,
                        linter: true
                    });

                    formatted = JSON.stringify(deps, null, 4);
                    let depsPath = path.join(buildFolder, linter.name, 'deps.json')
                    if (version) {
                        depsPath = path.join(buildFolder, linter.name, version, 'deps.json')
                    }
                    fs.writeFileSync(depsPath, formatted + '\n');

                    console.log(`OK: ${linter.name} ${json.info.version}`);
                }
            });
        }
    }
}