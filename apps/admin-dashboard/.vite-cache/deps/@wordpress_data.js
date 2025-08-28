import {
  isPromise,
  rememo_default,
  require_cjs,
  require_clipboard,
  require_dist,
  require_equivalent_key_map,
  require_mousetrap,
  require_requestidlecallback
} from "./chunk-HOFISRPD.js";
import {
  Tannin,
  memize,
  require_sprintf
} from "./chunk-HELTMWAY.js";
import {
  isPlainObject,
  pascalCase
} from "./chunk-LYSEHU5L.js";
import "./chunk-6CO5EZY2.js";
import {
  require_client
} from "./chunk-YS4MI3ZJ.js";
import {
  require_react_dom
} from "./chunk-ZIK3TCYH.js";
import {
  require_react
} from "./chunk-X56C4N66.js";
import {
  __export,
  __toESM
} from "./chunk-OL46QLBJ.js";

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/validateNamespace.js
function validateNamespace(namespace) {
  if ("string" !== typeof namespace || "" === namespace) {
    console.error("The namespace must be a non-empty string.");
    return false;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_.\-\/]*$/.test(namespace)) {
    console.error("The namespace can only contain numbers, letters, dashes, periods, underscores and slashes.");
    return false;
  }
  return true;
}
var validateNamespace_default = validateNamespace;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/validateHookName.js
function validateHookName(hookName) {
  if ("string" !== typeof hookName || "" === hookName) {
    console.error("The hook name must be a non-empty string.");
    return false;
  }
  if (/^__/.test(hookName)) {
    console.error("The hook name cannot begin with `__`.");
    return false;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(hookName)) {
    console.error("The hook name can only contain numbers, letters, dashes, periods and underscores.");
    return false;
  }
  return true;
}
var validateHookName_default = validateHookName;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createAddHook.js
function createAddHook(hooks, storeKey) {
  return function addHook(hookName, namespace, callback, priority = 10) {
    const hooksStore = hooks[storeKey];
    if (!validateHookName_default(hookName)) {
      return;
    }
    if (!validateNamespace_default(namespace)) {
      return;
    }
    if ("function" !== typeof callback) {
      console.error("The hook callback must be a function.");
      return;
    }
    if ("number" !== typeof priority) {
      console.error("If specified, the hook priority must be a number.");
      return;
    }
    const handler = {
      callback,
      priority,
      namespace
    };
    if (hooksStore[hookName]) {
      const handlers = hooksStore[hookName].handlers;
      let i;
      for (i = handlers.length; i > 0; i--) {
        if (priority >= handlers[i - 1].priority) {
          break;
        }
      }
      if (i === handlers.length) {
        handlers[i] = handler;
      } else {
        handlers.splice(i, 0, handler);
      }
      hooksStore.__current.forEach((hookInfo) => {
        if (hookInfo.name === hookName && hookInfo.currentIndex >= i) {
          hookInfo.currentIndex++;
        }
      });
    } else {
      hooksStore[hookName] = {
        handlers: [handler],
        runs: 0
      };
    }
    if (hookName !== "hookAdded") {
      hooks.doAction("hookAdded", hookName, namespace, callback, priority);
    }
  };
}
var createAddHook_default = createAddHook;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createRemoveHook.js
function createRemoveHook(hooks, storeKey, removeAll = false) {
  return function removeHook(hookName, namespace) {
    const hooksStore = hooks[storeKey];
    if (!validateHookName_default(hookName)) {
      return;
    }
    if (!removeAll && !validateNamespace_default(namespace)) {
      return;
    }
    if (!hooksStore[hookName]) {
      return 0;
    }
    let handlersRemoved = 0;
    if (removeAll) {
      handlersRemoved = hooksStore[hookName].handlers.length;
      hooksStore[hookName] = {
        runs: hooksStore[hookName].runs,
        handlers: []
      };
    } else {
      const handlers = hooksStore[hookName].handlers;
      for (let i = handlers.length - 1; i >= 0; i--) {
        if (handlers[i].namespace === namespace) {
          handlers.splice(i, 1);
          handlersRemoved++;
          hooksStore.__current.forEach((hookInfo) => {
            if (hookInfo.name === hookName && hookInfo.currentIndex >= i) {
              hookInfo.currentIndex--;
            }
          });
        }
      }
    }
    if (hookName !== "hookRemoved") {
      hooks.doAction("hookRemoved", hookName, namespace);
    }
    return handlersRemoved;
  };
}
var createRemoveHook_default = createRemoveHook;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createHasHook.js
function createHasHook(hooks, storeKey) {
  return function hasHook(hookName, namespace) {
    const hooksStore = hooks[storeKey];
    if ("undefined" !== typeof namespace) {
      return hookName in hooksStore && hooksStore[hookName].handlers.some((hook) => hook.namespace === namespace);
    }
    return hookName in hooksStore;
  };
}
var createHasHook_default = createHasHook;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createRunHook.js
function createRunHook(hooks, storeKey, returnFirstArg = false) {
  return function runHooks(hookName, ...args) {
    const hooksStore = hooks[storeKey];
    if (!hooksStore[hookName]) {
      hooksStore[hookName] = {
        handlers: [],
        runs: 0
      };
    }
    hooksStore[hookName].runs++;
    const handlers = hooksStore[hookName].handlers;
    if (true) {
      if ("hookAdded" !== hookName && hooksStore.all) {
        handlers.push(...hooksStore.all.handlers);
      }
    }
    if (!handlers || !handlers.length) {
      return returnFirstArg ? args[0] : void 0;
    }
    const hookInfo = {
      name: hookName,
      currentIndex: 0
    };
    hooksStore.__current.push(hookInfo);
    while (hookInfo.currentIndex < handlers.length) {
      const handler = handlers[hookInfo.currentIndex];
      const result = handler.callback.apply(null, args);
      if (returnFirstArg) {
        args[0] = result;
      }
      hookInfo.currentIndex++;
    }
    hooksStore.__current.pop();
    if (returnFirstArg) {
      return args[0];
    }
    return void 0;
  };
}
var createRunHook_default = createRunHook;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createCurrentHook.js
function createCurrentHook(hooks, storeKey) {
  return function currentHook() {
    var _a;
    var _hooksStore$__current;
    const hooksStore = hooks[storeKey];
    return (_hooksStore$__current = (_a = hooksStore.__current[hooksStore.__current.length - 1]) == null ? void 0 : _a.name) !== null && _hooksStore$__current !== void 0 ? _hooksStore$__current : null;
  };
}
var createCurrentHook_default = createCurrentHook;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createDoingHook.js
function createDoingHook(hooks, storeKey) {
  return function doingHook(hookName) {
    const hooksStore = hooks[storeKey];
    if ("undefined" === typeof hookName) {
      return "undefined" !== typeof hooksStore.__current[0];
    }
    return hooksStore.__current[0] ? hookName === hooksStore.__current[0].name : false;
  };
}
var createDoingHook_default = createDoingHook;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createDidHook.js
function createDidHook(hooks, storeKey) {
  return function didHook(hookName) {
    const hooksStore = hooks[storeKey];
    if (!validateHookName_default(hookName)) {
      return;
    }
    return hooksStore[hookName] && hooksStore[hookName].runs ? hooksStore[hookName].runs : 0;
  };
}
var createDidHook_default = createDidHook;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/createHooks.js
var _Hooks = class {
  constructor() {
    this.actions = /* @__PURE__ */ Object.create(null);
    this.actions.__current = [];
    this.filters = /* @__PURE__ */ Object.create(null);
    this.filters.__current = [];
    this.addAction = createAddHook_default(this, "actions");
    this.addFilter = createAddHook_default(this, "filters");
    this.removeAction = createRemoveHook_default(this, "actions");
    this.removeFilter = createRemoveHook_default(this, "filters");
    this.hasAction = createHasHook_default(this, "actions");
    this.hasFilter = createHasHook_default(this, "filters");
    this.removeAllActions = createRemoveHook_default(this, "actions", true);
    this.removeAllFilters = createRemoveHook_default(this, "filters", true);
    this.doAction = createRunHook_default(this, "actions");
    this.applyFilters = createRunHook_default(this, "filters", true);
    this.currentAction = createCurrentHook_default(this, "actions");
    this.currentFilter = createCurrentHook_default(this, "filters");
    this.doingAction = createDoingHook_default(this, "actions");
    this.doingFilter = createDoingHook_default(this, "filters");
    this.didAction = createDidHook_default(this, "actions");
    this.didFilter = createDidHook_default(this, "filters");
  }
};
function createHooks() {
  return new _Hooks();
}
var createHooks_default = createHooks;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/hooks/build-module/index.js
var defaultHooks = createHooks_default();
var {
  addAction,
  addFilter,
  removeAction,
  removeFilter,
  hasAction,
  hasFilter,
  removeAllActions,
  removeAllFilters,
  doAction,
  applyFilters,
  currentAction,
  currentFilter,
  doingAction,
  doingFilter,
  didAction,
  didFilter,
  actions,
  filters
} = defaultHooks;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/deprecated/build-module/index.js
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

// ../../node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}

// ../../node_modules/@babel/runtime/helpers/esm/toPrimitive.js
function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}

// ../../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js
function toPropertyKey(t) {
  var i = toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : i + "";
}

// ../../node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(e, r, t) {
  return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
}

// ../../node_modules/@babel/runtime/helpers/esm/objectSpread2.js
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}

// ../../node_modules/redux/es/redux.js
var $$observable = function() {
  return typeof Symbol === "function" && Symbol.observable || "@@observable";
}();
var randomString = function randomString2() {
  return Math.random().toString(36).substring(7).split("").join(".");
};
var ActionTypes = {
  INIT: "@@redux/INIT" + randomString(),
  REPLACE: "@@redux/REPLACE" + randomString(),
  PROBE_UNKNOWN_ACTION: function PROBE_UNKNOWN_ACTION() {
    return "@@redux/PROBE_UNKNOWN_ACTION" + randomString();
  }
};
function isPlainObject2(obj) {
  if (typeof obj !== "object" || obj === null) return false;
  var proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(obj) === proto;
}
function miniKindOf(val) {
  if (val === void 0) return "undefined";
  if (val === null) return "null";
  var type = typeof val;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "symbol":
    case "function": {
      return type;
    }
  }
  if (Array.isArray(val)) return "array";
  if (isDate(val)) return "date";
  if (isError(val)) return "error";
  var constructorName = ctorName(val);
  switch (constructorName) {
    case "Symbol":
    case "Promise":
    case "WeakMap":
    case "WeakSet":
    case "Map":
    case "Set":
      return constructorName;
  }
  return type.slice(8, -1).toLowerCase().replace(/\s/g, "");
}
function ctorName(val) {
  return typeof val.constructor === "function" ? val.constructor.name : null;
}
function isError(val) {
  return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
}
function isDate(val) {
  if (val instanceof Date) return true;
  return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
}
function kindOf(val) {
  var typeOfVal = typeof val;
  if (true) {
    typeOfVal = miniKindOf(val);
  }
  return typeOfVal;
}
function createStore(reducer, preloadedState, enhancer) {
  var _ref2;
  if (typeof preloadedState === "function" && typeof enhancer === "function" || typeof enhancer === "function" && typeof arguments[3] === "function") {
    throw new Error(false ? formatProdErrorMessage(0) : "It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function. See https://redux.js.org/tutorials/fundamentals/part-4-store#creating-a-store-with-enhancers for an example.");
  }
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState;
    preloadedState = void 0;
  }
  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      throw new Error(false ? formatProdErrorMessage(1) : "Expected the enhancer to be a function. Instead, received: '" + kindOf(enhancer) + "'");
    }
    return enhancer(createStore)(reducer, preloadedState);
  }
  if (typeof reducer !== "function") {
    throw new Error(false ? formatProdErrorMessage(2) : "Expected the root reducer to be a function. Instead, received: '" + kindOf(reducer) + "'");
  }
  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }
  function getState() {
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(3) : "You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.");
    }
    return currentState;
  }
  function subscribe3(listener2) {
    if (typeof listener2 !== "function") {
      throw new Error(false ? formatProdErrorMessage(4) : "Expected the listener to be a function. Instead, received: '" + kindOf(listener2) + "'");
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(5) : "You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details.");
    }
    var isSubscribed = true;
    ensureCanMutateNextListeners();
    nextListeners.push(listener2);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      if (isDispatching) {
        throw new Error(false ? formatProdErrorMessage(6) : "You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details.");
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener2);
      nextListeners.splice(index, 1);
      currentListeners = null;
    };
  }
  function dispatch3(action) {
    if (!isPlainObject2(action)) {
      throw new Error(false ? formatProdErrorMessage(7) : "Actions must be plain objects. Instead, the actual type was: '" + kindOf(action) + "'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.");
    }
    if (typeof action.type === "undefined") {
      throw new Error(false ? formatProdErrorMessage(8) : 'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
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
    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      var listener2 = listeners[i];
      listener2();
    }
    return action;
  }
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== "function") {
      throw new Error(false ? formatProdErrorMessage(10) : "Expected the nextReducer to be a function. Instead, received: '" + kindOf(nextReducer));
    }
    currentReducer = nextReducer;
    dispatch3({
      type: ActionTypes.REPLACE
    });
  }
  function observable() {
    var _ref;
    var outerSubscribe = subscribe3;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe: function subscribe4(observer) {
        if (typeof observer !== "object" || observer === null) {
          throw new Error(false ? formatProdErrorMessage(11) : "Expected the observer to be an object. Instead, received: '" + kindOf(observer) + "'");
        }
        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }
        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe
        };
      }
    }, _ref[$$observable] = function() {
      return this;
    }, _ref;
  }
  dispatch3({
    type: ActionTypes.INIT
  });
  return _ref2 = {
    dispatch: dispatch3,
    subscribe: subscribe3,
    getState,
    replaceReducer
  }, _ref2[$$observable] = observable, _ref2;
}
function compose() {
  for (var _len = arguments.length, funcs = new Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }
  if (funcs.length === 0) {
    return function(arg) {
      return arg;
    };
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce(function(a, b) {
    return function() {
      return a(b.apply(void 0, arguments));
    };
  });
}
function applyMiddleware() {
  for (var _len = arguments.length, middlewares = new Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }
  return function(createStore2) {
    return function() {
      var store = createStore2.apply(void 0, arguments);
      var _dispatch = function dispatch3() {
        throw new Error(false ? formatProdErrorMessage(15) : "Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.");
      };
      var middlewareAPI = {
        getState: store.getState,
        dispatch: function dispatch3() {
          return _dispatch.apply(void 0, arguments);
        }
      };
      var chain = middlewares.map(function(middleware) {
        return middleware(middlewareAPI);
      });
      _dispatch = compose.apply(void 0, chain)(store.dispatch);
      return _objectSpread2(_objectSpread2({}, store), {}, {
        dispatch: _dispatch
      });
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/utils/create-higher-order-component/index.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/pipe.js
var basePipe = (reverse = false) => (...funcs) => (...args) => {
  const functions = funcs.flat();
  if (reverse) {
    functions.reverse();
  }
  return functions.reduce((prev, func) => [func(...prev)], args)[0];
};
var pipe = basePipe();

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/compose.js
var compose2 = basePipe(true);
var compose_default = compose2;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/if-condition/index.js
var import_react = __toESM(require_react());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/pure/index.js
var import_react6 = __toESM(require_react());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/is-shallow-equal/build-module/objects.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/is-shallow-equal/build-module/arrays.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/is-shallow-equal/build-module/index.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/element/build-module/react.js
var import_react2 = __toESM(require_react());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/element/build-module/react-platform.js
var import_react_dom = __toESM(require_react_dom());
var import_client = __toESM(require_client());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/element/build-module/serialize.js
var {
  Provider,
  Consumer
} = (0, import_react2.createContext)(void 0);
var ForwardRef = (0, import_react2.forwardRef)(() => {
  return null;
});
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/pure/index.js
var pure = createHigherOrderComponent(function(WrappedComponent) {
  if (WrappedComponent.prototype instanceof import_react2.Component) {
    return class extends WrappedComponent {
      shouldComponentUpdate(nextProps, nextState) {
        return !isShallowEqual(nextProps, this.props) || !isShallowEqual(nextState, this.state);
      }
    };
  }
  return class extends import_react2.Component {
    shouldComponentUpdate(nextProps) {
      return !isShallowEqual(nextProps, this.props);
    }
    render() {
      return (0, import_react6.createElement)(WrappedComponent, {
        ...this.props
      });
    }
  };
}, "pure");
var pure_default = pure;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/with-global-events/index.js
var import_react7 = __toESM(require_react());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/with-global-events/listener.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/with-global-events/index.js
var listener = new listener_default();

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/with-instance-id/index.js
var import_react8 = __toESM(require_react());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-instance-id/index.js
var instanceMap = /* @__PURE__ */ new WeakMap();
function createId(object) {
  const instances = instanceMap.get(object) || 0;
  instanceMap.set(object, instances + 1);
  return instances;
}
function useInstanceId(object, prefix, preferredId) {
  return (0, import_react2.useMemo)(() => {
    if (preferredId) {
      return preferredId;
    }
    const id = createId(object);
    return prefix ? `${prefix}-${id}` : id;
  }, [object, preferredId, prefix]);
}
var use_instance_id_default = useInstanceId;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/with-instance-id/index.js
var withInstanceId = createHigherOrderComponent((WrappedComponent) => {
  return (props) => {
    const instanceId = use_instance_id_default(WrappedComponent);
    return (0, import_react8.createElement)(WrappedComponent, {
      ...props,
      instanceId
    });
  };
}, "instanceId");

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/with-safe-timeout/index.js
var import_react9 = __toESM(require_react());
var withSafeTimeout = createHigherOrderComponent((OriginalComponent) => {
  return class WrappedComponent extends import_react2.Component {
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
        (0, import_react9.createElement)(OriginalComponent, {
          ...this.props,
          setTimeout: this.setTimeout,
          clearTimeout: this.clearTimeout
        })
      );
    }
  };
}, "withSafeTimeout");

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/higher-order/with-state/index.js
var import_react10 = __toESM(require_react());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/dom/build-module/phrasing-content.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-copy-on-click/index.js
var import_clipboard = __toESM(require_clipboard());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-copy-to-clipboard/index.js
var import_clipboard2 = __toESM(require_clipboard());

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/i18n/build-module/sprintf.js
var import_sprintf_js = __toESM(require_sprintf());
var logErrorOnce = memize(console.error);

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/i18n/build-module/create-i18n.js
var DEFAULT_LOCALE_DATA = {
  "": {
    /** @param {number} n */
    plural_forms(n) {
      return n === 1 ? 0 : 1;
    }
  }
};
var I18N_HOOK_REGEXP = /^i18n\.(n?gettext|has_translation)(_|$)/;
var createI18n = (initialData, initialDomain, hooks) => {
  const tannin = new Tannin({});
  const listeners = /* @__PURE__ */ new Set();
  const notifyListeners = () => {
    listeners.forEach((listener2) => listener2());
  };
  const subscribe3 = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  };
  const getLocaleData2 = (domain = "default") => tannin.data[domain];
  const doSetLocaleData = (data, domain = "default") => {
    var _a;
    tannin.data[domain] = {
      ...tannin.data[domain],
      ...data
    };
    tannin.data[domain][""] = {
      ...DEFAULT_LOCALE_DATA[""],
      ...(_a = tannin.data[domain]) == null ? void 0 : _a[""]
    };
    delete tannin.pluralForms[domain];
  };
  const setLocaleData2 = (data, domain) => {
    doSetLocaleData(data, domain);
    notifyListeners();
  };
  const addLocaleData = (data, domain = "default") => {
    var _a;
    tannin.data[domain] = {
      ...tannin.data[domain],
      ...data,
      // Populate default domain configuration (supported locale date which omits
      // a plural forms expression).
      "": {
        ...DEFAULT_LOCALE_DATA[""],
        ...(_a = tannin.data[domain]) == null ? void 0 : _a[""],
        ...data == null ? void 0 : data[""]
      }
    };
    delete tannin.pluralForms[domain];
    notifyListeners();
  };
  const resetLocaleData2 = (data, domain) => {
    tannin.data = {};
    tannin.pluralForms = {};
    setLocaleData2(data, domain);
  };
  const dcnpgettext = (domain = "default", context, single, plural, number) => {
    if (!tannin.data[domain]) {
      doSetLocaleData(void 0, domain);
    }
    return tannin.dcnpgettext(domain, context, single, plural, number);
  };
  const getFilterDomain = (domain = "default") => domain;
  const __2 = (text, domain) => {
    let translation = dcnpgettext(domain, void 0, text);
    if (!hooks) {
      return translation;
    }
    translation = /** @type {string} */
    /** @type {*} */
    hooks.applyFilters("i18n.gettext", translation, text, domain);
    return (
      /** @type {string} */
      /** @type {*} */
      hooks.applyFilters("i18n.gettext_" + getFilterDomain(domain), translation, text, domain)
    );
  };
  const _x2 = (text, context, domain) => {
    let translation = dcnpgettext(domain, context, text);
    if (!hooks) {
      return translation;
    }
    translation = /** @type {string} */
    /** @type {*} */
    hooks.applyFilters("i18n.gettext_with_context", translation, text, context, domain);
    return (
      /** @type {string} */
      /** @type {*} */
      hooks.applyFilters("i18n.gettext_with_context_" + getFilterDomain(domain), translation, text, context, domain)
    );
  };
  const _n2 = (single, plural, number, domain) => {
    let translation = dcnpgettext(domain, void 0, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = /** @type {string} */
    /** @type {*} */
    hooks.applyFilters("i18n.ngettext", translation, single, plural, number, domain);
    return (
      /** @type {string} */
      /** @type {*} */
      hooks.applyFilters("i18n.ngettext_" + getFilterDomain(domain), translation, single, plural, number, domain)
    );
  };
  const _nx2 = (single, plural, number, context, domain) => {
    let translation = dcnpgettext(domain, context, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = /** @type {string} */
    /** @type {*} */
    hooks.applyFilters("i18n.ngettext_with_context", translation, single, plural, number, context, domain);
    return (
      /** @type {string} */
      /** @type {*} */
      hooks.applyFilters("i18n.ngettext_with_context_" + getFilterDomain(domain), translation, single, plural, number, context, domain)
    );
  };
  const isRTL3 = () => {
    return "rtl" === _x2("ltr", "text direction");
  };
  const hasTranslation2 = (single, context, domain) => {
    var _a, _b;
    const key = context ? context + "" + single : single;
    let result = !!((_b = (_a = tannin.data) == null ? void 0 : _a[domain !== null && domain !== void 0 ? domain : "default"]) == null ? void 0 : _b[key]);
    if (hooks) {
      result = /** @type { boolean } */
      /** @type {*} */
      hooks.applyFilters("i18n.has_translation", result, single, context, domain);
      result = /** @type { boolean } */
      /** @type {*} */
      hooks.applyFilters("i18n.has_translation_" + getFilterDomain(domain), result, single, context, domain);
    }
    return result;
  };
  if (initialData) {
    setLocaleData2(initialData, initialDomain);
  }
  if (hooks) {
    const onHookAddedOrRemoved = (hookName) => {
      if (I18N_HOOK_REGEXP.test(hookName)) {
        notifyListeners();
      }
    };
    hooks.addAction("hookAdded", "core/i18n", onHookAddedOrRemoved);
    hooks.addAction("hookRemoved", "core/i18n", onHookAddedOrRemoved);
  }
  return {
    getLocaleData: getLocaleData2,
    setLocaleData: setLocaleData2,
    addLocaleData,
    resetLocaleData: resetLocaleData2,
    subscribe: subscribe3,
    __: __2,
    _x: _x2,
    _n: _n2,
    _nx: _nx2,
    isRTL: isRTL3,
    hasTranslation: hasTranslation2
  };
};

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/validateNamespace.js
function validateNamespace2(namespace) {
  if ("string" !== typeof namespace || "" === namespace) {
    console.error("The namespace must be a non-empty string.");
    return false;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_.\-\/]*$/.test(namespace)) {
    console.error("The namespace can only contain numbers, letters, dashes, periods, underscores and slashes.");
    return false;
  }
  return true;
}
var validateNamespace_default2 = validateNamespace2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/validateHookName.js
function validateHookName2(hookName) {
  if ("string" !== typeof hookName || "" === hookName) {
    console.error("The hook name must be a non-empty string.");
    return false;
  }
  if (/^__/.test(hookName)) {
    console.error("The hook name cannot begin with `__`.");
    return false;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(hookName)) {
    console.error("The hook name can only contain numbers, letters, dashes, periods and underscores.");
    return false;
  }
  return true;
}
var validateHookName_default2 = validateHookName2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createAddHook.js
function createAddHook2(hooks, storeKey) {
  return function addHook(hookName, namespace, callback, priority = 10) {
    const hooksStore = hooks[storeKey];
    if (!validateHookName_default2(hookName)) {
      return;
    }
    if (!validateNamespace_default2(namespace)) {
      return;
    }
    if ("function" !== typeof callback) {
      console.error("The hook callback must be a function.");
      return;
    }
    if ("number" !== typeof priority) {
      console.error("If specified, the hook priority must be a number.");
      return;
    }
    const handler = {
      callback,
      priority,
      namespace
    };
    if (hooksStore[hookName]) {
      const handlers = hooksStore[hookName].handlers;
      let i;
      for (i = handlers.length; i > 0; i--) {
        if (priority >= handlers[i - 1].priority) {
          break;
        }
      }
      if (i === handlers.length) {
        handlers[i] = handler;
      } else {
        handlers.splice(i, 0, handler);
      }
      hooksStore.__current.forEach((hookInfo) => {
        if (hookInfo.name === hookName && hookInfo.currentIndex >= i) {
          hookInfo.currentIndex++;
        }
      });
    } else {
      hooksStore[hookName] = {
        handlers: [handler],
        runs: 0
      };
    }
    if (hookName !== "hookAdded") {
      hooks.doAction("hookAdded", hookName, namespace, callback, priority);
    }
  };
}
var createAddHook_default2 = createAddHook2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createRemoveHook.js
function createRemoveHook2(hooks, storeKey, removeAll = false) {
  return function removeHook(hookName, namespace) {
    const hooksStore = hooks[storeKey];
    if (!validateHookName_default2(hookName)) {
      return;
    }
    if (!removeAll && !validateNamespace_default2(namespace)) {
      return;
    }
    if (!hooksStore[hookName]) {
      return 0;
    }
    let handlersRemoved = 0;
    if (removeAll) {
      handlersRemoved = hooksStore[hookName].handlers.length;
      hooksStore[hookName] = {
        runs: hooksStore[hookName].runs,
        handlers: []
      };
    } else {
      const handlers = hooksStore[hookName].handlers;
      for (let i = handlers.length - 1; i >= 0; i--) {
        if (handlers[i].namespace === namespace) {
          handlers.splice(i, 1);
          handlersRemoved++;
          hooksStore.__current.forEach((hookInfo) => {
            if (hookInfo.name === hookName && hookInfo.currentIndex >= i) {
              hookInfo.currentIndex--;
            }
          });
        }
      }
    }
    if (hookName !== "hookRemoved") {
      hooks.doAction("hookRemoved", hookName, namespace);
    }
    return handlersRemoved;
  };
}
var createRemoveHook_default2 = createRemoveHook2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createHasHook.js
function createHasHook2(hooks, storeKey) {
  return function hasHook(hookName, namespace) {
    const hooksStore = hooks[storeKey];
    if ("undefined" !== typeof namespace) {
      return hookName in hooksStore && hooksStore[hookName].handlers.some((hook) => hook.namespace === namespace);
    }
    return hookName in hooksStore;
  };
}
var createHasHook_default2 = createHasHook2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createRunHook.js
function createRunHook2(hooks, storeKey, returnFirstArg = false) {
  return function runHooks(hookName, ...args) {
    const hooksStore = hooks[storeKey];
    if (!hooksStore[hookName]) {
      hooksStore[hookName] = {
        handlers: [],
        runs: 0
      };
    }
    hooksStore[hookName].runs++;
    const handlers = hooksStore[hookName].handlers;
    if (true) {
      if ("hookAdded" !== hookName && hooksStore.all) {
        handlers.push(...hooksStore.all.handlers);
      }
    }
    if (!handlers || !handlers.length) {
      return returnFirstArg ? args[0] : void 0;
    }
    const hookInfo = {
      name: hookName,
      currentIndex: 0
    };
    hooksStore.__current.push(hookInfo);
    while (hookInfo.currentIndex < handlers.length) {
      const handler = handlers[hookInfo.currentIndex];
      const result = handler.callback.apply(null, args);
      if (returnFirstArg) {
        args[0] = result;
      }
      hookInfo.currentIndex++;
    }
    hooksStore.__current.pop();
    if (returnFirstArg) {
      return args[0];
    }
    return void 0;
  };
}
var createRunHook_default2 = createRunHook2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createCurrentHook.js
function createCurrentHook2(hooks, storeKey) {
  return function currentHook() {
    var _a;
    var _hooksStore$__current;
    const hooksStore = hooks[storeKey];
    return (_hooksStore$__current = (_a = hooksStore.__current[hooksStore.__current.length - 1]) == null ? void 0 : _a.name) !== null && _hooksStore$__current !== void 0 ? _hooksStore$__current : null;
  };
}
var createCurrentHook_default2 = createCurrentHook2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createDoingHook.js
function createDoingHook2(hooks, storeKey) {
  return function doingHook(hookName) {
    const hooksStore = hooks[storeKey];
    if ("undefined" === typeof hookName) {
      return "undefined" !== typeof hooksStore.__current[0];
    }
    return hooksStore.__current[0] ? hookName === hooksStore.__current[0].name : false;
  };
}
var createDoingHook_default2 = createDoingHook2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createDidHook.js
function createDidHook2(hooks, storeKey) {
  return function didHook(hookName) {
    const hooksStore = hooks[storeKey];
    if (!validateHookName_default2(hookName)) {
      return;
    }
    return hooksStore[hookName] && hooksStore[hookName].runs ? hooksStore[hookName].runs : 0;
  };
}
var createDidHook_default2 = createDidHook2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createHooks.js
var _Hooks2 = class {
  constructor() {
    this.actions = /* @__PURE__ */ Object.create(null);
    this.actions.__current = [];
    this.filters = /* @__PURE__ */ Object.create(null);
    this.filters.__current = [];
    this.addAction = createAddHook_default2(this, "actions");
    this.addFilter = createAddHook_default2(this, "filters");
    this.removeAction = createRemoveHook_default2(this, "actions");
    this.removeFilter = createRemoveHook_default2(this, "filters");
    this.hasAction = createHasHook_default2(this, "actions");
    this.hasFilter = createHasHook_default2(this, "filters");
    this.removeAllActions = createRemoveHook_default2(this, "actions", true);
    this.removeAllFilters = createRemoveHook_default2(this, "filters", true);
    this.doAction = createRunHook_default2(this, "actions");
    this.applyFilters = createRunHook_default2(this, "filters", true);
    this.currentAction = createCurrentHook_default2(this, "actions");
    this.currentFilter = createCurrentHook_default2(this, "filters");
    this.doingAction = createDoingHook_default2(this, "actions");
    this.doingFilter = createDoingHook_default2(this, "filters");
    this.didAction = createDidHook_default2(this, "actions");
    this.didFilter = createDidHook_default2(this, "filters");
  }
};
function createHooks2() {
  return new _Hooks2();
}
var createHooks_default2 = createHooks2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/index.js
var defaultHooks2 = createHooks_default2();
var {
  addAction: addAction2,
  addFilter: addFilter2,
  removeAction: removeAction2,
  removeFilter: removeFilter2,
  hasAction: hasAction2,
  hasFilter: hasFilter2,
  removeAllActions: removeAllActions2,
  removeAllFilters: removeAllFilters2,
  doAction: doAction2,
  applyFilters: applyFilters2,
  currentAction: currentAction2,
  currentFilter: currentFilter2,
  doingAction: doingAction2,
  doingFilter: doingFilter2,
  didAction: didAction2,
  didFilter: didFilter2,
  actions: actions2,
  filters: filters2
} = defaultHooks2;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/i18n/build-module/default-i18n.js
var i18n = createI18n(void 0, void 0, defaultHooks2);
var getLocaleData = i18n.getLocaleData.bind(i18n);
var setLocaleData = i18n.setLocaleData.bind(i18n);
var resetLocaleData = i18n.resetLocaleData.bind(i18n);
var subscribe = i18n.subscribe.bind(i18n);
var __ = i18n.__.bind(i18n);
var _x = i18n._x.bind(i18n);
var _n = i18n._n.bind(i18n);
var _nx = i18n._nx.bind(i18n);
var isRTL2 = i18n.isRTL.bind(i18n);
var hasTranslation = i18n.hasTranslation.bind(i18n);

// ../../node_modules/@wordpress/keycodes/build-module/platform.js
function isAppleOS(_window = null) {
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
  return (
    /** @type {WPKeyHandler<string>} */
    (character, _isApple = isAppleOS) => {
      return [...modifier(_isApple), character.toLowerCase()].join("+");
    }
  );
});
var displayShortcutList = mapValues(modifiers, (modifier) => {
  return (
    /** @type {WPKeyHandler<string[]>} */
    (character, _isApple = isAppleOS) => {
      const isApple = _isApple();
      const replacementKeyMap = {
        [ALT]: isApple ? "⌥" : "Alt",
        [CTRL]: isApple ? "⌃" : "Ctrl",
        // Make sure ⌃ is the U+2303 UP ARROWHEAD unicode character and not the caret character.
        [COMMAND]: "⌘",
        [SHIFT]: isApple ? "⇧" : "Shift"
      };
      const modifierKeys = modifier(_isApple).reduce(
        (accumulator, key) => {
          var _replacementKeyMap$ke;
          const replacementKey = (_replacementKeyMap$ke = replacementKeyMap[key]) !== null && _replacementKeyMap$ke !== void 0 ? _replacementKeyMap$ke : key;
          if (isApple) {
            return [...accumulator, replacementKey];
          }
          return [...accumulator, replacementKey, "+"];
        },
        /** @type {string[]} */
        []
      );
      return [...modifierKeys, capitaliseFirstCharacter(character)];
    }
  );
});
var displayShortcut = mapValues(displayShortcutList, (shortcutList) => {
  return (
    /** @type {WPKeyHandler<string>} */
    (character, _isApple = isAppleOS) => shortcutList(character, _isApple).join("")
  );
});
var shortcutAriaLabel = mapValues(modifiers, (modifier) => {
  return (
    /** @type {WPKeyHandler<string>} */
    (character, _isApple = isAppleOS) => {
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
    }
  );
});
function getEventModifiers(event) {
  return (
    /** @type {WPModifierPart[]} */
    [ALT, CTRL, COMMAND, SHIFT].filter((key) => event[
      /** @type {'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'} */
      `${key}Key`
    ])
  );
}
var isKeyboardEvent = mapValues(modifiers, (getModifiers) => {
  return (
    /** @type {WPEventKeyHandler} */
    (event, character, _isApple = isAppleOS) => {
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
        return mods.includes(
          /** @type {WPModifierPart} */
          key
        );
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
    }
  );
});

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-isomorphic-layout-effect/index.js
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? import_react2.useLayoutEffect : import_react2.useEffect;
var use_isomorphic_layout_effect_default = useIsomorphicLayoutEffect;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-keyboard-shortcut/index.js
var import_mousetrap = __toESM(require_mousetrap());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-media-query/index.js
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
  const source = (0, import_react2.useMemo)(() => {
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
  return (0, import_react2.useSyncExternalStore)(source.subscribe, source.getValue, () => false);
}

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-viewport-match/index.js
var BREAKPOINTS = {
  huge: 1440,
  wide: 1280,
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
var ViewportMatchWidthContext = (0, import_react2.createContext)(
  /** @type {null | number} */
  null
);
var useViewportMatch = (breakpoint, operator = ">=") => {
  const simulatedWidth = (0, import_react2.useContext)(ViewportMatchWidthContext);
  const mediaQuery = !simulatedWidth && `(${CONDITIONS[operator]}: ${BREAKPOINTS[breakpoint]}px)`;
  const mediaQueryResult = useMediaQuery(mediaQuery || void 0);
  if (simulatedWidth) {
    return OPERATOR_EVALUATORS[operator](BREAKPOINTS[breakpoint], simulatedWidth);
  }
  return mediaQueryResult;
};
useViewportMatch.__experimentalWidthProvider = ViewportMatchWidthContext.Provider;

// ../../node_modules/@wordpress/data/node_modules/@wordpress/compose/build-module/hooks/use-resize-observer/index.js
var import_react11 = __toESM(require_react());

// ../../node_modules/@wordpress/data/node_modules/@wordpress/priority-queue/build-module/request-idle-callback.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/priority-queue/build-module/index.js
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

// ../../node_modules/@wordpress/data/node_modules/@wordpress/private-apis/build-module/implementation.js
var CORE_MODULES_USING_PRIVATE_APIS = ["@wordpress/block-directory", "@wordpress/block-editor", "@wordpress/block-library", "@wordpress/blocks", "@wordpress/commands", "@wordpress/components", "@wordpress/core-commands", "@wordpress/core-data", "@wordpress/customize-widgets", "@wordpress/data", "@wordpress/edit-post", "@wordpress/edit-site", "@wordpress/edit-widgets", "@wordpress/editor", "@wordpress/format-library", "@wordpress/interface", "@wordpress/patterns", "@wordpress/preferences", "@wordpress/reusable-blocks", "@wordpress/router", "@wordpress/dataviews"];
var registeredPrivateApis = [];
var requiredConsent = "I know using unstable features means my theme or plugin will inevitably break in the next version of WordPress.";
var allowReRegistration;
try {
  allowReRegistration = process.env.IS_WORDPRESS_CORE ? false : true;
} catch (error) {
  allowReRegistration = true;
}
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
  if (!(__private in object)) {
    object[__private] = {};
  }
  lockedData.set(object[__private], privateData);
}
function unlock(object) {
  if (!object) {
    throw new Error("Cannot unlock an undefined object.");
  }
  if (!(__private in object)) {
    throw new Error("Cannot unlock an object that was not locked before. ");
  }
  return lockedData.get(object[__private]);
}
var lockedData = /* @__PURE__ */ new WeakMap();
var __private = Symbol("Private API ID");

// ../../node_modules/@wordpress/data/build-module/lock-unlock.js
var {
  lock: lock2,
  unlock: unlock2
} = __dangerousOptInToUnstableAPIsOnlyForCoreModules("I know using unstable features means my theme or plugin will inevitably break in the next version of WordPress.", "@wordpress/data");

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
function createBindingCache(bind) {
  const cache = /* @__PURE__ */ new WeakMap();
  return {
    get(item, itemName) {
      let boundItem = cache.get(item);
      if (!boundItem) {
        boundItem = bind(item, itemName);
        cache.set(item, boundItem);
      }
      return boundItem;
    }
  };
}
function createReduxStore(key, options) {
  const privateActions = {};
  const privateSelectors = {};
  const privateRegistrationFunctions = {
    privateActions,
    registerPrivateActions: (actions3) => {
      Object.assign(privateActions, actions3);
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
          return thunkActions;
        },
        get select() {
          return thunkSelectors;
        },
        get resolveSelect() {
          return getResolveSelectors();
        }
      };
      const store = instantiateReduxStore(key, options, registry, thunkArgs);
      lock2(store, privateRegistrationFunctions);
      const resolversCache = createResolversCache();
      function bindAction(action) {
        return (...args) => Promise.resolve(store.dispatch(action(...args)));
      }
      const actions3 = {
        ...mapValues2(actions_exports, bindAction),
        ...mapValues2(options.actions, bindAction)
      };
      const boundPrivateActions = createBindingCache(bindAction);
      const allActions = new Proxy(() => {
      }, {
        get: (target, prop) => {
          const privateAction = privateActions[prop];
          return privateAction ? boundPrivateActions.get(privateAction, prop) : actions3[prop];
        }
      });
      const thunkActions = new Proxy(allActions, {
        apply: (target, thisArg, [action]) => store.dispatch(action)
      });
      lock2(actions3, allActions);
      const resolvers = options.resolvers ? mapResolvers(options.resolvers) : {};
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
        return mapSelectorWithResolver(boundSelector, selectorName, resolver, store, resolversCache);
      }
      function bindMetadataSelector(metaDataSelector) {
        const boundSelector = (...args) => {
          var _a;
          const state = store.__unstableOriginalGetState();
          const originalSelectorName = args && args[0];
          const originalSelectorArgs = args && args[1];
          const targetSelector = (_a = options == null ? void 0 : options.selectors) == null ? void 0 : _a[originalSelectorName];
          if (originalSelectorName && targetSelector) {
            args[1] = normalize(targetSelector, originalSelectorArgs);
          }
          return metaDataSelector(state.metadata, ...args);
        };
        boundSelector.hasResolver = false;
        return boundSelector;
      }
      const selectors = {
        ...mapValues2(selectors_exports, bindMetadataSelector),
        ...mapValues2(options.selectors, bindSelector)
      };
      const boundPrivateSelectors = createBindingCache(bindSelector);
      for (const [selectorName, selector] of Object.entries(privateSelectors)) {
        boundPrivateSelectors.get(selector, selectorName);
      }
      const allSelectors = new Proxy(() => {
      }, {
        get: (target, prop) => {
          const privateSelector = privateSelectors[prop];
          return privateSelector ? boundPrivateSelectors.get(privateSelector, prop) : selectors[prop];
        }
      });
      const thunkSelectors = new Proxy(allSelectors, {
        apply: (target, thisArg, [selector]) => selector(store.__unstableOriginalGetState())
      });
      lock2(selectors, allSelectors);
      const resolveSelectors = mapResolveSelectors(selectors, store);
      const suspendSelectors = mapSuspendSelectors(selectors, store);
      const getSelectors = () => selectors;
      const getActions = () => actions3;
      const getResolveSelectors = () => resolveSelectors;
      const getSuspendSelectors = () => suspendSelectors;
      store.__unstableOriginalGetState = store.getState;
      store.getState = () => store.__unstableOriginalGetState().root;
      const subscribe3 = store && ((listener2) => {
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
        actions: actions3,
        selectors,
        resolvers,
        getSelectors,
        getResolveSelectors,
        getSuspendSelectors,
        getActions,
        subscribe: subscribe3
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
function mapResolveSelectors(selectors, store) {
  const {
    getIsResolving: getIsResolving2,
    hasStartedResolution: hasStartedResolution2,
    hasFinishedResolution: hasFinishedResolution2,
    hasResolutionFailed: hasResolutionFailed2,
    isResolving: isResolving2,
    getCachedResolvers: getCachedResolvers2,
    getResolutionState: getResolutionState2,
    getResolutionError: getResolutionError2,
    hasResolvingSelectors: hasResolvingSelectors2,
    countSelectorsByStatus: countSelectorsByStatus2,
    ...storeSelectors
  } = selectors;
  return mapValues2(storeSelectors, (selector, selectorName) => {
    if (!selector.hasResolver) {
      return async (...args) => selector.apply(null, args);
    }
    return (...args) => {
      return new Promise((resolve, reject) => {
        const hasFinished = () => selectors.hasFinishedResolution(selectorName, args);
        const finalize = (result2) => {
          const hasFailed = selectors.hasResolutionFailed(selectorName, args);
          if (hasFailed) {
            const error = selectors.getResolutionError(selectorName, args);
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
  });
}
function mapSuspendSelectors(selectors, store) {
  return mapValues2(selectors, (selector, selectorName) => {
    if (!selector.hasResolver) {
      return selector;
    }
    return (...args) => {
      const result = selector.apply(null, args);
      if (selectors.hasFinishedResolution(selectorName, args)) {
        if (selectors.hasResolutionFailed(selectorName, args)) {
          throw selectors.getResolutionError(selectorName, args);
        }
        return result;
      }
      throw new Promise((resolve) => {
        const unsubscribe = store.subscribe(() => {
          if (selectors.hasFinishedResolution(selectorName, args)) {
            resolve();
            unsubscribe();
          }
        });
      });
    };
  });
}
function mapResolvers(resolvers) {
  return mapValues2(resolvers, (resolver) => {
    if (resolver.fulfill) {
      return resolver;
    }
    return {
      ...resolver,
      // Copy the enumerable properties of the resolver function.
      fulfill: resolver
      // Add the fulfill method.
    };
  });
}
function mapSelectorWithResolver(selector, selectorName, resolver, store, resolversCache) {
  function fulfillSelector(args) {
    const state = store.getState();
    if (resolversCache.isRunning(selectorName, args) || typeof resolver.isFulfilled === "function" && resolver.isFulfilled(state, ...args)) {
      return;
    }
    const {
      metadata
    } = store.__unstableOriginalGetState();
    if (hasStartedResolution(metadata, selectorName, args)) {
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
  const subscribe3 = (listener2, storeNameOrDescriptor) => {
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
    callback();
    emitter.resume();
    Object.values(stores).forEach((store) => store.emitter.resume());
  }
  let registry = {
    batch,
    stores,
    namespaces: stores,
    // TODO: Deprecate/remove this.
    subscribe: subscribe3,
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

// ../../node_modules/@wordpress/data/build-module/components/with-select/index.js
var import_react12 = __toESM(require_react());

// ../../node_modules/@wordpress/data/build-module/components/registry-provider/context.js
var Context = (0, import_react2.createContext)(default_registry_default);
var {
  Consumer: Consumer2,
  Provider: Provider2
} = Context;
var RegistryConsumer = Consumer2;
var context_default = Provider2;

// ../../node_modules/@wordpress/data/build-module/components/registry-provider/use-registry.js
function useRegistry() {
  return (0, import_react2.useContext)(Context);
}

// ../../node_modules/@wordpress/data/build-module/components/async-mode-provider/context.js
var Context2 = (0, import_react2.createContext)(false);
var {
  Consumer: Consumer3,
  Provider: Provider3
} = Context2;
var context_default2 = Provider3;

// ../../node_modules/@wordpress/data/build-module/components/async-mode-provider/use-async-mode.js
function useAsyncMode() {
  return (0, import_react2.useContext)(Context2);
}

// ../../node_modules/@wordpress/data/build-module/components/use-select/index.js
var renderQueue = createQueue();
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
    function subscribe3(listener2) {
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
      subscribe: subscribe3,
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
      if (true) {
        if (!didWarnUnstableReference) {
          const secondMapResult = mapSelect(select3, registry);
          if (!isShallowEqual(mapResult, secondMapResult)) {
            console.warn(`The 'useSelect' hook returns different values when called with the same state and parameters. This can lead to unnecessary rerenders.`);
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
function useStaticSelect(storeName) {
  return useRegistry().select(storeName);
}
function useMappingSelect(suspense, mapSelect, deps) {
  const registry = useRegistry();
  const isAsync = useAsyncMode();
  const store = (0, import_react2.useMemo)(() => Store(registry, suspense), [registry, suspense]);
  const selector = (0, import_react2.useCallback)(mapSelect, deps);
  const {
    subscribe: subscribe3,
    getValue
  } = store(selector, isAsync);
  const result = (0, import_react2.useSyncExternalStore)(subscribe3, getValue, getValue);
  (0, import_react2.useDebugValue)(result);
  return result;
}
function useSelect(mapSelect, deps) {
  const staticSelectMode = typeof mapSelect !== "function";
  const staticSelectModeRef = (0, import_react2.useRef)(staticSelectMode);
  if (staticSelectMode !== staticSelectModeRef.current) {
    const prevMode = staticSelectModeRef.current ? "static" : "mapping";
    const nextMode = staticSelectMode ? "static" : "mapping";
    throw new Error(`Switching useSelect from ${prevMode} to ${nextMode} is not allowed`);
  }
  return staticSelectMode ? useStaticSelect(mapSelect) : useMappingSelect(false, mapSelect, deps);
}
function useSuspenseSelect(mapSelect, deps) {
  return useMappingSelect(true, mapSelect, deps);
}

// ../../node_modules/@wordpress/data/build-module/components/with-select/index.js
var withSelect = (mapSelectToProps) => createHigherOrderComponent((WrappedComponent) => pure_default((ownProps) => {
  const mapSelect = (select3, registry) => mapSelectToProps(select3, ownProps, registry);
  const mergeProps = useSelect(mapSelect);
  return (0, import_react12.createElement)(WrappedComponent, {
    ...ownProps,
    ...mergeProps
  });
}), "withSelect");
var with_select_default = withSelect;

// ../../node_modules/@wordpress/data/build-module/components/with-dispatch/index.js
var import_react13 = __toESM(require_react());

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
  const currentDispatchMap = (0, import_react2.useRef)(dispatchMap);
  use_isomorphic_layout_effect_default(() => {
    currentDispatchMap.current = dispatchMap;
  });
  return (0, import_react2.useMemo)(() => {
    const currentDispatchProps = currentDispatchMap.current(registry.dispatch, registry);
    return Object.fromEntries(Object.entries(currentDispatchProps).map(([propName, dispatcher]) => {
      if (typeof dispatcher !== "function") {
        console.warn(`Property ${propName} returned from dispatchMap in useDispatchWithMap must be a function.`);
      }
      return [propName, (...args) => currentDispatchMap.current(registry.dispatch, registry)[propName](...args)];
    }));
  }, [registry, ...deps]);
};
var use_dispatch_with_map_default = useDispatchWithMap;

// ../../node_modules/@wordpress/data/build-module/components/with-dispatch/index.js
var withDispatch = (mapDispatchToProps) => createHigherOrderComponent((WrappedComponent) => (ownProps) => {
  const mapDispatch = (dispatch3, registry) => mapDispatchToProps(dispatch3, ownProps, registry);
  const dispatchProps = use_dispatch_with_map_default(mapDispatch, []);
  return (0, import_react13.createElement)(WrappedComponent, {
    ...ownProps,
    ...dispatchProps
  });
}, "withDispatch");
var with_dispatch_default = withDispatch;

// ../../node_modules/@wordpress/data/build-module/components/with-registry/index.js
var import_react14 = __toESM(require_react());
var withRegistry = createHigherOrderComponent((OriginalComponent) => (props) => (0, import_react14.createElement)(RegistryConsumer, null, (registry) => (0, import_react14.createElement)(OriginalComponent, {
  ...props,
  registry
})), "withRegistry");
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
var subscribe2 = default_registry_default.subscribe;
var registerGenericStore = default_registry_default.registerGenericStore;
var registerStore = default_registry_default.registerStore;
var use = default_registry_default.use;
var register = default_registry_default.register;
export {
  context_default2 as AsyncModeProvider,
  RegistryConsumer,
  context_default as RegistryProvider,
  combineReducers2 as combineReducers,
  controls,
  createReduxStore,
  createRegistry,
  createRegistryControl,
  createRegistrySelector,
  rememo_default as createSelector,
  dispatch2 as dispatch,
  plugins_exports as plugins,
  register,
  registerGenericStore,
  registerStore,
  resolveSelect2 as resolveSelect,
  select2 as select,
  subscribe2 as subscribe,
  suspendSelect,
  use,
  use_dispatch_default as useDispatch,
  useRegistry,
  useSelect,
  useSuspenseSelect,
  with_dispatch_default as withDispatch,
  with_registry_default as withRegistry,
  with_select_default as withSelect
};
//# sourceMappingURL=@wordpress_data.js.map
