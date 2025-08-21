import {
  memize,
  require_sprintf
} from "./chunk-RHY2OXSA.js";
import {
  Tannin
} from "./chunk-VCN4ELHL.js";
import {
  __toESM
} from "./chunk-OL46QLBJ.js";

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
    listeners.forEach((listener) => listener());
  };
  const subscribe2 = (callback) => {
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
  const isRTL2 = () => {
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
    subscribe: subscribe2,
    __: __2,
    _x: _x2,
    _n: _n2,
    _nx: _nx2,
    isRTL: isRTL2,
    hasTranslation: hasTranslation2
  };
};

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/validateNamespace.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/validateHookName.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createAddHook.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createRemoveHook.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createHasHook.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createRunHook.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createCurrentHook.js
function createCurrentHook(hooks, storeKey) {
  return function currentHook() {
    var _a;
    var _hooksStore$__current;
    const hooksStore = hooks[storeKey];
    return (_hooksStore$__current = (_a = hooksStore.__current[hooksStore.__current.length - 1]) == null ? void 0 : _a.name) !== null && _hooksStore$__current !== void 0 ? _hooksStore$__current : null;
  };
}
var createCurrentHook_default = createCurrentHook;

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createDoingHook.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createDidHook.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/createHooks.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/hooks/build-module/index.js
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

// ../../node_modules/@wordpress/keycodes/node_modules/@wordpress/i18n/build-module/default-i18n.js
var i18n = createI18n(void 0, void 0, defaultHooks);
var getLocaleData = i18n.getLocaleData.bind(i18n);
var setLocaleData = i18n.setLocaleData.bind(i18n);
var resetLocaleData = i18n.resetLocaleData.bind(i18n);
var subscribe = i18n.subscribe.bind(i18n);
var __ = i18n.__.bind(i18n);
var _x = i18n._x.bind(i18n);
var _n = i18n._n.bind(i18n);
var _nx = i18n._nx.bind(i18n);
var isRTL = i18n.isRTL.bind(i18n);
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
var F10 = 121;
var ALT = "alt";
var CTRL = "ctrl";
var COMMAND = "meta";
var SHIFT = "shift";
var ZERO = 48;
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

export {
  isAppleOS,
  BACKSPACE,
  TAB,
  ENTER,
  ESCAPE,
  SPACE,
  PAGEUP,
  PAGEDOWN,
  END,
  HOME,
  LEFT,
  UP,
  RIGHT,
  DOWN,
  DELETE,
  F10,
  ALT,
  CTRL,
  COMMAND,
  SHIFT,
  ZERO,
  modifiers,
  rawShortcut,
  displayShortcutList,
  displayShortcut,
  shortcutAriaLabel,
  isKeyboardEvent
};
//# sourceMappingURL=chunk-TYICW4ZW.js.map
