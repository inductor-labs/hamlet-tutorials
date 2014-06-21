#! /bin/bash

node_modules/.bin/hamlet -d templates

browserify app.js > build.js
