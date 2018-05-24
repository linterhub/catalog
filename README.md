# Linterhub Catalog

=========
[![Build Status](https://travis-ci.org/linterhub/catalog.svg?branch=master)](https://travis-ci.org/linterhub/catalog)

A [collection](https://repometric.github.io/linterhub/) of static analysis tools for source code. Each tool (engine) represented as package: metadata, cmd arguments and runtime dependencies.

Based on this information each engine 'containerized', e.g. wrapped in alpine docker container, more info here.

## Getting started

Update submodule(s):

```bash
git submodule init
git submodule update
```

## Development

Nothing special, all sources are inside `src` folder.

## Deployment

Install npm packages:

```bash
npm install
```

Build the page and copy all static files to `build` folder:

```bash
npm run build
```

That's it! Open `build` folder.