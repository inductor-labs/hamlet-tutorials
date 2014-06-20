#! /bin/bash

cd templates

for file in *.haml; do
  # Passing the runtime option let's the compiled
  # template know what the global runtime is called
  hamlet --runtime "Hamlet" < $file > ${file/.haml}.js
done

# expose templates on browser window object
for file in *.js; do
  echo "(window.JST || (window.JST = {}))['${file/.js}'] = " > tmpfile
  cat $file >> tmpfile
  mv tmpfile $file
done

# combine all templates into one file
cat *.js > ../templates.js

# clean up individual compiled template files
rm *.js