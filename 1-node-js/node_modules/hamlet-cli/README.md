Hamlet CLI
==========

Command line interface for processing files with Hamlet over stdio.


Usage
-----

Haml in, JavaScript templates out.

    hamlet < template.haml > output.js

    echo "%h1#title= @title" | hamlet

Options
-------

`--runtime, -r [runtime_name]` Specifies the name of the globally available Hamlet runtime (default is 'require("hamlet-runtime")'). This is so the templates can be used with browserify on node.js or used manully in the browser.

    ```bash
    hamlet -r "Hamlet" < template.haml > output.js
    ```

`-a, --ast` If given the compiler outputs the AST as JSON rather than a JavaScript template.
