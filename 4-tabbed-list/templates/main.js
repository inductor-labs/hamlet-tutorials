module.exports = function(data) {
  return (function() {
    var __runtime;
    __runtime = require("hamlet-runtime")(this);
    __runtime.push(document.createDocumentFragment());
    __runtime.push(document.createElement("div"));
    __runtime.classes("container");
    __runtime.push(document.createElement("ul"));
    __runtime.classes("nav", "nav-tabs");
    __runtime.attribute("role", "tablist");
    __runtime.each(this.tabs, function() {
      __runtime.push(document.createElement("li"));
      __runtime.classes(this["class"]);
      __runtime.attribute("click", this.click);
      __runtime.push(document.createElement("a"));
      __runtime.attribute("href", "#");
      __runtime.text(this.name);
      __runtime.pop();
      return __runtime.pop();
    });
    __runtime.pop();
    __runtime.push(document.createElement("div"));
    __runtime.classes("content", "well");
    __runtime.text(this.content);
    __runtime.pop();
    __runtime.pop();
    return __runtime.pop();
  }).call(data);
};
