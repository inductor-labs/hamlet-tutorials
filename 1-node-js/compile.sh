#! /bin/bash

cd templates

for file in *.haml; do
  hamlet < $file > ${file/.haml}.js
done

# expose templates on browser window object
for file in *.js; do
  echo "module.exports = " > tmpfile
  cat $file >> tmpfile
  mv tmpfile $file
done

cd ..

browserify app.js > build.js
