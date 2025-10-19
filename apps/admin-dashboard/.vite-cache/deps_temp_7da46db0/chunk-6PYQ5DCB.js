import {
  __,
  doAction
} from "./chunk-VY73N4T2.js";
import {
  escapeAttribute,
  escapeHTML,
  isPlainObject,
  isValidAttributeName,
  paramCase,
  pascalCase
} from "./chunk-KA2FDFUH.js";
import {
  require_client
} from "./chunk-R3AENI7Z.js";
import {
  require_react_dom
} from "./chunk-3KTXSWN7.js";
import {
  require_jsx_runtime
} from "./chunk-AVCP2MUZ.js";
import {
  require_react
} from "./chunk-SB6OIMPW.js";
import {
  __commonJS,
  __export,
  __toESM
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
    var EquivalentKeyMap3 = function() {
      function EquivalentKeyMap4(iterable) {
        _classCallCheck(this, EquivalentKeyMap4);
        this.clear();
        if (iterable instanceof EquivalentKeyMap4) {
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
      _createClass(EquivalentKeyMap4, [{
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
              map.set(property, new EquivalentKeyMap4());
            }
            map = map.get(property);
            var propertyValue = key[property];
            if (!map.has(propertyValue)) {
              map.set(propertyValue, new EquivalentKeyMap4());
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
      return EquivalentKeyMap4;
    }();
    module.exports = EquivalentKeyMap3;
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
    var subscribe2 = exports.subscribe = function subscribe3(channel) {
      return {
        type: _keys2.default.subscribe,
        channel
      };
    };
    var createChannel = exports.createChannel = function createChannel2(callback) {
      var listeners = [];
      var subscribe3 = function subscribe4(l) {
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
        subscribe: subscribe3
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
      subscribe: function subscribe2(value) {
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
    var create2 = function create3() {
      var userControls = arguments.length <= 0 || arguments[0] === void 0 ? [] : arguments[0];
      var controls2 = [].concat(_toConsumableArray(userControls), _toConsumableArray(_builtin2.default));
      var runtime = function runtime2(input) {
        var success = arguments.length <= 1 || arguments[1] === void 0 ? function() {
        } : arguments[1];
        var error = arguments.length <= 2 || arguments[2] === void 0 ? function() {
        } : arguments[2];
        var iterate = function iterate2(gen) {
          var yieldValue = function yieldValue2(isError2) {
            return function(ret) {
              try {
                var _ref = isError2 ? gen.throw(ret) : gen.next(ret);
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
            controls2.some(function(control) {
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
    exports.default = create2;
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
        subscribe: function subscribe2(listener2) {
          listeners.push(listener2);
          return function() {
            listeners = listeners.filter(function(l) {
              return l !== listener2;
            });
          };
        },
        dispatch: function dispatch3(action) {
          listeners.slice().forEach(function(listener2) {
            return listener2(action);
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
    var subscribe2 = function subscribe3(value, next) {
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
    exports.default = [promise, fork, join, race, subscribe2];
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

// ../../node_modules/clipboard/dist/clipboard.js
var require_clipboard = __commonJS({
  "../../node_modules/clipboard/dist/clipboard.js"(exports, module) {
    (function webpackUniversalModuleDefinition(root, factory) {
      if (typeof exports === "object" && typeof module === "object")
        module.exports = factory();
      else if (typeof define === "function" && define.amd)
        define([], factory);
      else if (typeof exports === "object")
        exports["ClipboardJS"] = factory();
      else
        root["ClipboardJS"] = factory();
    })(exports, function() {
      return (
        /******/
        function() {
          var __webpack_modules__ = {
            /***/
            686: (
              /***/
              function(__unused_webpack_module, __webpack_exports__, __webpack_require__2) {
                "use strict";
                __webpack_require__2.d(__webpack_exports__, {
                  "default": function() {
                    return (
                      /* binding */
                      clipboard
                    );
                  }
                });
                var tiny_emitter = __webpack_require__2(279);
                var tiny_emitter_default = __webpack_require__2.n(tiny_emitter);
                var listen = __webpack_require__2(370);
                var listen_default = __webpack_require__2.n(listen);
                var src_select = __webpack_require__2(817);
                var select_default = __webpack_require__2.n(src_select);
                ;
                function command(type) {
                  try {
                    return document.execCommand(type);
                  } catch (err) {
                    return false;
                  }
                }
                ;
                var ClipboardActionCut = function ClipboardActionCut2(target) {
                  var selectedText = select_default()(target);
                  command("cut");
                  return selectedText;
                };
                var actions_cut = ClipboardActionCut;
                ;
                function createFakeElement(value) {
                  var isRTL2 = document.documentElement.getAttribute("dir") === "rtl";
                  var fakeElement = document.createElement("textarea");
                  fakeElement.style.fontSize = "12pt";
                  fakeElement.style.border = "0";
                  fakeElement.style.padding = "0";
                  fakeElement.style.margin = "0";
                  fakeElement.style.position = "absolute";
                  fakeElement.style[isRTL2 ? "right" : "left"] = "-9999px";
                  var yPosition = window.pageYOffset || document.documentElement.scrollTop;
                  fakeElement.style.top = "".concat(yPosition, "px");
                  fakeElement.setAttribute("readonly", "");
                  fakeElement.value = value;
                  return fakeElement;
                }
                ;
                var fakeCopyAction = function fakeCopyAction2(value, options) {
                  var fakeElement = createFakeElement(value);
                  options.container.appendChild(fakeElement);
                  var selectedText = select_default()(fakeElement);
                  command("copy");
                  fakeElement.remove();
                  return selectedText;
                };
                var ClipboardActionCopy = function ClipboardActionCopy2(target) {
                  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
                    container: document.body
                  };
                  var selectedText = "";
                  if (typeof target === "string") {
                    selectedText = fakeCopyAction(target, options);
                  } else if (target instanceof HTMLInputElement && !["text", "search", "url", "tel", "password"].includes(target === null || target === void 0 ? void 0 : target.type)) {
                    selectedText = fakeCopyAction(target.value, options);
                  } else {
                    selectedText = select_default()(target);
                    command("copy");
                  }
                  return selectedText;
                };
                var actions_copy = ClipboardActionCopy;
                ;
                function _typeof(obj) {
                  "@babel/helpers - typeof";
                  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
                    _typeof = function _typeof2(obj2) {
                      return typeof obj2;
                    };
                  } else {
                    _typeof = function _typeof2(obj2) {
                      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
                    };
                  }
                  return _typeof(obj);
                }
                var ClipboardActionDefault = function ClipboardActionDefault2() {
                  var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
                  var _options$action = options.action, action = _options$action === void 0 ? "copy" : _options$action, container = options.container, target = options.target, text = options.text;
                  if (action !== "copy" && action !== "cut") {
                    throw new Error('Invalid "action" value, use either "copy" or "cut"');
                  }
                  if (target !== void 0) {
                    if (target && _typeof(target) === "object" && target.nodeType === 1) {
                      if (action === "copy" && target.hasAttribute("disabled")) {
                        throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');
                      }
                      if (action === "cut" && (target.hasAttribute("readonly") || target.hasAttribute("disabled"))) {
                        throw new Error(`Invalid "target" attribute. You can't cut text from elements with "readonly" or "disabled" attributes`);
                      }
                    } else {
                      throw new Error('Invalid "target" value, use a valid Element');
                    }
                  }
                  if (text) {
                    return actions_copy(text, {
                      container
                    });
                  }
                  if (target) {
                    return action === "cut" ? actions_cut(target) : actions_copy(target, {
                      container
                    });
                  }
                };
                var actions_default = ClipboardActionDefault;
                ;
                function clipboard_typeof(obj) {
                  "@babel/helpers - typeof";
                  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
                    clipboard_typeof = function _typeof2(obj2) {
                      return typeof obj2;
                    };
                  } else {
                    clipboard_typeof = function _typeof2(obj2) {
                      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
                    };
                  }
                  return clipboard_typeof(obj);
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
                function _inherits(subClass, superClass) {
                  if (typeof superClass !== "function" && superClass !== null) {
                    throw new TypeError("Super expression must either be null or a function");
                  }
                  subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
                  if (superClass) _setPrototypeOf(subClass, superClass);
                }
                function _setPrototypeOf(o, p) {
                  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o2, p2) {
                    o2.__proto__ = p2;
                    return o2;
                  };
                  return _setPrototypeOf(o, p);
                }
                function _createSuper(Derived) {
                  var hasNativeReflectConstruct = _isNativeReflectConstruct();
                  return function _createSuperInternal() {
                    var Super = _getPrototypeOf(Derived), result;
                    if (hasNativeReflectConstruct) {
                      var NewTarget = _getPrototypeOf(this).constructor;
                      result = Reflect.construct(Super, arguments, NewTarget);
                    } else {
                      result = Super.apply(this, arguments);
                    }
                    return _possibleConstructorReturn(this, result);
                  };
                }
                function _possibleConstructorReturn(self, call) {
                  if (call && (clipboard_typeof(call) === "object" || typeof call === "function")) {
                    return call;
                  }
                  return _assertThisInitialized(self);
                }
                function _assertThisInitialized(self) {
                  if (self === void 0) {
                    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                  }
                  return self;
                }
                function _isNativeReflectConstruct() {
                  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
                  if (Reflect.construct.sham) return false;
                  if (typeof Proxy === "function") return true;
                  try {
                    Date.prototype.toString.call(Reflect.construct(Date, [], function() {
                    }));
                    return true;
                  } catch (e) {
                    return false;
                  }
                }
                function _getPrototypeOf(o) {
                  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf2(o2) {
                    return o2.__proto__ || Object.getPrototypeOf(o2);
                  };
                  return _getPrototypeOf(o);
                }
                function getAttributeValue(suffix, element) {
                  var attribute = "data-clipboard-".concat(suffix);
                  if (!element.hasAttribute(attribute)) {
                    return;
                  }
                  return element.getAttribute(attribute);
                }
                var Clipboard3 = function(_Emitter) {
                  _inherits(Clipboard4, _Emitter);
                  var _super = _createSuper(Clipboard4);
                  function Clipboard4(trigger, options) {
                    var _this;
                    _classCallCheck(this, Clipboard4);
                    _this = _super.call(this);
                    _this.resolveOptions(options);
                    _this.listenClick(trigger);
                    return _this;
                  }
                  _createClass(Clipboard4, [{
                    key: "resolveOptions",
                    value: function resolveOptions() {
                      var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
                      this.action = typeof options.action === "function" ? options.action : this.defaultAction;
                      this.target = typeof options.target === "function" ? options.target : this.defaultTarget;
                      this.text = typeof options.text === "function" ? options.text : this.defaultText;
                      this.container = clipboard_typeof(options.container) === "object" ? options.container : document.body;
                    }
                    /**
                     * Adds a click event listener to the passed trigger.
                     * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
                     */
                  }, {
                    key: "listenClick",
                    value: function listenClick(trigger) {
                      var _this2 = this;
                      this.listener = listen_default()(trigger, "click", function(e) {
                        return _this2.onClick(e);
                      });
                    }
                    /**
                     * Defines a new `ClipboardAction` on each click event.
                     * @param {Event} e
                     */
                  }, {
                    key: "onClick",
                    value: function onClick(e) {
                      var trigger = e.delegateTarget || e.currentTarget;
                      var action = this.action(trigger) || "copy";
                      var text = actions_default({
                        action,
                        container: this.container,
                        target: this.target(trigger),
                        text: this.text(trigger)
                      });
                      this.emit(text ? "success" : "error", {
                        action,
                        text,
                        trigger,
                        clearSelection: function clearSelection() {
                          if (trigger) {
                            trigger.focus();
                          }
                          window.getSelection().removeAllRanges();
                        }
                      });
                    }
                    /**
                     * Default `action` lookup function.
                     * @param {Element} trigger
                     */
                  }, {
                    key: "defaultAction",
                    value: function defaultAction(trigger) {
                      return getAttributeValue("action", trigger);
                    }
                    /**
                     * Default `target` lookup function.
                     * @param {Element} trigger
                     */
                  }, {
                    key: "defaultTarget",
                    value: function defaultTarget(trigger) {
                      var selector = getAttributeValue("target", trigger);
                      if (selector) {
                        return document.querySelector(selector);
                      }
                    }
                    /**
                     * Allow fire programmatically a copy action
                     * @param {String|HTMLElement} target
                     * @param {Object} options
                     * @returns Text copied.
                     */
                  }, {
                    key: "defaultText",
                    /**
                     * Default `text` lookup function.
                     * @param {Element} trigger
                     */
                    value: function defaultText(trigger) {
                      return getAttributeValue("text", trigger);
                    }
                    /**
                     * Destroy lifecycle.
                     */
                  }, {
                    key: "destroy",
                    value: function destroy() {
                      this.listener.destroy();
                    }
                  }], [{
                    key: "copy",
                    value: function copy(target) {
                      var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
                        container: document.body
                      };
                      return actions_copy(target, options);
                    }
                    /**
                     * Allow fire programmatically a cut action
                     * @param {String|HTMLElement} target
                     * @returns Text cutted.
                     */
                  }, {
                    key: "cut",
                    value: function cut(target) {
                      return actions_cut(target);
                    }
                    /**
                     * Returns the support of the given action, or all actions if no action is
                     * given.
                     * @param {String} [action]
                     */
                  }, {
                    key: "isSupported",
                    value: function isSupported() {
                      var action = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : ["copy", "cut"];
                      var actions = typeof action === "string" ? [action] : action;
                      var support = !!document.queryCommandSupported;
                      actions.forEach(function(action2) {
                        support = support && !!document.queryCommandSupported(action2);
                      });
                      return support;
                    }
                  }]);
                  return Clipboard4;
                }(tiny_emitter_default());
                var clipboard = Clipboard3;
              }
            ),
            /***/
            828: (
              /***/
              function(module2) {
                var DOCUMENT_NODE_TYPE = 9;
                if (typeof Element !== "undefined" && !Element.prototype.matches) {
                  var proto = Element.prototype;
                  proto.matches = proto.matchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || proto.oMatchesSelector || proto.webkitMatchesSelector;
                }
                function closest(element, selector) {
                  while (element && element.nodeType !== DOCUMENT_NODE_TYPE) {
                    if (typeof element.matches === "function" && element.matches(selector)) {
                      return element;
                    }
                    element = element.parentNode;
                  }
                }
                module2.exports = closest;
              }
            ),
            /***/
            438: (
              /***/
              function(module2, __unused_webpack_exports, __webpack_require__2) {
                var closest = __webpack_require__2(828);
                function _delegate(element, selector, type, callback, useCapture) {
                  var listenerFn = listener2.apply(this, arguments);
                  element.addEventListener(type, listenerFn, useCapture);
                  return {
                    destroy: function() {
                      element.removeEventListener(type, listenerFn, useCapture);
                    }
                  };
                }
                function delegate(elements, selector, type, callback, useCapture) {
                  if (typeof elements.addEventListener === "function") {
                    return _delegate.apply(null, arguments);
                  }
                  if (typeof type === "function") {
                    return _delegate.bind(null, document).apply(null, arguments);
                  }
                  if (typeof elements === "string") {
                    elements = document.querySelectorAll(elements);
                  }
                  return Array.prototype.map.call(elements, function(element) {
                    return _delegate(element, selector, type, callback, useCapture);
                  });
                }
                function listener2(element, selector, type, callback) {
                  return function(e) {
                    e.delegateTarget = closest(e.target, selector);
                    if (e.delegateTarget) {
                      callback.call(element, e);
                    }
                  };
                }
                module2.exports = delegate;
              }
            ),
            /***/
            879: (
              /***/
              function(__unused_webpack_module, exports2) {
                exports2.node = function(value) {
                  return value !== void 0 && value instanceof HTMLElement && value.nodeType === 1;
                };
                exports2.nodeList = function(value) {
                  var type = Object.prototype.toString.call(value);
                  return value !== void 0 && (type === "[object NodeList]" || type === "[object HTMLCollection]") && "length" in value && (value.length === 0 || exports2.node(value[0]));
                };
                exports2.string = function(value) {
                  return typeof value === "string" || value instanceof String;
                };
                exports2.fn = function(value) {
                  var type = Object.prototype.toString.call(value);
                  return type === "[object Function]";
                };
              }
            ),
            /***/
            370: (
              /***/
              function(module2, __unused_webpack_exports, __webpack_require__2) {
                var is = __webpack_require__2(879);
                var delegate = __webpack_require__2(438);
                function listen(target, type, callback) {
                  if (!target && !type && !callback) {
                    throw new Error("Missing required arguments");
                  }
                  if (!is.string(type)) {
                    throw new TypeError("Second argument must be a String");
                  }
                  if (!is.fn(callback)) {
                    throw new TypeError("Third argument must be a Function");
                  }
                  if (is.node(target)) {
                    return listenNode(target, type, callback);
                  } else if (is.nodeList(target)) {
                    return listenNodeList(target, type, callback);
                  } else if (is.string(target)) {
                    return listenSelector(target, type, callback);
                  } else {
                    throw new TypeError("First argument must be a String, HTMLElement, HTMLCollection, or NodeList");
                  }
                }
                function listenNode(node, type, callback) {
                  node.addEventListener(type, callback);
                  return {
                    destroy: function() {
                      node.removeEventListener(type, callback);
                    }
                  };
                }
                function listenNodeList(nodeList, type, callback) {
                  Array.prototype.forEach.call(nodeList, function(node) {
                    node.addEventListener(type, callback);
                  });
                  return {
                    destroy: function() {
                      Array.prototype.forEach.call(nodeList, function(node) {
                        node.removeEventListener(type, callback);
                      });
                    }
                  };
                }
                function listenSelector(selector, type, callback) {
                  return delegate(document.body, selector, type, callback);
                }
                module2.exports = listen;
              }
            ),
            /***/
            817: (
              /***/
              function(module2) {
                function select3(element) {
                  var selectedText;
                  if (element.nodeName === "SELECT") {
                    element.focus();
                    selectedText = element.value;
                  } else if (element.nodeName === "INPUT" || element.nodeName === "TEXTAREA") {
                    var isReadOnly = element.hasAttribute("readonly");
                    if (!isReadOnly) {
                      element.setAttribute("readonly", "");
                    }
                    element.select();
                    element.setSelectionRange(0, element.value.length);
                    if (!isReadOnly) {
                      element.removeAttribute("readonly");
                    }
                    selectedText = element.value;
                  } else {
                    if (element.hasAttribute("contenteditable")) {
                      element.focus();
                    }
                    var selection = window.getSelection();
                    var range = document.createRange();
                    range.selectNodeContents(element);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    selectedText = selection.toString();
                  }
                  return selectedText;
                }
                module2.exports = select3;
              }
            ),
            /***/
            279: (
              /***/
              function(module2) {
                function E() {
                }
                E.prototype = {
                  on: function(name, callback, ctx) {
                    var e = this.e || (this.e = {});
                    (e[name] || (e[name] = [])).push({
                      fn: callback,
                      ctx
                    });
                    return this;
                  },
                  once: function(name, callback, ctx) {
                    var self = this;
                    function listener2() {
                      self.off(name, listener2);
                      callback.apply(ctx, arguments);
                    }
                    ;
                    listener2._ = callback;
                    return this.on(name, listener2, ctx);
                  },
                  emit: function(name) {
                    var data = [].slice.call(arguments, 1);
                    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
                    var i = 0;
                    var len = evtArr.length;
                    for (i; i < len; i++) {
                      evtArr[i].fn.apply(evtArr[i].ctx, data);
                    }
                    return this;
                  },
                  off: function(name, callback) {
                    var e = this.e || (this.e = {});
                    var evts = e[name];
                    var liveEvents = [];
                    if (evts && callback) {
                      for (var i = 0, len = evts.length; i < len; i++) {
                        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
                          liveEvents.push(evts[i]);
                      }
                    }
                    liveEvents.length ? e[name] = liveEvents : delete e[name];
                    return this;
                  }
                };
                module2.exports = E;
                module2.exports.TinyEmitter = E;
              }
            )
            /******/
          };
          var __webpack_module_cache__ = {};
          function __webpack_require__(moduleId) {
            if (__webpack_module_cache__[moduleId]) {
              return __webpack_module_cache__[moduleId].exports;
            }
            var module2 = __webpack_module_cache__[moduleId] = {
              /******/
              // no module.id needed
              /******/
              // no module.loaded needed
              /******/
              exports: {}
              /******/
            };
            __webpack_modules__[moduleId](module2, module2.exports, __webpack_require__);
            return module2.exports;
          }
          !function() {
            __webpack_require__.n = function(module2) {
              var getter = module2 && module2.__esModule ? (
                /******/
                function() {
                  return module2["default"];
                }
              ) : (
                /******/
                function() {
                  return module2;
                }
              );
              __webpack_require__.d(getter, { a: getter });
              return getter;
            };
          }();
          !function() {
            __webpack_require__.d = function(exports2, definition) {
              for (var key in definition) {
                if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports2, key)) {
                  Object.defineProperty(exports2, key, { enumerable: true, get: definition[key] });
                }
              }
            };
          }();
          !function() {
            __webpack_require__.o = function(obj, prop) {
              return Object.prototype.hasOwnProperty.call(obj, prop);
            };
          }();
          return __webpack_require__(686);
        }().default
      );
    });
  }
});

// ../../node_modules/mousetrap/mousetrap.js
var require_mousetrap = __commonJS({
  "../../node_modules/mousetrap/mousetrap.js"(exports, module) {
    (function(window2, document2, undefined2) {
      if (!window2) {
        return;
      }
      var _MAP = {
        8: "backspace",
        9: "tab",
        13: "enter",
        16: "shift",
        17: "ctrl",
        18: "alt",
        20: "capslock",
        27: "esc",
        32: "space",
        33: "pageup",
        34: "pagedown",
        35: "end",
        36: "home",
        37: "left",
        38: "up",
        39: "right",
        40: "down",
        45: "ins",
        46: "del",
        91: "meta",
        93: "meta",
        224: "meta"
      };
      var _KEYCODE_MAP = {
        106: "*",
        107: "+",
        109: "-",
        110: ".",
        111: "/",
        186: ";",
        187: "=",
        188: ",",
        189: "-",
        190: ".",
        191: "/",
        192: "`",
        219: "[",
        220: "\\",
        221: "]",
        222: "'"
      };
      var _SHIFT_MAP = {
        "~": "`",
        "!": "1",
        "@": "2",
        "#": "3",
        "$": "4",
        "%": "5",
        "^": "6",
        "&": "7",
        "*": "8",
        "(": "9",
        ")": "0",
        "_": "-",
        "+": "=",
        ":": ";",
        '"': "'",
        "<": ",",
        ">": ".",
        "?": "/",
        "|": "\\"
      };
      var _SPECIAL_ALIASES = {
        "option": "alt",
        "command": "meta",
        "return": "enter",
        "escape": "esc",
        "plus": "+",
        "mod": /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "meta" : "ctrl"
      };
      var _REVERSE_MAP;
      for (var i = 1; i < 20; ++i) {
        _MAP[111 + i] = "f" + i;
      }
      for (i = 0; i <= 9; ++i) {
        _MAP[i + 96] = i.toString();
      }
      function _addEvent(object, type, callback) {
        if (object.addEventListener) {
          object.addEventListener(type, callback, false);
          return;
        }
        object.attachEvent("on" + type, callback);
      }
      function _characterFromEvent(e) {
        if (e.type == "keypress") {
          var character = String.fromCharCode(e.which);
          if (!e.shiftKey) {
            character = character.toLowerCase();
          }
          return character;
        }
        if (_MAP[e.which]) {
          return _MAP[e.which];
        }
        if (_KEYCODE_MAP[e.which]) {
          return _KEYCODE_MAP[e.which];
        }
        return String.fromCharCode(e.which).toLowerCase();
      }
      function _modifiersMatch(modifiers1, modifiers2) {
        return modifiers1.sort().join(",") === modifiers2.sort().join(",");
      }
      function _eventModifiers(e) {
        var modifiers2 = [];
        if (e.shiftKey) {
          modifiers2.push("shift");
        }
        if (e.altKey) {
          modifiers2.push("alt");
        }
        if (e.ctrlKey) {
          modifiers2.push("ctrl");
        }
        if (e.metaKey) {
          modifiers2.push("meta");
        }
        return modifiers2;
      }
      function _preventDefault(e) {
        if (e.preventDefault) {
          e.preventDefault();
          return;
        }
        e.returnValue = false;
      }
      function _stopPropagation(e) {
        if (e.stopPropagation) {
          e.stopPropagation();
          return;
        }
        e.cancelBubble = true;
      }
      function _isModifier(key) {
        return key == "shift" || key == "ctrl" || key == "alt" || key == "meta";
      }
      function _getReverseMap() {
        if (!_REVERSE_MAP) {
          _REVERSE_MAP = {};
          for (var key in _MAP) {
            if (key > 95 && key < 112) {
              continue;
            }
            if (_MAP.hasOwnProperty(key)) {
              _REVERSE_MAP[_MAP[key]] = key;
            }
          }
        }
        return _REVERSE_MAP;
      }
      function _pickBestAction(key, modifiers2, action) {
        if (!action) {
          action = _getReverseMap()[key] ? "keydown" : "keypress";
        }
        if (action == "keypress" && modifiers2.length) {
          action = "keydown";
        }
        return action;
      }
      function _keysFromString(combination) {
        if (combination === "+") {
          return ["+"];
        }
        combination = combination.replace(/\+{2}/g, "+plus");
        return combination.split("+");
      }
      function _getKeyInfo(combination, action) {
        var keys;
        var key;
        var i2;
        var modifiers2 = [];
        keys = _keysFromString(combination);
        for (i2 = 0; i2 < keys.length; ++i2) {
          key = keys[i2];
          if (_SPECIAL_ALIASES[key]) {
            key = _SPECIAL_ALIASES[key];
          }
          if (action && action != "keypress" && _SHIFT_MAP[key]) {
            key = _SHIFT_MAP[key];
            modifiers2.push("shift");
          }
          if (_isModifier(key)) {
            modifiers2.push(key);
          }
        }
        action = _pickBestAction(key, modifiers2, action);
        return {
          key,
          modifiers: modifiers2,
          action
        };
      }
      function _belongsTo(element, ancestor) {
        if (element === null || element === document2) {
          return false;
        }
        if (element === ancestor) {
          return true;
        }
        return _belongsTo(element.parentNode, ancestor);
      }
      function Mousetrap3(targetElement) {
        var self = this;
        targetElement = targetElement || document2;
        if (!(self instanceof Mousetrap3)) {
          return new Mousetrap3(targetElement);
        }
        self.target = targetElement;
        self._callbacks = {};
        self._directMap = {};
        var _sequenceLevels = {};
        var _resetTimer;
        var _ignoreNextKeyup = false;
        var _ignoreNextKeypress = false;
        var _nextExpectedAction = false;
        function _resetSequences(doNotReset) {
          doNotReset = doNotReset || {};
          var activeSequences = false, key;
          for (key in _sequenceLevels) {
            if (doNotReset[key]) {
              activeSequences = true;
              continue;
            }
            _sequenceLevels[key] = 0;
          }
          if (!activeSequences) {
            _nextExpectedAction = false;
          }
        }
        function _getMatches(character, modifiers2, e, sequenceName, combination, level) {
          var i2;
          var callback;
          var matches = [];
          var action = e.type;
          if (!self._callbacks[character]) {
            return [];
          }
          if (action == "keyup" && _isModifier(character)) {
            modifiers2 = [character];
          }
          for (i2 = 0; i2 < self._callbacks[character].length; ++i2) {
            callback = self._callbacks[character][i2];
            if (!sequenceName && callback.seq && _sequenceLevels[callback.seq] != callback.level) {
              continue;
            }
            if (action != callback.action) {
              continue;
            }
            if (action == "keypress" && !e.metaKey && !e.ctrlKey || _modifiersMatch(modifiers2, callback.modifiers)) {
              var deleteCombo = !sequenceName && callback.combo == combination;
              var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
              if (deleteCombo || deleteSequence) {
                self._callbacks[character].splice(i2, 1);
              }
              matches.push(callback);
            }
          }
          return matches;
        }
        function _fireCallback(callback, e, combo, sequence) {
          if (self.stopCallback(e, e.target || e.srcElement, combo, sequence)) {
            return;
          }
          if (callback(e, combo) === false) {
            _preventDefault(e);
            _stopPropagation(e);
          }
        }
        self._handleKey = function(character, modifiers2, e) {
          var callbacks = _getMatches(character, modifiers2, e);
          var i2;
          var doNotReset = {};
          var maxLevel = 0;
          var processedSequenceCallback = false;
          for (i2 = 0; i2 < callbacks.length; ++i2) {
            if (callbacks[i2].seq) {
              maxLevel = Math.max(maxLevel, callbacks[i2].level);
            }
          }
          for (i2 = 0; i2 < callbacks.length; ++i2) {
            if (callbacks[i2].seq) {
              if (callbacks[i2].level != maxLevel) {
                continue;
              }
              processedSequenceCallback = true;
              doNotReset[callbacks[i2].seq] = 1;
              _fireCallback(callbacks[i2].callback, e, callbacks[i2].combo, callbacks[i2].seq);
              continue;
            }
            if (!processedSequenceCallback) {
              _fireCallback(callbacks[i2].callback, e, callbacks[i2].combo);
            }
          }
          var ignoreThisKeypress = e.type == "keypress" && _ignoreNextKeypress;
          if (e.type == _nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
            _resetSequences(doNotReset);
          }
          _ignoreNextKeypress = processedSequenceCallback && e.type == "keydown";
        };
        function _handleKeyEvent(e) {
          if (typeof e.which !== "number") {
            e.which = e.keyCode;
          }
          var character = _characterFromEvent(e);
          if (!character) {
            return;
          }
          if (e.type == "keyup" && _ignoreNextKeyup === character) {
            _ignoreNextKeyup = false;
            return;
          }
          self.handleKey(character, _eventModifiers(e), e);
        }
        function _resetSequenceTimer() {
          clearTimeout(_resetTimer);
          _resetTimer = setTimeout(_resetSequences, 1e3);
        }
        function _bindSequence(combo, keys, callback, action) {
          _sequenceLevels[combo] = 0;
          function _increaseSequence(nextAction) {
            return function() {
              _nextExpectedAction = nextAction;
              ++_sequenceLevels[combo];
              _resetSequenceTimer();
            };
          }
          function _callbackAndReset(e) {
            _fireCallback(callback, e, combo);
            if (action !== "keyup") {
              _ignoreNextKeyup = _characterFromEvent(e);
            }
            setTimeout(_resetSequences, 10);
          }
          for (var i2 = 0; i2 < keys.length; ++i2) {
            var isFinal = i2 + 1 === keys.length;
            var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence(action || _getKeyInfo(keys[i2 + 1]).action);
            _bindSingle(keys[i2], wrappedCallback, action, combo, i2);
          }
        }
        function _bindSingle(combination, callback, action, sequenceName, level) {
          self._directMap[combination + ":" + action] = callback;
          combination = combination.replace(/\s+/g, " ");
          var sequence = combination.split(" ");
          var info;
          if (sequence.length > 1) {
            _bindSequence(combination, sequence, callback, action);
            return;
          }
          info = _getKeyInfo(combination, action);
          self._callbacks[info.key] = self._callbacks[info.key] || [];
          _getMatches(info.key, info.modifiers, { type: info.action }, sequenceName, combination, level);
          self._callbacks[info.key][sequenceName ? "unshift" : "push"]({
            callback,
            modifiers: info.modifiers,
            action: info.action,
            seq: sequenceName,
            level,
            combo: combination
          });
        }
        self._bindMultiple = function(combinations, callback, action) {
          for (var i2 = 0; i2 < combinations.length; ++i2) {
            _bindSingle(combinations[i2], callback, action);
          }
        };
        _addEvent(targetElement, "keypress", _handleKeyEvent);
        _addEvent(targetElement, "keydown", _handleKeyEvent);
        _addEvent(targetElement, "keyup", _handleKeyEvent);
      }
      Mousetrap3.prototype.bind = function(keys, callback, action) {
        var self = this;
        keys = keys instanceof Array ? keys : [keys];
        self._bindMultiple.call(self, keys, callback, action);
        return self;
      };
      Mousetrap3.prototype.unbind = function(keys, action) {
        var self = this;
        return self.bind.call(self, keys, function() {
        }, action);
      };
      Mousetrap3.prototype.trigger = function(keys, action) {
        var self = this;
        if (self._directMap[keys + ":" + action]) {
          self._directMap[keys + ":" + action]({}, keys);
        }
        return self;
      };
      Mousetrap3.prototype.reset = function() {
        var self = this;
        self._callbacks = {};
        self._directMap = {};
        return self;
      };
      Mousetrap3.prototype.stopCallback = function(e, element) {
        var self = this;
        if ((" " + element.className + " ").indexOf(" mousetrap ") > -1) {
          return false;
        }
        if (_belongsTo(element, self.target)) {
          return false;
        }
        if ("composedPath" in e && typeof e.composedPath === "function") {
          var initialEventTarget = e.composedPath()[0];
          if (initialEventTarget !== e.target) {
            element = initialEventTarget;
          }
        }
        return element.tagName == "INPUT" || element.tagName == "SELECT" || element.tagName == "TEXTAREA" || element.isContentEditable;
      };
      Mousetrap3.prototype.handleKey = function() {
        var self = this;
        return self._handleKey.apply(self, arguments);
      };
      Mousetrap3.addKeycodes = function(object) {
        for (var key in object) {
          if (object.hasOwnProperty(key)) {
            _MAP[key] = object[key];
          }
        }
        _REVERSE_MAP = null;
      };
      Mousetrap3.init = function() {
        var documentMousetrap = Mousetrap3(document2);
        for (var method in documentMousetrap) {
          if (method.charAt(0) !== "_") {
            Mousetrap3[method] = /* @__PURE__ */ function(method2) {
              return function() {
                return documentMousetrap[method2].apply(documentMousetrap, arguments);
              };
            }(method);
          }
        }
      };
      Mousetrap3.init();
      window2.Mousetrap = Mousetrap3;
      if (typeof module !== "undefined" && module.exports) {
        module.exports = Mousetrap3;
      }
      if (typeof define === "function" && define.amd) {
        define(function() {
          return Mousetrap3;
        });
      }
    })(typeof window !== "undefined" ? window : null, typeof window !== "undefined" ? document : null);
  }
});

// ../../node_modules/requestidlecallback/index.js
var require_requestidlecallback = __commonJS({
  "../../node_modules/requestidlecallback/index.js"(exports, module) {
    (function(factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
      } else {
        window.idleCallbackShim = factory();
      }
    })(function() {
      "use strict";
      var scheduleStart, throttleDelay, lazytimer, lazyraf;
      var root = typeof window != "undefined" ? window : typeof globalThis != void 0 ? globalThis : this || {};
      var requestAnimationFrame = root.cancelRequestAnimationFrame && root.requestAnimationFrame || setTimeout;
      var cancelRequestAnimationFrame = root.cancelRequestAnimationFrame || clearTimeout;
      var tasks = [];
      var runAttempts = 0;
      var isRunning = false;
      var remainingTime = 7;
      var minThrottle = 35;
      var throttle2 = 125;
      var index = 0;
      var taskStart = 0;
      var tasklength = 0;
      var IdleDeadline = {
        get didTimeout() {
          return false;
        },
        timeRemaining: function() {
          var timeRemaining = remainingTime - (Date.now() - taskStart);
          return timeRemaining < 0 ? 0 : timeRemaining;
        }
      };
      var setInactive = debounce2(function() {
        remainingTime = 22;
        throttle2 = 66;
        minThrottle = 0;
      });
      function debounce2(fn) {
        var id, timestamp;
        var wait = 99;
        var check = function() {
          var last = Date.now() - timestamp;
          if (last < wait) {
            id = setTimeout(check, wait - last);
          } else {
            id = null;
            fn();
          }
        };
        return function() {
          timestamp = Date.now();
          if (!id) {
            id = setTimeout(check, wait);
          }
        };
      }
      function abortRunning() {
        if (isRunning) {
          if (lazyraf) {
            cancelRequestAnimationFrame(lazyraf);
          }
          if (lazytimer) {
            clearTimeout(lazytimer);
          }
          isRunning = false;
        }
      }
      function onInputorMutation() {
        if (throttle2 != 125) {
          remainingTime = 7;
          throttle2 = 125;
          minThrottle = 35;
          if (isRunning) {
            abortRunning();
            scheduleLazy();
          }
        }
        setInactive();
      }
      function scheduleAfterRaf() {
        lazyraf = null;
        lazytimer = setTimeout(runTasks, 0);
      }
      function scheduleRaf() {
        lazytimer = null;
        requestAnimationFrame(scheduleAfterRaf);
      }
      function scheduleLazy() {
        if (isRunning) {
          return;
        }
        throttleDelay = throttle2 - (Date.now() - taskStart);
        scheduleStart = Date.now();
        isRunning = true;
        if (minThrottle && throttleDelay < minThrottle) {
          throttleDelay = minThrottle;
        }
        if (throttleDelay > 9) {
          lazytimer = setTimeout(scheduleRaf, throttleDelay);
        } else {
          throttleDelay = 0;
          scheduleRaf();
        }
      }
      function runTasks() {
        var task, i, len;
        var timeThreshold = remainingTime > 9 ? 9 : 1;
        taskStart = Date.now();
        isRunning = false;
        lazytimer = null;
        if (runAttempts > 2 || taskStart - throttleDelay - 50 < scheduleStart) {
          for (i = 0, len = tasks.length; i < len && IdleDeadline.timeRemaining() > timeThreshold; i++) {
            task = tasks.shift();
            tasklength++;
            if (task) {
              task(IdleDeadline);
            }
          }
        }
        if (tasks.length) {
          scheduleLazy();
        } else {
          runAttempts = 0;
        }
      }
      function requestIdleCallbackShim(task) {
        index++;
        tasks.push(task);
        scheduleLazy();
        return index;
      }
      function cancelIdleCallbackShim(id) {
        var index2 = id - 1 - tasklength;
        if (tasks[index2]) {
          tasks[index2] = null;
        }
      }
      if (!root.requestIdleCallback || !root.cancelIdleCallback) {
        root.requestIdleCallback = requestIdleCallbackShim;
        root.cancelIdleCallback = cancelIdleCallbackShim;
        if (root.document && document.addEventListener) {
          root.addEventListener("scroll", onInputorMutation, true);
          root.addEventListener("resize", onInputorMutation);
          document.addEventListener("focus", onInputorMutation, true);
          document.addEventListener("mouseover", onInputorMutation, true);
          ["click", "keypress", "touchstart", "mousedown"].forEach(function(name) {
            document.addEventListener(name, onInputorMutation, { capture: true, passive: true });
          });
          if (root.MutationObserver) {
            new MutationObserver(onInputorMutation).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
          }
        }
      } else {
        try {
          root.requestIdleCallback(function() {
          }, { timeout: 0 });
        } catch (e) {
          (function(rIC) {
            var timeRemainingProto, timeRemaining;
            root.requestIdleCallback = function(fn, timeout) {
              if (timeout && typeof timeout.timeout == "number") {
                return rIC(fn, timeout.timeout);
              }
              return rIC(fn);
            };
            if (root.IdleCallbackDeadline && (timeRemainingProto = IdleCallbackDeadline.prototype)) {
              timeRemaining = Object.getOwnPropertyDescriptor(timeRemainingProto, "timeRemaining");
              if (!timeRemaining || !timeRemaining.configurable || !timeRemaining.get) {
                return;
              }
              Object.defineProperty(timeRemainingProto, "timeRemaining", {
                value: function() {
                  return timeRemaining.get.call(this);
                },
                enumerable: true,
                configurable: true
              });
            }
          })(root.requestIdleCallback);
        }
      }
      return {
        request: requestIdleCallbackShim,
        cancel: cancelIdleCallbackShim
      };
    });
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
      return options.clone !== false && options.isMergeableObject(value) ? deepmerge2(emptyTarget(value), value, options) : value;
    }
    function defaultArrayMerge(target, source, options) {
      return target.concat(source).map(function(element) {
        return cloneUnlessOtherwiseSpecified(element, options);
      });
    }
    function getMergeFunction(key, options) {
      if (!options.customMerge) {
        return deepmerge2;
      }
      var customMerge = options.customMerge(key);
      return typeof customMerge === "function" ? customMerge : deepmerge2;
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
    function deepmerge2(target, source, options) {
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
    deepmerge2.all = function deepmergeAll(array, options) {
      if (!Array.isArray(array)) {
        throw new Error("first argument should be an array");
      }
      return array.reduce(function(prev, next) {
        return deepmerge2(prev, next, options);
      }, {});
    };
    var deepmerge_1 = deepmerge2;
    module.exports = deepmerge_1;
  }
});

// ../../node_modules/@wordpress/deprecated/build-module/index.js
var logged = /* @__PURE__ */ Object.create(null);
function deprecated(feature, options = {}) {
  const {
    since,
    version,
    alternative,
    plugin,
    link,
    hint
  } = options;
  const pluginMessage = plugin ? ` from ${plugin}` : "";
  const sinceMessage = since ? ` since version ${since}` : "";
  const versionMessage = version ? ` and will be removed${pluginMessage} in version ${version}` : "";
  const useInsteadMessage = alternative ? ` Please use ${alternative} instead.` : "";
  const linkMessage = link ? ` See: ${link}` : "";
  const hintMessage = hint ? ` Note: ${hint}` : "";
  const message = `${feature} is deprecated${sinceMessage}${versionMessage}.${useInsteadMessage}${linkMessage}${hintMessage}`;
  if (message in logged) {
    return;
  }
  doAction("deprecated", feature, options, message);
  console.warn(message);
  logged[message] = true;
}

// ../../node_modules/@wordpress/data/node_modules/redux/dist/redux.mjs
var $$observable = (() => typeof Symbol === "function" && Symbol.observable || "@@observable")();
var symbol_observable_default = $$observable;
var randomString = () => Math.random().toString(36).substring(7).split("").join(".");
var ActionTypes = {
  INIT: `@@redux/INIT${randomString()}`,
  REPLACE: `@@redux/REPLACE${randomString()}`,
  PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}`
};
var actionTypes_default = ActionTypes;
function isPlainObject2(obj) {
  if (typeof obj !== "object" || obj === null)
    return false;
  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(obj) === proto || Object.getPrototypeOf(obj) === null;
}
function miniKindOf(val) {
  if (val === void 0)
    return "undefined";
  if (val === null)
    return "null";
  const type = typeof val;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "symbol":
    case "function": {
      return type;
    }
  }
  if (Array.isArray(val))
    return "array";
  if (isDate(val))
    return "date";
  if (isError(val))
    return "error";
  const constructorName = ctorName(val);
  switch (constructorName) {
    case "Symbol":
    case "Promise":
    case "WeakMap":
    case "WeakSet":
    case "Map":
    case "Set":
      return constructorName;
  }
  return Object.prototype.toString.call(val).slice(8, -1).toLowerCase().replace(/\s/g, "");
}
function ctorName(val) {
  return typeof val.constructor === "function" ? val.constructor.name : null;
}
function isError(val) {
  return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
}
function isDate(val) {
  if (val instanceof Date)
    return true;
  return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
}
function kindOf(val) {
  let typeOfVal = typeof val;
  if (true) {
    typeOfVal = miniKindOf(val);
  }
  return typeOfVal;
}
function createStore(reducer, preloadedState, enhancer) {
  if (typeof reducer !== "function") {
    throw new Error(false ? formatProdErrorMessage(2) : `Expected the root reducer to be a function. Instead, received: '${kindOf(reducer)}'`);
  }
  if (typeof preloadedState === "function" && typeof enhancer === "function" || typeof enhancer === "function" && typeof arguments[3] === "function") {
    throw new Error(false ? formatProdErrorMessage(0) : "It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function. See https://redux.js.org/tutorials/fundamentals/part-4-store#creating-a-store-with-enhancers for an example.");
  }
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState;
    preloadedState = void 0;
  }
  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      throw new Error(false ? formatProdErrorMessage(1) : `Expected the enhancer to be a function. Instead, received: '${kindOf(enhancer)}'`);
    }
    return enhancer(createStore)(reducer, preloadedState);
  }
  let currentReducer = reducer;
  let currentState = preloadedState;
  let currentListeners = /* @__PURE__ */ new Map();
  let nextListeners = currentListeners;
  let listenerIdCounter = 0;
  let isDispatching = false;
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = /* @__PURE__ */ new Map();
      currentListeners.forEach((listener2, key) => {
        nextListeners.set(key, listener2);
      });
    }
  }
  function getState() {
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(3) : "You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.");
    }
    return currentState;
  }
  function subscribe2(listener2) {
    if (typeof listener2 !== "function") {
      throw new Error(false ? formatProdErrorMessage(4) : `Expected the listener to be a function. Instead, received: '${kindOf(listener2)}'`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(5) : "You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details.");
    }
    let isSubscribed = true;
    ensureCanMutateNextListeners();
    const listenerId = listenerIdCounter++;
    nextListeners.set(listenerId, listener2);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      if (isDispatching) {
        throw new Error(false ? formatProdErrorMessage(6) : "You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details.");
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      nextListeners.delete(listenerId);
      currentListeners = null;
    };
  }
  function dispatch3(action) {
    if (!isPlainObject2(action)) {
      throw new Error(false ? formatProdErrorMessage(7) : `Actions must be plain objects. Instead, the actual type was: '${kindOf(action)}'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.`);
    }
    if (typeof action.type === "undefined") {
      throw new Error(false ? formatProdErrorMessage(8) : 'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
    }
    if (typeof action.type !== "string") {
      throw new Error(false ? formatProdErrorMessage(17) : `Action "type" property must be a string. Instead, the actual type was: '${kindOf(action.type)}'. Value was: '${action.type}' (stringified)`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(9) : "Reducers may not dispatch actions.");
    }
    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }
    const listeners = currentListeners = nextListeners;
    listeners.forEach((listener2) => {
      listener2();
    });
    return action;
  }
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== "function") {
      throw new Error(false ? formatProdErrorMessage(10) : `Expected the nextReducer to be a function. Instead, received: '${kindOf(nextReducer)}`);
    }
    currentReducer = nextReducer;
    dispatch3({
      type: actionTypes_default.REPLACE
    });
  }
  function observable() {
    const outerSubscribe = subscribe2;
    return {
      /**
       * The minimal observable subscription method.
       * @param observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== "object" || observer === null) {
          throw new Error(false ? formatProdErrorMessage(11) : `Expected the observer to be an object. Instead, received: '${kindOf(observer)}'`);
        }
        function observeState() {
          const observerAsObserver = observer;
          if (observerAsObserver.next) {
            observerAsObserver.next(getState());
          }
        }
        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe
        };
      },
      [symbol_observable_default]() {
        return this;
      }
    };
  }
  dispatch3({
    type: actionTypes_default.INIT
  });
  const store = {
    dispatch: dispatch3,
    subscribe: subscribe2,
    getState,
    replaceReducer,
    [symbol_observable_default]: observable
  };
  return store;
}
function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
function applyMiddleware(...middlewares) {
  return (createStore2) => (reducer, preloadedState) => {
    const store = createStore2(reducer, preloadedState);
    let dispatch3 = () => {
      throw new Error(false ? formatProdErrorMessage(15) : "Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.");
    };
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action, ...args) => dispatch3(action, ...args)
    };
    const chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch3 = compose(...chain)(store.dispatch);
    return {
      ...store,
      dispatch: dispatch3
    };
  };
}

// ../../node_modules/@wordpress/data/build-module/redux-store/index.js
var import_equivalent_key_map2 = __toESM(require_equivalent_key_map());

// ../../node_modules/@wordpress/redux-routine/build-module/is-generator.js
function isGenerator(object) {
  return !!object && typeof object[Symbol.iterator] === "function" && typeof object.next === "function";
}

// ../../node_modules/@wordpress/redux-routine/build-module/runtime.js
var import_rungen = __toESM(require_dist());

// ../../node_modules/is-promise/index.mjs
function isPromise(obj) {
  return !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";
}

// ../../node_modules/@wordpress/redux-routine/build-module/is-action.js
function isAction(object) {
  return isPlainObject(object) && typeof object.type === "string";
}
function isActionOfType(object, expectedType) {
  return isAction(object) && object.type === expectedType;
}

// ../../node_modules/@wordpress/redux-routine/build-module/runtime.js
function createRuntime(controls2 = {}, dispatch3) {
  const rungenControls = Object.entries(controls2).map(([actionType, control]) => (value, next, iterate, yieldNext, yieldError) => {
    if (!isActionOfType(value, actionType)) {
      return false;
    }
    const routine = control(value);
    if (isPromise(routine)) {
      routine.then(yieldNext, yieldError);
    } else {
      yieldNext(routine);
    }
    return true;
  });
  const unhandledActionControl = (value, next) => {
    if (!isAction(value)) {
      return false;
    }
    dispatch3(value);
    next();
    return true;
  };
  rungenControls.push(unhandledActionControl);
  const rungenRuntime = (0, import_rungen.create)(rungenControls);
  return (action) => new Promise((resolve, reject) => rungenRuntime(action, (result) => {
    if (isAction(result)) {
      dispatch3(result);
    }
    resolve(result);
  }, reject));
}

// ../../node_modules/@wordpress/redux-routine/build-module/index.js
function createMiddleware(controls2 = {}) {
  return (store) => {
    const runtime = createRuntime(controls2, store.dispatch);
    return (next) => (action) => {
      if (!isGenerator(action)) {
        return next(action);
      }
      return runtime(action);
    };
  };
}

// ../../node_modules/@wordpress/compose/build-module/utils/create-higher-order-component/index.js
function createHigherOrderComponent(mapComponent, modifierName) {
  return (Inner) => {
    const Outer = mapComponent(Inner);
    Outer.displayName = hocName(modifierName, Inner);
    return Outer;
  };
}
var hocName = (name, Inner) => {
  const inner = Inner.displayName || Inner.name || "Component";
  const outer = pascalCase(name !== null && name !== void 0 ? name : "");
  return `${outer}(${inner})`;
};

// ../../node_modules/@wordpress/compose/build-module/utils/debounce/index.js
var debounce = (func, wait, options) => {
  let lastArgs;
  let lastThis;
  let maxWait = 0;
  let result;
  let timerId;
  let lastCallTime;
  let lastInvokeTime = 0;
  let leading = false;
  let maxing = false;
  let trailing = true;
  if (options) {
    leading = !!options.leading;
    maxing = "maxWait" in options;
    if (options.maxWait !== void 0) {
      maxWait = Math.max(options.maxWait, wait);
    }
    trailing = "trailing" in options ? !!options.trailing : trailing;
  }
  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = void 0;
    lastThis = void 0;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }
  function startTimer(pendingFunc, waitTime) {
    timerId = setTimeout(pendingFunc, waitTime);
  }
  function cancelTimer() {
    if (timerId !== void 0) {
      clearTimeout(timerId);
    }
  }
  function leadingEdge(time) {
    lastInvokeTime = time;
    startTimer(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }
  function getTimeSinceLastCall(time) {
    return time - (lastCallTime || 0);
  }
  function remainingWait(time) {
    const timeSinceLastCall = getTimeSinceLastCall(time);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return maxing ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
  }
  function shouldInvoke(time) {
    const timeSinceLastCall = getTimeSinceLastCall(time);
    const timeSinceLastInvoke = time - lastInvokeTime;
    return lastCallTime === void 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
  }
  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    startTimer(timerExpired, remainingWait(time));
    return void 0;
  }
  function clearTimer() {
    timerId = void 0;
  }
  function trailingEdge(time) {
    clearTimer();
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = void 0;
    return result;
  }
  function cancel() {
    cancelTimer();
    lastInvokeTime = 0;
    clearTimer();
    lastArgs = lastCallTime = lastThis = void 0;
  }
  function flush() {
    return pending() ? trailingEdge(Date.now()) : result;
  }
  function pending() {
    return timerId !== void 0;
  }
  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    lastArgs = args;
    lastThis = this;
    lastCallTime = time;
    if (isInvoking) {
      if (!pending()) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        startTimer(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (!pending()) {
      startTimer(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;
  return debounced;
};

// ../../node_modules/@wordpress/compose/build-module/utils/throttle/index.js
var throttle = (func, wait, options) => {
  let leading = true;
  let trailing = true;
  if (options) {
    leading = "leading" in options ? !!options.leading : leading;
    trailing = "trailing" in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait
  });
};

// ../../node_modules/@wordpress/compose/build-module/utils/observable-map/index.js
function observableMap() {
  const map = /* @__PURE__ */ new Map();
  const listeners = /* @__PURE__ */ new Map();
  function callListeners(name) {
    const list = listeners.get(name);
    if (!list) {
      return;
    }
    for (const listener2 of list) {
      listener2();
    }
  }
  return {
    get(name) {
      return map.get(name);
    },
    set(name, value) {
      map.set(name, value);
      callListeners(name);
    },
    delete(name) {
      map.delete(name);
      callListeners(name);
    },
    subscribe(name, listener2) {
      let list = listeners.get(name);
      if (!list) {
        list = /* @__PURE__ */ new Set();
        listeners.set(name, list);
      }
      list.add(listener2);
      return () => {
        list.delete(listener2);
        if (list.size === 0) {
          listeners.delete(name);
        }
      };
    }
  };
}

// ../../node_modules/@wordpress/compose/build-module/higher-order/pipe.js
var basePipe = (reverse = false) => (...funcs) => (...args) => {
  const functions = funcs.flat();
  if (reverse) {
    functions.reverse();
  }
  return functions.reduce((prev, func) => [func(...prev)], args)[0];
};
var pipe = basePipe();
var pipe_default = pipe;

// ../../node_modules/@wordpress/compose/build-module/higher-order/compose.js
var compose2 = basePipe(true);
var compose_default = compose2;

// ../../node_modules/@wordpress/compose/build-module/higher-order/if-condition/index.js
var import_jsx_runtime = __toESM(require_jsx_runtime());
function ifCondition(predicate) {
  return createHigherOrderComponent((WrappedComponent) => (props) => {
    if (!predicate(props)) {
      return null;
    }
    return (0, import_jsx_runtime.jsx)(WrappedComponent, {
      ...props
    });
  }, "ifCondition");
}
var if_condition_default = ifCondition;

// ../../node_modules/@wordpress/is-shallow-equal/build-module/objects.js
function isShallowEqualObjects(a, b) {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  let i = 0;
  while (i < aKeys.length) {
    const key = aKeys[i];
    const aValue = a[key];
    if (
      // In iterating only the keys of the first object after verifying
      // equal lengths, account for the case that an explicit `undefined`
      // value in the first is implicitly undefined in the second.
      //
      // Example: isShallowEqualObjects( { a: undefined }, { b: 5 } )
      aValue === void 0 && !b.hasOwnProperty(key) || aValue !== b[key]
    ) {
      return false;
    }
    i++;
  }
  return true;
}

// ../../node_modules/@wordpress/is-shallow-equal/build-module/arrays.js
function isShallowEqualArrays(a, b) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0, len = a.length; i < len; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// ../../node_modules/@wordpress/is-shallow-equal/build-module/index.js
function isShallowEqual(a, b) {
  if (a && b) {
    if (a.constructor === Object && b.constructor === Object) {
      return isShallowEqualObjects(a, b);
    } else if (Array.isArray(a) && Array.isArray(b)) {
      return isShallowEqualArrays(a, b);
    }
  }
  return a === b;
}

// ../../node_modules/@wordpress/element/build-module/react.js
var import_react = __toESM(require_react());

// ../../node_modules/@wordpress/element/build-module/react-platform.js
var import_react_dom = __toESM(require_react_dom());
var import_client = __toESM(require_client());

// ../../node_modules/@wordpress/element/build-module/utils.js
var isEmptyElement = (element) => {
  if (typeof element === "number") {
    return false;
  }
  if (typeof (element == null ? void 0 : element.valueOf()) === "string" || Array.isArray(element)) {
    return !element.length;
  }
  return !element;
};

// ../../node_modules/@wordpress/element/build-module/platform.js
var Platform = {
  /** Platform identifier. Will always be `'web'` in this module. */
  OS: "web",
  /**
   * Select a value based on the platform.
   *
   * @template T
   * @param    spec - Object with optional platform-specific values.
   * @return The selected value.
   */
  select(spec) {
    return "web" in spec ? spec.web : spec.default;
  },
  /** Whether the platform is web */
  isWeb: true
};
var platform_default = Platform;

// ../../node_modules/@wordpress/element/build-module/raw-html.js
function RawHTML({
  children,
  ...props
}) {
  let rawHtml = "";
  import_react.Children.toArray(children).forEach((child) => {
    if (typeof child === "string" && child.trim() !== "") {
      rawHtml += child;
    }
  });
  return (0, import_react.createElement)("div", {
    dangerouslySetInnerHTML: {
      __html: rawHtml
    },
    ...props
  });
}

// ../../node_modules/@wordpress/element/build-module/serialize.js
var Context = (0, import_react.createContext)(void 0);
Context.displayName = "ElementContext";
var {
  Provider,
  Consumer
} = Context;
var ForwardRef = (0, import_react.forwardRef)(() => {
  return null;
});
var ATTRIBUTES_TYPES = /* @__PURE__ */ new Set(["string", "boolean", "number"]);
var SELF_CLOSING_TAGS = /* @__PURE__ */ new Set(["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"]);
var BOOLEAN_ATTRIBUTES = /* @__PURE__ */ new Set(["allowfullscreen", "allowpaymentrequest", "allowusermedia", "async", "autofocus", "autoplay", "checked", "controls", "default", "defer", "disabled", "download", "formnovalidate", "hidden", "ismap", "itemscope", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "selected", "typemustmatch"]);
var ENUMERATED_ATTRIBUTES = /* @__PURE__ */ new Set(["autocapitalize", "autocomplete", "charset", "contenteditable", "crossorigin", "decoding", "dir", "draggable", "enctype", "formenctype", "formmethod", "http-equiv", "inputmode", "kind", "method", "preload", "scope", "shape", "spellcheck", "translate", "type", "wrap"]);
var CSS_PROPERTIES_SUPPORTS_UNITLESS = /* @__PURE__ */ new Set(["animation", "animationIterationCount", "baselineShift", "borderImageOutset", "borderImageSlice", "borderImageWidth", "columnCount", "cx", "cy", "fillOpacity", "flexGrow", "flexShrink", "floodOpacity", "fontWeight", "gridColumnEnd", "gridColumnStart", "gridRowEnd", "gridRowStart", "lineHeight", "opacity", "order", "orphans", "r", "rx", "ry", "shapeImageThreshold", "stopOpacity", "strokeDasharray", "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth", "tabSize", "widows", "x", "y", "zIndex", "zoom"]);
function hasPrefix(string, prefixes) {
  return prefixes.some((prefix) => string.indexOf(prefix) === 0);
}
function isInternalAttribute(attribute) {
  return "key" === attribute || "children" === attribute;
}
function getNormalAttributeValue(attribute, value) {
  switch (attribute) {
    case "style":
      return renderStyle(value);
  }
  return value;
}
var SVG_ATTRIBUTE_WITH_DASHES_LIST = ["accentHeight", "alignmentBaseline", "arabicForm", "baselineShift", "capHeight", "clipPath", "clipRule", "colorInterpolation", "colorInterpolationFilters", "colorProfile", "colorRendering", "dominantBaseline", "enableBackground", "fillOpacity", "fillRule", "floodColor", "floodOpacity", "fontFamily", "fontSize", "fontSizeAdjust", "fontStretch", "fontStyle", "fontVariant", "fontWeight", "glyphName", "glyphOrientationHorizontal", "glyphOrientationVertical", "horizAdvX", "horizOriginX", "imageRendering", "letterSpacing", "lightingColor", "markerEnd", "markerMid", "markerStart", "overlinePosition", "overlineThickness", "paintOrder", "panose1", "pointerEvents", "renderingIntent", "shapeRendering", "stopColor", "stopOpacity", "strikethroughPosition", "strikethroughThickness", "strokeDasharray", "strokeDashoffset", "strokeLinecap", "strokeLinejoin", "strokeMiterlimit", "strokeOpacity", "strokeWidth", "textAnchor", "textDecoration", "textRendering", "underlinePosition", "underlineThickness", "unicodeBidi", "unicodeRange", "unitsPerEm", "vAlphabetic", "vHanging", "vIdeographic", "vMathematical", "vectorEffect", "vertAdvY", "vertOriginX", "vertOriginY", "wordSpacing", "writingMode", "xmlnsXlink", "xHeight"].reduce((map, attribute) => {
  map[attribute.toLowerCase()] = attribute;
  return map;
}, {});
var CASE_SENSITIVE_SVG_ATTRIBUTES = ["allowReorder", "attributeName", "attributeType", "autoReverse", "baseFrequency", "baseProfile", "calcMode", "clipPathUnits", "contentScriptType", "contentStyleType", "diffuseConstant", "edgeMode", "externalResourcesRequired", "filterRes", "filterUnits", "glyphRef", "gradientTransform", "gradientUnits", "kernelMatrix", "kernelUnitLength", "keyPoints", "keySplines", "keyTimes", "lengthAdjust", "limitingConeAngle", "markerHeight", "markerUnits", "markerWidth", "maskContentUnits", "maskUnits", "numOctaves", "pathLength", "patternContentUnits", "patternTransform", "patternUnits", "pointsAtX", "pointsAtY", "pointsAtZ", "preserveAlpha", "preserveAspectRatio", "primitiveUnits", "refX", "refY", "repeatCount", "repeatDur", "requiredExtensions", "requiredFeatures", "specularConstant", "specularExponent", "spreadMethod", "startOffset", "stdDeviation", "stitchTiles", "suppressContentEditableWarning", "suppressHydrationWarning", "surfaceScale", "systemLanguage", "tableValues", "targetX", "targetY", "textLength", "viewBox", "viewTarget", "xChannelSelector", "yChannelSelector"].reduce((map, attribute) => {
  map[attribute.toLowerCase()] = attribute;
  return map;
}, {});
var SVG_ATTRIBUTES_WITH_COLONS = ["xlink:actuate", "xlink:arcrole", "xlink:href", "xlink:role", "xlink:show", "xlink:title", "xlink:type", "xml:base", "xml:lang", "xml:space", "xmlns:xlink"].reduce((map, attribute) => {
  map[attribute.replace(":", "").toLowerCase()] = attribute;
  return map;
}, {});
function getNormalAttributeName(attribute) {
  switch (attribute) {
    case "htmlFor":
      return "for";
    case "className":
      return "class";
  }
  const attributeLowerCase = attribute.toLowerCase();
  if (CASE_SENSITIVE_SVG_ATTRIBUTES[attributeLowerCase]) {
    return CASE_SENSITIVE_SVG_ATTRIBUTES[attributeLowerCase];
  } else if (SVG_ATTRIBUTE_WITH_DASHES_LIST[attributeLowerCase]) {
    return paramCase(SVG_ATTRIBUTE_WITH_DASHES_LIST[attributeLowerCase]);
  } else if (SVG_ATTRIBUTES_WITH_COLONS[attributeLowerCase]) {
    return SVG_ATTRIBUTES_WITH_COLONS[attributeLowerCase];
  }
  return attributeLowerCase;
}
function getNormalStylePropertyName(property) {
  if (property.startsWith("--")) {
    return property;
  }
  if (hasPrefix(property, ["ms", "O", "Moz", "Webkit"])) {
    return "-" + paramCase(property);
  }
  return paramCase(property);
}
function getNormalStylePropertyValue(property, value) {
  if (typeof value === "number" && 0 !== value && !hasPrefix(property, ["--"]) && !CSS_PROPERTIES_SUPPORTS_UNITLESS.has(property)) {
    return value + "px";
  }
  return value;
}
function renderElement(element, context, legacyContext = {}) {
  if (null === element || void 0 === element || false === element) {
    return "";
  }
  if (Array.isArray(element)) {
    return renderChildren(element, context, legacyContext);
  }
  switch (typeof element) {
    case "string":
      return escapeHTML(element);
    case "number":
      return element.toString();
  }
  const {
    type,
    props
  } = element;
  switch (type) {
    case import_react.StrictMode:
    case import_react.Fragment:
      return renderChildren(props.children, context, legacyContext);
    case RawHTML:
      const {
        children,
        ...wrapperProps
      } = props;
      return renderNativeComponent(!Object.keys(wrapperProps).length ? null : "div", {
        ...wrapperProps,
        dangerouslySetInnerHTML: {
          __html: children
        }
      }, context, legacyContext);
  }
  switch (typeof type) {
    case "string":
      return renderNativeComponent(type, props, context, legacyContext);
    case "function":
      if (type.prototype && typeof type.prototype.render === "function") {
        return renderComponent(type, props, context, legacyContext);
      }
      return renderElement(type(props, legacyContext), context, legacyContext);
  }
  switch (type && type.$$typeof) {
    case Provider.$$typeof:
      return renderChildren(props.children, props.value, legacyContext);
    case Consumer.$$typeof:
      return renderElement(props.children(context || type._currentValue), context, legacyContext);
    case ForwardRef.$$typeof:
      return renderElement(type.render(props), context, legacyContext);
  }
  return "";
}
function renderNativeComponent(type, props, context, legacyContext = {}) {
  let content = "";
  if (type === "textarea" && props.hasOwnProperty("value")) {
    content = renderChildren(props.value, context, legacyContext);
    const {
      value,
      ...restProps
    } = props;
    props = restProps;
  } else if (props.dangerouslySetInnerHTML && typeof props.dangerouslySetInnerHTML.__html === "string") {
    content = props.dangerouslySetInnerHTML.__html;
  } else if (typeof props.children !== "undefined") {
    content = renderChildren(props.children, context, legacyContext);
  }
  if (!type) {
    return content;
  }
  const attributes = renderAttributes(props);
  if (SELF_CLOSING_TAGS.has(type)) {
    return "<" + type + attributes + "/>";
  }
  return "<" + type + attributes + ">" + content + "</" + type + ">";
}
function renderComponent(Component2, props, context, legacyContext = {}) {
  const instance = new Component2(props, legacyContext);
  if (typeof instance.getChildContext === "function") {
    Object.assign(legacyContext, instance.getChildContext());
  }
  const html = renderElement(instance.render(), context, legacyContext);
  return html;
}
function renderChildren(children, context, legacyContext = {}) {
  let result = "";
  const childrenArray = Array.isArray(children) ? children : [children];
  for (let i = 0; i < childrenArray.length; i++) {
    const child = childrenArray[i];
    result += renderElement(child, context, legacyContext);
  }
  return result;
}
function renderAttributes(props) {
  let result = "";
  for (const key in props) {
    const attribute = getNormalAttributeName(key);
    if (!isValidAttributeName(attribute)) {
      continue;
    }
    let value = getNormalAttributeValue(key, props[key]);
    if (!ATTRIBUTES_TYPES.has(typeof value)) {
      continue;
    }
    if (isInternalAttribute(key)) {
      continue;
    }
    const isBooleanAttribute = BOOLEAN_ATTRIBUTES.has(attribute);
    if (isBooleanAttribute && value === false) {
      continue;
    }
    const isMeaningfulAttribute = isBooleanAttribute || hasPrefix(key, ["data-", "aria-"]) || ENUMERATED_ATTRIBUTES.has(attribute);
    if (typeof value === "boolean" && !isMeaningfulAttribute) {
      continue;
    }
    result += " " + attribute;
    if (isBooleanAttribute) {
      continue;
    }
    if (typeof value === "string") {
      value = escapeAttribute(value);
    }
    result += '="' + value + '"';
  }
  return result;
}
function renderStyle(style) {
  if (!isPlainObject(style)) {
    return style;
  }
  let result;
  const styleObj = style;
  for (const property in styleObj) {
    const value = styleObj[property];
    if (null === value || void 0 === value) {
      continue;
    }
    if (result) {
      result += ";";
    } else {
      result = "";
    }
    const normalName = getNormalStylePropertyName(property);
    const normalValue = getNormalStylePropertyValue(property, value);
    result += normalName + ":" + normalValue;
  }
  return result;
}
var serialize_default = renderElement;

// ../../node_modules/@wordpress/compose/build-module/higher-order/pure/index.js
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var pure = createHigherOrderComponent(function(WrappedComponent) {
  if (WrappedComponent.prototype instanceof import_react.Component) {
    return class extends WrappedComponent {
      shouldComponentUpdate(nextProps, nextState) {
        return !isShallowEqual(nextProps, this.props) || !isShallowEqual(nextState, this.state);
      }
    };
  }
  return class extends import_react.Component {
    shouldComponentUpdate(nextProps) {
      return !isShallowEqual(nextProps, this.props);
    }
    render() {
      return (0, import_jsx_runtime2.jsx)(WrappedComponent, {
        ...this.props
      });
    }
  };
}, "pure");
var pure_default = pure;

// ../../node_modules/@wordpress/compose/build-module/higher-order/with-global-events/listener.js
var Listener = class {
  constructor() {
    this.listeners = {};
    this.handleEvent = this.handleEvent.bind(this);
  }
  add(eventType, instance) {
    if (!this.listeners[eventType]) {
      window.addEventListener(eventType, this.handleEvent);
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(instance);
  }
  remove(eventType, instance) {
    if (!this.listeners[eventType]) {
      return;
    }
    this.listeners[eventType] = this.listeners[eventType].filter((listener2) => listener2 !== instance);
    if (!this.listeners[eventType].length) {
      window.removeEventListener(eventType, this.handleEvent);
      delete this.listeners[eventType];
    }
  }
  handleEvent(event) {
    var _a;
    (_a = this.listeners[event.type]) == null ? void 0 : _a.forEach((instance) => {
      instance.handleEvent(event);
    });
  }
};
var listener_default = Listener;

// ../../node_modules/@wordpress/compose/build-module/higher-order/with-global-events/index.js
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var listener = new listener_default();

// ../../node_modules/@wordpress/compose/build-module/hooks/use-instance-id/index.js
var instanceMap = /* @__PURE__ */ new WeakMap();
function createId(object) {
  const instances = instanceMap.get(object) || 0;
  instanceMap.set(object, instances + 1);
  return instances;
}
function useInstanceId(object, prefix, preferredId) {
  return (0, import_react.useMemo)(() => {
    if (preferredId) {
      return preferredId;
    }
    const id = createId(object);
    return prefix ? `${prefix}-${id}` : id;
  }, [object, preferredId, prefix]);
}
var use_instance_id_default = useInstanceId;

// ../../node_modules/@wordpress/compose/build-module/higher-order/with-instance-id/index.js
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
var withInstanceId = createHigherOrderComponent((WrappedComponent) => {
  return (props) => {
    const instanceId = use_instance_id_default(WrappedComponent);
    return (0, import_jsx_runtime4.jsx)(WrappedComponent, {
      ...props,
      instanceId
    });
  };
}, "instanceId");
var with_instance_id_default = withInstanceId;

// ../../node_modules/@wordpress/compose/build-module/higher-order/with-safe-timeout/index.js
var import_jsx_runtime5 = __toESM(require_jsx_runtime());
var withSafeTimeout = createHigherOrderComponent((OriginalComponent) => {
  return class WrappedComponent extends import_react.Component {
    constructor(props) {
      super(props);
      this.timeouts = [];
      this.setTimeout = this.setTimeout.bind(this);
      this.clearTimeout = this.clearTimeout.bind(this);
    }
    componentWillUnmount() {
      this.timeouts.forEach(clearTimeout);
    }
    setTimeout(fn, delay) {
      const id = setTimeout(() => {
        fn();
        this.clearTimeout(id);
      }, delay);
      this.timeouts.push(id);
      return id;
    }
    clearTimeout(id) {
      clearTimeout(id);
      this.timeouts = this.timeouts.filter((timeoutId) => timeoutId !== id);
    }
    render() {
      return (
        // @ts-ignore
        (0, import_jsx_runtime5.jsx)(OriginalComponent, {
          ...this.props,
          setTimeout: this.setTimeout,
          clearTimeout: this.clearTimeout
        })
      );
    }
  };
}, "withSafeTimeout");
var with_safe_timeout_default = withSafeTimeout;

// ../../node_modules/@wordpress/compose/build-module/higher-order/with-state/index.js
var import_jsx_runtime6 = __toESM(require_jsx_runtime());

// ../../node_modules/@wordpress/dom/build-module/focusable.js
var focusable_exports = {};
__export(focusable_exports, {
  find: () => find
});
function buildSelector(sequential) {
  return [sequential ? '[tabindex]:not([tabindex^="-"])' : "[tabindex]", "a[href]", "button:not([disabled])", 'input:not([type="hidden"]):not([disabled])', "select:not([disabled])", "textarea:not([disabled])", 'iframe:not([tabindex^="-"])', "object", "embed", "summary", "area[href]", "[contenteditable]:not([contenteditable=false])"].join(",");
}
function isVisible(element) {
  return element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
}
function isValidFocusableArea(element) {
  const map = element.closest("map[name]");
  if (!map) {
    return false;
  }
  const img = element.ownerDocument.querySelector('img[usemap="#' + map.name + '"]');
  return !!img && isVisible(img);
}
function find(context, {
  sequential = false
} = {}) {
  const elements = context.querySelectorAll(buildSelector(sequential));
  return Array.from(elements).filter((element) => {
    if (!isVisible(element)) {
      return false;
    }
    const {
      nodeName
    } = element;
    if ("AREA" === nodeName) {
      return isValidFocusableArea(
        /** @type {HTMLAreaElement} */
        element
      );
    }
    return true;
  });
}

// ../../node_modules/@wordpress/dom/build-module/tabbable.js
var tabbable_exports = {};
__export(tabbable_exports, {
  find: () => find2,
  findNext: () => findNext,
  findPrevious: () => findPrevious,
  isTabbableIndex: () => isTabbableIndex
});
function getTabIndex(element) {
  const tabIndex = element.getAttribute("tabindex");
  return tabIndex === null ? 0 : parseInt(tabIndex, 10);
}
function isTabbableIndex(element) {
  return getTabIndex(element) !== -1;
}
function createStatefulCollapseRadioGroup() {
  const CHOSEN_RADIO_BY_NAME = {};
  return function collapseRadioGroup(result, element) {
    const {
      nodeName,
      type,
      checked,
      name
    } = element;
    if (nodeName !== "INPUT" || type !== "radio" || !name) {
      return result.concat(element);
    }
    const hasChosen = CHOSEN_RADIO_BY_NAME.hasOwnProperty(name);
    const isChosen = checked || !hasChosen;
    if (!isChosen) {
      return result;
    }
    if (hasChosen) {
      const hadChosenElement = CHOSEN_RADIO_BY_NAME[name];
      result = result.filter((e) => e !== hadChosenElement);
    }
    CHOSEN_RADIO_BY_NAME[name] = element;
    return result.concat(element);
  };
}
function mapElementToObjectTabbable(element, index) {
  return {
    element,
    index
  };
}
function mapObjectTabbableToElement(object) {
  return object.element;
}
function compareObjectTabbables(a, b) {
  const aTabIndex = getTabIndex(a.element);
  const bTabIndex = getTabIndex(b.element);
  if (aTabIndex === bTabIndex) {
    return a.index - b.index;
  }
  return aTabIndex - bTabIndex;
}
function filterTabbable(focusables) {
  return focusables.filter(isTabbableIndex).map(mapElementToObjectTabbable).sort(compareObjectTabbables).map(mapObjectTabbableToElement).reduce(createStatefulCollapseRadioGroup(), []);
}
function find2(context) {
  return filterTabbable(find(context));
}
function findPrevious(element) {
  return filterTabbable(find(element.ownerDocument.body)).reverse().find((focusable) => (
    // eslint-disable-next-line no-bitwise
    element.compareDocumentPosition(focusable) & element.DOCUMENT_POSITION_PRECEDING
  ));
}
function findNext(element) {
  return filterTabbable(find(element.ownerDocument.body)).find((focusable) => (
    // eslint-disable-next-line no-bitwise
    element.compareDocumentPosition(focusable) & element.DOCUMENT_POSITION_FOLLOWING
  ));
}

// ../../node_modules/@wordpress/dom/build-module/utils/assert-is-defined.js
function assertIsDefined(val, name) {
  if (val === void 0 || val === null) {
    throw new Error(`Expected '${name}' to be defined, but received ${val}`);
  }
}

// ../../node_modules/@wordpress/dom/build-module/dom/get-rectangle-from-range.js
function getRectangleFromRange(range) {
  if (!range.collapsed) {
    const rects2 = Array.from(range.getClientRects());
    if (rects2.length === 1) {
      return rects2[0];
    }
    const filteredRects = rects2.filter(({
      width
    }) => width > 1);
    if (filteredRects.length === 0) {
      return range.getBoundingClientRect();
    }
    if (filteredRects.length === 1) {
      return filteredRects[0];
    }
    let {
      top: furthestTop,
      bottom: furthestBottom,
      left: furthestLeft,
      right: furthestRight
    } = filteredRects[0];
    for (const {
      top,
      bottom,
      left,
      right
    } of filteredRects) {
      if (top < furthestTop) {
        furthestTop = top;
      }
      if (bottom > furthestBottom) {
        furthestBottom = bottom;
      }
      if (left < furthestLeft) {
        furthestLeft = left;
      }
      if (right > furthestRight) {
        furthestRight = right;
      }
    }
    return new window.DOMRect(furthestLeft, furthestTop, furthestRight - furthestLeft, furthestBottom - furthestTop);
  }
  const {
    startContainer
  } = range;
  const {
    ownerDocument
  } = startContainer;
  if (startContainer.nodeName === "BR") {
    const {
      parentNode
    } = startContainer;
    assertIsDefined(parentNode, "parentNode");
    const index = (
      /** @type {Node[]} */
      Array.from(parentNode.childNodes).indexOf(startContainer)
    );
    assertIsDefined(ownerDocument, "ownerDocument");
    range = ownerDocument.createRange();
    range.setStart(parentNode, index);
    range.setEnd(parentNode, index);
  }
  const rects = range.getClientRects();
  if (rects.length > 1) {
    return null;
  }
  let rect = rects[0];
  if (!rect || rect.height === 0) {
    assertIsDefined(ownerDocument, "ownerDocument");
    const padNode = ownerDocument.createTextNode("​");
    range = range.cloneRange();
    range.insertNode(padNode);
    rect = range.getClientRects()[0];
    assertIsDefined(padNode.parentNode, "padNode.parentNode");
    padNode.parentNode.removeChild(padNode);
  }
  return rect;
}

// ../../node_modules/@wordpress/dom/build-module/dom/compute-caret-rect.js
function computeCaretRect(win) {
  const selection = win.getSelection();
  assertIsDefined(selection, "selection");
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  if (!range) {
    return null;
  }
  return getRectangleFromRange(range);
}

// ../../node_modules/@wordpress/dom/build-module/dom/document-has-text-selection.js
function documentHasTextSelection(doc) {
  assertIsDefined(doc.defaultView, "doc.defaultView");
  const selection = doc.defaultView.getSelection();
  assertIsDefined(selection, "selection");
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  return !!range && !range.collapsed;
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-html-input-element.js
function isHTMLInputElement(node) {
  return (node == null ? void 0 : node.nodeName) === "INPUT";
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-text-field.js
function isTextField(node) {
  const nonTextInputs = ["button", "checkbox", "hidden", "file", "radio", "image", "range", "reset", "submit", "number", "email", "time"];
  return isHTMLInputElement(node) && node.type && !nonTextInputs.includes(node.type) || node.nodeName === "TEXTAREA" || /** @type {HTMLElement} */
  node.contentEditable === "true";
}

// ../../node_modules/@wordpress/dom/build-module/dom/input-field-has-uncollapsed-selection.js
function inputFieldHasUncollapsedSelection(element) {
  if (!isHTMLInputElement(element) && !isTextField(element)) {
    return false;
  }
  try {
    const {
      selectionStart,
      selectionEnd
    } = (
      /** @type {HTMLInputElement | HTMLTextAreaElement} */
      element
    );
    return (
      // `null` means the input type doesn't implement selection, thus we
      // cannot determine whether the selection is collapsed, so we
      // default to true.
      selectionStart === null || // when not null, compare the two points
      selectionStart !== selectionEnd
    );
  } catch (error) {
    return true;
  }
}

// ../../node_modules/@wordpress/dom/build-module/dom/document-has-uncollapsed-selection.js
function documentHasUncollapsedSelection(doc) {
  return documentHasTextSelection(doc) || !!doc.activeElement && inputFieldHasUncollapsedSelection(doc.activeElement);
}

// ../../node_modules/@wordpress/dom/build-module/dom/document-has-selection.js
function documentHasSelection(doc) {
  return !!doc.activeElement && (isHTMLInputElement(doc.activeElement) || isTextField(doc.activeElement) || documentHasTextSelection(doc));
}

// ../../node_modules/@wordpress/dom/build-module/dom/get-computed-style.js
function getComputedStyle(element) {
  assertIsDefined(element.ownerDocument.defaultView, "element.ownerDocument.defaultView");
  return element.ownerDocument.defaultView.getComputedStyle(element);
}

// ../../node_modules/@wordpress/dom/build-module/dom/get-scroll-container.js
function getScrollContainer(node, direction = "vertical") {
  if (!node) {
    return void 0;
  }
  if (direction === "vertical" || direction === "all") {
    if (node.scrollHeight > node.clientHeight) {
      const {
        overflowY
      } = getComputedStyle(node);
      if (/(auto|scroll)/.test(overflowY)) {
        return node;
      }
    }
  }
  if (direction === "horizontal" || direction === "all") {
    if (node.scrollWidth > node.clientWidth) {
      const {
        overflowX
      } = getComputedStyle(node);
      if (/(auto|scroll)/.test(overflowX)) {
        return node;
      }
    }
  }
  if (node.ownerDocument === node.parentNode) {
    return node;
  }
  return getScrollContainer(
    /** @type {Element} */
    node.parentNode,
    direction
  );
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-input-or-text-area.js
function isInputOrTextArea(element) {
  return element.tagName === "INPUT" || element.tagName === "TEXTAREA";
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-entirely-selected.js
function isEntirelySelected(element) {
  if (isInputOrTextArea(element)) {
    return element.selectionStart === 0 && element.value.length === element.selectionEnd;
  }
  if (!element.isContentEditable) {
    return true;
  }
  const {
    ownerDocument
  } = element;
  const {
    defaultView
  } = ownerDocument;
  assertIsDefined(defaultView, "defaultView");
  const selection = defaultView.getSelection();
  assertIsDefined(selection, "selection");
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  if (!range) {
    return true;
  }
  const {
    startContainer,
    endContainer,
    startOffset,
    endOffset
  } = range;
  if (startContainer === element && endContainer === element && startOffset === 0 && endOffset === element.childNodes.length) {
    return true;
  }
  const lastChild = element.lastChild;
  assertIsDefined(lastChild, "lastChild");
  const endContainerContentLength = endContainer.nodeType === endContainer.TEXT_NODE ? (
    /** @type {Text} */
    endContainer.data.length
  ) : endContainer.childNodes.length;
  return isDeepChild(startContainer, element, "firstChild") && isDeepChild(endContainer, element, "lastChild") && startOffset === 0 && endOffset === endContainerContentLength;
}
function isDeepChild(query, container, propName) {
  let candidate = container;
  do {
    if (query === candidate) {
      return true;
    }
    candidate = candidate[propName];
  } while (candidate);
  return false;
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-form-element.js
function isFormElement(element) {
  if (!element) {
    return false;
  }
  const {
    tagName
  } = element;
  const checkForInputTextarea = isInputOrTextArea(element);
  return checkForInputTextarea || tagName === "BUTTON" || tagName === "SELECT";
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-rtl.js
function isRTL(element) {
  return getComputedStyle(element).direction === "rtl";
}

// ../../node_modules/@wordpress/dom/build-module/dom/get-range-height.js
function getRangeHeight(range) {
  const rects = Array.from(range.getClientRects());
  if (!rects.length) {
    return;
  }
  const highestTop = Math.min(...rects.map(({
    top
  }) => top));
  const lowestBottom = Math.max(...rects.map(({
    bottom
  }) => bottom));
  return lowestBottom - highestTop;
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-selection-forward.js
function isSelectionForward(selection) {
  const {
    anchorNode,
    focusNode,
    anchorOffset,
    focusOffset
  } = selection;
  assertIsDefined(anchorNode, "anchorNode");
  assertIsDefined(focusNode, "focusNode");
  const position = anchorNode.compareDocumentPosition(focusNode);
  if (position & anchorNode.DOCUMENT_POSITION_PRECEDING) {
    return false;
  }
  if (position & anchorNode.DOCUMENT_POSITION_FOLLOWING) {
    return true;
  }
  if (position === 0) {
    return anchorOffset <= focusOffset;
  }
  return true;
}

// ../../node_modules/@wordpress/dom/build-module/dom/caret-range-from-point.js
function caretRangeFromPoint(doc, x, y) {
  if (doc.caretRangeFromPoint) {
    return doc.caretRangeFromPoint(x, y);
  }
  if (!doc.caretPositionFromPoint) {
    return null;
  }
  const point = doc.caretPositionFromPoint(x, y);
  if (!point) {
    return null;
  }
  const range = doc.createRange();
  range.setStart(point.offsetNode, point.offset);
  range.collapse(true);
  return range;
}

// ../../node_modules/@wordpress/dom/build-module/dom/hidden-caret-range-from-point.js
function hiddenCaretRangeFromPoint(doc, x, y, container) {
  const originalZIndex = container.style.zIndex;
  const originalPosition = container.style.position;
  const {
    position = "static"
  } = getComputedStyle(container);
  if (position === "static") {
    container.style.position = "relative";
  }
  container.style.zIndex = "10000";
  const range = caretRangeFromPoint(doc, x, y);
  container.style.zIndex = originalZIndex;
  container.style.position = originalPosition;
  return range;
}

// ../../node_modules/@wordpress/dom/build-module/dom/scroll-if-no-range.js
function scrollIfNoRange(container, alignToTop, callback) {
  let range = callback();
  if (!range || !range.startContainer || !container.contains(range.startContainer)) {
    container.scrollIntoView(alignToTop);
    range = callback();
    if (!range || !range.startContainer || !container.contains(range.startContainer)) {
      return null;
    }
  }
  return range;
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-edge.js
function isEdge(container, isReverse, onlyVertical = false) {
  if (isInputOrTextArea(container) && typeof container.selectionStart === "number") {
    if (container.selectionStart !== container.selectionEnd) {
      return false;
    }
    if (isReverse) {
      return container.selectionStart === 0;
    }
    return container.value.length === container.selectionStart;
  }
  if (!container.isContentEditable) {
    return true;
  }
  const {
    ownerDocument
  } = container;
  const {
    defaultView
  } = ownerDocument;
  assertIsDefined(defaultView, "defaultView");
  const selection = defaultView.getSelection();
  if (!selection || !selection.rangeCount) {
    return false;
  }
  const range = selection.getRangeAt(0);
  const collapsedRange = range.cloneRange();
  const isForward = isSelectionForward(selection);
  const isCollapsed = selection.isCollapsed;
  if (!isCollapsed) {
    collapsedRange.collapse(!isForward);
  }
  const collapsedRangeRect = getRectangleFromRange(collapsedRange);
  const rangeRect = getRectangleFromRange(range);
  if (!collapsedRangeRect || !rangeRect) {
    return false;
  }
  const rangeHeight = getRangeHeight(range);
  if (!isCollapsed && rangeHeight && rangeHeight > collapsedRangeRect.height && isForward === isReverse) {
    return false;
  }
  const isReverseDir = isRTL(container) ? !isReverse : isReverse;
  const containerRect = container.getBoundingClientRect();
  const x = isReverseDir ? containerRect.left + 1 : containerRect.right - 1;
  const y = isReverse ? containerRect.top + 1 : containerRect.bottom - 1;
  const testRange = scrollIfNoRange(container, isReverse, () => hiddenCaretRangeFromPoint(ownerDocument, x, y, container));
  if (!testRange) {
    return false;
  }
  const testRect = getRectangleFromRange(testRange);
  if (!testRect) {
    return false;
  }
  const verticalSide = isReverse ? "top" : "bottom";
  const horizontalSide = isReverseDir ? "left" : "right";
  const verticalDiff = testRect[verticalSide] - rangeRect[verticalSide];
  const horizontalDiff = testRect[horizontalSide] - collapsedRangeRect[horizontalSide];
  const hasVerticalDiff = Math.abs(verticalDiff) <= 1;
  const hasHorizontalDiff = Math.abs(horizontalDiff) <= 1;
  return onlyVertical ? hasVerticalDiff : hasVerticalDiff && hasHorizontalDiff;
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-horizontal-edge.js
function isHorizontalEdge(container, isReverse) {
  return isEdge(container, isReverse);
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-vertical-edge.js
function isVerticalEdge(container, isReverse) {
  return isEdge(container, isReverse, true);
}

// ../../node_modules/@wordpress/dom/build-module/dom/place-caret-at-edge.js
function getRange(container, isReverse, x) {
  const {
    ownerDocument
  } = container;
  const isReverseDir = isRTL(container) ? !isReverse : isReverse;
  const containerRect = container.getBoundingClientRect();
  if (x === void 0) {
    x = isReverse ? containerRect.right - 1 : containerRect.left + 1;
  } else if (x <= containerRect.left) {
    x = containerRect.left + 1;
  } else if (x >= containerRect.right) {
    x = containerRect.right - 1;
  }
  const y = isReverseDir ? containerRect.bottom - 1 : containerRect.top + 1;
  return hiddenCaretRangeFromPoint(ownerDocument, x, y, container);
}
function placeCaretAtEdge(container, isReverse, x) {
  if (!container) {
    return;
  }
  container.focus();
  if (isInputOrTextArea(container)) {
    if (typeof container.selectionStart !== "number") {
      return;
    }
    if (isReverse) {
      container.selectionStart = container.value.length;
      container.selectionEnd = container.value.length;
    } else {
      container.selectionStart = 0;
      container.selectionEnd = 0;
    }
    return;
  }
  if (!container.isContentEditable) {
    return;
  }
  const range = scrollIfNoRange(container, isReverse, () => getRange(container, isReverse, x));
  if (!range) {
    return;
  }
  const {
    ownerDocument
  } = container;
  const {
    defaultView
  } = ownerDocument;
  assertIsDefined(defaultView, "defaultView");
  const selection = defaultView.getSelection();
  assertIsDefined(selection, "selection");
  selection.removeAllRanges();
  selection.addRange(range);
}

// ../../node_modules/@wordpress/dom/build-module/dom/place-caret-at-horizontal-edge.js
function placeCaretAtHorizontalEdge(container, isReverse) {
  return placeCaretAtEdge(container, isReverse, void 0);
}

// ../../node_modules/@wordpress/dom/build-module/dom/place-caret-at-vertical-edge.js
function placeCaretAtVerticalEdge(container, isReverse, rect) {
  return placeCaretAtEdge(container, isReverse, rect == null ? void 0 : rect.left);
}

// ../../node_modules/@wordpress/dom/build-module/dom/insert-after.js
function insertAfter(newNode, referenceNode) {
  assertIsDefined(referenceNode.parentNode, "referenceNode.parentNode");
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

// ../../node_modules/@wordpress/dom/build-module/dom/remove.js
function remove(node) {
  assertIsDefined(node.parentNode, "node.parentNode");
  node.parentNode.removeChild(node);
}

// ../../node_modules/@wordpress/dom/build-module/dom/replace.js
function replace(processedNode, newNode) {
  assertIsDefined(processedNode.parentNode, "processedNode.parentNode");
  insertAfter(newNode, processedNode.parentNode);
  remove(processedNode);
}

// ../../node_modules/@wordpress/dom/build-module/dom/unwrap.js
function unwrap(node) {
  const parent = node.parentNode;
  assertIsDefined(parent, "node.parentNode");
  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }
  parent.removeChild(node);
}

// ../../node_modules/@wordpress/dom/build-module/dom/replace-tag.js
function replaceTag(node, tagName) {
  const newNode = node.ownerDocument.createElement(tagName);
  while (node.firstChild) {
    newNode.appendChild(node.firstChild);
  }
  assertIsDefined(node.parentNode, "node.parentNode");
  node.parentNode.replaceChild(newNode, node);
  return newNode;
}

// ../../node_modules/@wordpress/dom/build-module/dom/wrap.js
function wrap(newNode, referenceNode) {
  assertIsDefined(referenceNode.parentNode, "referenceNode.parentNode");
  referenceNode.parentNode.insertBefore(newNode, referenceNode);
  newNode.appendChild(referenceNode);
}

// ../../node_modules/@wordpress/dom/build-module/dom/safe-html.js
function safeHTML(html) {
  const {
    body
  } = document.implementation.createHTMLDocument("");
  body.innerHTML = html;
  const elements = body.getElementsByTagName("*");
  let elementIndex = elements.length;
  while (elementIndex--) {
    const element = elements[elementIndex];
    if (element.tagName === "SCRIPT") {
      remove(element);
    } else {
      let attributeIndex = element.attributes.length;
      while (attributeIndex--) {
        const {
          name: key
        } = element.attributes[attributeIndex];
        if (key.startsWith("on")) {
          element.removeAttribute(key);
        }
      }
    }
  }
  return body.innerHTML;
}

// ../../node_modules/@wordpress/dom/build-module/dom/strip-html.js
function stripHTML(html) {
  html = safeHTML(html);
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html;
  return doc.body.textContent || "";
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-empty.js
function isEmpty(element) {
  switch (element.nodeType) {
    case element.TEXT_NODE:
      return /^[ \f\n\r\t\v\u00a0]*$/.test(element.nodeValue || "");
    case element.ELEMENT_NODE:
      if (element.hasAttributes()) {
        return false;
      } else if (!element.hasChildNodes()) {
        return true;
      }
      return (
        /** @type {Element[]} */
        Array.from(element.childNodes).every(isEmpty)
      );
    default:
      return true;
  }
}

// ../../node_modules/@wordpress/dom/build-module/phrasing-content.js
var textContentSchema = {
  strong: {},
  em: {},
  s: {},
  del: {},
  ins: {},
  a: {
    attributes: ["href", "target", "rel", "id"]
  },
  code: {},
  abbr: {
    attributes: ["title"]
  },
  sub: {},
  sup: {},
  br: {},
  small: {},
  // To do: fix blockquote.
  // cite: {},
  q: {
    attributes: ["cite"]
  },
  dfn: {
    attributes: ["title"]
  },
  data: {
    attributes: ["value"]
  },
  time: {
    attributes: ["datetime"]
  },
  var: {},
  samp: {},
  kbd: {},
  i: {},
  b: {},
  u: {},
  mark: {},
  ruby: {},
  rt: {},
  rp: {},
  bdi: {
    attributes: ["dir"]
  },
  bdo: {
    attributes: ["dir"]
  },
  wbr: {},
  "#text": {}
};
var excludedElements = ["#text", "br"];
Object.keys(textContentSchema).filter((element) => !excludedElements.includes(element)).forEach((tag) => {
  const {
    [tag]: removedTag,
    ...restSchema
  } = textContentSchema;
  textContentSchema[tag].children = restSchema;
});
var embeddedContentSchema = {
  audio: {
    attributes: ["src", "preload", "autoplay", "mediagroup", "loop", "muted"]
  },
  canvas: {
    attributes: ["width", "height"]
  },
  embed: {
    attributes: ["src", "type", "width", "height"]
  },
  img: {
    attributes: ["alt", "src", "srcset", "usemap", "ismap", "width", "height"]
  },
  object: {
    attributes: ["data", "type", "name", "usemap", "form", "width", "height"]
  },
  video: {
    attributes: ["src", "poster", "preload", "playsinline", "autoplay", "mediagroup", "loop", "muted", "controls", "width", "height"]
  }
};
var phrasingContentSchema = {
  ...textContentSchema,
  ...embeddedContentSchema
};
function getPhrasingContentSchema(context) {
  if (context !== "paste") {
    return phrasingContentSchema;
  }
  const {
    u,
    // Used to mark misspelling. Shouldn't be pasted.
    abbr,
    // Invisible.
    data,
    // Invisible.
    time,
    // Invisible.
    wbr,
    // Invisible.
    bdi,
    // Invisible.
    bdo,
    // Invisible.
    ...remainingContentSchema
  } = {
    ...phrasingContentSchema,
    // We shouldn't paste potentially sensitive information which is not
    // visible to the user when pasted, so strip the attributes.
    ins: {
      children: phrasingContentSchema.ins.children
    },
    del: {
      children: phrasingContentSchema.del.children
    }
  };
  return remainingContentSchema;
}
function isPhrasingContent(node) {
  const tag = node.nodeName.toLowerCase();
  return getPhrasingContentSchema().hasOwnProperty(tag) || tag === "span";
}
function isTextContent(node) {
  const tag = node.nodeName.toLowerCase();
  return textContentSchema.hasOwnProperty(tag) || tag === "span";
}

// ../../node_modules/@wordpress/dom/build-module/dom/is-element.js
function isElement(node) {
  return !!node && node.nodeType === node.ELEMENT_NODE;
}

// ../../node_modules/@wordpress/dom/build-module/dom/clean-node-list.js
var noop = () => {
};
function cleanNodeList(nodeList, doc, schema, inline) {
  Array.from(nodeList).forEach((node) => {
    var _a, _b;
    const tag = node.nodeName.toLowerCase();
    if (schema.hasOwnProperty(tag) && (!schema[tag].isMatch || ((_b = (_a = schema[tag]).isMatch) == null ? void 0 : _b.call(_a, node)))) {
      if (isElement(node)) {
        const {
          attributes = [],
          classes = [],
          children,
          require: require2 = [],
          allowEmpty
        } = schema[tag];
        if (children && !allowEmpty && isEmpty(node)) {
          remove(node);
          return;
        }
        if (node.hasAttributes()) {
          Array.from(node.attributes).forEach(({
            name
          }) => {
            if (name !== "class" && !attributes.includes(name)) {
              node.removeAttribute(name);
            }
          });
          if (node.classList && node.classList.length) {
            const mattchers = classes.map((item) => {
              if (item === "*") {
                return () => true;
              } else if (typeof item === "string") {
                return (className) => className === item;
              } else if (item instanceof RegExp) {
                return (className) => item.test(className);
              }
              return noop;
            });
            Array.from(node.classList).forEach((name) => {
              if (!mattchers.some((isMatch) => isMatch(name))) {
                node.classList.remove(name);
              }
            });
            if (!node.classList.length) {
              node.removeAttribute("class");
            }
          }
        }
        if (node.hasChildNodes()) {
          if (children === "*") {
            return;
          }
          if (children) {
            if (require2.length && !node.querySelector(require2.join(","))) {
              cleanNodeList(node.childNodes, doc, schema, inline);
              unwrap(node);
            } else if (node.parentNode && node.parentNode.nodeName === "BODY" && isPhrasingContent(node)) {
              cleanNodeList(node.childNodes, doc, schema, inline);
              if (Array.from(node.childNodes).some((child) => !isPhrasingContent(child))) {
                unwrap(node);
              }
            } else {
              cleanNodeList(node.childNodes, doc, children, inline);
            }
          } else {
            while (node.firstChild) {
              remove(node.firstChild);
            }
          }
        }
      }
    } else {
      cleanNodeList(node.childNodes, doc, schema, inline);
      if (inline && !isPhrasingContent(node) && node.nextElementSibling) {
        insertAfter(doc.createElement("br"), node);
      }
      unwrap(node);
    }
  });
}

// ../../node_modules/@wordpress/dom/build-module/dom/remove-invalid-html.js
function removeInvalidHTML(HTML, schema, inline) {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = HTML;
  cleanNodeList(doc.body.childNodes, doc, schema, inline);
  return doc.body.innerHTML;
}

// ../../node_modules/@wordpress/dom/build-module/data-transfer.js
function getFilesFromDataTransfer(dataTransfer) {
  const files = Array.from(dataTransfer.files);
  Array.from(dataTransfer.items).forEach((item) => {
    const file = item.getAsFile();
    if (file && !files.find(({
      name,
      type,
      size
    }) => name === file.name && type === file.type && size === file.size)) {
      files.push(file);
    }
  });
  return files;
}

// ../../node_modules/@wordpress/dom/build-module/index.js
var focus = {
  focusable: focusable_exports,
  tabbable: tabbable_exports
};

// ../../node_modules/@wordpress/compose/build-module/hooks/use-ref-effect/index.js
function useRefEffect(callback, dependencies) {
  const cleanupRef = (0, import_react.useRef)();
  return (0, import_react.useCallback)((node) => {
    if (node) {
      cleanupRef.current = callback(node);
    } else if (cleanupRef.current) {
      cleanupRef.current();
    }
  }, dependencies);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-constrained-tabbing/index.js
function useConstrainedTabbing() {
  return useRefEffect((node) => {
    function onKeyDown(event) {
      const {
        key,
        shiftKey,
        target
      } = event;
      if (key !== "Tab") {
        return;
      }
      const action = shiftKey ? "findPrevious" : "findNext";
      const nextElement = focus.tabbable[action](
        /** @type {HTMLElement} */
        target
      ) || null;
      if (
        /** @type {HTMLElement} */
        target.contains(nextElement)
      ) {
        event.preventDefault();
        nextElement == null ? void 0 : nextElement.focus();
        return;
      }
      if (node.contains(nextElement)) {
        return;
      }
      const domAction = shiftKey ? "append" : "prepend";
      const {
        ownerDocument
      } = node;
      const trap = ownerDocument.createElement("div");
      trap.tabIndex = -1;
      node[domAction](trap);
      trap.addEventListener("blur", () => node.removeChild(trap));
      trap.focus();
    }
    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
var use_constrained_tabbing_default = useConstrainedTabbing;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-copy-on-click/index.js
var import_clipboard = __toESM(require_clipboard());

// ../../node_modules/@wordpress/compose/build-module/hooks/use-copy-to-clipboard/index.js
var import_clipboard2 = __toESM(require_clipboard());
function useUpdatedRef(value) {
  const ref = (0, import_react.useRef)(value);
  (0, import_react.useLayoutEffect)(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
function useCopyToClipboard(text, onSuccess) {
  const textRef = useUpdatedRef(text);
  const onSuccessRef = useUpdatedRef(onSuccess);
  return useRefEffect((node) => {
    const clipboard = new import_clipboard2.default(node, {
      text() {
        return typeof textRef.current === "function" ? textRef.current() : textRef.current || "";
      }
    });
    clipboard.on("success", ({
      clearSelection
    }) => {
      clearSelection();
      if (onSuccessRef.current) {
        onSuccessRef.current();
      }
    });
    return () => {
      clipboard.destroy();
    };
  }, []);
}

// ../../node_modules/@wordpress/keycodes/build-module/platform.js
function isAppleOS(_window) {
  if (!_window) {
    if (typeof window === "undefined") {
      return false;
    }
    _window = window;
  }
  const {
    platform
  } = _window.navigator;
  return platform.indexOf("Mac") !== -1 || ["iPad", "iPhone"].includes(platform);
}

// ../../node_modules/@wordpress/keycodes/build-module/index.js
var BACKSPACE = 8;
var TAB = 9;
var ENTER = 13;
var ESCAPE = 27;
var SPACE = 32;
var PAGEUP = 33;
var PAGEDOWN = 34;
var END = 35;
var HOME = 36;
var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;
var DELETE = 46;
var ALT = "alt";
var CTRL = "ctrl";
var COMMAND = "meta";
var SHIFT = "shift";
function capitaliseFirstCharacter(string) {
  return string.length < 2 ? string.toUpperCase() : string.charAt(0).toUpperCase() + string.slice(1);
}
function mapValues(object, mapFn) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, mapFn(value)]));
}
var modifiers = {
  primary: (_isApple) => _isApple() ? [COMMAND] : [CTRL],
  primaryShift: (_isApple) => _isApple() ? [SHIFT, COMMAND] : [CTRL, SHIFT],
  primaryAlt: (_isApple) => _isApple() ? [ALT, COMMAND] : [CTRL, ALT],
  secondary: (_isApple) => _isApple() ? [SHIFT, ALT, COMMAND] : [CTRL, SHIFT, ALT],
  access: (_isApple) => _isApple() ? [CTRL, ALT] : [SHIFT, ALT],
  ctrl: () => [CTRL],
  alt: () => [ALT],
  ctrlShift: () => [CTRL, SHIFT],
  shift: () => [SHIFT],
  shiftAlt: () => [SHIFT, ALT],
  undefined: () => []
};
var rawShortcut = mapValues(modifiers, (modifier) => {
  return (character, _isApple = isAppleOS) => {
    return [...modifier(_isApple), character.toLowerCase()].join("+");
  };
});
var displayShortcutList = mapValues(modifiers, (modifier) => {
  return (character, _isApple = isAppleOS) => {
    const isApple = _isApple();
    const replacementKeyMap = {
      [ALT]: isApple ? "⌥" : "Alt",
      [CTRL]: isApple ? "⌃" : "Ctrl",
      // Make sure ⌃ is the U+2303 UP ARROWHEAD unicode character and not the caret character.
      [COMMAND]: "⌘",
      [SHIFT]: isApple ? "⇧" : "Shift"
    };
    const modifierKeys = modifier(_isApple).reduce((accumulator, key) => {
      var _replacementKeyMap$ke;
      const replacementKey = (_replacementKeyMap$ke = replacementKeyMap[key]) !== null && _replacementKeyMap$ke !== void 0 ? _replacementKeyMap$ke : key;
      if (isApple) {
        return [...accumulator, replacementKey];
      }
      return [...accumulator, replacementKey, "+"];
    }, []);
    return [...modifierKeys, capitaliseFirstCharacter(character)];
  };
});
var displayShortcut = mapValues(displayShortcutList, (shortcutList) => {
  return (character, _isApple = isAppleOS) => shortcutList(character, _isApple).join("");
});
var shortcutAriaLabel = mapValues(modifiers, (modifier) => {
  return (character, _isApple = isAppleOS) => {
    const isApple = _isApple();
    const replacementKeyMap = {
      [SHIFT]: "Shift",
      [COMMAND]: isApple ? "Command" : "Control",
      [CTRL]: "Control",
      [ALT]: isApple ? "Option" : "Alt",
      /* translators: comma as in the character ',' */
      ",": __("Comma"),
      /* translators: period as in the character '.' */
      ".": __("Period"),
      /* translators: backtick as in the character '`' */
      "`": __("Backtick"),
      /* translators: tilde as in the character '~' */
      "~": __("Tilde")
    };
    return [...modifier(_isApple), character].map((key) => {
      var _replacementKeyMap$ke2;
      return capitaliseFirstCharacter((_replacementKeyMap$ke2 = replacementKeyMap[key]) !== null && _replacementKeyMap$ke2 !== void 0 ? _replacementKeyMap$ke2 : key);
    }).join(isApple ? " " : " + ");
  };
});
function getEventModifiers(event) {
  return [ALT, CTRL, COMMAND, SHIFT].filter((key) => event[`${key}Key`]);
}
var isKeyboardEvent = mapValues(modifiers, (getModifiers) => {
  return (event, character, _isApple = isAppleOS) => {
    const mods = getModifiers(_isApple);
    const eventMods = getEventModifiers(event);
    const replacementWithShiftKeyMap = {
      Comma: ",",
      Backslash: "\\",
      // Windows returns `\` for both IntlRo and IntlYen.
      IntlRo: "\\",
      IntlYen: "\\"
    };
    const modsDiff = mods.filter((mod) => !eventMods.includes(mod));
    const eventModsDiff = eventMods.filter((mod) => !mods.includes(mod));
    if (modsDiff.length > 0 || eventModsDiff.length > 0) {
      return false;
    }
    let key = event.key.toLowerCase();
    if (!character) {
      return mods.includes(key);
    }
    if (event.altKey && character.length === 1) {
      key = String.fromCharCode(event.keyCode).toLowerCase();
    }
    if (event.shiftKey && character.length === 1 && replacementWithShiftKeyMap[event.code]) {
      key = replacementWithShiftKeyMap[event.code];
    }
    if (character === "del") {
      character = "delete";
    }
    return key === character.toLowerCase();
  };
});

// ../../node_modules/@wordpress/compose/build-module/hooks/use-focus-on-mount/index.js
function useFocusOnMount(focusOnMount = "firstElement") {
  const focusOnMountRef = (0, import_react.useRef)(focusOnMount);
  const setFocus = (target) => {
    target.focus({
      // When focusing newly mounted dialogs,
      // the position of the popover is often not right on the first render
      // This prevents the layout shifts when focusing the dialogs.
      preventScroll: true
    });
  };
  const timerIdRef = (0, import_react.useRef)();
  (0, import_react.useEffect)(() => {
    focusOnMountRef.current = focusOnMount;
  }, [focusOnMount]);
  return useRefEffect((node) => {
    var _a;
    var _node$ownerDocument$a;
    if (!node || focusOnMountRef.current === false) {
      return;
    }
    if (node.contains((_node$ownerDocument$a = (_a = node.ownerDocument) == null ? void 0 : _a.activeElement) !== null && _node$ownerDocument$a !== void 0 ? _node$ownerDocument$a : null)) {
      return;
    }
    if (focusOnMountRef.current !== "firstElement") {
      setFocus(node);
      return;
    }
    timerIdRef.current = setTimeout(() => {
      const firstTabbable = focus.tabbable.find(node)[0];
      if (firstTabbable) {
        setFocus(firstTabbable);
      }
    }, 0);
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-focus-return/index.js
var origin = null;
function useFocusReturn(onFocusReturn) {
  const ref = (0, import_react.useRef)(null);
  const focusedBeforeMount = (0, import_react.useRef)(null);
  const onFocusReturnRef = (0, import_react.useRef)(onFocusReturn);
  (0, import_react.useEffect)(() => {
    onFocusReturnRef.current = onFocusReturn;
  }, [onFocusReturn]);
  return (0, import_react.useCallback)((node) => {
    var _a, _b, _c, _d;
    if (node) {
      var _activeDocument$activ;
      ref.current = node;
      if (focusedBeforeMount.current) {
        return;
      }
      const activeDocument = node.ownerDocument.activeElement instanceof window.HTMLIFrameElement ? node.ownerDocument.activeElement.contentDocument : node.ownerDocument;
      focusedBeforeMount.current = (_activeDocument$activ = activeDocument == null ? void 0 : activeDocument.activeElement) !== null && _activeDocument$activ !== void 0 ? _activeDocument$activ : null;
    } else if (focusedBeforeMount.current) {
      const isFocused = (_b = ref.current) == null ? void 0 : _b.contains((_a = ref.current) == null ? void 0 : _a.ownerDocument.activeElement);
      if (((_c = ref.current) == null ? void 0 : _c.isConnected) && !isFocused) {
        var _origin;
        (_origin = origin) !== null && _origin !== void 0 ? _origin : origin = focusedBeforeMount.current;
        return;
      }
      if (onFocusReturnRef.current) {
        onFocusReturnRef.current();
      } else {
        (_d = !focusedBeforeMount.current.isConnected ? origin : focusedBeforeMount.current) == null ? void 0 : _d.focus();
      }
      origin = null;
    }
  }, []);
}
var use_focus_return_default = useFocusReturn;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-focus-outside/index.js
var INPUT_BUTTON_TYPES = ["button", "submit"];
function isFocusNormalizedButton(eventTarget) {
  if (!(eventTarget instanceof window.HTMLElement)) {
    return false;
  }
  switch (eventTarget.nodeName) {
    case "A":
    case "BUTTON":
      return true;
    case "INPUT":
      return INPUT_BUTTON_TYPES.includes(eventTarget.type);
  }
  return false;
}
function useFocusOutside(onFocusOutside) {
  const currentOnFocusOutsideRef = (0, import_react.useRef)(onFocusOutside);
  (0, import_react.useEffect)(() => {
    currentOnFocusOutsideRef.current = onFocusOutside;
  }, [onFocusOutside]);
  const preventBlurCheckRef = (0, import_react.useRef)(false);
  const blurCheckTimeoutIdRef = (0, import_react.useRef)();
  const cancelBlurCheck = (0, import_react.useCallback)(() => {
    clearTimeout(blurCheckTimeoutIdRef.current);
  }, []);
  (0, import_react.useEffect)(() => {
    if (!onFocusOutside) {
      cancelBlurCheck();
    }
  }, [onFocusOutside, cancelBlurCheck]);
  const normalizeButtonFocus = (0, import_react.useCallback)((event) => {
    const {
      type,
      target
    } = event;
    const isInteractionEnd = ["mouseup", "touchend"].includes(type);
    if (isInteractionEnd) {
      preventBlurCheckRef.current = false;
    } else if (isFocusNormalizedButton(target)) {
      preventBlurCheckRef.current = true;
    }
  }, []);
  const queueBlurCheck = (0, import_react.useCallback)((event) => {
    var _a;
    event.persist();
    if (preventBlurCheckRef.current) {
      return;
    }
    const ignoreForRelatedTarget = event.target.getAttribute("data-unstable-ignore-focus-outside-for-relatedtarget");
    if (ignoreForRelatedTarget && ((_a = event.relatedTarget) == null ? void 0 : _a.closest(ignoreForRelatedTarget))) {
      return;
    }
    blurCheckTimeoutIdRef.current = setTimeout(() => {
      if (!document.hasFocus()) {
        event.preventDefault();
        return;
      }
      if ("function" === typeof currentOnFocusOutsideRef.current) {
        currentOnFocusOutsideRef.current(event);
      }
    }, 0);
  }, []);
  return {
    onFocus: cancelBlurCheck,
    onMouseDown: normalizeButtonFocus,
    onMouseUp: normalizeButtonFocus,
    onTouchStart: normalizeButtonFocus,
    onTouchEnd: normalizeButtonFocus,
    onBlur: queueBlurCheck
  };
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-merge-refs/index.js
function assignRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && ref.hasOwnProperty("current")) {
    ref.current = value;
  }
}
function useMergeRefs(refs) {
  const element = (0, import_react.useRef)();
  const isAttachedRef = (0, import_react.useRef)(false);
  const didElementChangeRef = (0, import_react.useRef)(false);
  const previousRefsRef = (0, import_react.useRef)([]);
  const currentRefsRef = (0, import_react.useRef)(refs);
  currentRefsRef.current = refs;
  (0, import_react.useLayoutEffect)(() => {
    if (didElementChangeRef.current === false && isAttachedRef.current === true) {
      refs.forEach((ref, index) => {
        const previousRef = previousRefsRef.current[index];
        if (ref !== previousRef) {
          assignRef(previousRef, null);
          assignRef(ref, element.current);
        }
      });
    }
    previousRefsRef.current = refs;
  }, refs);
  (0, import_react.useLayoutEffect)(() => {
    didElementChangeRef.current = false;
  });
  return (0, import_react.useCallback)((value) => {
    assignRef(element, value);
    didElementChangeRef.current = true;
    isAttachedRef.current = value !== null;
    const refsToAssign = value ? currentRefsRef.current : previousRefsRef.current;
    for (const ref of refsToAssign) {
      assignRef(ref, value);
    }
  }, []);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-dialog/index.js
function useDialog(options) {
  const currentOptions = (0, import_react.useRef)();
  const {
    constrainTabbing = options.focusOnMount !== false
  } = options;
  (0, import_react.useEffect)(() => {
    currentOptions.current = options;
  }, Object.values(options));
  const constrainedTabbingRef = use_constrained_tabbing_default();
  const focusOnMountRef = useFocusOnMount(options.focusOnMount);
  const focusReturnRef = use_focus_return_default();
  const focusOutsideProps = useFocusOutside((event) => {
    var _a, _b;
    if ((_a = currentOptions.current) == null ? void 0 : _a.__unstableOnClose) {
      currentOptions.current.__unstableOnClose("focus-outside", event);
    } else if ((_b = currentOptions.current) == null ? void 0 : _b.onClose) {
      currentOptions.current.onClose();
    }
  });
  const closeOnEscapeRef = (0, import_react.useCallback)((node) => {
    if (!node) {
      return;
    }
    node.addEventListener("keydown", (event) => {
      var _a;
      if (event.keyCode === ESCAPE && !event.defaultPrevented && ((_a = currentOptions.current) == null ? void 0 : _a.onClose)) {
        event.preventDefault();
        currentOptions.current.onClose();
      }
    });
  }, []);
  return [useMergeRefs([constrainTabbing ? constrainedTabbingRef : null, options.focusOnMount !== false ? focusReturnRef : null, options.focusOnMount !== false ? focusOnMountRef : null, closeOnEscapeRef]), {
    ...focusOutsideProps,
    tabIndex: -1
  }];
}
var use_dialog_default = useDialog;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-disabled/index.js
function useDisabled({
  isDisabled: isDisabledProp = false
} = {}) {
  return useRefEffect((node) => {
    var _a;
    if (isDisabledProp) {
      return;
    }
    const defaultView = (_a = node == null ? void 0 : node.ownerDocument) == null ? void 0 : _a.defaultView;
    if (!defaultView) {
      return;
    }
    const updates = [];
    const disable = () => {
      node.childNodes.forEach((child) => {
        if (!(child instanceof defaultView.HTMLElement)) {
          return;
        }
        if (!child.getAttribute("inert")) {
          child.setAttribute("inert", "true");
          updates.push(() => {
            child.removeAttribute("inert");
          });
        }
      });
    };
    const debouncedDisable = debounce(disable, 0, {
      leading: true
    });
    disable();
    const observer = new window.MutationObserver(debouncedDisable);
    observer.observe(node, {
      childList: true
    });
    return () => {
      if (observer) {
        observer.disconnect();
      }
      debouncedDisable.cancel();
      updates.forEach((update) => update());
    };
  }, [isDisabledProp]);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-event/index.js
function useEvent(callback) {
  const ref = (0, import_react.useRef)(() => {
    throw new Error("Callbacks created with `useEvent` cannot be called during rendering.");
  });
  (0, import_react.useInsertionEffect)(() => {
    ref.current = callback;
  });
  return (0, import_react.useCallback)((...args) => {
    var _a;
    return (_a = ref.current) == null ? void 0 : _a.call(ref, ...args);
  }, []);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-isomorphic-layout-effect/index.js
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? import_react.useLayoutEffect : import_react.useEffect;
var use_isomorphic_layout_effect_default = useIsomorphicLayoutEffect;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-dragging/index.js
function useDragging({
  onDragStart,
  onDragMove,
  onDragEnd
}) {
  const [isDragging, setIsDragging] = (0, import_react.useState)(false);
  const eventsRef = (0, import_react.useRef)({
    onDragStart,
    onDragMove,
    onDragEnd
  });
  use_isomorphic_layout_effect_default(() => {
    eventsRef.current.onDragStart = onDragStart;
    eventsRef.current.onDragMove = onDragMove;
    eventsRef.current.onDragEnd = onDragEnd;
  }, [onDragStart, onDragMove, onDragEnd]);
  const onMouseMove = (0, import_react.useCallback)((event) => eventsRef.current.onDragMove && eventsRef.current.onDragMove(event), []);
  const endDrag = (0, import_react.useCallback)((event) => {
    if (eventsRef.current.onDragEnd) {
      eventsRef.current.onDragEnd(event);
    }
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", endDrag);
    setIsDragging(false);
  }, []);
  const startDrag = (0, import_react.useCallback)((event) => {
    if (eventsRef.current.onDragStart) {
      eventsRef.current.onDragStart(event);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", endDrag);
    setIsDragging(true);
  }, []);
  (0, import_react.useEffect)(() => {
    return () => {
      if (isDragging) {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", endDrag);
      }
    };
  }, [isDragging]);
  return {
    startDrag,
    endDrag,
    isDragging
  };
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-keyboard-shortcut/index.js
var import_mousetrap = __toESM(require_mousetrap());

// ../../node_modules/mousetrap/plugins/global-bind/mousetrap-global-bind.js
(function(Mousetrap3) {
  if (!Mousetrap3) {
    return;
  }
  var _globalCallbacks = {};
  var _originalStopCallback = Mousetrap3.prototype.stopCallback;
  Mousetrap3.prototype.stopCallback = function(e, element, combo, sequence) {
    var self = this;
    if (self.paused) {
      return true;
    }
    if (_globalCallbacks[combo] || _globalCallbacks[sequence]) {
      return false;
    }
    return _originalStopCallback.call(self, e, element, combo);
  };
  Mousetrap3.prototype.bindGlobal = function(keys, callback, action) {
    var self = this;
    self.bind(keys, callback, action);
    if (keys instanceof Array) {
      for (var i = 0; i < keys.length; i++) {
        _globalCallbacks[keys[i]] = true;
      }
      return;
    }
    _globalCallbacks[keys] = true;
  };
  Mousetrap3.init();
})(typeof Mousetrap !== "undefined" ? Mousetrap : void 0);

// ../../node_modules/@wordpress/compose/build-module/hooks/use-keyboard-shortcut/index.js
function useKeyboardShortcut(shortcuts, callback, {
  bindGlobal = false,
  eventName = "keydown",
  isDisabled = false,
  // This is important for performance considerations.
  target
} = {}) {
  const currentCallbackRef = (0, import_react.useRef)(callback);
  (0, import_react.useEffect)(() => {
    currentCallbackRef.current = callback;
  }, [callback]);
  (0, import_react.useEffect)(() => {
    if (isDisabled) {
      return;
    }
    const mousetrap = new import_mousetrap.default(target && target.current ? target.current : (
      // We were passing `document` here previously, so to successfully cast it to Element we must cast it first to `unknown`.
      // Not sure if this is a mistake but it was the behavior previous to the addition of types so we're just doing what's
      // necessary to maintain the existing behavior.
      /** @type {Element} */
      /** @type {unknown} */
      document
    ));
    const shortcutsArray = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
    shortcutsArray.forEach((shortcut) => {
      const keys = shortcut.split("+");
      const modifiers2 = new Set(keys.filter((value) => value.length > 1));
      const hasAlt = modifiers2.has("alt");
      const hasShift = modifiers2.has("shift");
      if (isAppleOS() && (modifiers2.size === 1 && hasAlt || modifiers2.size === 2 && hasAlt && hasShift)) {
        throw new Error(`Cannot bind ${shortcut}. Alt and Shift+Alt modifiers are reserved for character input.`);
      }
      const bindFn = bindGlobal ? "bindGlobal" : "bind";
      mousetrap[bindFn](shortcut, (...args) => (
        /* eslint-enable jsdoc/valid-types */
        currentCallbackRef.current(...args)
      ), eventName);
    });
    return () => {
      mousetrap.reset();
    };
  }, [shortcuts, bindGlobal, eventName, target, isDisabled]);
}
var use_keyboard_shortcut_default = useKeyboardShortcut;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-media-query/index.js
var matchMediaCache = /* @__PURE__ */ new Map();
function getMediaQueryList(query) {
  if (!query) {
    return null;
  }
  let match = matchMediaCache.get(query);
  if (match) {
    return match;
  }
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    match = window.matchMedia(query);
    matchMediaCache.set(query, match);
    return match;
  }
  return null;
}
function useMediaQuery(query) {
  const source = (0, import_react.useMemo)(() => {
    const mediaQueryList = getMediaQueryList(query);
    return {
      /** @type {(onStoreChange: () => void) => () => void} */
      subscribe(onStoreChange) {
        var _a;
        if (!mediaQueryList) {
          return () => {
          };
        }
        (_a = mediaQueryList.addEventListener) == null ? void 0 : _a.call(mediaQueryList, "change", onStoreChange);
        return () => {
          var _a2;
          (_a2 = mediaQueryList.removeEventListener) == null ? void 0 : _a2.call(mediaQueryList, "change", onStoreChange);
        };
      },
      getValue() {
        var _mediaQueryList$match;
        return (_mediaQueryList$match = mediaQueryList == null ? void 0 : mediaQueryList.matches) !== null && _mediaQueryList$match !== void 0 ? _mediaQueryList$match : false;
      }
    };
  }, [query]);
  return (0, import_react.useSyncExternalStore)(source.subscribe, source.getValue, () => false);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-previous/index.js
function usePrevious(value) {
  const ref = (0, import_react.useRef)();
  (0, import_react.useEffect)(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-reduced-motion/index.js
var useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
var use_reduced_motion_default = useReducedMotion;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-viewport-match/index.js
var BREAKPOINTS = {
  xhuge: 1920,
  huge: 1440,
  wide: 1280,
  xlarge: 1080,
  large: 960,
  medium: 782,
  small: 600,
  mobile: 480
};
var CONDITIONS = {
  ">=": "min-width",
  "<": "max-width"
};
var OPERATOR_EVALUATORS = {
  ">=": (breakpointValue, width) => width >= breakpointValue,
  "<": (breakpointValue, width) => width < breakpointValue
};
var ViewportMatchWidthContext = (0, import_react.createContext)(
  /** @type {null | number} */
  null
);
ViewportMatchWidthContext.displayName = "ViewportMatchWidthContext";
var useViewportMatch = (breakpoint, operator = ">=") => {
  const simulatedWidth = (0, import_react.useContext)(ViewportMatchWidthContext);
  const mediaQuery = !simulatedWidth && `(${CONDITIONS[operator]}: ${BREAKPOINTS[breakpoint]}px)`;
  const mediaQueryResult = useMediaQuery(mediaQuery || void 0);
  if (simulatedWidth) {
    return OPERATOR_EVALUATORS[operator](BREAKPOINTS[breakpoint], simulatedWidth);
  }
  return mediaQueryResult;
};
useViewportMatch.__experimentalWidthProvider = ViewportMatchWidthContext.Provider;
var use_viewport_match_default = useViewportMatch;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-resize-observer/use-resize-observer.js
function useResizeObserver(callback, resizeObserverOptions = {}) {
  const callbackEvent = useEvent(callback);
  const observedElementRef = (0, import_react.useRef)();
  const resizeObserverRef = (0, import_react.useRef)();
  return useEvent((element) => {
    var _resizeObserverRef$cu;
    if (element === observedElementRef.current) {
      return;
    }
    (_resizeObserverRef$cu = resizeObserverRef.current) !== null && _resizeObserverRef$cu !== void 0 ? _resizeObserverRef$cu : resizeObserverRef.current = new ResizeObserver(callbackEvent);
    const {
      current: resizeObserver
    } = resizeObserverRef;
    if (observedElementRef.current) {
      resizeObserver.unobserve(observedElementRef.current);
    }
    observedElementRef.current = element;
    if (element) {
      resizeObserver.observe(element, resizeObserverOptions);
    }
  });
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-resize-observer/legacy/index.js
var import_jsx_runtime7 = __toESM(require_jsx_runtime());
var extractSize = (entry) => {
  let entrySize;
  if (!entry.contentBoxSize) {
    entrySize = [entry.contentRect.width, entry.contentRect.height];
  } else if (entry.contentBoxSize[0]) {
    const contentBoxSize = entry.contentBoxSize[0];
    entrySize = [contentBoxSize.inlineSize, contentBoxSize.blockSize];
  } else {
    const contentBoxSize = entry.contentBoxSize;
    entrySize = [contentBoxSize.inlineSize, contentBoxSize.blockSize];
  }
  const [width, height] = entrySize.map((d) => Math.round(d));
  return {
    width,
    height
  };
};
var RESIZE_ELEMENT_STYLES = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: "none",
  opacity: 0,
  overflow: "hidden",
  zIndex: -1
};
function ResizeElement({
  onResize
}) {
  const resizeElementRef = useResizeObserver((entries) => {
    const newSize = extractSize(entries.at(-1));
    onResize(newSize);
  });
  return (0, import_jsx_runtime7.jsx)("div", {
    ref: resizeElementRef,
    style: RESIZE_ELEMENT_STYLES,
    "aria-hidden": "true"
  });
}
function sizeEquals(a, b) {
  return a.width === b.width && a.height === b.height;
}
var NULL_SIZE = {
  width: null,
  height: null
};
function useLegacyResizeObserver() {
  const [size, setSize] = (0, import_react.useState)(NULL_SIZE);
  const previousSizeRef = (0, import_react.useRef)(NULL_SIZE);
  const handleResize = (0, import_react.useCallback)((newSize) => {
    if (!sizeEquals(previousSizeRef.current, newSize)) {
      previousSizeRef.current = newSize;
      setSize(newSize);
    }
  }, []);
  const resizeElement = (0, import_jsx_runtime7.jsx)(ResizeElement, {
    onResize: handleResize
  });
  return [resizeElement, size];
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-resize-observer/index.js
function useResizeObserver2(callback, options = {}) {
  return callback ? useResizeObserver(callback, options) : useLegacyResizeObserver();
}

// ../../node_modules/@wordpress/priority-queue/build-module/request-idle-callback.js
var import_requestidlecallback = __toESM(require_requestidlecallback());
function createRequestIdleCallback() {
  if (typeof window === "undefined") {
    return (callback) => {
      setTimeout(() => callback(Date.now()), 0);
    };
  }
  return window.requestIdleCallback;
}
var request_idle_callback_default = createRequestIdleCallback();

// ../../node_modules/@wordpress/priority-queue/build-module/index.js
var createQueue = () => {
  const waitingList = /* @__PURE__ */ new Map();
  let isRunning = false;
  const runWaitingList = (deadline) => {
    for (const [nextElement, callback] of waitingList) {
      waitingList.delete(nextElement);
      callback();
      if ("number" === typeof deadline || deadline.timeRemaining() <= 0) {
        break;
      }
    }
    if (waitingList.size === 0) {
      isRunning = false;
      return;
    }
    request_idle_callback_default(runWaitingList);
  };
  const add = (element, item) => {
    waitingList.set(element, item);
    if (!isRunning) {
      isRunning = true;
      request_idle_callback_default(runWaitingList);
    }
  };
  const flush = (element) => {
    const callback = waitingList.get(element);
    if (void 0 === callback) {
      return false;
    }
    waitingList.delete(element);
    callback();
    return true;
  };
  const cancel = (element) => {
    return waitingList.delete(element);
  };
  const reset = () => {
    waitingList.clear();
    isRunning = false;
  };
  return {
    add,
    flush,
    cancel,
    reset
  };
};

// ../../node_modules/@wordpress/compose/build-module/hooks/use-async-list/index.js
function getFirstItemsPresentInState(list, state) {
  const firstItems = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!state.includes(item)) {
      break;
    }
    firstItems.push(item);
  }
  return firstItems;
}
function useAsyncList(list, config = {
  step: 1
}) {
  const {
    step = 1
  } = config;
  const [current, setCurrent] = (0, import_react.useState)([]);
  (0, import_react.useEffect)(() => {
    let firstItems = getFirstItemsPresentInState(list, current);
    if (firstItems.length < step) {
      firstItems = firstItems.concat(list.slice(firstItems.length, step));
    }
    setCurrent(firstItems);
    const asyncQueue = createQueue();
    for (let i = firstItems.length; i < list.length; i += step) {
      asyncQueue.add({}, () => {
        (0, import_react_dom.flushSync)(() => {
          setCurrent((state) => [...state, ...list.slice(i, i + step)]);
        });
      });
    }
    return () => asyncQueue.reset();
  }, [list]);
  return current;
}
var use_async_list_default = useAsyncList;

// ../../node_modules/use-memo-one/dist/use-memo-one.esm.js
var import_react5 = __toESM(require_react());
function areInputsEqual(newInputs, lastInputs) {
  if (newInputs.length !== lastInputs.length) {
    return false;
  }
  for (var i = 0; i < newInputs.length; i++) {
    if (newInputs[i] !== lastInputs[i]) {
      return false;
    }
  }
  return true;
}
function useMemoOne(getResult, inputs) {
  var initial = (0, import_react5.useState)(function() {
    return {
      inputs,
      result: getResult()
    };
  })[0];
  var isFirstRun = (0, import_react5.useRef)(true);
  var committed = (0, import_react5.useRef)(initial);
  var useCache = isFirstRun.current || Boolean(inputs && committed.current.inputs && areInputsEqual(inputs, committed.current.inputs));
  var cache = useCache ? committed.current : {
    inputs,
    result: getResult()
  };
  (0, import_react5.useEffect)(function() {
    isFirstRun.current = false;
    committed.current = cache;
  }, [cache]);
  return cache.result;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-debounce/index.js
function useDebounce(fn, wait, options) {
  const debounced = useMemoOne(() => debounce(fn, wait !== null && wait !== void 0 ? wait : 0, options), [fn, wait, options]);
  (0, import_react.useEffect)(() => () => debounced.cancel(), [debounced]);
  return debounced;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-debounced-input/index.js
function useDebouncedInput(defaultValue = "") {
  const [input, setInput] = (0, import_react.useState)(defaultValue);
  const [debouncedInput, setDebouncedState] = (0, import_react.useState)(defaultValue);
  const setDebouncedInput = useDebounce(setDebouncedState, 250);
  (0, import_react.useEffect)(() => {
    setDebouncedInput(input);
  }, [input, setDebouncedInput]);
  return [input, setInput, debouncedInput];
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-throttle/index.js
function useThrottle(fn, wait, options) {
  const throttled = useMemoOne(() => throttle(fn, wait !== null && wait !== void 0 ? wait : 0, options), [fn, wait, options]);
  (0, import_react.useEffect)(() => () => throttled.cancel(), [throttled]);
  return throttled;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-drop-zone/index.js
function useDropZone({
  dropZoneElement,
  isDisabled,
  onDrop: _onDrop,
  onDragStart: _onDragStart,
  onDragEnter: _onDragEnter,
  onDragLeave: _onDragLeave,
  onDragEnd: _onDragEnd,
  onDragOver: _onDragOver
}) {
  const onDropEvent = useEvent(_onDrop);
  const onDragStartEvent = useEvent(_onDragStart);
  const onDragEnterEvent = useEvent(_onDragEnter);
  const onDragLeaveEvent = useEvent(_onDragLeave);
  const onDragEndEvent = useEvent(_onDragEnd);
  const onDragOverEvent = useEvent(_onDragOver);
  return useRefEffect(
    (elem) => {
      if (isDisabled) {
        return;
      }
      const element = dropZoneElement !== null && dropZoneElement !== void 0 ? dropZoneElement : elem;
      let isDragging = false;
      const {
        ownerDocument
      } = element;
      function isElementInZone(targetToCheck) {
        const {
          defaultView
        } = ownerDocument;
        if (!targetToCheck || !defaultView || !(targetToCheck instanceof defaultView.HTMLElement) || !element.contains(targetToCheck)) {
          return false;
        }
        let elementToCheck = targetToCheck;
        do {
          if (elementToCheck.dataset.isDropZone) {
            return elementToCheck === element;
          }
        } while (elementToCheck = elementToCheck.parentElement);
        return false;
      }
      function maybeDragStart(event) {
        if (isDragging) {
          return;
        }
        isDragging = true;
        ownerDocument.addEventListener("dragend", maybeDragEnd);
        ownerDocument.addEventListener("mousemove", maybeDragEnd);
        if (_onDragStart) {
          onDragStartEvent(event);
        }
      }
      function onDragEnter(event) {
        event.preventDefault();
        if (element.contains(
          /** @type {Node} */
          event.relatedTarget
        )) {
          return;
        }
        if (_onDragEnter) {
          onDragEnterEvent(event);
        }
      }
      function onDragOver(event) {
        if (!event.defaultPrevented && _onDragOver) {
          onDragOverEvent(event);
        }
        event.preventDefault();
      }
      function onDragLeave(event) {
        if (isElementInZone(event.relatedTarget)) {
          return;
        }
        if (_onDragLeave) {
          onDragLeaveEvent(event);
        }
      }
      function onDrop(event) {
        if (event.defaultPrevented) {
          return;
        }
        event.preventDefault();
        event.dataTransfer && event.dataTransfer.files.length;
        if (_onDrop) {
          onDropEvent(event);
        }
        maybeDragEnd(event);
      }
      function maybeDragEnd(event) {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        ownerDocument.removeEventListener("dragend", maybeDragEnd);
        ownerDocument.removeEventListener("mousemove", maybeDragEnd);
        if (_onDragEnd) {
          onDragEndEvent(event);
        }
      }
      element.setAttribute("data-is-drop-zone", "true");
      element.addEventListener("drop", onDrop);
      element.addEventListener("dragenter", onDragEnter);
      element.addEventListener("dragover", onDragOver);
      element.addEventListener("dragleave", onDragLeave);
      ownerDocument.addEventListener("dragenter", maybeDragStart);
      return () => {
        element.removeAttribute("data-is-drop-zone");
        element.removeEventListener("drop", onDrop);
        element.removeEventListener("dragenter", onDragEnter);
        element.removeEventListener("dragover", onDragOver);
        element.removeEventListener("dragleave", onDragLeave);
        ownerDocument.removeEventListener("dragend", maybeDragEnd);
        ownerDocument.removeEventListener("mousemove", maybeDragEnd);
        ownerDocument.removeEventListener("dragenter", maybeDragStart);
      };
    },
    [isDisabled, dropZoneElement]
    // Refresh when the passed in dropZoneElement changes.
  );
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-focusable-iframe/index.js
function useFocusableIframe() {
  return useRefEffect((element) => {
    const {
      ownerDocument
    } = element;
    if (!ownerDocument) {
      return;
    }
    const {
      defaultView
    } = ownerDocument;
    if (!defaultView) {
      return;
    }
    function checkFocus() {
      if (ownerDocument && ownerDocument.activeElement === element) {
        element.focus();
      }
    }
    defaultView.addEventListener("blur", checkFocus);
    return () => {
      defaultView.removeEventListener("blur", checkFocus);
    };
  }, []);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-fixed-window-list/index.js
var DEFAULT_INIT_WINDOW_SIZE = 30;
function useFixedWindowList(elementRef, itemHeight, totalItems, options) {
  var _options$initWindowSi, _options$useWindowing;
  const initWindowSize = (_options$initWindowSi = options == null ? void 0 : options.initWindowSize) !== null && _options$initWindowSi !== void 0 ? _options$initWindowSi : DEFAULT_INIT_WINDOW_SIZE;
  const useWindowing = (_options$useWindowing = options == null ? void 0 : options.useWindowing) !== null && _options$useWindowing !== void 0 ? _options$useWindowing : true;
  const [fixedListWindow, setFixedListWindow] = (0, import_react.useState)({
    visibleItems: initWindowSize,
    start: 0,
    end: initWindowSize,
    itemInView: (index) => {
      return index >= 0 && index <= initWindowSize;
    }
  });
  (0, import_react.useLayoutEffect)(() => {
    var _a, _b, _c, _d;
    if (!useWindowing) {
      return;
    }
    const scrollContainer = getScrollContainer(elementRef.current);
    const measureWindow = (initRender) => {
      var _options$windowOversc;
      if (!scrollContainer) {
        return;
      }
      const visibleItems = Math.ceil(scrollContainer.clientHeight / itemHeight);
      const windowOverscan = initRender ? visibleItems : (_options$windowOversc = options == null ? void 0 : options.windowOverscan) !== null && _options$windowOversc !== void 0 ? _options$windowOversc : visibleItems;
      const firstViewableIndex = Math.floor(scrollContainer.scrollTop / itemHeight);
      const start = Math.max(0, firstViewableIndex - windowOverscan);
      const end = Math.min(totalItems - 1, firstViewableIndex + visibleItems + windowOverscan);
      setFixedListWindow((lastWindow) => {
        const nextWindow = {
          visibleItems,
          start,
          end,
          itemInView: (index) => {
            return start <= index && index <= end;
          }
        };
        if (lastWindow.start !== nextWindow.start || lastWindow.end !== nextWindow.end || lastWindow.visibleItems !== nextWindow.visibleItems) {
          return nextWindow;
        }
        return lastWindow;
      });
    };
    measureWindow(true);
    const debounceMeasureList = debounce(() => {
      measureWindow();
    }, 16);
    scrollContainer == null ? void 0 : scrollContainer.addEventListener("scroll", debounceMeasureList);
    (_b = (_a = scrollContainer == null ? void 0 : scrollContainer.ownerDocument) == null ? void 0 : _a.defaultView) == null ? void 0 : _b.addEventListener("resize", debounceMeasureList);
    (_d = (_c = scrollContainer == null ? void 0 : scrollContainer.ownerDocument) == null ? void 0 : _c.defaultView) == null ? void 0 : _d.addEventListener("resize", debounceMeasureList);
    return () => {
      var _a2, _b2;
      scrollContainer == null ? void 0 : scrollContainer.removeEventListener("scroll", debounceMeasureList);
      (_b2 = (_a2 = scrollContainer == null ? void 0 : scrollContainer.ownerDocument) == null ? void 0 : _a2.defaultView) == null ? void 0 : _b2.removeEventListener("resize", debounceMeasureList);
    };
  }, [itemHeight, elementRef, totalItems, options == null ? void 0 : options.expandedState, options == null ? void 0 : options.windowOverscan, useWindowing]);
  (0, import_react.useLayoutEffect)(() => {
    var _a, _b;
    if (!useWindowing) {
      return;
    }
    const scrollContainer = getScrollContainer(elementRef.current);
    const handleKeyDown = (event) => {
      switch (event.keyCode) {
        case HOME: {
          return scrollContainer == null ? void 0 : scrollContainer.scrollTo({
            top: 0
          });
        }
        case END: {
          return scrollContainer == null ? void 0 : scrollContainer.scrollTo({
            top: totalItems * itemHeight
          });
        }
        case PAGEUP: {
          return scrollContainer == null ? void 0 : scrollContainer.scrollTo({
            top: scrollContainer.scrollTop - fixedListWindow.visibleItems * itemHeight
          });
        }
        case PAGEDOWN: {
          return scrollContainer == null ? void 0 : scrollContainer.scrollTo({
            top: scrollContainer.scrollTop + fixedListWindow.visibleItems * itemHeight
          });
        }
      }
    };
    (_b = (_a = scrollContainer == null ? void 0 : scrollContainer.ownerDocument) == null ? void 0 : _a.defaultView) == null ? void 0 : _b.addEventListener("keydown", handleKeyDown);
    return () => {
      var _a2, _b2;
      (_b2 = (_a2 = scrollContainer == null ? void 0 : scrollContainer.ownerDocument) == null ? void 0 : _a2.defaultView) == null ? void 0 : _b2.removeEventListener("keydown", handleKeyDown);
    };
  }, [totalItems, itemHeight, elementRef, fixedListWindow.visibleItems, useWindowing, options == null ? void 0 : options.expandedState]);
  return [fixedListWindow, setFixedListWindow];
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-observable-value/index.js
function useObservableValue(map, name) {
  const [subscribe2, getValue] = (0, import_react.useMemo)(() => [(listener2) => map.subscribe(name, listener2), () => map.get(name)], [map, name]);
  return (0, import_react.useSyncExternalStore)(subscribe2, getValue, getValue);
}

// ../../node_modules/@wordpress/data/build-module/redux-store/combine-reducers.js
function combineReducers(reducers) {
  const keys = Object.keys(reducers);
  return function combinedReducer(state = {}, action) {
    const nextState = {};
    let hasChanged = false;
    for (const key of keys) {
      const reducer = reducers[key];
      const prevStateForKey = state[key];
      const nextStateForKey = reducer(prevStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== prevStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}

// ../../node_modules/@wordpress/data/build-module/factory.js
function createRegistrySelector(registrySelector) {
  const selectorsByRegistry = /* @__PURE__ */ new WeakMap();
  const wrappedSelector = (...args) => {
    let selector = selectorsByRegistry.get(wrappedSelector.registry);
    if (!selector) {
      selector = registrySelector(wrappedSelector.registry.select);
      selectorsByRegistry.set(wrappedSelector.registry, selector);
    }
    return selector(...args);
  };
  wrappedSelector.isRegistrySelector = true;
  return wrappedSelector;
}
function createRegistryControl(registryControl) {
  registryControl.isRegistryControl = true;
  return registryControl;
}

// ../../node_modules/@wordpress/data/build-module/controls.js
var SELECT = "@@data/SELECT";
var RESOLVE_SELECT = "@@data/RESOLVE_SELECT";
var DISPATCH = "@@data/DISPATCH";
function isObject(object) {
  return object !== null && typeof object === "object";
}
function select(storeNameOrDescriptor, selectorName, ...args) {
  return {
    type: SELECT,
    storeKey: isObject(storeNameOrDescriptor) ? storeNameOrDescriptor.name : storeNameOrDescriptor,
    selectorName,
    args
  };
}
function resolveSelect(storeNameOrDescriptor, selectorName, ...args) {
  return {
    type: RESOLVE_SELECT,
    storeKey: isObject(storeNameOrDescriptor) ? storeNameOrDescriptor.name : storeNameOrDescriptor,
    selectorName,
    args
  };
}
function dispatch(storeNameOrDescriptor, actionName, ...args) {
  return {
    type: DISPATCH,
    storeKey: isObject(storeNameOrDescriptor) ? storeNameOrDescriptor.name : storeNameOrDescriptor,
    actionName,
    args
  };
}
var controls = {
  select,
  resolveSelect,
  dispatch
};
var builtinControls = {
  [SELECT]: createRegistryControl((registry) => ({
    storeKey,
    selectorName,
    args
  }) => registry.select(storeKey)[selectorName](...args)),
  [RESOLVE_SELECT]: createRegistryControl((registry) => ({
    storeKey,
    selectorName,
    args
  }) => {
    const method = registry.select(storeKey)[selectorName].hasResolver ? "resolveSelect" : "select";
    return registry[method](storeKey)[selectorName](...args);
  }),
  [DISPATCH]: createRegistryControl((registry) => ({
    storeKey,
    actionName,
    args
  }) => registry.dispatch(storeKey)[actionName](...args))
};

// ../../node_modules/@wordpress/private-apis/build-module/implementation.js
var CORE_MODULES_USING_PRIVATE_APIS = ["@wordpress/block-directory", "@wordpress/block-editor", "@wordpress/block-library", "@wordpress/blocks", "@wordpress/commands", "@wordpress/components", "@wordpress/core-commands", "@wordpress/core-data", "@wordpress/customize-widgets", "@wordpress/data", "@wordpress/edit-post", "@wordpress/edit-site", "@wordpress/edit-widgets", "@wordpress/editor", "@wordpress/format-library", "@wordpress/patterns", "@wordpress/preferences", "@wordpress/reusable-blocks", "@wordpress/router", "@wordpress/dataviews", "@wordpress/fields", "@wordpress/media-utils", "@wordpress/upload-media"];
var registeredPrivateApis = [];
var requiredConsent = "I acknowledge private features are not for use in themes or plugins and doing so will break in the next version of WordPress.";
var allowReRegistration = globalThis.IS_WORDPRESS_CORE ? false : true;
var __dangerousOptInToUnstableAPIsOnlyForCoreModules = (consent, moduleName) => {
  if (!CORE_MODULES_USING_PRIVATE_APIS.includes(moduleName)) {
    throw new Error(`You tried to opt-in to unstable APIs as module "${moduleName}". This feature is only for JavaScript modules shipped with WordPress core. Please do not use it in plugins and themes as the unstable APIs will be removed without a warning. If you ignore this error and depend on unstable features, your product will inevitably break on one of the next WordPress releases.`);
  }
  if (!allowReRegistration && registeredPrivateApis.includes(moduleName)) {
    throw new Error(`You tried to opt-in to unstable APIs as module "${moduleName}" which is already registered. This feature is only for JavaScript modules shipped with WordPress core. Please do not use it in plugins and themes as the unstable APIs will be removed without a warning. If you ignore this error and depend on unstable features, your product will inevitably break on one of the next WordPress releases.`);
  }
  if (consent !== requiredConsent) {
    throw new Error(`You tried to opt-in to unstable APIs without confirming you know the consequences. This feature is only for JavaScript modules shipped with WordPress core. Please do not use it in plugins and themes as the unstable APIs will removed without a warning. If you ignore this error and depend on unstable features, your product will inevitably break on the next WordPress release.`);
  }
  registeredPrivateApis.push(moduleName);
  return {
    lock,
    unlock
  };
};
function lock(object, privateData) {
  if (!object) {
    throw new Error("Cannot lock an undefined object.");
  }
  const _object = object;
  if (!(__private in _object)) {
    _object[__private] = {};
  }
  lockedData.set(_object[__private], privateData);
}
function unlock(object) {
  if (!object) {
    throw new Error("Cannot unlock an undefined object.");
  }
  const _object = object;
  if (!(__private in _object)) {
    throw new Error("Cannot unlock an object that was not locked before. ");
  }
  return lockedData.get(_object[__private]);
}
var lockedData = /* @__PURE__ */ new WeakMap();
var __private = Symbol("Private API ID");

// ../../node_modules/@wordpress/data/build-module/lock-unlock.js
var {
  lock: lock2,
  unlock: unlock2
} = __dangerousOptInToUnstableAPIsOnlyForCoreModules("I acknowledge private features are not for use in themes or plugins and doing so will break in the next version of WordPress.", "@wordpress/data");

// ../../node_modules/@wordpress/data/build-module/promise-middleware.js
var promiseMiddleware = () => (next) => (action) => {
  if (isPromise(action)) {
    return action.then((resolvedAction) => {
      if (resolvedAction) {
        return next(resolvedAction);
      }
    });
  }
  return next(action);
};
var promise_middleware_default = promiseMiddleware;

// ../../node_modules/@wordpress/data/build-module/resolvers-cache-middleware.js
var createResolversCacheMiddleware = (registry, storeName) => () => (next) => (action) => {
  const resolvers = registry.select(storeName).getCachedResolvers();
  const resolverEntries = Object.entries(resolvers);
  resolverEntries.forEach(([selectorName, resolversByArgs]) => {
    var _a, _b;
    const resolver = (_b = (_a = registry.stores[storeName]) == null ? void 0 : _a.resolvers) == null ? void 0 : _b[selectorName];
    if (!resolver || !resolver.shouldInvalidate) {
      return;
    }
    resolversByArgs.forEach((value, args) => {
      if (value === void 0) {
        return;
      }
      if (value.status !== "finished" && value.status !== "error") {
        return;
      }
      if (!resolver.shouldInvalidate(action, ...args)) {
        return;
      }
      registry.dispatch(storeName).invalidateResolution(selectorName, args);
    });
  });
  return next(action);
};
var resolvers_cache_middleware_default = createResolversCacheMiddleware;

// ../../node_modules/@wordpress/data/build-module/redux-store/thunk-middleware.js
function createThunkMiddleware(args) {
  return () => (next) => (action) => {
    if (typeof action === "function") {
      return action(args);
    }
    return next(action);
  };
}

// ../../node_modules/@wordpress/data/build-module/redux-store/metadata/reducer.js
var import_equivalent_key_map = __toESM(require_equivalent_key_map());

// ../../node_modules/@wordpress/data/build-module/redux-store/metadata/utils.js
var onSubKey = (actionProperty) => (reducer) => (state = {}, action) => {
  const key = action[actionProperty];
  if (key === void 0) {
    return state;
  }
  const nextKeyState = reducer(state[key], action);
  if (nextKeyState === state[key]) {
    return state;
  }
  return {
    ...state,
    [key]: nextKeyState
  };
};
function selectorArgsToStateKey(args) {
  if (args === void 0 || args === null) {
    return [];
  }
  const len = args.length;
  let idx = len;
  while (idx > 0 && args[idx - 1] === void 0) {
    idx--;
  }
  return idx === len ? args : args.slice(0, idx);
}

// ../../node_modules/@wordpress/data/build-module/redux-store/metadata/reducer.js
var subKeysIsResolved = onSubKey("selectorName")((state = new import_equivalent_key_map.default(), action) => {
  switch (action.type) {
    case "START_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.set(selectorArgsToStateKey(action.args), {
        status: "resolving"
      });
      return nextState;
    }
    case "FINISH_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.set(selectorArgsToStateKey(action.args), {
        status: "finished"
      });
      return nextState;
    }
    case "FAIL_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.set(selectorArgsToStateKey(action.args), {
        status: "error",
        error: action.error
      });
      return nextState;
    }
    case "START_RESOLUTIONS": {
      const nextState = new import_equivalent_key_map.default(state);
      for (const resolutionArgs of action.args) {
        nextState.set(selectorArgsToStateKey(resolutionArgs), {
          status: "resolving"
        });
      }
      return nextState;
    }
    case "FINISH_RESOLUTIONS": {
      const nextState = new import_equivalent_key_map.default(state);
      for (const resolutionArgs of action.args) {
        nextState.set(selectorArgsToStateKey(resolutionArgs), {
          status: "finished"
        });
      }
      return nextState;
    }
    case "FAIL_RESOLUTIONS": {
      const nextState = new import_equivalent_key_map.default(state);
      action.args.forEach((resolutionArgs, idx) => {
        const resolutionState = {
          status: "error",
          error: void 0
        };
        const error = action.errors[idx];
        if (error) {
          resolutionState.error = error;
        }
        nextState.set(selectorArgsToStateKey(resolutionArgs), resolutionState);
      });
      return nextState;
    }
    case "INVALIDATE_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.delete(selectorArgsToStateKey(action.args));
      return nextState;
    }
  }
  return state;
});
var isResolved = (state = {}, action) => {
  switch (action.type) {
    case "INVALIDATE_RESOLUTION_FOR_STORE":
      return {};
    case "INVALIDATE_RESOLUTION_FOR_STORE_SELECTOR": {
      if (action.selectorName in state) {
        const {
          [action.selectorName]: removedSelector,
          ...restState
        } = state;
        return restState;
      }
      return state;
    }
    case "START_RESOLUTION":
    case "FINISH_RESOLUTION":
    case "FAIL_RESOLUTION":
    case "START_RESOLUTIONS":
    case "FINISH_RESOLUTIONS":
    case "FAIL_RESOLUTIONS":
    case "INVALIDATE_RESOLUTION":
      return subKeysIsResolved(state, action);
  }
  return state;
};
var reducer_default = isResolved;

// ../../node_modules/@wordpress/data/build-module/redux-store/metadata/selectors.js
var selectors_exports = {};
__export(selectors_exports, {
  countSelectorsByStatus: () => countSelectorsByStatus,
  getCachedResolvers: () => getCachedResolvers,
  getIsResolving: () => getIsResolving,
  getResolutionError: () => getResolutionError,
  getResolutionState: () => getResolutionState,
  hasFinishedResolution: () => hasFinishedResolution,
  hasResolutionFailed: () => hasResolutionFailed,
  hasResolvingSelectors: () => hasResolvingSelectors,
  hasStartedResolution: () => hasStartedResolution,
  isResolving: () => isResolving
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
function isShallowEqual2(a, b, fromIndex) {
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
      if (cache.lastDependants && !isShallowEqual2(dependants, cache.lastDependants, 0)) {
        cache.clear();
      }
      cache.lastDependants = dependants;
    }
    node = cache.head;
    while (node) {
      if (!isShallowEqual2(node.args, args, 1)) {
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

// ../../node_modules/@wordpress/data/build-module/redux-store/metadata/selectors.js
function getResolutionState(state, selectorName, args) {
  const map = state[selectorName];
  if (!map) {
    return;
  }
  return map.get(selectorArgsToStateKey(args));
}
function getIsResolving(state, selectorName, args) {
  deprecated("wp.data.select( store ).getIsResolving", {
    since: "6.6",
    version: "6.8",
    alternative: "wp.data.select( store ).getResolutionState"
  });
  const resolutionState = getResolutionState(state, selectorName, args);
  return resolutionState && resolutionState.status === "resolving";
}
function hasStartedResolution(state, selectorName, args) {
  return getResolutionState(state, selectorName, args) !== void 0;
}
function hasFinishedResolution(state, selectorName, args) {
  var _a;
  const status = (_a = getResolutionState(state, selectorName, args)) == null ? void 0 : _a.status;
  return status === "finished" || status === "error";
}
function hasResolutionFailed(state, selectorName, args) {
  var _a;
  return ((_a = getResolutionState(state, selectorName, args)) == null ? void 0 : _a.status) === "error";
}
function getResolutionError(state, selectorName, args) {
  const resolutionState = getResolutionState(state, selectorName, args);
  return (resolutionState == null ? void 0 : resolutionState.status) === "error" ? resolutionState.error : null;
}
function isResolving(state, selectorName, args) {
  var _a;
  return ((_a = getResolutionState(state, selectorName, args)) == null ? void 0 : _a.status) === "resolving";
}
function getCachedResolvers(state) {
  return state;
}
function hasResolvingSelectors(state) {
  return Object.values(state).some((selectorState) => (
    /**
     * This uses the internal `_map` property of `EquivalentKeyMap` for
     * optimization purposes, since the `EquivalentKeyMap` implementation
     * does not support a `.values()` implementation.
     *
     * @see https://github.com/aduth/equivalent-key-map
     */
    Array.from(selectorState._map.values()).some((resolution) => {
      var _a;
      return ((_a = resolution[1]) == null ? void 0 : _a.status) === "resolving";
    })
  ));
}
var countSelectorsByStatus = rememo_default((state) => {
  const selectorsByStatus = {};
  Object.values(state).forEach((selectorState) => (
    /**
     * This uses the internal `_map` property of `EquivalentKeyMap` for
     * optimization purposes, since the `EquivalentKeyMap` implementation
     * does not support a `.values()` implementation.
     *
     * @see https://github.com/aduth/equivalent-key-map
     */
    Array.from(selectorState._map.values()).forEach((resolution) => {
      var _a;
      var _resolution$1$status;
      const currentStatus = (_resolution$1$status = (_a = resolution[1]) == null ? void 0 : _a.status) !== null && _resolution$1$status !== void 0 ? _resolution$1$status : "error";
      if (!selectorsByStatus[currentStatus]) {
        selectorsByStatus[currentStatus] = 0;
      }
      selectorsByStatus[currentStatus]++;
    })
  ));
  return selectorsByStatus;
}, (state) => [state]);

// ../../node_modules/@wordpress/data/build-module/redux-store/metadata/actions.js
var actions_exports = {};
__export(actions_exports, {
  failResolution: () => failResolution,
  failResolutions: () => failResolutions,
  finishResolution: () => finishResolution,
  finishResolutions: () => finishResolutions,
  invalidateResolution: () => invalidateResolution,
  invalidateResolutionForStore: () => invalidateResolutionForStore,
  invalidateResolutionForStoreSelector: () => invalidateResolutionForStoreSelector,
  startResolution: () => startResolution,
  startResolutions: () => startResolutions
});
function startResolution(selectorName, args) {
  return {
    type: "START_RESOLUTION",
    selectorName,
    args
  };
}
function finishResolution(selectorName, args) {
  return {
    type: "FINISH_RESOLUTION",
    selectorName,
    args
  };
}
function failResolution(selectorName, args, error) {
  return {
    type: "FAIL_RESOLUTION",
    selectorName,
    args,
    error
  };
}
function startResolutions(selectorName, args) {
  return {
    type: "START_RESOLUTIONS",
    selectorName,
    args
  };
}
function finishResolutions(selectorName, args) {
  return {
    type: "FINISH_RESOLUTIONS",
    selectorName,
    args
  };
}
function failResolutions(selectorName, args, errors) {
  return {
    type: "FAIL_RESOLUTIONS",
    selectorName,
    args,
    errors
  };
}
function invalidateResolution(selectorName, args) {
  return {
    type: "INVALIDATE_RESOLUTION",
    selectorName,
    args
  };
}
function invalidateResolutionForStore() {
  return {
    type: "INVALIDATE_RESOLUTION_FOR_STORE"
  };
}
function invalidateResolutionForStoreSelector(selectorName) {
  return {
    type: "INVALIDATE_RESOLUTION_FOR_STORE_SELECTOR",
    selectorName
  };
}

// ../../node_modules/@wordpress/data/build-module/redux-store/index.js
var trimUndefinedValues = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] === void 0) {
      result.splice(i, 1);
    }
  }
  return result;
};
var mapValues2 = (obj, callback) => Object.fromEntries(Object.entries(obj !== null && obj !== void 0 ? obj : {}).map(([key, value]) => [key, callback(value, key)]));
var devToolsReplacer = (key, state) => {
  if (state instanceof Map) {
    return Object.fromEntries(state);
  }
  if (state instanceof window.HTMLElement) {
    return null;
  }
  return state;
};
function createResolversCache() {
  const cache = {};
  return {
    isRunning(selectorName, args) {
      return cache[selectorName] && cache[selectorName].get(trimUndefinedValues(args));
    },
    clear(selectorName, args) {
      if (cache[selectorName]) {
        cache[selectorName].delete(trimUndefinedValues(args));
      }
    },
    markAsRunning(selectorName, args) {
      if (!cache[selectorName]) {
        cache[selectorName] = new import_equivalent_key_map2.default();
      }
      cache[selectorName].set(trimUndefinedValues(args), true);
    }
  };
}
function createBindingCache(getItem, bindItem) {
  const cache = /* @__PURE__ */ new WeakMap();
  return {
    get(itemName) {
      const item = getItem(itemName);
      if (!item) {
        return null;
      }
      let boundItem = cache.get(item);
      if (!boundItem) {
        boundItem = bindItem(item, itemName);
        cache.set(item, boundItem);
      }
      return boundItem;
    }
  };
}
function createPrivateProxy(publicItems, privateItems) {
  return new Proxy(publicItems, {
    get: (target, itemName) => privateItems.get(itemName) || Reflect.get(target, itemName)
  });
}
function createReduxStore(key, options) {
  const privateActions = {};
  const privateSelectors = {};
  const privateRegistrationFunctions = {
    privateActions,
    registerPrivateActions: (actions) => {
      Object.assign(privateActions, actions);
    },
    privateSelectors,
    registerPrivateSelectors: (selectors) => {
      Object.assign(privateSelectors, selectors);
    }
  };
  const storeDescriptor = {
    name: key,
    instantiate: (registry) => {
      const listeners = /* @__PURE__ */ new Set();
      const reducer = options.reducer;
      const thunkArgs = {
        registry,
        get dispatch() {
          return thunkDispatch;
        },
        get select() {
          return thunkSelect;
        },
        get resolveSelect() {
          return resolveSelectors;
        }
      };
      const store = instantiateReduxStore(key, options, registry, thunkArgs);
      lock2(store, privateRegistrationFunctions);
      const resolversCache = createResolversCache();
      function bindAction(action) {
        return (...args) => Promise.resolve(store.dispatch(action(...args)));
      }
      const actions = {
        ...mapValues2(actions_exports, bindAction),
        ...mapValues2(options.actions, bindAction)
      };
      const allActions = createPrivateProxy(actions, createBindingCache((name) => privateActions[name], bindAction));
      const thunkDispatch = new Proxy((action) => store.dispatch(action), {
        get: (target, name) => allActions[name]
      });
      lock2(actions, allActions);
      const resolvers = options.resolvers ? mapValues2(options.resolvers, mapResolver) : {};
      function bindSelector(selector, selectorName) {
        if (selector.isRegistrySelector) {
          selector.registry = registry;
        }
        const boundSelector = (...args) => {
          args = normalize(selector, args);
          const state = store.__unstableOriginalGetState();
          if (selector.isRegistrySelector) {
            selector.registry = registry;
          }
          return selector(state.root, ...args);
        };
        boundSelector.__unstableNormalizeArgs = selector.__unstableNormalizeArgs;
        const resolver = resolvers[selectorName];
        if (!resolver) {
          boundSelector.hasResolver = false;
          return boundSelector;
        }
        return mapSelectorWithResolver(boundSelector, selectorName, resolver, store, resolversCache, boundMetadataSelectors);
      }
      function bindMetadataSelector(metaDataSelector) {
        const boundSelector = (selectorName, selectorArgs, ...args) => {
          var _a;
          if (selectorName) {
            const targetSelector = (_a = options.selectors) == null ? void 0 : _a[selectorName];
            if (targetSelector) {
              selectorArgs = normalize(targetSelector, selectorArgs);
            }
          }
          const state = store.__unstableOriginalGetState();
          return metaDataSelector(state.metadata, selectorName, selectorArgs, ...args);
        };
        boundSelector.hasResolver = false;
        return boundSelector;
      }
      const boundMetadataSelectors = mapValues2(selectors_exports, bindMetadataSelector);
      const boundSelectors = mapValues2(options.selectors, bindSelector);
      const selectors = {
        ...boundMetadataSelectors,
        ...boundSelectors
      };
      const boundPrivateSelectors = createBindingCache((name) => privateSelectors[name], bindSelector);
      const allSelectors = createPrivateProxy(selectors, boundPrivateSelectors);
      for (const selectorName of Object.keys(privateSelectors)) {
        boundPrivateSelectors.get(selectorName);
      }
      const thunkSelect = new Proxy((selector) => selector(store.__unstableOriginalGetState()), {
        get: (target, name) => allSelectors[name]
      });
      lock2(selectors, allSelectors);
      const bindResolveSelector = mapResolveSelector(store, boundMetadataSelectors);
      const resolveSelectors = mapValues2(boundSelectors, bindResolveSelector);
      const allResolveSelectors = createPrivateProxy(resolveSelectors, createBindingCache((name) => boundPrivateSelectors.get(name), bindResolveSelector));
      lock2(resolveSelectors, allResolveSelectors);
      const bindSuspendSelector = mapSuspendSelector(store, boundMetadataSelectors);
      const suspendSelectors = {
        ...boundMetadataSelectors,
        // no special suspense behavior
        ...mapValues2(boundSelectors, bindSuspendSelector)
      };
      const allSuspendSelectors = createPrivateProxy(suspendSelectors, createBindingCache((name) => boundPrivateSelectors.get(name), bindSuspendSelector));
      lock2(suspendSelectors, allSuspendSelectors);
      const getSelectors = () => selectors;
      const getActions = () => actions;
      const getResolveSelectors = () => resolveSelectors;
      const getSuspendSelectors = () => suspendSelectors;
      store.__unstableOriginalGetState = store.getState;
      store.getState = () => store.__unstableOriginalGetState().root;
      const subscribe2 = store && ((listener2) => {
        listeners.add(listener2);
        return () => listeners.delete(listener2);
      });
      let lastState = store.__unstableOriginalGetState();
      store.subscribe(() => {
        const state = store.__unstableOriginalGetState();
        const hasChanged = state !== lastState;
        lastState = state;
        if (hasChanged) {
          for (const listener2 of listeners) {
            listener2();
          }
        }
      });
      return {
        reducer,
        store,
        actions,
        selectors,
        resolvers,
        getSelectors,
        getResolveSelectors,
        getSuspendSelectors,
        getActions,
        subscribe: subscribe2
      };
    }
  };
  lock2(storeDescriptor, privateRegistrationFunctions);
  return storeDescriptor;
}
function instantiateReduxStore(key, options, registry, thunkArgs) {
  const controls2 = {
    ...options.controls,
    ...builtinControls
  };
  const normalizedControls = mapValues2(controls2, (control) => control.isRegistryControl ? control(registry) : control);
  const middlewares = [resolvers_cache_middleware_default(registry, key), promise_middleware_default, createMiddleware(normalizedControls), createThunkMiddleware(thunkArgs)];
  const enhancers = [applyMiddleware(...middlewares)];
  if (typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__) {
    enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__({
      name: key,
      instanceId: key,
      serialize: {
        replacer: devToolsReplacer
      }
    }));
  }
  const {
    reducer,
    initialState
  } = options;
  const enhancedReducer = combineReducers({
    metadata: reducer_default,
    root: reducer
  });
  return createStore(enhancedReducer, {
    root: initialState
  }, compose_default(enhancers));
}
function mapResolveSelector(store, boundMetadataSelectors) {
  return (selector, selectorName) => {
    if (!selector.hasResolver) {
      return async (...args) => selector.apply(null, args);
    }
    return (...args) => new Promise((resolve, reject) => {
      const hasFinished = () => {
        return boundMetadataSelectors.hasFinishedResolution(selectorName, args);
      };
      const finalize = (result2) => {
        const hasFailed = boundMetadataSelectors.hasResolutionFailed(selectorName, args);
        if (hasFailed) {
          const error = boundMetadataSelectors.getResolutionError(selectorName, args);
          reject(error);
        } else {
          resolve(result2);
        }
      };
      const getResult = () => selector.apply(null, args);
      const result = getResult();
      if (hasFinished()) {
        return finalize(result);
      }
      const unsubscribe = store.subscribe(() => {
        if (hasFinished()) {
          unsubscribe();
          finalize(getResult());
        }
      });
    });
  };
}
function mapSuspendSelector(store, boundMetadataSelectors) {
  return (selector, selectorName) => {
    if (!selector.hasResolver) {
      return selector;
    }
    return (...args) => {
      const result = selector.apply(null, args);
      if (boundMetadataSelectors.hasFinishedResolution(selectorName, args)) {
        if (boundMetadataSelectors.hasResolutionFailed(selectorName, args)) {
          throw boundMetadataSelectors.getResolutionError(selectorName, args);
        }
        return result;
      }
      throw new Promise((resolve) => {
        const unsubscribe = store.subscribe(() => {
          if (boundMetadataSelectors.hasFinishedResolution(selectorName, args)) {
            resolve();
            unsubscribe();
          }
        });
      });
    };
  };
}
function mapResolver(resolver) {
  if (resolver.fulfill) {
    return resolver;
  }
  return {
    ...resolver,
    // Copy the enumerable properties of the resolver function.
    fulfill: resolver
    // Add the fulfill method.
  };
}
function mapSelectorWithResolver(selector, selectorName, resolver, store, resolversCache, boundMetadataSelectors) {
  function fulfillSelector(args) {
    const state = store.getState();
    if (resolversCache.isRunning(selectorName, args) || typeof resolver.isFulfilled === "function" && resolver.isFulfilled(state, ...args)) {
      return;
    }
    if (boundMetadataSelectors.hasStartedResolution(selectorName, args)) {
      return;
    }
    resolversCache.markAsRunning(selectorName, args);
    setTimeout(async () => {
      resolversCache.clear(selectorName, args);
      store.dispatch(startResolution(selectorName, args));
      try {
        const action = resolver.fulfill(...args);
        if (action) {
          await store.dispatch(action);
        }
        store.dispatch(finishResolution(selectorName, args));
      } catch (error) {
        store.dispatch(failResolution(selectorName, args, error));
      }
    }, 0);
  }
  const selectorResolver = (...args) => {
    args = normalize(selector, args);
    fulfillSelector(args);
    return selector(...args);
  };
  selectorResolver.hasResolver = true;
  return selectorResolver;
}
function normalize(selector, args) {
  if (selector.__unstableNormalizeArgs && typeof selector.__unstableNormalizeArgs === "function" && (args == null ? void 0 : args.length)) {
    return selector.__unstableNormalizeArgs(args);
  }
  return args;
}

// ../../node_modules/@wordpress/data/build-module/store/index.js
var coreDataStore = {
  name: "core/data",
  instantiate(registry) {
    const getCoreDataSelector = (selectorName) => (key, ...args) => {
      return registry.select(key)[selectorName](...args);
    };
    const getCoreDataAction = (actionName) => (key, ...args) => {
      return registry.dispatch(key)[actionName](...args);
    };
    return {
      getSelectors() {
        return Object.fromEntries(["getIsResolving", "hasStartedResolution", "hasFinishedResolution", "isResolving", "getCachedResolvers"].map((selectorName) => [selectorName, getCoreDataSelector(selectorName)]));
      },
      getActions() {
        return Object.fromEntries(["startResolution", "finishResolution", "invalidateResolution", "invalidateResolutionForStore", "invalidateResolutionForStoreSelector"].map((actionName) => [actionName, getCoreDataAction(actionName)]));
      },
      subscribe() {
        return () => () => {
        };
      }
    };
  }
};
var store_default = coreDataStore;

// ../../node_modules/@wordpress/data/build-module/utils/emitter.js
function createEmitter() {
  let isPaused = false;
  let isPending = false;
  const listeners = /* @__PURE__ */ new Set();
  const notifyListeners = () => (
    // We use Array.from to clone the listeners Set
    // This ensures that we don't run a listener
    // that was added as a response to another listener.
    Array.from(listeners).forEach((listener2) => listener2())
  );
  return {
    get isPaused() {
      return isPaused;
    },
    subscribe(listener2) {
      listeners.add(listener2);
      return () => listeners.delete(listener2);
    },
    pause() {
      isPaused = true;
    },
    resume() {
      isPaused = false;
      if (isPending) {
        isPending = false;
        notifyListeners();
      }
    },
    emit() {
      if (isPaused) {
        isPending = true;
        return;
      }
      notifyListeners();
    }
  };
}

// ../../node_modules/@wordpress/data/build-module/registry.js
function getStoreName(storeNameOrDescriptor) {
  return typeof storeNameOrDescriptor === "string" ? storeNameOrDescriptor : storeNameOrDescriptor.name;
}
function createRegistry(storeConfigs = {}, parent = null) {
  const stores = {};
  const emitter = createEmitter();
  let listeningStores = null;
  function globalListener() {
    emitter.emit();
  }
  const subscribe2 = (listener2, storeNameOrDescriptor) => {
    if (!storeNameOrDescriptor) {
      return emitter.subscribe(listener2);
    }
    const storeName = getStoreName(storeNameOrDescriptor);
    const store = stores[storeName];
    if (store) {
      return store.subscribe(listener2);
    }
    if (!parent) {
      return emitter.subscribe(listener2);
    }
    return parent.subscribe(listener2, storeNameOrDescriptor);
  };
  function select3(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    listeningStores == null ? void 0 : listeningStores.add(storeName);
    const store = stores[storeName];
    if (store) {
      return store.getSelectors();
    }
    return parent == null ? void 0 : parent.select(storeName);
  }
  function __unstableMarkListeningStores(callback, ref) {
    listeningStores = /* @__PURE__ */ new Set();
    try {
      return callback.call(this);
    } finally {
      ref.current = Array.from(listeningStores);
      listeningStores = null;
    }
  }
  function resolveSelect3(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    listeningStores == null ? void 0 : listeningStores.add(storeName);
    const store = stores[storeName];
    if (store) {
      return store.getResolveSelectors();
    }
    return parent && parent.resolveSelect(storeName);
  }
  function suspendSelect2(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    listeningStores == null ? void 0 : listeningStores.add(storeName);
    const store = stores[storeName];
    if (store) {
      return store.getSuspendSelectors();
    }
    return parent && parent.suspendSelect(storeName);
  }
  function dispatch3(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    const store = stores[storeName];
    if (store) {
      return store.getActions();
    }
    return parent && parent.dispatch(storeName);
  }
  function withPlugins(attributes) {
    return Object.fromEntries(Object.entries(attributes).map(([key, attribute]) => {
      if (typeof attribute !== "function") {
        return [key, attribute];
      }
      return [key, function() {
        return registry[key].apply(null, arguments);
      }];
    }));
  }
  function registerStoreInstance(name, createStore2) {
    if (stores[name]) {
      console.error('Store "' + name + '" is already registered.');
      return stores[name];
    }
    const store = createStore2();
    if (typeof store.getSelectors !== "function") {
      throw new TypeError("store.getSelectors must be a function");
    }
    if (typeof store.getActions !== "function") {
      throw new TypeError("store.getActions must be a function");
    }
    if (typeof store.subscribe !== "function") {
      throw new TypeError("store.subscribe must be a function");
    }
    store.emitter = createEmitter();
    const currentSubscribe = store.subscribe;
    store.subscribe = (listener2) => {
      const unsubscribeFromEmitter = store.emitter.subscribe(listener2);
      const unsubscribeFromStore = currentSubscribe(() => {
        if (store.emitter.isPaused) {
          store.emitter.emit();
          return;
        }
        listener2();
      });
      return () => {
        unsubscribeFromStore == null ? void 0 : unsubscribeFromStore();
        unsubscribeFromEmitter == null ? void 0 : unsubscribeFromEmitter();
      };
    };
    stores[name] = store;
    store.subscribe(globalListener);
    if (parent) {
      try {
        unlock2(store.store).registerPrivateActions(unlock2(parent).privateActionsOf(name));
        unlock2(store.store).registerPrivateSelectors(unlock2(parent).privateSelectorsOf(name));
      } catch (e) {
      }
    }
    return store;
  }
  function register2(store) {
    registerStoreInstance(store.name, () => store.instantiate(registry));
  }
  function registerGenericStore2(name, store) {
    deprecated("wp.data.registerGenericStore", {
      since: "5.9",
      alternative: "wp.data.register( storeDescriptor )"
    });
    registerStoreInstance(name, () => store);
  }
  function registerStore2(storeName, options) {
    if (!options.reducer) {
      throw new TypeError("Must specify store reducer");
    }
    const store = registerStoreInstance(storeName, () => createReduxStore(storeName, options).instantiate(registry));
    return store.store;
  }
  function batch(callback) {
    if (emitter.isPaused) {
      callback();
      return;
    }
    emitter.pause();
    Object.values(stores).forEach((store) => store.emitter.pause());
    try {
      callback();
    } finally {
      emitter.resume();
      Object.values(stores).forEach((store) => store.emitter.resume());
    }
  }
  let registry = {
    batch,
    stores,
    namespaces: stores,
    // TODO: Deprecate/remove this.
    subscribe: subscribe2,
    select: select3,
    resolveSelect: resolveSelect3,
    suspendSelect: suspendSelect2,
    dispatch: dispatch3,
    use: use2,
    register: register2,
    registerGenericStore: registerGenericStore2,
    registerStore: registerStore2,
    __unstableMarkListeningStores
  };
  function use2(plugin, options) {
    if (!plugin) {
      return;
    }
    registry = {
      ...registry,
      ...plugin(registry, options)
    };
    return registry;
  }
  registry.register(store_default);
  for (const [name, config] of Object.entries(storeConfigs)) {
    registry.register(createReduxStore(name, config));
  }
  if (parent) {
    parent.subscribe(globalListener);
  }
  const registryWithPlugins = withPlugins(registry);
  lock2(registryWithPlugins, {
    privateActionsOf: (name) => {
      try {
        return unlock2(stores[name].store).privateActions;
      } catch (e) {
        return {};
      }
    },
    privateSelectorsOf: (name) => {
      try {
        return unlock2(stores[name].store).privateSelectors;
      } catch (e) {
        return {};
      }
    }
  });
  return registryWithPlugins;
}

// ../../node_modules/@wordpress/data/build-module/default-registry.js
var default_registry_default = createRegistry();

// ../../node_modules/@wordpress/data/build-module/plugins/index.js
var plugins_exports = {};
__export(plugins_exports, {
  persistence: () => persistence_default
});

// ../../node_modules/@wordpress/data/build-module/plugins/persistence/index.js
var import_deepmerge = __toESM(require_cjs());

// ../../node_modules/@wordpress/data/build-module/plugins/persistence/storage/object.js
var objectStorage;
var storage = {
  getItem(key) {
    if (!objectStorage || !objectStorage[key]) {
      return null;
    }
    return objectStorage[key];
  },
  setItem(key, value) {
    if (!objectStorage) {
      storage.clear();
    }
    objectStorage[key] = String(value);
  },
  clear() {
    objectStorage = /* @__PURE__ */ Object.create(null);
  }
};
var object_default = storage;

// ../../node_modules/@wordpress/data/build-module/plugins/persistence/storage/default.js
var storage2;
try {
  storage2 = window.localStorage;
  storage2.setItem("__wpDataTestLocalStorage", "");
  storage2.removeItem("__wpDataTestLocalStorage");
} catch (error) {
  storage2 = object_default;
}
var default_default = storage2;

// ../../node_modules/@wordpress/data/build-module/plugins/persistence/index.js
var DEFAULT_STORAGE = default_default;
var DEFAULT_STORAGE_KEY = "WP_DATA";
var withLazySameState = (reducer) => (state, action) => {
  if (action.nextState === state) {
    return state;
  }
  return reducer(state, action);
};
function createPersistenceInterface(options) {
  const {
    storage: storage3 = DEFAULT_STORAGE,
    storageKey = DEFAULT_STORAGE_KEY
  } = options;
  let data;
  function getData() {
    if (data === void 0) {
      const persisted = storage3.getItem(storageKey);
      if (persisted === null) {
        data = {};
      } else {
        try {
          data = JSON.parse(persisted);
        } catch (error) {
          data = {};
        }
      }
    }
    return data;
  }
  function setData(key, value) {
    data = {
      ...data,
      [key]: value
    };
    storage3.setItem(storageKey, JSON.stringify(data));
  }
  return {
    get: getData,
    set: setData
  };
}
function persistencePlugin(registry, pluginOptions) {
  const persistence = createPersistenceInterface(pluginOptions);
  function createPersistOnChange(getState, storeName, keys) {
    let getPersistedState;
    if (Array.isArray(keys)) {
      const reducers = keys.reduce((accumulator, key) => Object.assign(accumulator, {
        [key]: (state, action) => action.nextState[key]
      }), {});
      getPersistedState = withLazySameState(combineReducers2(reducers));
    } else {
      getPersistedState = (state, action) => action.nextState;
    }
    let lastState = getPersistedState(void 0, {
      nextState: getState()
    });
    return () => {
      const state = getPersistedState(lastState, {
        nextState: getState()
      });
      if (state !== lastState) {
        persistence.set(storeName, state);
        lastState = state;
      }
    };
  }
  return {
    registerStore(storeName, options) {
      if (!options.persist) {
        return registry.registerStore(storeName, options);
      }
      const persistedState = persistence.get()[storeName];
      if (persistedState !== void 0) {
        let initialState = options.reducer(options.initialState, {
          type: "@@WP/PERSISTENCE_RESTORE"
        });
        if (isPlainObject(initialState) && isPlainObject(persistedState)) {
          initialState = (0, import_deepmerge.default)(initialState, persistedState, {
            isMergeableObject: isPlainObject
          });
        } else {
          initialState = persistedState;
        }
        options = {
          ...options,
          initialState
        };
      }
      const store = registry.registerStore(storeName, options);
      store.subscribe(createPersistOnChange(store.getState, storeName, options.persist));
      return store;
    }
  };
}
persistencePlugin.__unstableMigrate = () => {
};
var persistence_default = persistencePlugin;

// ../../node_modules/@wordpress/data/build-module/components/registry-provider/context.js
var Context2 = (0, import_react.createContext)(default_registry_default);
Context2.displayName = "RegistryProviderContext";
var {
  Consumer: Consumer2,
  Provider: Provider2
} = Context2;
var RegistryConsumer = Consumer2;
var context_default = Provider2;

// ../../node_modules/@wordpress/data/build-module/components/registry-provider/use-registry.js
function useRegistry() {
  return (0, import_react.useContext)(Context2);
}

// ../../node_modules/@wordpress/data/build-module/components/async-mode-provider/context.js
var Context3 = (0, import_react.createContext)(false);
Context3.displayName = "AsyncModeContext";
var {
  Consumer: Consumer3,
  Provider: Provider3
} = Context3;
var context_default2 = Provider3;

// ../../node_modules/@wordpress/data/build-module/components/async-mode-provider/use-async-mode.js
function useAsyncMode() {
  return (0, import_react.useContext)(Context3);
}

// ../../node_modules/@wordpress/data/build-module/components/use-select/index.js
var renderQueue = createQueue();
function warnOnUnstableReference(a, b) {
  if (!a || !b) {
    return;
  }
  const keys = typeof a === "object" && typeof b === "object" ? Object.keys(a).filter((k) => a[k] !== b[k]) : [];
  console.warn("The `useSelect` hook returns different values when called with the same state and parameters.\nThis can lead to unnecessary re-renders and performance issues if not fixed.\n\nNon-equal value keys: %s\n\n", keys.join(", "));
}
function Store(registry, suspense) {
  const select3 = suspense ? registry.suspendSelect : registry.select;
  const queueContext = {};
  let lastMapSelect;
  let lastMapResult;
  let lastMapResultValid = false;
  let lastIsAsync;
  let subscriber;
  let didWarnUnstableReference;
  const storeStatesOnMount = /* @__PURE__ */ new Map();
  function getStoreState(name) {
    var _a, _b, _c;
    var _registry$stores$name;
    return (_registry$stores$name = (_c = (_b = (_a = registry.stores[name]) == null ? void 0 : _a.store) == null ? void 0 : _b.getState) == null ? void 0 : _c.call(_b)) !== null && _registry$stores$name !== void 0 ? _registry$stores$name : {};
  }
  const createSubscriber = (stores) => {
    const activeStores = [...stores];
    const activeSubscriptions = /* @__PURE__ */ new Set();
    function subscribe2(listener2) {
      if (lastMapResultValid) {
        for (const name of activeStores) {
          if (storeStatesOnMount.get(name) !== getStoreState(name)) {
            lastMapResultValid = false;
          }
        }
      }
      storeStatesOnMount.clear();
      const onStoreChange = () => {
        lastMapResultValid = false;
        listener2();
      };
      const onChange = () => {
        if (lastIsAsync) {
          renderQueue.add(queueContext, onStoreChange);
        } else {
          onStoreChange();
        }
      };
      const unsubs = [];
      function subscribeStore(storeName) {
        unsubs.push(registry.subscribe(onChange, storeName));
      }
      for (const storeName of activeStores) {
        subscribeStore(storeName);
      }
      activeSubscriptions.add(subscribeStore);
      return () => {
        activeSubscriptions.delete(subscribeStore);
        for (const unsub of unsubs.values()) {
          unsub == null ? void 0 : unsub();
        }
        renderQueue.cancel(queueContext);
      };
    }
    function updateStores(newStores) {
      for (const newStore of newStores) {
        if (activeStores.includes(newStore)) {
          continue;
        }
        activeStores.push(newStore);
        for (const subscription of activeSubscriptions) {
          subscription(newStore);
        }
      }
    }
    return {
      subscribe: subscribe2,
      updateStores
    };
  };
  return (mapSelect, isAsync) => {
    function updateValue() {
      if (lastMapResultValid && mapSelect === lastMapSelect) {
        return lastMapResult;
      }
      const listeningStores = {
        current: null
      };
      const mapResult = registry.__unstableMarkListeningStores(() => mapSelect(select3, registry), listeningStores);
      if (globalThis.SCRIPT_DEBUG) {
        if (!didWarnUnstableReference) {
          const secondMapResult = mapSelect(select3, registry);
          if (!isShallowEqual(mapResult, secondMapResult)) {
            warnOnUnstableReference(mapResult, secondMapResult);
            didWarnUnstableReference = true;
          }
        }
      }
      if (!subscriber) {
        for (const name of listeningStores.current) {
          storeStatesOnMount.set(name, getStoreState(name));
        }
        subscriber = createSubscriber(listeningStores.current);
      } else {
        subscriber.updateStores(listeningStores.current);
      }
      if (!isShallowEqual(lastMapResult, mapResult)) {
        lastMapResult = mapResult;
      }
      lastMapSelect = mapSelect;
      lastMapResultValid = true;
    }
    function getValue() {
      updateValue();
      return lastMapResult;
    }
    if (lastIsAsync && !isAsync) {
      lastMapResultValid = false;
      renderQueue.cancel(queueContext);
    }
    updateValue();
    lastIsAsync = isAsync;
    return {
      subscribe: subscriber.subscribe,
      getValue
    };
  };
}
function _useStaticSelect(storeName) {
  return useRegistry().select(storeName);
}
function _useMappingSelect(suspense, mapSelect, deps) {
  const registry = useRegistry();
  const isAsync = useAsyncMode();
  const store = (0, import_react.useMemo)(() => Store(registry, suspense), [registry, suspense]);
  const selector = (0, import_react.useCallback)(mapSelect, deps);
  const {
    subscribe: subscribe2,
    getValue
  } = store(selector, isAsync);
  const result = (0, import_react.useSyncExternalStore)(subscribe2, getValue, getValue);
  (0, import_react.useDebugValue)(result);
  return result;
}
function useSelect(mapSelect, deps) {
  const staticSelectMode = typeof mapSelect !== "function";
  const staticSelectModeRef = (0, import_react.useRef)(staticSelectMode);
  if (staticSelectMode !== staticSelectModeRef.current) {
    const prevMode = staticSelectModeRef.current ? "static" : "mapping";
    const nextMode = staticSelectMode ? "static" : "mapping";
    throw new Error(`Switching useSelect from ${prevMode} to ${nextMode} is not allowed`);
  }
  return staticSelectMode ? _useStaticSelect(mapSelect) : _useMappingSelect(false, mapSelect, deps);
}
function useSuspenseSelect(mapSelect, deps) {
  return _useMappingSelect(true, mapSelect, deps);
}

// ../../node_modules/@wordpress/data/build-module/components/with-select/index.js
var import_jsx_runtime8 = __toESM(require_jsx_runtime());
var withSelect = (mapSelectToProps) => createHigherOrderComponent((WrappedComponent) => pure_default((ownProps) => {
  const mapSelect = (select3, registry) => mapSelectToProps(select3, ownProps, registry);
  const mergeProps = useSelect(mapSelect);
  return (0, import_jsx_runtime8.jsx)(WrappedComponent, {
    ...ownProps,
    ...mergeProps
  });
}), "withSelect");
var with_select_default = withSelect;

// ../../node_modules/@wordpress/data/build-module/components/use-dispatch/use-dispatch.js
var useDispatch = (storeNameOrDescriptor) => {
  const {
    dispatch: dispatch3
  } = useRegistry();
  return storeNameOrDescriptor === void 0 ? dispatch3 : dispatch3(storeNameOrDescriptor);
};
var use_dispatch_default = useDispatch;

// ../../node_modules/@wordpress/data/build-module/components/use-dispatch/use-dispatch-with-map.js
var useDispatchWithMap = (dispatchMap, deps) => {
  const registry = useRegistry();
  const currentDispatchMapRef = (0, import_react.useRef)(dispatchMap);
  use_isomorphic_layout_effect_default(() => {
    currentDispatchMapRef.current = dispatchMap;
  });
  return (0, import_react.useMemo)(() => {
    const currentDispatchProps = currentDispatchMapRef.current(registry.dispatch, registry);
    return Object.fromEntries(Object.entries(currentDispatchProps).map(([propName, dispatcher]) => {
      if (typeof dispatcher !== "function") {
        console.warn(`Property ${propName} returned from dispatchMap in useDispatchWithMap must be a function.`);
      }
      return [propName, (...args) => currentDispatchMapRef.current(registry.dispatch, registry)[propName](...args)];
    }));
  }, [registry, ...deps]);
};
var use_dispatch_with_map_default = useDispatchWithMap;

// ../../node_modules/@wordpress/data/build-module/components/with-dispatch/index.js
var import_jsx_runtime9 = __toESM(require_jsx_runtime());
var withDispatch = (mapDispatchToProps) => createHigherOrderComponent((WrappedComponent) => (ownProps) => {
  const mapDispatch = (dispatch3, registry) => mapDispatchToProps(dispatch3, ownProps, registry);
  const dispatchProps = use_dispatch_with_map_default(mapDispatch, []);
  return (0, import_jsx_runtime9.jsx)(WrappedComponent, {
    ...ownProps,
    ...dispatchProps
  });
}, "withDispatch");
var with_dispatch_default = withDispatch;

// ../../node_modules/@wordpress/data/build-module/components/with-registry/index.js
var import_jsx_runtime10 = __toESM(require_jsx_runtime());
var withRegistry = createHigherOrderComponent((OriginalComponent) => (props) => (0, import_jsx_runtime10.jsx)(RegistryConsumer, {
  children: (registry) => (0, import_jsx_runtime10.jsx)(OriginalComponent, {
    ...props,
    registry
  })
}), "withRegistry");
var with_registry_default = withRegistry;

// ../../node_modules/@wordpress/data/build-module/dispatch.js
function dispatch2(storeNameOrDescriptor) {
  return default_registry_default.dispatch(storeNameOrDescriptor);
}

// ../../node_modules/@wordpress/data/build-module/select.js
function select2(storeNameOrDescriptor) {
  return default_registry_default.select(storeNameOrDescriptor);
}

// ../../node_modules/@wordpress/data/build-module/index.js
var combineReducers2 = combineReducers;
var resolveSelect2 = default_registry_default.resolveSelect;
var suspendSelect = default_registry_default.suspendSelect;
var subscribe = default_registry_default.subscribe;
var registerGenericStore = default_registry_default.registerGenericStore;
var registerStore = default_registry_default.registerStore;
var use = default_registry_default.use;
var register = default_registry_default.register;

export {
  deprecated,
  createHigherOrderComponent,
  debounce,
  throttle,
  observableMap,
  pipe_default,
  compose_default,
  if_condition_default,
  isShallowEqualObjects,
  isShallowEqual,
  import_react,
  import_react_dom,
  isEmptyElement,
  platform_default,
  RawHTML,
  serialize_default,
  use_instance_id_default,
  with_instance_id_default,
  with_safe_timeout_default,
  computeCaretRect,
  isTextField,
  documentHasUncollapsedSelection,
  documentHasSelection,
  getScrollContainer,
  isEntirelySelected,
  isFormElement,
  isRTL,
  isSelectionForward,
  isHorizontalEdge,
  isVerticalEdge,
  placeCaretAtHorizontalEdge,
  placeCaretAtVerticalEdge,
  remove,
  replace,
  unwrap,
  replaceTag,
  wrap,
  safeHTML,
  stripHTML,
  isEmpty,
  getPhrasingContentSchema,
  isPhrasingContent,
  isTextContent,
  removeInvalidHTML,
  getFilesFromDataTransfer,
  focus,
  useRefEffect,
  use_constrained_tabbing_default,
  useCopyToClipboard,
  isAppleOS,
  BACKSPACE,
  TAB,
  ENTER,
  ESCAPE,
  SPACE,
  END,
  HOME,
  LEFT,
  UP,
  RIGHT,
  DOWN,
  DELETE,
  rawShortcut,
  displayShortcut,
  shortcutAriaLabel,
  isKeyboardEvent,
  useFocusOnMount,
  use_focus_return_default,
  useFocusOutside,
  useMergeRefs,
  use_dialog_default,
  useDisabled,
  useEvent,
  use_isomorphic_layout_effect_default,
  useDragging,
  use_keyboard_shortcut_default,
  usePrevious,
  use_reduced_motion_default,
  use_viewport_match_default,
  useResizeObserver2 as useResizeObserver,
  use_async_list_default,
  useDebounce,
  useDebouncedInput,
  useThrottle,
  useDropZone,
  useFocusableIframe,
  useFixedWindowList,
  useObservableValue,
  createRegistrySelector,
  createRegistryControl,
  controls,
  __dangerousOptInToUnstableAPIsOnlyForCoreModules,
  rememo_default,
  createReduxStore,
  createRegistry,
  require_cjs,
  plugins_exports,
  RegistryConsumer,
  context_default,
  useRegistry,
  context_default2,
  useSelect,
  useSuspenseSelect,
  with_select_default,
  use_dispatch_default,
  with_dispatch_default,
  with_registry_default,
  dispatch2 as dispatch,
  select2 as select,
  combineReducers2 as combineReducers,
  resolveSelect2 as resolveSelect,
  suspendSelect,
  subscribe,
  registerGenericStore,
  registerStore,
  use,
  register
};
/*! Bundled license information:

clipboard/dist/clipboard.js:
  (*!
   * clipboard.js v2.0.11
   * https://clipboardjs.com/
   *
   * Licensed MIT © Zeno Rocha
   *)
*/
//# sourceMappingURL=chunk-6PYQ5DCB.js.map
