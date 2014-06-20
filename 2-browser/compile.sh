#! /bin/bash

for file in *.haml; do
  hamlet < $file > ${file/.haml}.js
done

coffee -c app.coffee
