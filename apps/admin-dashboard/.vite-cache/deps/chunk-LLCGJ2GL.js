import {
  __commonJS
} from "./chunk-OL46QLBJ.js";

// ../../node_modules/equivalent-key-map/equivalent-key-map.js
var require_equivalent_key_map = __commonJS({
  "../../node_modules/equivalent-key-map/equivalent-key-map.js"(exports, module) {
    "use strict";
    function _typeof(obj) {
      if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
        _typeof = function(obj2) {
          return typeof obj2;
        };
      } else {
        _typeof = function(obj2) {
          return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
        };
      }
      return _typeof(obj);
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }
    function getValuePair(instance, key) {
      var _map = instance._map, _arrayTreeMap = instance._arrayTreeMap, _objectTreeMap = instance._objectTreeMap;
      if (_map.has(key)) {
        return _map.get(key);
      }
      var properties = Object.keys(key).sort();
      var map = Array.isArray(key) ? _arrayTreeMap : _objectTreeMap;
      for (var i = 0; i < properties.length; i++) {
        var property = properties[i];
        map = map.get(property);
        if (map === void 0) {
          return;
        }
        var propertyValue = key[property];
        map = map.get(propertyValue);
        if (map === void 0) {
          return;
        }
      }
      var valuePair = map.get("_ekm_value");
      if (!valuePair) {
        return;
      }
      _map.delete(valuePair[0]);
      valuePair[0] = key;
      map.set("_ekm_value", valuePair);
      _map.set(key, valuePair);
      return valuePair;
    }
    var EquivalentKeyMap = function() {
      function EquivalentKeyMap2(iterable) {
        _classCallCheck(this, EquivalentKeyMap2);
        this.clear();
        if (iterable instanceof EquivalentKeyMap2) {
          var iterablePairs = [];
          iterable.forEach(function(value, key) {
            iterablePairs.push([key, value]);
          });
          iterable = iterablePairs;
        }
        if (iterable != null) {
          for (var i = 0; i < iterable.length; i++) {
            this.set(iterable[i][0], iterable[i][1]);
          }
        }
      }
      _createClass(EquivalentKeyMap2, [{
        key: "set",
        /**
         * Add or update an element with a specified key and value.
         *
         * @param {*} key   The key of the element to add.
         * @param {*} value The value of the element to add.
         *
         * @return {EquivalentKeyMap} Map instance.
         */
        value: function set(key, value) {
          if (key === null || _typeof(key) !== "object") {
            this._map.set(key, value);
            return this;
          }
          var properties = Object.keys(key).sort();
          var valuePair = [key, value];
          var map = Array.isArray(key) ? this._arrayTreeMap : this._objectTreeMap;
          for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
            if (!map.has(property)) {
              map.set(property, new EquivalentKeyMap2());
            }
            map = map.get(property);
            var propertyValue = key[property];
            if (!map.has(propertyValue)) {
              map.set(propertyValue, new EquivalentKeyMap2());
            }
            map = map.get(propertyValue);
          }
          var previousValuePair = map.get("_ekm_value");
          if (previousValuePair) {
            this._map.delete(previousValuePair[0]);
          }
          map.set("_ekm_value", valuePair);
          this._map.set(key, valuePair);
          return this;
        }
        /**
         * Returns a specified element.
         *
         * @param {*} key The key of the element to return.
         *
         * @return {?*} The element associated with the specified key or undefined
         *              if the key can't be found.
         */
      }, {
        key: "get",
        value: function get(key) {
          if (key === null || _typeof(key) !== "object") {
            return this._map.get(key);
          }
          var valuePair = getValuePair(this, key);
          if (valuePair) {
            return valuePair[1];
          }
        }
        /**
         * Returns a boolean indicating whether an element with the specified key
         * exists or not.
         *
         * @param {*} key The key of the element to test for presence.
         *
         * @return {boolean} Whether an element with the specified key exists.
         */
      }, {
        key: "has",
        value: function has(key) {
          if (key === null || _typeof(key) !== "object") {
            return this._map.has(key);
          }
          return getValuePair(this, key) !== void 0;
        }
        /**
         * Removes the specified element.
         *
         * @param {*} key The key of the element to remove.
         *
         * @return {boolean} Returns true if an element existed and has been
         *                   removed, or false if the element does not exist.
         */
      }, {
        key: "delete",
        value: function _delete(key) {
          if (!this.has(key)) {
            return false;
          }
          this.set(key, void 0);
          return true;
        }
        /**
         * Executes a provided function once per each key/value pair, in insertion
         * order.
         *
         * @param {Function} callback Function to execute for each element.
         * @param {*}        thisArg  Value to use as `this` when executing
         *                            `callback`.
         */
      }, {
        key: "forEach",
        value: function forEach(callback) {
          var _this = this;
          var thisArg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this;
          this._map.forEach(function(value, key) {
            if (key !== null && _typeof(key) === "object") {
              value = value[1];
            }
            callback.call(thisArg, value, key, _this);
          });
        }
        /**
         * Removes all elements.
         */
      }, {
        key: "clear",
        value: function clear() {
          this._map = /* @__PURE__ */ new Map();
          this._arrayTreeMap = /* @__PURE__ */ new Map();
          this._objectTreeMap = /* @__PURE__ */ new Map();
        }
      }, {
        key: "size",
        get: function get() {
          return this._map.size;
        }
      }]);
      return EquivalentKeyMap2;
    }();
    module.exports = EquivalentKeyMap;
  }
});

// ../../node_modules/deepmerge/dist/cjs.js
var require_cjs = __commonJS({
  "../../node_modules/deepmerge/dist/cjs.js"(exports, module) {
    "use strict";
    var isMergeableObject = function isMergeableObject2(value) {
      return isNonNullObject(value) && !isSpecial(value);
    };
    function isNonNullObject(value) {
      return !!value && typeof value === "object";
    }
    function isSpecial(value) {
      var stringValue = Object.prototype.toString.call(value);
      return stringValue === "[object RegExp]" || stringValue === "[object Date]" || isReactElement(value);
    }
    var canUseSymbol = typeof Symbol === "function" && Symbol.for;
    var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for("react.element") : 60103;
    function isReactElement(value) {
      return value.$$typeof === REACT_ELEMENT_TYPE;
    }
    function emptyTarget(val) {
      return Array.isArray(val) ? [] : {};
    }
    function cloneUnlessOtherwiseSpecified(value, options) {
      return options.clone !== false && options.isMergeableObject(value) ? deepmerge(emptyTarget(value), value, options) : value;
    }
    function defaultArrayMerge(target, source, options) {
      return target.concat(source).map(function(element) {
        return cloneUnlessOtherwiseSpecified(element, options);
      });
    }
    function getMergeFunction(key, options) {
      if (!options.customMerge) {
        return deepmerge;
      }
      var customMerge = options.customMerge(key);
      return typeof customMerge === "function" ? customMerge : deepmerge;
    }
    function getEnumerableOwnPropertySymbols(target) {
      return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(target).filter(function(symbol) {
        return Object.propertyIsEnumerable.call(target, symbol);
      }) : [];
    }
    function getKeys(target) {
      return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
    }
    function propertyIsOnObject(object, property) {
      try {
        return property in object;
      } catch (_) {
        return false;
      }
    }
    function propertyIsUnsafe(target, key) {
      return propertyIsOnObject(target, key) && !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key));
    }
    function mergeObject(target, source, options) {
      var destination = {};
      if (options.isMergeableObject(target)) {
        getKeys(target).forEach(function(key) {
          destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
        });
      }
      getKeys(source).forEach(function(key) {
        if (propertyIsUnsafe(target, key)) {
          return;
        }
        if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
          destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
        } else {
          destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
        }
      });
      return destination;
    }
    function deepmerge(target, source, options) {
      options = options || {};
      options.arrayMerge = options.arrayMerge || defaultArrayMerge;
      options.isMergeableObject = options.isMergeableObject || isMergeableObject;
      options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
      var sourceIsArray = Array.isArray(source);
      var targetIsArray = Array.isArray(target);
      var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
      if (!sourceAndTargetTypesMatch) {
        return cloneUnlessOtherwiseSpecified(source, options);
      } else if (sourceIsArray) {
        return options.arrayMerge(target, source, options);
      } else {
        return mergeObject(target, source, options);
      }
    }
    deepmerge.all = function deepmergeAll(array, options) {
      if (!Array.isArray(array)) {
        throw new Error("first argument should be an array");
      }
      return array.reduce(function(prev, next) {
        return deepmerge(prev, next, options);
      }, {});
    };
    var deepmerge_1 = deepmerge;
    module.exports = deepmerge_1;
  }
});

// ../../node_modules/rungen/dist/utils/keys.js
var require_keys = __commonJS({
  "../../node_modules/rungen/dist/utils/keys.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var keys = {
      all: Symbol("all"),
      error: Symbol("error"),
      fork: Symbol("fork"),
      join: Symbol("join"),
      race: Symbol("race"),
      call: Symbol("call"),
      cps: Symbol("cps"),
      subscribe: Symbol("subscribe")
    };
    exports.default = keys;
  }
});

// ../../node_modules/rungen/dist/utils/helpers.js
var require_helpers = __commonJS({
  "../../node_modules/rungen/dist/utils/helpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.createChannel = exports.subscribe = exports.cps = exports.apply = exports.call = exports.invoke = exports.delay = exports.race = exports.join = exports.fork = exports.error = exports.all = void 0;
    var _keys = require_keys();
    var _keys2 = _interopRequireDefault(_keys);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var all = exports.all = function all2(value) {
      return {
        type: _keys2.default.all,
        value
      };
    };
    var error = exports.error = function error2(err) {
      return {
        type: _keys2.default.error,
        error: err
      };
    };
    var fork = exports.fork = function fork2(iterator) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      return {
        type: _keys2.default.fork,
        iterator,
        args
      };
    };
    var join = exports.join = function join2(task) {
      return {
        type: _keys2.default.join,
        task
      };
    };
    var race = exports.race = function race2(competitors) {
      return {
        type: _keys2.default.race,
        competitors
      };
    };
    var delay = exports.delay = function delay2(timeout) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          return resolve(true);
        }, timeout);
      });
    };
    var invoke = exports.invoke = function invoke2(func) {
      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      return {
        type: _keys2.default.call,
        func,
        context: null,
        args
      };
    };
    var call = exports.call = function call2(func, context) {
      for (var _len3 = arguments.length, args = Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
        args[_key3 - 2] = arguments[_key3];
      }
      return {
        type: _keys2.default.call,
        func,
        context,
        args
      };
    };
    var apply = exports.apply = function apply2(func, context, args) {
      return {
        type: _keys2.default.call,
        func,
        context,
        args
      };
    };
    var cps = exports.cps = function cps2(func) {
      for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }
      return {
        type: _keys2.default.cps,
        func,
        args
      };
    };
    var subscribe = exports.subscribe = function subscribe2(channel) {
      return {
        type: _keys2.default.subscribe,
        channel
      };
    };
    var createChannel = exports.createChannel = function createChannel2(callback) {
      var listeners = [];
      var subscribe2 = function subscribe3(l) {
        listeners.push(l);
        return function() {
          return listeners.splice(listeners.indexOf(l), 1);
        };
      };
      var next = function next2(val) {
        return listeners.forEach(function(l) {
          return l(val);
        });
      };
      callback(next);
      return {
        subscribe: subscribe2
      };
    };
  }
});

// ../../node_modules/rungen/dist/utils/is.js
var require_is = __commonJS({
  "../../node_modules/rungen/dist/utils/is.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };
    var _keys = require_keys();
    var _keys2 = _interopRequireDefault(_keys);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var is = {
      obj: function obj(value) {
        return (typeof value === "undefined" ? "undefined" : _typeof(value)) === "object" && !!value;
      },
      all: function all(value) {
        return is.obj(value) && value.type === _keys2.default.all;
      },
      error: function error(value) {
        return is.obj(value) && value.type === _keys2.default.error;
      },
      array: Array.isArray,
      func: function func(value) {
        return typeof value === "function";
      },
      promise: function promise(value) {
        return value && is.func(value.then);
      },
      iterator: function iterator(value) {
        return value && is.func(value.next) && is.func(value.throw);
      },
      fork: function fork(value) {
        return is.obj(value) && value.type === _keys2.default.fork;
      },
      join: function join(value) {
        return is.obj(value) && value.type === _keys2.default.join;
      },
      race: function race(value) {
        return is.obj(value) && value.type === _keys2.default.race;
      },
      call: function call(value) {
        return is.obj(value) && value.type === _keys2.default.call;
      },
      cps: function cps(value) {
        return is.obj(value) && value.type === _keys2.default.cps;
      },
      subscribe: function subscribe(value) {
        return is.obj(value) && value.type === _keys2.default.subscribe;
      },
      channel: function channel(value) {
        return is.obj(value) && is.func(value.subscribe);
      }
    };
    exports.default = is;
  }
});

// ../../node_modules/rungen/dist/controls/builtin.js
var require_builtin = __commonJS({
  "../../node_modules/rungen/dist/controls/builtin.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.iterator = exports.array = exports.object = exports.error = exports.any = void 0;
    var _is = require_is();
    var _is2 = _interopRequireDefault(_is);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var any = exports.any = function any2(value, next, rungen, yieldNext) {
      yieldNext(value);
      return true;
    };
    var error = exports.error = function error2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.error(value)) return false;
      raiseNext(value.error);
      return true;
    };
    var object = exports.object = function object2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.all(value) || !_is2.default.obj(value.value)) return false;
      var result = {};
      var keys = Object.keys(value.value);
      var count = 0;
      var hasError = false;
      var gotResultSuccess = function gotResultSuccess2(key, ret) {
        if (hasError) return;
        result[key] = ret;
        count++;
        if (count === keys.length) {
          yieldNext(result);
        }
      };
      var gotResultError = function gotResultError2(key, error2) {
        if (hasError) return;
        hasError = true;
        raiseNext(error2);
      };
      keys.map(function(key) {
        rungen(value.value[key], function(ret) {
          return gotResultSuccess(key, ret);
        }, function(err) {
          return gotResultError(key, err);
        });
      });
      return true;
    };
    var array = exports.array = function array2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.all(value) || !_is2.default.array(value.value)) return false;
      var result = [];
      var count = 0;
      var hasError = false;
      var gotResultSuccess = function gotResultSuccess2(key, ret) {
        if (hasError) return;
        result[key] = ret;
        count++;
        if (count === value.value.length) {
          yieldNext(result);
        }
      };
      var gotResultError = function gotResultError2(key, error2) {
        if (hasError) return;
        hasError = true;
        raiseNext(error2);
      };
      value.value.map(function(v, key) {
        rungen(v, function(ret) {
          return gotResultSuccess(key, ret);
        }, function(err) {
          return gotResultError(key, err);
        });
      });
      return true;
    };
    var iterator = exports.iterator = function iterator2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.iterator(value)) return false;
      rungen(value, next, raiseNext);
      return true;
    };
    exports.default = [error, iterator, array, object, any];
  }
});

// ../../node_modules/rungen/dist/create.js
var require_create = __commonJS({
  "../../node_modules/rungen/dist/create.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _builtin = require_builtin();
    var _builtin2 = _interopRequireDefault(_builtin);
    var _is = require_is();
    var _is2 = _interopRequireDefault(_is);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function _toConsumableArray(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
          arr2[i] = arr[i];
        }
        return arr2;
      } else {
        return Array.from(arr);
      }
    }
    var create = function create2() {
      var userControls = arguments.length <= 0 || arguments[0] === void 0 ? [] : arguments[0];
      var controls = [].concat(_toConsumableArray(userControls), _toConsumableArray(_builtin2.default));
      var runtime = function runtime2(input) {
        var success = arguments.length <= 1 || arguments[1] === void 0 ? function() {
        } : arguments[1];
        var error = arguments.length <= 2 || arguments[2] === void 0 ? function() {
        } : arguments[2];
        var iterate = function iterate2(gen) {
          var yieldValue = function yieldValue2(isError) {
            return function(ret) {
              try {
                var _ref = isError ? gen.throw(ret) : gen.next(ret);
                var value = _ref.value;
                var done = _ref.done;
                if (done) return success(value);
                next(value);
              } catch (e) {
                return error(e);
              }
            };
          };
          var next = function next2(ret) {
            controls.some(function(control) {
              return control(ret, next2, runtime2, yieldValue(false), yieldValue(true));
            });
          };
          yieldValue(false)();
        };
        var iterator = _is2.default.iterator(input) ? input : regeneratorRuntime.mark(function _callee() {
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return input;
                case 2:
                  return _context.abrupt("return", _context.sent);
                case 3:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, this);
        })();
        iterate(iterator, success, error);
      };
      return runtime;
    };
    exports.default = create;
  }
});

// ../../node_modules/rungen/dist/utils/dispatcher.js
var require_dispatcher = __commonJS({
  "../../node_modules/rungen/dist/utils/dispatcher.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var createDispatcher = function createDispatcher2() {
      var listeners = [];
      return {
        subscribe: function subscribe(listener) {
          listeners.push(listener);
          return function() {
            listeners = listeners.filter(function(l) {
              return l !== listener;
            });
          };
        },
        dispatch: function dispatch(action) {
          listeners.slice().forEach(function(listener) {
            return listener(action);
          });
        }
      };
    };
    exports.default = createDispatcher;
  }
});

// ../../node_modules/rungen/dist/controls/async.js
var require_async = __commonJS({
  "../../node_modules/rungen/dist/controls/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.race = exports.join = exports.fork = exports.promise = void 0;
    var _is = require_is();
    var _is2 = _interopRequireDefault(_is);
    var _helpers = require_helpers();
    var _dispatcher = require_dispatcher();
    var _dispatcher2 = _interopRequireDefault(_dispatcher);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var promise = exports.promise = function promise2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.promise(value)) return false;
      value.then(next, raiseNext);
      return true;
    };
    var forkedTasks = /* @__PURE__ */ new Map();
    var fork = exports.fork = function fork2(value, next, rungen) {
      if (!_is2.default.fork(value)) return false;
      var task = Symbol("fork");
      var dispatcher = (0, _dispatcher2.default)();
      forkedTasks.set(task, dispatcher);
      rungen(value.iterator.apply(null, value.args), function(result) {
        return dispatcher.dispatch(result);
      }, function(err) {
        return dispatcher.dispatch((0, _helpers.error)(err));
      });
      var unsubscribe = dispatcher.subscribe(function() {
        unsubscribe();
        forkedTasks.delete(task);
      });
      next(task);
      return true;
    };
    var join = exports.join = function join2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.join(value)) return false;
      var dispatcher = forkedTasks.get(value.task);
      if (!dispatcher) {
        raiseNext("join error : task not found");
      } else {
        (function() {
          var unsubscribe = dispatcher.subscribe(function(result) {
            unsubscribe();
            next(result);
          });
        })();
      }
      return true;
    };
    var race = exports.race = function race2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.race(value)) return false;
      var finished = false;
      var success = function success2(result, k, v) {
        if (finished) return;
        finished = true;
        result[k] = v;
        next(result);
      };
      var fail = function fail2(err) {
        if (finished) return;
        raiseNext(err);
      };
      if (_is2.default.array(value.competitors)) {
        (function() {
          var result = value.competitors.map(function() {
            return false;
          });
          value.competitors.forEach(function(competitor, index) {
            rungen(competitor, function(output) {
              return success(result, index, output);
            }, fail);
          });
        })();
      } else {
        (function() {
          var result = Object.keys(value.competitors).reduce(function(p, c) {
            p[c] = false;
            return p;
          }, {});
          Object.keys(value.competitors).forEach(function(index) {
            rungen(value.competitors[index], function(output) {
              return success(result, index, output);
            }, fail);
          });
        })();
      }
      return true;
    };
    var subscribe = function subscribe2(value, next) {
      if (!_is2.default.subscribe(value)) return false;
      if (!_is2.default.channel(value.channel)) {
        throw new Error('the first argument of "subscribe" must be a valid channel');
      }
      var unsubscribe = value.channel.subscribe(function(ret) {
        unsubscribe && unsubscribe();
        next(ret);
      });
      return true;
    };
    exports.default = [promise, fork, join, race, subscribe];
  }
});

// ../../node_modules/rungen/dist/controls/wrap.js
var require_wrap = __commonJS({
  "../../node_modules/rungen/dist/controls/wrap.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.cps = exports.call = void 0;
    var _is = require_is();
    var _is2 = _interopRequireDefault(_is);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function _toConsumableArray(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
          arr2[i] = arr[i];
        }
        return arr2;
      } else {
        return Array.from(arr);
      }
    }
    var call = exports.call = function call2(value, next, rungen, yieldNext, raiseNext) {
      if (!_is2.default.call(value)) return false;
      try {
        next(value.func.apply(value.context, value.args));
      } catch (err) {
        raiseNext(err);
      }
      return true;
    };
    var cps = exports.cps = function cps2(value, next, rungen, yieldNext, raiseNext) {
      var _value$func;
      if (!_is2.default.cps(value)) return false;
      (_value$func = value.func).call.apply(_value$func, [null].concat(_toConsumableArray(value.args), [function(err, result) {
        if (err) raiseNext(err);
        else next(result);
      }]));
      return true;
    };
    exports.default = [call, cps];
  }
});

// ../../node_modules/rungen/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/rungen/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.wrapControls = exports.asyncControls = exports.create = void 0;
    var _helpers = require_helpers();
    Object.keys(_helpers).forEach(function(key) {
      if (key === "default") return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function get() {
          return _helpers[key];
        }
      });
    });
    var _create = require_create();
    var _create2 = _interopRequireDefault(_create);
    var _async = require_async();
    var _async2 = _interopRequireDefault(_async);
    var _wrap = require_wrap();
    var _wrap2 = _interopRequireDefault(_wrap);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    exports.create = _create2.default;
    exports.asyncControls = _async2.default;
    exports.wrapControls = _wrap2.default;
  }
});

// ../../node_modules/rememo/rememo.js
var LEAF_KEY = {};
function arrayOf(value) {
  return [value];
}
function isObjectLike(value) {
  return !!value && "object" === typeof value;
}
function createCache() {
  var cache = {
    clear: function() {
      cache.head = null;
    }
  };
  return cache;
}
function isShallowEqual(a, b, fromIndex) {
  var i;
  if (a.length !== b.length) {
    return false;
  }
  for (i = fromIndex; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
function rememo_default(selector, getDependants) {
  var rootCache;
  var normalizedGetDependants = getDependants ? getDependants : arrayOf;
  function getCache(dependants) {
    var caches = rootCache, isUniqueByDependants = true, i, dependant, map, cache;
    for (i = 0; i < dependants.length; i++) {
      dependant = dependants[i];
      if (!isObjectLike(dependant)) {
        isUniqueByDependants = false;
        break;
      }
      if (caches.has(dependant)) {
        caches = caches.get(dependant);
      } else {
        map = /* @__PURE__ */ new WeakMap();
        caches.set(dependant, map);
        caches = map;
      }
    }
    if (!caches.has(LEAF_KEY)) {
      cache = createCache();
      cache.isUniqueByDependants = isUniqueByDependants;
      caches.set(LEAF_KEY, cache);
    }
    return caches.get(LEAF_KEY);
  }
  function clear() {
    rootCache = /* @__PURE__ */ new WeakMap();
  }
  function callSelector() {
    var len = arguments.length, cache, node, i, args, dependants;
    args = new Array(len);
    for (i = 0; i < len; i++) {
      args[i] = arguments[i];
    }
    dependants = normalizedGetDependants.apply(null, args);
    cache = getCache(dependants);
    if (!cache.isUniqueByDependants) {
      if (cache.lastDependants && !isShallowEqual(dependants, cache.lastDependants, 0)) {
        cache.clear();
      }
      cache.lastDependants = dependants;
    }
    node = cache.head;
    while (node) {
      if (!isShallowEqual(node.args, args, 1)) {
        node = node.next;
        continue;
      }
      if (node !== cache.head) {
        node.prev.next = node.next;
        if (node.next) {
          node.next.prev = node.prev;
        }
        node.next = cache.head;
        node.prev = null;
        cache.head.prev = node;
        cache.head = node;
      }
      return node.val;
    }
    node = /** @type {CacheNode} */
    {
      // Generate the result from original function
      val: selector.apply(null, args)
    };
    args[0] = null;
    node.args = args;
    if (cache.head) {
      cache.head.prev = node;
      node.next = cache.head;
    }
    cache.head = node;
    return node.val;
  }
  callSelector.getDependants = normalizedGetDependants;
  callSelector.clear = clear;
  clear();
  return (
    /** @type {S & EnhancedSelector} */
    callSelector
  );
}

// ../../node_modules/is-promise/index.mjs
function isPromise(obj) {
  return !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";
}

export {
  require_equivalent_key_map,
  require_dist,
  isPromise,
  rememo_default,
  require_cjs
};
//# sourceMappingURL=chunk-LLCGJ2GL.js.map
