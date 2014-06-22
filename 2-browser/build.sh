#! /bin/bash

# --runtime tells the compiled templates which global variable
# stores the runtime since browsers don't have require by default

# -d instructs the compiler to compile all templates in the `template` directory

# -e 'JST["$file"]' prepends window.JST[:filename] to the compiled template
# so that it'll be accessible in the browser
hamlet \
  --runtime "Hamlet" \
  -d templates \
  -e '(window.JST || (window.JST = {}))["$file"]'

# combine all templates into one file
cat templates/*.js > templates.js
