'use strict';

const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const odata = require('odata-client');
const convert = require('xml-js');

module.exports = class {

    constructor(buildFolder) {
        this.buildFolder = buildFolder
        this.managerName = "chocolatey"
        this.url = "chocolatey.org"
    }

    parseVersion(linter, json) {
        const version = json['m:properties']["d:Version"]._text;
        const managerName = this.managerName
        mkdirp.sync(path.join(this.buildFolder, linter.name));
        mkdirp.sync(path.join(this.buildFolder, linter.name, version));
        const meta = {
            '$schema': 'https://schema.linterhub.com/meta.json',
            name: linter.name,
            description: json.summary._text,
            url: json['m:properties']["d:ProjectUrl"]._text,
            languages: linter.languages,
            extensions: linter.extensions,
            configs: linter.configs,
            license: "-" // TODO this
        }
        let formatted = JSON.stringify(meta, null, 4);
        let metaPath = path.join(this.buildFolder, linter.name, 'meta.json');
        fs.writeFileSync(metaPath, formatted + '\n');
        metaPath = path.join(this.buildFolder, linter.name, version, 'meta.json');
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

        let requirements = [];
        if (json['m:properties']["d:Dependencies"]._text) {
            requirements =
                json['m:properties']["d:Dependencies"]._text
                    .split('|')
                    .map(x => {
                        const parsedDependency = x.split(':')
                        if(parsedDependency.length < 2){
                            return null
                        }
                        return {
                            manager: managerName,
                            package: parsedDependency[0],
                            version: parsedDependency[1]
                        }
                    })
        }

        for (var key in requirements) {
            if (requirements[key]) {
                deps.dependencies[0].push(requirements[key]);
            }
        }

        deps.dependencies[0].push({
            manager: this.managerName,
            package: json.title._text,
            version: version,
            target: true
        });

        formatted = JSON.stringify(deps, null, 4);
        let depsPath = path.join(this.buildFolder, linter.name, 'deps.json');
        fs.writeFileSync(depsPath, formatted + '\n');
        depsPath = path.join(this.buildFolder, linter.name, version, 'deps.json');
        fs.writeFileSync(depsPath, formatted + '\n');

        console.log(`OK: ${linter.name} ${version}`);
    }

    run(linter) {
        const parsed = linter.package.match(/.*chocolatey\.org\/packages\/([A-Z0-9a-z]+).*/);
        const that = this
        if (parsed.length > 1) {
            let packageName = parsed[1]
            const query = odata({
                service: 'https://chocolatey.org/api/v2/FindPackagesById',
            });

            query.custom('id', `'${packageName}'`);
            query.get()
                .then(function (response) {
                    var result = convert.xml2json(response.body, { compact: true, spaces: 4 });
                    JSON.parse(result).feed.entry.forEach(x => that.parseVersion(linter, x))
                })

        }
    }
}