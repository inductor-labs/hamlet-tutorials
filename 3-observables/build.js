(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/node_modules/o_0/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"dist/main.js"}
});

require.define("/node_modules/o_0/dist/main.js",function(require,module,exports,__dirname,__filename,process,global){!function(){var Observable,autoDeps,computeDependencies,copy,extend,flatten,get,last,magicDependency,remove,splat,withBase,__slice=[].slice;Observable=function(value,context){var changed,fn,listeners,notify,notifyReturning,self;if(typeof(value!=null?value.observe:void 0)==="function"){return value}listeners=[];notify=function(newValue){return copy(listeners).forEach(function(listener){return listener(newValue)})};if(typeof value==="function"){fn=value;self=function(){magicDependency(self);return value};self.each=function(){var args,_ref;args=1<=arguments.length?__slice.call(arguments,0):[];magicDependency(self);return(_ref=splat(value)).forEach.apply(_ref,args)};changed=function(){value=computeDependencies(self,fn,changed,context);return notify(value)};value=computeDependencies(self,fn,changed,context)}else{self=function(newValue){if(arguments.length>0){if(value!==newValue){value=newValue;notify(newValue)}}else{magicDependency(self)}return value}}self.each=function(){var args,_ref;args=1<=arguments.length?__slice.call(arguments,0):[];magicDependency(self);if(value!=null){return(_ref=[value]).forEach.apply(_ref,args)}};if(Array.isArray(value)){["concat","every","filter","forEach","indexOf","join","lastIndexOf","map","reduce","reduceRight","slice","some"].forEach(function(method){return self[method]=function(){var args;args=1<=arguments.length?__slice.call(arguments,0):[];magicDependency(self);return value[method].apply(value,args)}});["pop","push","reverse","shift","splice","sort","unshift"].forEach(function(method){return self[method]=function(){var args;args=1<=arguments.length?__slice.call(arguments,0):[];return notifyReturning(value[method].apply(value,args))}});notifyReturning=function(returnValue){notify(value);return returnValue};extend(self,{each:function(){var args;args=1<=arguments.length?__slice.call(arguments,0):[];self.forEach.apply(self,args);return self},remove:function(object){var index;index=value.indexOf(object);if(index>=0){return notifyReturning(value.splice(index,1)[0])}},get:function(index){return value[index]},first:function(){return value[0]},last:function(){return value[value.length-1]}})}extend(self,{listeners:listeners,observe:function(listener){return listeners.push(listener)},stopObserving:function(fn){return remove(listeners,fn)},toggle:function(){return self(!value)},increment:function(n){return self(value+n)},decrement:function(n){return self(value-n)},toString:function(){return"Observable("+value+")"}});return self};Observable.concat=function(){var args,o;args=1<=arguments.length?__slice.call(arguments,0):[];args=Observable(args);o=Observable(function(){return flatten(args.map(splat))});o.push=args.push;return o};module.exports=Observable;extend=function(){var name,source,sources,target,_i,_len;target=arguments[0],sources=2<=arguments.length?__slice.call(arguments,1):[];for(_i=0,_len=sources.length;_i<_len;_i++){source=sources[_i];for(name in source){target[name]=source[name]}}return target};global.OBSERVABLE_ROOT_HACK=[];autoDeps=function(){return last(global.OBSERVABLE_ROOT_HACK)};magicDependency=function(self){var observerStack;if(observerStack=autoDeps()){return observerStack.push(self)}};withBase=function(self,update,fn){var deps,value,_ref;global.OBSERVABLE_ROOT_HACK.push(deps=[]);try{value=fn();if((_ref=self._deps)!=null){_ref.forEach(function(observable){return observable.stopObserving(update)})}self._deps=deps;deps.forEach(function(observable){return observable.observe(update)})}finally{global.OBSERVABLE_ROOT_HACK.pop()}return value};computeDependencies=function(self,fn,update,context){return withBase(self,update,function(){return fn.call(context)})};remove=function(array,value){var index;index=array.indexOf(value);if(index>=0){return array.splice(index,1)[0]}};copy=function(array){return array.concat([])};get=function(arg){if(typeof arg==="function"){return arg()}else{return arg}};splat=function(item){var result,results;results=[];if(typeof item.forEach==="function"){item.forEach(function(i){return results.push(i)})}else{result=get(item);if(result!=null){results.push(result)}}return results};last=function(array){return array[array.length-1]};flatten=function(array){return array.reduce(function(a,b){return a.concat(b)},[])}}.call(this);
});

require.define("/templates/main.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = function(data) {
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

});

require.define("/node_modules/hamlet-runtime/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"dist/runtime.js"}
});

require.define("/node_modules/hamlet-runtime/dist/runtime.js",function(require,module,exports,__dirname,__filename,process,global){// Generated by CoffeeScript 1.7.1
(function() {
  var Observable, Runtime, bindEvent, bindObservable, cleanup, contentBind, empty, eventNames, initContent, isEvent, isFragment, remove, specialBindings, valueBind, valueIndexOf,
    __slice = [].slice;

  Observable = require("o_0");

  eventNames = "abort\nblur\nchange\nclick\ndblclick\ndrag\ndragend\ndragenter\ndragleave\ndragover\ndragstart\ndrop\nerror\nfocus\ninput\nkeydown\nkeypress\nkeyup\nload\nmousedown\nmousemove\nmouseout\nmouseover\nmouseup\nreset\nresize\nscroll\nselect\nsubmit\ntouchcancel\ntouchend\ntouchenter\ntouchleave\ntouchmove\ntouchstart\nunload".split("\n");

  isEvent = function(name) {
    return eventNames.indexOf(name) !== -1;
  };

  isFragment = function(node) {
    return (node != null ? node.nodeType : void 0) === 11;
  };

  initContent = function(element) {
    var allContent, update;
    if (element._hamlet_content) {
      return element._hamlet_content;
    }
    allContent = (element._hamlet_content != null ? element._hamlet_content : element._hamlet_content = Observable.concat());
    update = function() {
      empty(element);
      return allContent.each(function(item) {
        return element.appendChild(item);
      });
    };
    bindObservable(element, allContent, null, update);
    return allContent;
  };

  contentBind = function(element, value) {
    initContent(element).push(value);
    return element;
  };

  valueBind = function(element, value, context) {
    var update;
    value = Observable(value, context);
    switch (element.nodeName) {
      case "SELECT":
        element.oninput = element.onchange = function() {
          var optionValue, _ref, _value;
          _ref = this.children[this.selectedIndex], optionValue = _ref.value, _value = _ref._value;
          return value(_value || optionValue);
        };
        update = function(newValue) {
          var options;
          element._value = newValue;
          if ((options = element._options)) {
            if (newValue.value != null) {
              return element.value = (typeof newValue.value === "function" ? newValue.value() : void 0) || newValue.value;
            } else {
              return element.selectedIndex = valueIndexOf(options, newValue);
            }
          } else {
            return element.value = newValue;
          }
        };
        bindObservable(element, value, context, update);
        break;
      default:
        element.oninput = element.onchange = function() {
          return value(element.value);
        };
        bindObservable(element, value, context, function(newValue) {
          if (element.value !== newValue) {
            return element.value = newValue;
          }
        });
    }
  };

  specialBindings = {
    INPUT: {
      checked: function(element, value, context) {
        element.onchange = function() {
          return typeof value === "function" ? value(element.checked) : void 0;
        };
        return bindObservable(element, value, context, function(newValue) {
          return element.checked = newValue;
        });
      }
    },
    SELECT: {
      options: function(element, values, context) {
        var updateValues;
        values = Observable(values, context);
        updateValues = function(values) {
          empty(element);
          element._options = values;
          return values.map(function(value, index) {
            var option, optionName, optionValue;
            option = document.createElement("option");
            option._value = value;
            if (typeof value === "object") {
              optionValue = (value != null ? value.value : void 0) || index;
            } else {
              optionValue = value.toString();
            }
            bindObservable(option, optionValue, value, function(newValue) {
              return option.value = newValue;
            });
            optionName = (value != null ? value.name : void 0) || value;
            bindObservable(option, optionName, value, function(newValue) {
              return option.textContent = newValue;
            });
            element.appendChild(option);
            if (value === element._value) {
              element.selectedIndex = index;
            }
            return option;
          });
        };
        return bindObservable(element, values, context, updateValues);
      }
    }
  };

  bindObservable = function(element, value, context, update) {
    var observable, observe, unobserve;
    observable = Observable(value, context);
    observe = function() {
      observable.observe(update);
      return update(observable());
    };
    unobserve = function() {
      return observable.stopObserving(update);
    };
    observe();
    (element._hamlet_cleanup || (element._hamlet_cleanup = [])).push(unobserve);
    return element;
  };

  bindEvent = function(element, name, fn, context) {
    return element[name] = function() {
      return fn.apply(context, arguments);
    };
  };

  cleanup = function(element) {
    var _ref;
    Array.prototype.forEach.call(element.children, cleanup);
    if ((_ref = element._hamlet_cleanup) != null) {
      _ref.forEach(function(method) {
        return method();
      });
    }
    delete element._hamlet_cleanup;
  };

  Runtime = function(context) {
    var append, buffer, classes, contextTop, id, lastParent, observeAttribute, observeText, pop, push, render, self, stack, top, withContext;
    stack = [];
    lastParent = function() {
      var element, i;
      i = stack.length - 1;
      while ((element = stack[i]) && isFragment(element)) {
        i -= 1;
      }
      return element;
    };
    contextTop = void 0;
    top = function() {
      return stack[stack.length - 1] || contextTop;
    };
    append = function(child) {
      var parent, _ref;
      parent = top();
      if (isFragment(child) && child.childNodes.length === 1) {
        child = child.childNodes[0];
      }
      if ((_ref = top()) != null) {
        _ref.appendChild(child);
      }
      return child;
    };
    push = function(child) {
      return stack.push(child);
    };
    pop = function() {
      return append(stack.pop());
    };
    render = function(child) {
      push(child);
      return pop();
    };
    id = function() {
      var element, sources, update, value;
      sources = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      element = top();
      update = function(newValue) {
        if (typeof newValue === "function") {
          newValue = newValue();
        }
        return element.id = newValue;
      };
      value = function() {
        var possibleValues;
        possibleValues = sources.map(function(source) {
          if (typeof source === "function") {
            return source();
          } else {
            return source;
          }
        }).filter(function(idValue) {
          return idValue != null;
        });
        return possibleValues[possibleValues.length - 1];
      };
      return bindObservable(element, value, context, update);
    };
    classes = function() {
      var element, sources, update;
      sources = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      element = top();
      update = function(newValue) {
        if (typeof newValue === "function") {
          newValue = newValue();
        }
        return element.className = newValue;
      };
      return (function(context) {
        var value;
        value = function() {
          var possibleValues;
          possibleValues = sources.map(function(source) {
            if (typeof source === "function") {
              return source.call(context);
            } else {
              return source;
            }
          }).filter(function(sourceValue) {
            return sourceValue != null;
          });
          return possibleValues.join(" ");
        };
        return bindObservable(element, value, context, update);
      })(context);
    };
    observeAttribute = function(name, value) {
      var binding, element, nodeName, _ref;
      element = top();
      nodeName = element.nodeName;
      if (name === "value") {
        valueBind(element, value);
      } else if (binding = (_ref = specialBindings[nodeName]) != null ? _ref[name] : void 0) {
        binding(element, value, context);
      } else if (name.match(/^on/) && isEvent(name.substr(2))) {
        bindEvent(element, name, value, context);
      } else if (isEvent(name)) {
        bindEvent(element, "on" + name, value, context);
      } else {
        bindObservable(element, value, context, function(newValue) {
          if ((newValue != null) && newValue !== false) {
            return element.setAttribute(name, newValue);
          } else {
            return element.removeAttribute(name);
          }
        });
      }
      return element;
    };
    observeText = function(value) {
      var element, update;
      element = document.createTextNode('');
      update = function(newValue) {
        return element.nodeValue = newValue;
      };
      bindObservable(element, value, context, update);
      return render(element);
    };
    withContext = function(newContext, newContextTop, fn) {
      var oldContext;
      oldContext = context;
      context = newContext;
      contextTop = newContextTop;
      try {
        return fn();
      } finally {
        contextTop = void 0;
        context = oldContext;
      }
    };
    buffer = function(value) {
      var _ref, _ref1, _ref2;
      value = Observable(value, context);
      switch ((_ref = value()) != null ? _ref.nodeType : void 0) {
        case 1:
        case 3:
        case 11:
          contentBind(top(), value);
          return value();
      }
      switch ((_ref1 = value()) != null ? (_ref2 = _ref1[0]) != null ? _ref2.nodeType : void 0 : void 0) {
        case 1:
        case 3:
        case 11:
          return contentBind(top(), value);
      }
      return observeText(value);
    };
    self = {
      push: push,
      pop: pop,
      id: id,
      classes: classes,
      attribute: observeAttribute,
      text: buffer,
      filter: function(name, content) {},
      each: function(items, fn) {
        var elements, parent, replace;
        items = Observable(items, context);
        elements = null;
        parent = lastParent();
        items.observe(function() {
          return replace(elements);
        });
        replace = function(oldElements) {
          elements = [];
          items.each(function(item, index, array) {
            var element;
            element = null;
            withContext(item, parent, function() {
              return element = fn.call(item, item, index, array);
            });
            if (isFragment(element)) {
              elements.push.apply(elements, element.childNodes);
            } else {
              elements.push(element);
            }
            parent.appendChild(element);
            return element;
          });
          return oldElements != null ? oldElements.forEach(remove) : void 0;
        };
        return replace(null, items);
      }
    };
    return self;
  };

  Runtime.Observable = Observable;

  module.exports = Runtime;

  empty = function(node) {
    var child, _results;
    _results = [];
    while (child = node.firstChild) {
      _results.push(node.removeChild(child));
    }
    return _results;
  };

  valueIndexOf = function(options, value) {
    if (typeof value === "object") {
      return options.indexOf(value);
    } else {
      return options.map(function(option) {
        return option.toString();
      }).indexOf(value.toString());
    }
  };

  remove = function(element) {
    var _ref;
    cleanup(element);
    if ((_ref = element.parentNode) != null) {
      _ref.removeChild(element);
    }
  };

}).call(this);

});

require.define("/app.js",function(require,module,exports,__dirname,__filename,process,global){var Observable = require("o_0");
var mainTemplate = require("./templates/main");

model = {
  min: 1,
  max: 10,
  value: Observable(5)
};

document.body.appendChild(mainTemplate(model));
});
require("/app.js");
})();

