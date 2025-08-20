// ../../node_modules/@wordpress/hooks/build-module/validateNamespace.js
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

// ../../node_modules/@wordpress/hooks/build-module/validateHookName.js
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

// ../../node_modules/@wordpress/hooks/build-module/createAddHook.js
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

// ../../node_modules/@wordpress/hooks/build-module/createRemoveHook.js
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

// ../../node_modules/@wordpress/hooks/build-module/createHasHook.js
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

// ../../node_modules/@wordpress/hooks/build-module/createRunHook.js
function createRunHook(hooks, storeKey, returnFirstArg, async) {
  return function runHook(hookName, ...args) {
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
    async function asyncRunner() {
      try {
        hooksStore.__current.add(hookInfo);
        let result = returnFirstArg ? args[0] : void 0;
        while (hookInfo.currentIndex < handlers.length) {
          const handler = handlers[hookInfo.currentIndex];
          result = await handler.callback.apply(null, args);
          if (returnFirstArg) {
            args[0] = result;
          }
          hookInfo.currentIndex++;
        }
        return returnFirstArg ? result : void 0;
      } finally {
        hooksStore.__current.delete(hookInfo);
      }
    }
    function syncRunner() {
      try {
        hooksStore.__current.add(hookInfo);
        let result = returnFirstArg ? args[0] : void 0;
        while (hookInfo.currentIndex < handlers.length) {
          const handler = handlers[hookInfo.currentIndex];
          result = handler.callback.apply(null, args);
          if (returnFirstArg) {
            args[0] = result;
          }
          hookInfo.currentIndex++;
        }
        return returnFirstArg ? result : void 0;
      } finally {
        hooksStore.__current.delete(hookInfo);
      }
    }
    return (async ? asyncRunner : syncRunner)();
  };
}
var createRunHook_default = createRunHook;

// ../../node_modules/@wordpress/hooks/build-module/createCurrentHook.js
function createCurrentHook(hooks, storeKey) {
  return function currentHook() {
    var _currentArray$at$name;
    const hooksStore = hooks[storeKey];
    const currentArray = Array.from(hooksStore.__current);
    return (_currentArray$at$name = currentArray.at(-1)?.name) !== null && _currentArray$at$name !== void 0 ? _currentArray$at$name : null;
  };
}
var createCurrentHook_default = createCurrentHook;

// ../../node_modules/@wordpress/hooks/build-module/createDoingHook.js
function createDoingHook(hooks, storeKey) {
  return function doingHook(hookName) {
    const hooksStore = hooks[storeKey];
    if ("undefined" === typeof hookName) {
      return hooksStore.__current.size > 0;
    }
    return Array.from(hooksStore.__current).some((hook) => hook.name === hookName);
  };
}
var createDoingHook_default = createDoingHook;

// ../../node_modules/@wordpress/hooks/build-module/createDidHook.js
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

// ../../node_modules/@wordpress/hooks/build-module/createHooks.js
var _Hooks = class {
  constructor() {
    this.actions = /* @__PURE__ */ Object.create(null);
    this.actions.__current = /* @__PURE__ */ new Set();
    this.filters = /* @__PURE__ */ Object.create(null);
    this.filters.__current = /* @__PURE__ */ new Set();
    this.addAction = createAddHook_default(this, "actions");
    this.addFilter = createAddHook_default(this, "filters");
    this.removeAction = createRemoveHook_default(this, "actions");
    this.removeFilter = createRemoveHook_default(this, "filters");
    this.hasAction = createHasHook_default(this, "actions");
    this.hasFilter = createHasHook_default(this, "filters");
    this.removeAllActions = createRemoveHook_default(this, "actions", true);
    this.removeAllFilters = createRemoveHook_default(this, "filters", true);
    this.doAction = createRunHook_default(this, "actions", false, false);
    this.doActionAsync = createRunHook_default(this, "actions", false, true);
    this.applyFilters = createRunHook_default(this, "filters", true, false);
    this.applyFiltersAsync = createRunHook_default(this, "filters", true, true);
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

// ../../node_modules/@wordpress/hooks/build-module/index.js
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
  doActionAsync,
  applyFilters,
  applyFiltersAsync,
  currentAction,
  currentFilter,
  doingAction,
  doingFilter,
  didAction,
  didFilter,
  actions,
  filters
} = defaultHooks;

export {
  createHooks_default,
  defaultHooks,
  addAction,
  addFilter,
  removeAction,
  removeFilter,
  hasAction,
  hasFilter,
  removeAllActions,
  removeAllFilters,
  doAction,
  doActionAsync,
  applyFilters,
  applyFiltersAsync,
  currentAction,
  currentFilter,
  doingAction,
  doingFilter,
  didAction,
  didFilter,
  actions,
  filters
};
//# sourceMappingURL=chunk-4FYQPERE.js.map
