#! /bin/bash

cd templates

for file in *.haml; do
  ../node_modules/.bin/hamlet < $file > ${file/.haml}.js
done

cd ..

browserify app.js > build.js
