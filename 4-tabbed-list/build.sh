#! /bin/bash

node_modules/.bin/hamlet -d templates

browserify app.coffee > build.js
