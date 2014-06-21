module.exports = function(data) {
  return (function() {
    var __runtime;
    __runtime = require("hamlet-runtime")(this);
    __runtime.push(document.createDocumentFragment());
    __runtime.push(document.createElement("h1"));
    __runtime.text(this.title);
    __runtime.pop();
    return __runtime.pop();
  }).call(data);
};
