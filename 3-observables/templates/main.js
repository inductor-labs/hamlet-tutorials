module.exports = function(data) {
  return (function() {
    var __runtime, _i, _ref, _ref1, _results;
    __runtime = require("hamlet-runtime")(this);
    __runtime.push(document.createDocumentFragment());
    __runtime.push(document.createElement("input"));
    __runtime.attribute("type", "text");
    __runtime.attribute("value", this.value);
    __runtime.pop();
    __runtime.push(document.createElement("select"));
    __runtime.attribute("value", this.value);
    __runtime.attribute("options", (function() {
      _results = [];
      for (var _i = _ref = this.min, _ref1 = this.max; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; _ref <= _ref1 ? _i++ : _i--){ _results.push(_i); }
      return _results;
    }).apply(this));
    __runtime.pop();
    __runtime.push(document.createElement("input"));
    __runtime.attribute("type", "range");
    __runtime.attribute("value", this.value);
    __runtime.attribute("min", this.min);
    __runtime.attribute("max", this.max);
    __runtime.pop();
    __runtime.push(document.createElement("progress"));
    __runtime.attribute("value", this.value);
    __runtime.attribute("max", this.max);
    __runtime.pop();
    return __runtime.pop();
  }).call(data);
};
