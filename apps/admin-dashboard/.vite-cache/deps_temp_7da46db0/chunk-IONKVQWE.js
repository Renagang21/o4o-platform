import {
  RichTextData,
  a11y_default,
  decodeEntities,
  k,
  memize,
  names_default,
  require_es6,
  require_remove_accents,
  require_sprintf,
  w,
  warning
} from "./chunk-XKH3TMBG.js";
import {
  v4_default
} from "./chunk-JNUZ4ZPW.js";
import {
  __dangerousOptInToUnstableAPIsOnlyForCoreModules,
  combineReducers,
  createReduxStore,
  deprecated,
  dispatch,
  getPhrasingContentSchema,
  isEmpty,
  isPhrasingContent,
  isShallowEqual,
  isTextContent,
  register,
  rememo_default,
  remove,
  removeInvalidHTML,
  replace,
  replaceTag,
  select,
  stripHTML,
  unwrap,
  wrap
} from "./chunk-6PYQ5DCB.js";
import {
  Tannin,
  applyFilters,
  createHooks_default,
  defaultHooks,
  hasFilter
} from "./chunk-VY73N4T2.js";
import {
  camelCase,
  escapeAttribute,
  escapeHTML,
  isPlainObject,
  isValidAttributeName,
  paramCase
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

// ../../node_modules/@wordpress/blocks/node_modules/react-is/cjs/react-is.development.js
var require_react_is_development = __commonJS({
  "../../node_modules/@wordpress/blocks/node_modules/react-is/cjs/react-is.development.js"(exports) {
    "use strict";
    if (true) {
      (function() {
        "use strict";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_SERVER_CONTEXT_TYPE = Symbol.for("react.server_context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType2(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function typeOf(object) {
          if (typeof object === "object" && object !== null) {
            var $$typeof = object.$$typeof;
            switch ($$typeof) {
              case REACT_ELEMENT_TYPE:
                var type = object.type;
                switch (type) {
                  case REACT_FRAGMENT_TYPE:
                  case REACT_PROFILER_TYPE:
                  case REACT_STRICT_MODE_TYPE:
                  case REACT_SUSPENSE_TYPE:
                  case REACT_SUSPENSE_LIST_TYPE:
                    return type;
                  default:
                    var $$typeofType = type && type.$$typeof;
                    switch ($$typeofType) {
                      case REACT_SERVER_CONTEXT_TYPE:
                      case REACT_CONTEXT_TYPE:
                      case REACT_FORWARD_REF_TYPE:
                      case REACT_LAZY_TYPE:
                      case REACT_MEMO_TYPE:
                      case REACT_PROVIDER_TYPE:
                        return $$typeofType;
                      default:
                        return $$typeof;
                    }
                }
              case REACT_PORTAL_TYPE:
                return $$typeof;
            }
          }
          return void 0;
        }
        var ContextConsumer = REACT_CONTEXT_TYPE;
        var ContextProvider = REACT_PROVIDER_TYPE;
        var Element = REACT_ELEMENT_TYPE;
        var ForwardRef2 = REACT_FORWARD_REF_TYPE;
        var Fragment2 = REACT_FRAGMENT_TYPE;
        var Lazy = REACT_LAZY_TYPE;
        var Memo = REACT_MEMO_TYPE;
        var Portal = REACT_PORTAL_TYPE;
        var Profiler = REACT_PROFILER_TYPE;
        var StrictMode2 = REACT_STRICT_MODE_TYPE;
        var Suspense2 = REACT_SUSPENSE_TYPE;
        var SuspenseList = REACT_SUSPENSE_LIST_TYPE;
        var hasWarnedAboutDeprecatedIsAsyncMode = false;
        var hasWarnedAboutDeprecatedIsConcurrentMode = false;
        function isAsyncMode(object) {
          {
            if (!hasWarnedAboutDeprecatedIsAsyncMode) {
              hasWarnedAboutDeprecatedIsAsyncMode = true;
              console["warn"]("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 18+.");
            }
          }
          return false;
        }
        function isConcurrentMode(object) {
          {
            if (!hasWarnedAboutDeprecatedIsConcurrentMode) {
              hasWarnedAboutDeprecatedIsConcurrentMode = true;
              console["warn"]("The ReactIs.isConcurrentMode() alias has been deprecated, and will be removed in React 18+.");
            }
          }
          return false;
        }
        function isContextConsumer(object) {
          return typeOf(object) === REACT_CONTEXT_TYPE;
        }
        function isContextProvider(object) {
          return typeOf(object) === REACT_PROVIDER_TYPE;
        }
        function isElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        function isForwardRef(object) {
          return typeOf(object) === REACT_FORWARD_REF_TYPE;
        }
        function isFragment(object) {
          return typeOf(object) === REACT_FRAGMENT_TYPE;
        }
        function isLazy(object) {
          return typeOf(object) === REACT_LAZY_TYPE;
        }
        function isMemo(object) {
          return typeOf(object) === REACT_MEMO_TYPE;
        }
        function isPortal(object) {
          return typeOf(object) === REACT_PORTAL_TYPE;
        }
        function isProfiler(object) {
          return typeOf(object) === REACT_PROFILER_TYPE;
        }
        function isStrictMode(object) {
          return typeOf(object) === REACT_STRICT_MODE_TYPE;
        }
        function isSuspense(object) {
          return typeOf(object) === REACT_SUSPENSE_TYPE;
        }
        function isSuspenseList(object) {
          return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
        }
        exports.ContextConsumer = ContextConsumer;
        exports.ContextProvider = ContextProvider;
        exports.Element = Element;
        exports.ForwardRef = ForwardRef2;
        exports.Fragment = Fragment2;
        exports.Lazy = Lazy;
        exports.Memo = Memo;
        exports.Portal = Portal;
        exports.Profiler = Profiler;
        exports.StrictMode = StrictMode2;
        exports.Suspense = Suspense2;
        exports.SuspenseList = SuspenseList;
        exports.isAsyncMode = isAsyncMode;
        exports.isConcurrentMode = isConcurrentMode;
        exports.isContextConsumer = isContextConsumer;
        exports.isContextProvider = isContextProvider;
        exports.isElement = isElement;
        exports.isForwardRef = isForwardRef;
        exports.isFragment = isFragment;
        exports.isLazy = isLazy;
        exports.isMemo = isMemo;
        exports.isPortal = isPortal;
        exports.isProfiler = isProfiler;
        exports.isStrictMode = isStrictMode;
        exports.isSuspense = isSuspense;
        exports.isSuspenseList = isSuspenseList;
        exports.isValidElementType = isValidElementType2;
        exports.typeOf = typeOf;
      })();
    }
  }
});

// ../../node_modules/@wordpress/blocks/node_modules/react-is/index.js
var require_react_is = __commonJS({
  "../../node_modules/@wordpress/blocks/node_modules/react-is/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_is_development();
    }
  }
});

// ../../node_modules/showdown/dist/showdown.js
var require_showdown = __commonJS({
  "../../node_modules/showdown/dist/showdown.js"(exports, module) {
    (function() {
      function getDefaultOpts(simple) {
        "use strict";
        var defaultOptions = {
          omitExtraWLInCodeBlocks: {
            defaultValue: false,
            describe: "Omit the default extra whiteline added to code blocks",
            type: "boolean"
          },
          noHeaderId: {
            defaultValue: false,
            describe: "Turn on/off generated header id",
            type: "boolean"
          },
          prefixHeaderId: {
            defaultValue: false,
            describe: "Add a prefix to the generated header ids. Passing a string will prefix that string to the header id. Setting to true will add a generic 'section-' prefix",
            type: "string"
          },
          rawPrefixHeaderId: {
            defaultValue: false,
            describe: 'Setting this option to true will prevent showdown from modifying the prefix. This might result in malformed IDs (if, for instance, the " char is used in the prefix)',
            type: "boolean"
          },
          ghCompatibleHeaderId: {
            defaultValue: false,
            describe: "Generate header ids compatible with github style (spaces are replaced with dashes, a bunch of non alphanumeric chars are removed)",
            type: "boolean"
          },
          rawHeaderId: {
            defaultValue: false,
            describe: `Remove only spaces, ' and " from generated header ids (including prefixes), replacing them with dashes (-). WARNING: This might result in malformed ids`,
            type: "boolean"
          },
          headerLevelStart: {
            defaultValue: false,
            describe: "The header blocks level start",
            type: "integer"
          },
          parseImgDimensions: {
            defaultValue: false,
            describe: "Turn on/off image dimension parsing",
            type: "boolean"
          },
          simplifiedAutoLink: {
            defaultValue: false,
            describe: "Turn on/off GFM autolink style",
            type: "boolean"
          },
          excludeTrailingPunctuationFromURLs: {
            defaultValue: false,
            describe: "Excludes trailing punctuation from links generated with autoLinking",
            type: "boolean"
          },
          literalMidWordUnderscores: {
            defaultValue: false,
            describe: "Parse midword underscores as literal underscores",
            type: "boolean"
          },
          literalMidWordAsterisks: {
            defaultValue: false,
            describe: "Parse midword asterisks as literal asterisks",
            type: "boolean"
          },
          strikethrough: {
            defaultValue: false,
            describe: "Turn on/off strikethrough support",
            type: "boolean"
          },
          tables: {
            defaultValue: false,
            describe: "Turn on/off tables support",
            type: "boolean"
          },
          tablesHeaderId: {
            defaultValue: false,
            describe: "Add an id to table headers",
            type: "boolean"
          },
          ghCodeBlocks: {
            defaultValue: true,
            describe: "Turn on/off GFM fenced code blocks support",
            type: "boolean"
          },
          tasklists: {
            defaultValue: false,
            describe: "Turn on/off GFM tasklist support",
            type: "boolean"
          },
          smoothLivePreview: {
            defaultValue: false,
            describe: "Prevents weird effects in live previews due to incomplete input",
            type: "boolean"
          },
          smartIndentationFix: {
            defaultValue: false,
            description: "Tries to smartly fix indentation in es6 strings",
            type: "boolean"
          },
          disableForced4SpacesIndentedSublists: {
            defaultValue: false,
            description: "Disables the requirement of indenting nested sublists by 4 spaces",
            type: "boolean"
          },
          simpleLineBreaks: {
            defaultValue: false,
            description: "Parses simple line breaks as <br> (GFM Style)",
            type: "boolean"
          },
          requireSpaceBeforeHeadingText: {
            defaultValue: false,
            description: "Makes adding a space between `#` and the header text mandatory (GFM Style)",
            type: "boolean"
          },
          ghMentions: {
            defaultValue: false,
            description: "Enables github @mentions",
            type: "boolean"
          },
          ghMentionsLink: {
            defaultValue: "https://github.com/{u}",
            description: "Changes the link generated by @mentions. Only applies if ghMentions option is enabled.",
            type: "string"
          },
          encodeEmails: {
            defaultValue: true,
            description: "Encode e-mail addresses through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities",
            type: "boolean"
          },
          openLinksInNewWindow: {
            defaultValue: false,
            description: "Open all links in new windows",
            type: "boolean"
          },
          backslashEscapesHTMLTags: {
            defaultValue: false,
            description: "Support for HTML Tag escaping. ex: <div>foo</div>",
            type: "boolean"
          },
          emoji: {
            defaultValue: false,
            description: "Enable emoji support. Ex: `this is a :smile: emoji`",
            type: "boolean"
          },
          underline: {
            defaultValue: false,
            description: "Enable support for underline. Syntax is double or triple underscores: `__underline word__`. With this option enabled, underscores no longer parses into `<em>` and `<strong>`",
            type: "boolean"
          },
          completeHTMLDocument: {
            defaultValue: false,
            description: "Outputs a complete html document, including `<html>`, `<head>` and `<body>` tags",
            type: "boolean"
          },
          metadata: {
            defaultValue: false,
            description: "Enable support for document metadata (defined at the top of the document between `«««` and `»»»` or between `---` and `---`).",
            type: "boolean"
          },
          splitAdjacentBlockquotes: {
            defaultValue: false,
            description: "Split adjacent blockquote blocks",
            type: "boolean"
          }
        };
        if (simple === false) {
          return JSON.parse(JSON.stringify(defaultOptions));
        }
        var ret = {};
        for (var opt in defaultOptions) {
          if (defaultOptions.hasOwnProperty(opt)) {
            ret[opt] = defaultOptions[opt].defaultValue;
          }
        }
        return ret;
      }
      function allOptionsOn() {
        "use strict";
        var options = getDefaultOpts(true), ret = {};
        for (var opt in options) {
          if (options.hasOwnProperty(opt)) {
            ret[opt] = true;
          }
        }
        return ret;
      }
      var showdown2 = {}, parsers = {}, extensions = {}, globalOptions = getDefaultOpts(true), setFlavor = "vanilla", flavor = {
        github: {
          omitExtraWLInCodeBlocks: true,
          simplifiedAutoLink: true,
          excludeTrailingPunctuationFromURLs: true,
          literalMidWordUnderscores: true,
          strikethrough: true,
          tables: true,
          tablesHeaderId: true,
          ghCodeBlocks: true,
          tasklists: true,
          disableForced4SpacesIndentedSublists: true,
          simpleLineBreaks: true,
          requireSpaceBeforeHeadingText: true,
          ghCompatibleHeaderId: true,
          ghMentions: true,
          backslashEscapesHTMLTags: true,
          emoji: true,
          splitAdjacentBlockquotes: true
        },
        original: {
          noHeaderId: true,
          ghCodeBlocks: false
        },
        ghost: {
          omitExtraWLInCodeBlocks: true,
          parseImgDimensions: true,
          simplifiedAutoLink: true,
          excludeTrailingPunctuationFromURLs: true,
          literalMidWordUnderscores: true,
          strikethrough: true,
          tables: true,
          tablesHeaderId: true,
          ghCodeBlocks: true,
          tasklists: true,
          smoothLivePreview: true,
          simpleLineBreaks: true,
          requireSpaceBeforeHeadingText: true,
          ghMentions: false,
          encodeEmails: true
        },
        vanilla: getDefaultOpts(true),
        allOn: allOptionsOn()
      };
      showdown2.helper = {};
      showdown2.extensions = {};
      showdown2.setOption = function(key, value) {
        "use strict";
        globalOptions[key] = value;
        return this;
      };
      showdown2.getOption = function(key) {
        "use strict";
        return globalOptions[key];
      };
      showdown2.getOptions = function() {
        "use strict";
        return globalOptions;
      };
      showdown2.resetOptions = function() {
        "use strict";
        globalOptions = getDefaultOpts(true);
      };
      showdown2.setFlavor = function(name) {
        "use strict";
        if (!flavor.hasOwnProperty(name)) {
          throw Error(name + " flavor was not found");
        }
        showdown2.resetOptions();
        var preset = flavor[name];
        setFlavor = name;
        for (var option in preset) {
          if (preset.hasOwnProperty(option)) {
            globalOptions[option] = preset[option];
          }
        }
      };
      showdown2.getFlavor = function() {
        "use strict";
        return setFlavor;
      };
      showdown2.getFlavorOptions = function(name) {
        "use strict";
        if (flavor.hasOwnProperty(name)) {
          return flavor[name];
        }
      };
      showdown2.getDefaultOptions = function(simple) {
        "use strict";
        return getDefaultOpts(simple);
      };
      showdown2.subParser = function(name, func) {
        "use strict";
        if (showdown2.helper.isString(name)) {
          if (typeof func !== "undefined") {
            parsers[name] = func;
          } else {
            if (parsers.hasOwnProperty(name)) {
              return parsers[name];
            } else {
              throw Error("SubParser named " + name + " not registered!");
            }
          }
        }
      };
      showdown2.extension = function(name, ext) {
        "use strict";
        if (!showdown2.helper.isString(name)) {
          throw Error("Extension 'name' must be a string");
        }
        name = showdown2.helper.stdExtName(name);
        if (showdown2.helper.isUndefined(ext)) {
          if (!extensions.hasOwnProperty(name)) {
            throw Error("Extension named " + name + " is not registered!");
          }
          return extensions[name];
        } else {
          if (typeof ext === "function") {
            ext = ext();
          }
          if (!showdown2.helper.isArray(ext)) {
            ext = [ext];
          }
          var validExtension = validate(ext, name);
          if (validExtension.valid) {
            extensions[name] = ext;
          } else {
            throw Error(validExtension.error);
          }
        }
      };
      showdown2.getAllExtensions = function() {
        "use strict";
        return extensions;
      };
      showdown2.removeExtension = function(name) {
        "use strict";
        delete extensions[name];
      };
      showdown2.resetExtensions = function() {
        "use strict";
        extensions = {};
      };
      function validate(extension, name) {
        "use strict";
        var errMsg = name ? "Error in " + name + " extension->" : "Error in unnamed extension", ret = {
          valid: true,
          error: ""
        };
        if (!showdown2.helper.isArray(extension)) {
          extension = [extension];
        }
        for (var i = 0; i < extension.length; ++i) {
          var baseMsg = errMsg + " sub-extension " + i + ": ", ext = extension[i];
          if (typeof ext !== "object") {
            ret.valid = false;
            ret.error = baseMsg + "must be an object, but " + typeof ext + " given";
            return ret;
          }
          if (!showdown2.helper.isString(ext.type)) {
            ret.valid = false;
            ret.error = baseMsg + 'property "type" must be a string, but ' + typeof ext.type + " given";
            return ret;
          }
          var type = ext.type = ext.type.toLowerCase();
          if (type === "language") {
            type = ext.type = "lang";
          }
          if (type === "html") {
            type = ext.type = "output";
          }
          if (type !== "lang" && type !== "output" && type !== "listener") {
            ret.valid = false;
            ret.error = baseMsg + "type " + type + ' is not recognized. Valid values: "lang/language", "output/html" or "listener"';
            return ret;
          }
          if (type === "listener") {
            if (showdown2.helper.isUndefined(ext.listeners)) {
              ret.valid = false;
              ret.error = baseMsg + '. Extensions of type "listener" must have a property called "listeners"';
              return ret;
            }
          } else {
            if (showdown2.helper.isUndefined(ext.filter) && showdown2.helper.isUndefined(ext.regex)) {
              ret.valid = false;
              ret.error = baseMsg + type + ' extensions must define either a "regex" property or a "filter" method';
              return ret;
            }
          }
          if (ext.listeners) {
            if (typeof ext.listeners !== "object") {
              ret.valid = false;
              ret.error = baseMsg + '"listeners" property must be an object but ' + typeof ext.listeners + " given";
              return ret;
            }
            for (var ln in ext.listeners) {
              if (ext.listeners.hasOwnProperty(ln)) {
                if (typeof ext.listeners[ln] !== "function") {
                  ret.valid = false;
                  ret.error = baseMsg + '"listeners" property must be an hash of [event name]: [callback]. listeners.' + ln + " must be a function but " + typeof ext.listeners[ln] + " given";
                  return ret;
                }
              }
            }
          }
          if (ext.filter) {
            if (typeof ext.filter !== "function") {
              ret.valid = false;
              ret.error = baseMsg + '"filter" must be a function, but ' + typeof ext.filter + " given";
              return ret;
            }
          } else if (ext.regex) {
            if (showdown2.helper.isString(ext.regex)) {
              ext.regex = new RegExp(ext.regex, "g");
            }
            if (!(ext.regex instanceof RegExp)) {
              ret.valid = false;
              ret.error = baseMsg + '"regex" property must either be a string or a RegExp object, but ' + typeof ext.regex + " given";
              return ret;
            }
            if (showdown2.helper.isUndefined(ext.replace)) {
              ret.valid = false;
              ret.error = baseMsg + '"regex" extensions must implement a replace string or function';
              return ret;
            }
          }
        }
        return ret;
      }
      showdown2.validateExtension = function(ext) {
        "use strict";
        var validateExtension = validate(ext, null);
        if (!validateExtension.valid) {
          console.warn(validateExtension.error);
          return false;
        }
        return true;
      };
      if (!showdown2.hasOwnProperty("helper")) {
        showdown2.helper = {};
      }
      showdown2.helper.isString = function(a) {
        "use strict";
        return typeof a === "string" || a instanceof String;
      };
      showdown2.helper.isFunction = function(a) {
        "use strict";
        var getType = {};
        return a && getType.toString.call(a) === "[object Function]";
      };
      showdown2.helper.isArray = function(a) {
        "use strict";
        return Array.isArray(a);
      };
      showdown2.helper.isUndefined = function(value) {
        "use strict";
        return typeof value === "undefined";
      };
      showdown2.helper.forEach = function(obj, callback) {
        "use strict";
        if (showdown2.helper.isUndefined(obj)) {
          throw new Error("obj param is required");
        }
        if (showdown2.helper.isUndefined(callback)) {
          throw new Error("callback param is required");
        }
        if (!showdown2.helper.isFunction(callback)) {
          throw new Error("callback param must be a function/closure");
        }
        if (typeof obj.forEach === "function") {
          obj.forEach(callback);
        } else if (showdown2.helper.isArray(obj)) {
          for (var i = 0; i < obj.length; i++) {
            callback(obj[i], i, obj);
          }
        } else if (typeof obj === "object") {
          for (var prop2 in obj) {
            if (obj.hasOwnProperty(prop2)) {
              callback(obj[prop2], prop2, obj);
            }
          }
        } else {
          throw new Error("obj does not seem to be an array or an iterable object");
        }
      };
      showdown2.helper.stdExtName = function(s) {
        "use strict";
        return s.replace(/[_?*+\/\\.^-]/g, "").replace(/\s/g, "").toLowerCase();
      };
      function escapeCharactersCallback(wholeMatch, m1) {
        "use strict";
        var charCodeToEscape = m1.charCodeAt(0);
        return "¨E" + charCodeToEscape + "E";
      }
      showdown2.helper.escapeCharactersCallback = escapeCharactersCallback;
      showdown2.helper.escapeCharacters = function(text2, charsToEscape, afterBackslash) {
        "use strict";
        var regexString = "([" + charsToEscape.replace(/([\[\]\\])/g, "\\$1") + "])";
        if (afterBackslash) {
          regexString = "\\\\" + regexString;
        }
        var regex = new RegExp(regexString, "g");
        text2 = text2.replace(regex, escapeCharactersCallback);
        return text2;
      };
      showdown2.helper.unescapeHTMLEntities = function(txt) {
        "use strict";
        return txt.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      };
      var rgxFindMatchPos = function(str, left, right, flags) {
        "use strict";
        var f = flags || "", g = f.indexOf("g") > -1, x = new RegExp(left + "|" + right, "g" + f.replace(/g/g, "")), l = new RegExp(left, f.replace(/g/g, "")), pos = [], t, s, m, start, end;
        do {
          t = 0;
          while (m = x.exec(str)) {
            if (l.test(m[0])) {
              if (!t++) {
                s = x.lastIndex;
                start = s - m[0].length;
              }
            } else if (t) {
              if (!--t) {
                end = m.index + m[0].length;
                var obj = {
                  left: { start, end: s },
                  match: { start: s, end: m.index },
                  right: { start: m.index, end },
                  wholeMatch: { start, end }
                };
                pos.push(obj);
                if (!g) {
                  return pos;
                }
              }
            }
          }
        } while (t && (x.lastIndex = s));
        return pos;
      };
      showdown2.helper.matchRecursiveRegExp = function(str, left, right, flags) {
        "use strict";
        var matchPos = rgxFindMatchPos(str, left, right, flags), results = [];
        for (var i = 0; i < matchPos.length; ++i) {
          results.push([
            str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
            str.slice(matchPos[i].match.start, matchPos[i].match.end),
            str.slice(matchPos[i].left.start, matchPos[i].left.end),
            str.slice(matchPos[i].right.start, matchPos[i].right.end)
          ]);
        }
        return results;
      };
      showdown2.helper.replaceRecursiveRegExp = function(str, replacement, left, right, flags) {
        "use strict";
        if (!showdown2.helper.isFunction(replacement)) {
          var repStr = replacement;
          replacement = function() {
            return repStr;
          };
        }
        var matchPos = rgxFindMatchPos(str, left, right, flags), finalStr = str, lng = matchPos.length;
        if (lng > 0) {
          var bits = [];
          if (matchPos[0].wholeMatch.start !== 0) {
            bits.push(str.slice(0, matchPos[0].wholeMatch.start));
          }
          for (var i = 0; i < lng; ++i) {
            bits.push(
              replacement(
                str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
                str.slice(matchPos[i].match.start, matchPos[i].match.end),
                str.slice(matchPos[i].left.start, matchPos[i].left.end),
                str.slice(matchPos[i].right.start, matchPos[i].right.end)
              )
            );
            if (i < lng - 1) {
              bits.push(str.slice(matchPos[i].wholeMatch.end, matchPos[i + 1].wholeMatch.start));
            }
          }
          if (matchPos[lng - 1].wholeMatch.end < str.length) {
            bits.push(str.slice(matchPos[lng - 1].wholeMatch.end));
          }
          finalStr = bits.join("");
        }
        return finalStr;
      };
      showdown2.helper.regexIndexOf = function(str, regex, fromIndex) {
        "use strict";
        if (!showdown2.helper.isString(str)) {
          throw "InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string";
        }
        if (regex instanceof RegExp === false) {
          throw "InvalidArgumentError: second parameter of showdown.helper.regexIndexOf function must be an instance of RegExp";
        }
        var indexOf = str.substring(fromIndex || 0).search(regex);
        return indexOf >= 0 ? indexOf + (fromIndex || 0) : indexOf;
      };
      showdown2.helper.splitAtIndex = function(str, index) {
        "use strict";
        if (!showdown2.helper.isString(str)) {
          throw "InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string";
        }
        return [str.substring(0, index), str.substring(index)];
      };
      showdown2.helper.encodeEmailAddress = function(mail) {
        "use strict";
        var encode = [
          function(ch) {
            return "&#" + ch.charCodeAt(0) + ";";
          },
          function(ch) {
            return "&#x" + ch.charCodeAt(0).toString(16) + ";";
          },
          function(ch) {
            return ch;
          }
        ];
        mail = mail.replace(/./g, function(ch) {
          if (ch === "@") {
            ch = encode[Math.floor(Math.random() * 2)](ch);
          } else {
            var r = Math.random();
            ch = r > 0.9 ? encode[2](ch) : r > 0.45 ? encode[1](ch) : encode[0](ch);
          }
          return ch;
        });
        return mail;
      };
      showdown2.helper.padEnd = function padEnd(str, targetLength, padString) {
        "use strict";
        targetLength = targetLength >> 0;
        padString = String(padString || " ");
        if (str.length > targetLength) {
          return String(str);
        } else {
          targetLength = targetLength - str.length;
          if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length);
          }
          return String(str) + padString.slice(0, targetLength);
        }
      };
      if (typeof console === "undefined") {
        console = {
          warn: function(msg) {
            "use strict";
            alert(msg);
          },
          log: function(msg) {
            "use strict";
            alert(msg);
          },
          error: function(msg) {
            "use strict";
            throw msg;
          }
        };
      }
      showdown2.helper.regexes = {
        asteriskDashAndColon: /([*_:~])/g
      };
      showdown2.helper.emojis = {
        "+1": "👍",
        "-1": "👎",
        "100": "💯",
        "1234": "🔢",
        "1st_place_medal": "🥇",
        "2nd_place_medal": "🥈",
        "3rd_place_medal": "🥉",
        "8ball": "🎱",
        "a": "🅰️",
        "ab": "🆎",
        "abc": "🔤",
        "abcd": "🔡",
        "accept": "🉑",
        "aerial_tramway": "🚡",
        "airplane": "✈️",
        "alarm_clock": "⏰",
        "alembic": "⚗️",
        "alien": "👽",
        "ambulance": "🚑",
        "amphora": "🏺",
        "anchor": "⚓️",
        "angel": "👼",
        "anger": "💢",
        "angry": "😠",
        "anguished": "😧",
        "ant": "🐜",
        "apple": "🍎",
        "aquarius": "♒️",
        "aries": "♈️",
        "arrow_backward": "◀️",
        "arrow_double_down": "⏬",
        "arrow_double_up": "⏫",
        "arrow_down": "⬇️",
        "arrow_down_small": "🔽",
        "arrow_forward": "▶️",
        "arrow_heading_down": "⤵️",
        "arrow_heading_up": "⤴️",
        "arrow_left": "⬅️",
        "arrow_lower_left": "↙️",
        "arrow_lower_right": "↘️",
        "arrow_right": "➡️",
        "arrow_right_hook": "↪️",
        "arrow_up": "⬆️",
        "arrow_up_down": "↕️",
        "arrow_up_small": "🔼",
        "arrow_upper_left": "↖️",
        "arrow_upper_right": "↗️",
        "arrows_clockwise": "🔃",
        "arrows_counterclockwise": "🔄",
        "art": "🎨",
        "articulated_lorry": "🚛",
        "artificial_satellite": "🛰",
        "astonished": "😲",
        "athletic_shoe": "👟",
        "atm": "🏧",
        "atom_symbol": "⚛️",
        "avocado": "🥑",
        "b": "🅱️",
        "baby": "👶",
        "baby_bottle": "🍼",
        "baby_chick": "🐤",
        "baby_symbol": "🚼",
        "back": "🔙",
        "bacon": "🥓",
        "badminton": "🏸",
        "baggage_claim": "🛄",
        "baguette_bread": "🥖",
        "balance_scale": "⚖️",
        "balloon": "🎈",
        "ballot_box": "🗳",
        "ballot_box_with_check": "☑️",
        "bamboo": "🎍",
        "banana": "🍌",
        "bangbang": "‼️",
        "bank": "🏦",
        "bar_chart": "📊",
        "barber": "💈",
        "baseball": "⚾️",
        "basketball": "🏀",
        "basketball_man": "⛹️",
        "basketball_woman": "⛹️&zwj;♀️",
        "bat": "🦇",
        "bath": "🛀",
        "bathtub": "🛁",
        "battery": "🔋",
        "beach_umbrella": "🏖",
        "bear": "🐻",
        "bed": "🛏",
        "bee": "🐝",
        "beer": "🍺",
        "beers": "🍻",
        "beetle": "🐞",
        "beginner": "🔰",
        "bell": "🔔",
        "bellhop_bell": "🛎",
        "bento": "🍱",
        "biking_man": "🚴",
        "bike": "🚲",
        "biking_woman": "🚴&zwj;♀️",
        "bikini": "👙",
        "biohazard": "☣️",
        "bird": "🐦",
        "birthday": "🎂",
        "black_circle": "⚫️",
        "black_flag": "🏴",
        "black_heart": "🖤",
        "black_joker": "🃏",
        "black_large_square": "⬛️",
        "black_medium_small_square": "◾️",
        "black_medium_square": "◼️",
        "black_nib": "✒️",
        "black_small_square": "▪️",
        "black_square_button": "🔲",
        "blonde_man": "👱",
        "blonde_woman": "👱&zwj;♀️",
        "blossom": "🌼",
        "blowfish": "🐡",
        "blue_book": "📘",
        "blue_car": "🚙",
        "blue_heart": "💙",
        "blush": "😊",
        "boar": "🐗",
        "boat": "⛵️",
        "bomb": "💣",
        "book": "📖",
        "bookmark": "🔖",
        "bookmark_tabs": "📑",
        "books": "📚",
        "boom": "💥",
        "boot": "👢",
        "bouquet": "💐",
        "bowing_man": "🙇",
        "bow_and_arrow": "🏹",
        "bowing_woman": "🙇&zwj;♀️",
        "bowling": "🎳",
        "boxing_glove": "🥊",
        "boy": "👦",
        "bread": "🍞",
        "bride_with_veil": "👰",
        "bridge_at_night": "🌉",
        "briefcase": "💼",
        "broken_heart": "💔",
        "bug": "🐛",
        "building_construction": "🏗",
        "bulb": "💡",
        "bullettrain_front": "🚅",
        "bullettrain_side": "🚄",
        "burrito": "🌯",
        "bus": "🚌",
        "business_suit_levitating": "🕴",
        "busstop": "🚏",
        "bust_in_silhouette": "👤",
        "busts_in_silhouette": "👥",
        "butterfly": "🦋",
        "cactus": "🌵",
        "cake": "🍰",
        "calendar": "📆",
        "call_me_hand": "🤙",
        "calling": "📲",
        "camel": "🐫",
        "camera": "📷",
        "camera_flash": "📸",
        "camping": "🏕",
        "cancer": "♋️",
        "candle": "🕯",
        "candy": "🍬",
        "canoe": "🛶",
        "capital_abcd": "🔠",
        "capricorn": "♑️",
        "car": "🚗",
        "card_file_box": "🗃",
        "card_index": "📇",
        "card_index_dividers": "🗂",
        "carousel_horse": "🎠",
        "carrot": "🥕",
        "cat": "🐱",
        "cat2": "🐈",
        "cd": "💿",
        "chains": "⛓",
        "champagne": "🍾",
        "chart": "💹",
        "chart_with_downwards_trend": "📉",
        "chart_with_upwards_trend": "📈",
        "checkered_flag": "🏁",
        "cheese": "🧀",
        "cherries": "🍒",
        "cherry_blossom": "🌸",
        "chestnut": "🌰",
        "chicken": "🐔",
        "children_crossing": "🚸",
        "chipmunk": "🐿",
        "chocolate_bar": "🍫",
        "christmas_tree": "🎄",
        "church": "⛪️",
        "cinema": "🎦",
        "circus_tent": "🎪",
        "city_sunrise": "🌇",
        "city_sunset": "🌆",
        "cityscape": "🏙",
        "cl": "🆑",
        "clamp": "🗜",
        "clap": "👏",
        "clapper": "🎬",
        "classical_building": "🏛",
        "clinking_glasses": "🥂",
        "clipboard": "📋",
        "clock1": "🕐",
        "clock10": "🕙",
        "clock1030": "🕥",
        "clock11": "🕚",
        "clock1130": "🕦",
        "clock12": "🕛",
        "clock1230": "🕧",
        "clock130": "🕜",
        "clock2": "🕑",
        "clock230": "🕝",
        "clock3": "🕒",
        "clock330": "🕞",
        "clock4": "🕓",
        "clock430": "🕟",
        "clock5": "🕔",
        "clock530": "🕠",
        "clock6": "🕕",
        "clock630": "🕡",
        "clock7": "🕖",
        "clock730": "🕢",
        "clock8": "🕗",
        "clock830": "🕣",
        "clock9": "🕘",
        "clock930": "🕤",
        "closed_book": "📕",
        "closed_lock_with_key": "🔐",
        "closed_umbrella": "🌂",
        "cloud": "☁️",
        "cloud_with_lightning": "🌩",
        "cloud_with_lightning_and_rain": "⛈",
        "cloud_with_rain": "🌧",
        "cloud_with_snow": "🌨",
        "clown_face": "🤡",
        "clubs": "♣️",
        "cocktail": "🍸",
        "coffee": "☕️",
        "coffin": "⚰️",
        "cold_sweat": "😰",
        "comet": "☄️",
        "computer": "💻",
        "computer_mouse": "🖱",
        "confetti_ball": "🎊",
        "confounded": "😖",
        "confused": "😕",
        "congratulations": "㊗️",
        "construction": "🚧",
        "construction_worker_man": "👷",
        "construction_worker_woman": "👷&zwj;♀️",
        "control_knobs": "🎛",
        "convenience_store": "🏪",
        "cookie": "🍪",
        "cool": "🆒",
        "policeman": "👮",
        "copyright": "©️",
        "corn": "🌽",
        "couch_and_lamp": "🛋",
        "couple": "👫",
        "couple_with_heart_woman_man": "💑",
        "couple_with_heart_man_man": "👨&zwj;❤️&zwj;👨",
        "couple_with_heart_woman_woman": "👩&zwj;❤️&zwj;👩",
        "couplekiss_man_man": "👨&zwj;❤️&zwj;💋&zwj;👨",
        "couplekiss_man_woman": "💏",
        "couplekiss_woman_woman": "👩&zwj;❤️&zwj;💋&zwj;👩",
        "cow": "🐮",
        "cow2": "🐄",
        "cowboy_hat_face": "🤠",
        "crab": "🦀",
        "crayon": "🖍",
        "credit_card": "💳",
        "crescent_moon": "🌙",
        "cricket": "🏏",
        "crocodile": "🐊",
        "croissant": "🥐",
        "crossed_fingers": "🤞",
        "crossed_flags": "🎌",
        "crossed_swords": "⚔️",
        "crown": "👑",
        "cry": "😢",
        "crying_cat_face": "😿",
        "crystal_ball": "🔮",
        "cucumber": "🥒",
        "cupid": "💘",
        "curly_loop": "➰",
        "currency_exchange": "💱",
        "curry": "🍛",
        "custard": "🍮",
        "customs": "🛃",
        "cyclone": "🌀",
        "dagger": "🗡",
        "dancer": "💃",
        "dancing_women": "👯",
        "dancing_men": "👯&zwj;♂️",
        "dango": "🍡",
        "dark_sunglasses": "🕶",
        "dart": "🎯",
        "dash": "💨",
        "date": "📅",
        "deciduous_tree": "🌳",
        "deer": "🦌",
        "department_store": "🏬",
        "derelict_house": "🏚",
        "desert": "🏜",
        "desert_island": "🏝",
        "desktop_computer": "🖥",
        "male_detective": "🕵️",
        "diamond_shape_with_a_dot_inside": "💠",
        "diamonds": "♦️",
        "disappointed": "😞",
        "disappointed_relieved": "😥",
        "dizzy": "💫",
        "dizzy_face": "😵",
        "do_not_litter": "🚯",
        "dog": "🐶",
        "dog2": "🐕",
        "dollar": "💵",
        "dolls": "🎎",
        "dolphin": "🐬",
        "door": "🚪",
        "doughnut": "🍩",
        "dove": "🕊",
        "dragon": "🐉",
        "dragon_face": "🐲",
        "dress": "👗",
        "dromedary_camel": "🐪",
        "drooling_face": "🤤",
        "droplet": "💧",
        "drum": "🥁",
        "duck": "🦆",
        "dvd": "📀",
        "e-mail": "📧",
        "eagle": "🦅",
        "ear": "👂",
        "ear_of_rice": "🌾",
        "earth_africa": "🌍",
        "earth_americas": "🌎",
        "earth_asia": "🌏",
        "egg": "🥚",
        "eggplant": "🍆",
        "eight_pointed_black_star": "✴️",
        "eight_spoked_asterisk": "✳️",
        "electric_plug": "🔌",
        "elephant": "🐘",
        "email": "✉️",
        "end": "🔚",
        "envelope_with_arrow": "📩",
        "euro": "💶",
        "european_castle": "🏰",
        "european_post_office": "🏤",
        "evergreen_tree": "🌲",
        "exclamation": "❗️",
        "expressionless": "😑",
        "eye": "👁",
        "eye_speech_bubble": "👁&zwj;🗨",
        "eyeglasses": "👓",
        "eyes": "👀",
        "face_with_head_bandage": "🤕",
        "face_with_thermometer": "🤒",
        "fist_oncoming": "👊",
        "factory": "🏭",
        "fallen_leaf": "🍂",
        "family_man_woman_boy": "👪",
        "family_man_boy": "👨&zwj;👦",
        "family_man_boy_boy": "👨&zwj;👦&zwj;👦",
        "family_man_girl": "👨&zwj;👧",
        "family_man_girl_boy": "👨&zwj;👧&zwj;👦",
        "family_man_girl_girl": "👨&zwj;👧&zwj;👧",
        "family_man_man_boy": "👨&zwj;👨&zwj;👦",
        "family_man_man_boy_boy": "👨&zwj;👨&zwj;👦&zwj;👦",
        "family_man_man_girl": "👨&zwj;👨&zwj;👧",
        "family_man_man_girl_boy": "👨&zwj;👨&zwj;👧&zwj;👦",
        "family_man_man_girl_girl": "👨&zwj;👨&zwj;👧&zwj;👧",
        "family_man_woman_boy_boy": "👨&zwj;👩&zwj;👦&zwj;👦",
        "family_man_woman_girl": "👨&zwj;👩&zwj;👧",
        "family_man_woman_girl_boy": "👨&zwj;👩&zwj;👧&zwj;👦",
        "family_man_woman_girl_girl": "👨&zwj;👩&zwj;👧&zwj;👧",
        "family_woman_boy": "👩&zwj;👦",
        "family_woman_boy_boy": "👩&zwj;👦&zwj;👦",
        "family_woman_girl": "👩&zwj;👧",
        "family_woman_girl_boy": "👩&zwj;👧&zwj;👦",
        "family_woman_girl_girl": "👩&zwj;👧&zwj;👧",
        "family_woman_woman_boy": "👩&zwj;👩&zwj;👦",
        "family_woman_woman_boy_boy": "👩&zwj;👩&zwj;👦&zwj;👦",
        "family_woman_woman_girl": "👩&zwj;👩&zwj;👧",
        "family_woman_woman_girl_boy": "👩&zwj;👩&zwj;👧&zwj;👦",
        "family_woman_woman_girl_girl": "👩&zwj;👩&zwj;👧&zwj;👧",
        "fast_forward": "⏩",
        "fax": "📠",
        "fearful": "😨",
        "feet": "🐾",
        "female_detective": "🕵️&zwj;♀️",
        "ferris_wheel": "🎡",
        "ferry": "⛴",
        "field_hockey": "🏑",
        "file_cabinet": "🗄",
        "file_folder": "📁",
        "film_projector": "📽",
        "film_strip": "🎞",
        "fire": "🔥",
        "fire_engine": "🚒",
        "fireworks": "🎆",
        "first_quarter_moon": "🌓",
        "first_quarter_moon_with_face": "🌛",
        "fish": "🐟",
        "fish_cake": "🍥",
        "fishing_pole_and_fish": "🎣",
        "fist_raised": "✊",
        "fist_left": "🤛",
        "fist_right": "🤜",
        "flags": "🎏",
        "flashlight": "🔦",
        "fleur_de_lis": "⚜️",
        "flight_arrival": "🛬",
        "flight_departure": "🛫",
        "floppy_disk": "💾",
        "flower_playing_cards": "🎴",
        "flushed": "😳",
        "fog": "🌫",
        "foggy": "🌁",
        "football": "🏈",
        "footprints": "👣",
        "fork_and_knife": "🍴",
        "fountain": "⛲️",
        "fountain_pen": "🖋",
        "four_leaf_clover": "🍀",
        "fox_face": "🦊",
        "framed_picture": "🖼",
        "free": "🆓",
        "fried_egg": "🍳",
        "fried_shrimp": "🍤",
        "fries": "🍟",
        "frog": "🐸",
        "frowning": "😦",
        "frowning_face": "☹️",
        "frowning_man": "🙍&zwj;♂️",
        "frowning_woman": "🙍",
        "middle_finger": "🖕",
        "fuelpump": "⛽️",
        "full_moon": "🌕",
        "full_moon_with_face": "🌝",
        "funeral_urn": "⚱️",
        "game_die": "🎲",
        "gear": "⚙️",
        "gem": "💎",
        "gemini": "♊️",
        "ghost": "👻",
        "gift": "🎁",
        "gift_heart": "💝",
        "girl": "👧",
        "globe_with_meridians": "🌐",
        "goal_net": "🥅",
        "goat": "🐐",
        "golf": "⛳️",
        "golfing_man": "🏌️",
        "golfing_woman": "🏌️&zwj;♀️",
        "gorilla": "🦍",
        "grapes": "🍇",
        "green_apple": "🍏",
        "green_book": "📗",
        "green_heart": "💚",
        "green_salad": "🥗",
        "grey_exclamation": "❕",
        "grey_question": "❔",
        "grimacing": "😬",
        "grin": "😁",
        "grinning": "😀",
        "guardsman": "💂",
        "guardswoman": "💂&zwj;♀️",
        "guitar": "🎸",
        "gun": "🔫",
        "haircut_woman": "💇",
        "haircut_man": "💇&zwj;♂️",
        "hamburger": "🍔",
        "hammer": "🔨",
        "hammer_and_pick": "⚒",
        "hammer_and_wrench": "🛠",
        "hamster": "🐹",
        "hand": "✋",
        "handbag": "👜",
        "handshake": "🤝",
        "hankey": "💩",
        "hatched_chick": "🐥",
        "hatching_chick": "🐣",
        "headphones": "🎧",
        "hear_no_evil": "🙉",
        "heart": "❤️",
        "heart_decoration": "💟",
        "heart_eyes": "😍",
        "heart_eyes_cat": "😻",
        "heartbeat": "💓",
        "heartpulse": "💗",
        "hearts": "♥️",
        "heavy_check_mark": "✔️",
        "heavy_division_sign": "➗",
        "heavy_dollar_sign": "💲",
        "heavy_heart_exclamation": "❣️",
        "heavy_minus_sign": "➖",
        "heavy_multiplication_x": "✖️",
        "heavy_plus_sign": "➕",
        "helicopter": "🚁",
        "herb": "🌿",
        "hibiscus": "🌺",
        "high_brightness": "🔆",
        "high_heel": "👠",
        "hocho": "🔪",
        "hole": "🕳",
        "honey_pot": "🍯",
        "horse": "🐴",
        "horse_racing": "🏇",
        "hospital": "🏥",
        "hot_pepper": "🌶",
        "hotdog": "🌭",
        "hotel": "🏨",
        "hotsprings": "♨️",
        "hourglass": "⌛️",
        "hourglass_flowing_sand": "⏳",
        "house": "🏠",
        "house_with_garden": "🏡",
        "houses": "🏘",
        "hugs": "🤗",
        "hushed": "😯",
        "ice_cream": "🍨",
        "ice_hockey": "🏒",
        "ice_skate": "⛸",
        "icecream": "🍦",
        "id": "🆔",
        "ideograph_advantage": "🉐",
        "imp": "👿",
        "inbox_tray": "📥",
        "incoming_envelope": "📨",
        "tipping_hand_woman": "💁",
        "information_source": "ℹ️",
        "innocent": "😇",
        "interrobang": "⁉️",
        "iphone": "📱",
        "izakaya_lantern": "🏮",
        "jack_o_lantern": "🎃",
        "japan": "🗾",
        "japanese_castle": "🏯",
        "japanese_goblin": "👺",
        "japanese_ogre": "👹",
        "jeans": "👖",
        "joy": "😂",
        "joy_cat": "😹",
        "joystick": "🕹",
        "kaaba": "🕋",
        "key": "🔑",
        "keyboard": "⌨️",
        "keycap_ten": "🔟",
        "kick_scooter": "🛴",
        "kimono": "👘",
        "kiss": "💋",
        "kissing": "😗",
        "kissing_cat": "😽",
        "kissing_closed_eyes": "😚",
        "kissing_heart": "😘",
        "kissing_smiling_eyes": "😙",
        "kiwi_fruit": "🥝",
        "koala": "🐨",
        "koko": "🈁",
        "label": "🏷",
        "large_blue_circle": "🔵",
        "large_blue_diamond": "🔷",
        "large_orange_diamond": "🔶",
        "last_quarter_moon": "🌗",
        "last_quarter_moon_with_face": "🌜",
        "latin_cross": "✝️",
        "laughing": "😆",
        "leaves": "🍃",
        "ledger": "📒",
        "left_luggage": "🛅",
        "left_right_arrow": "↔️",
        "leftwards_arrow_with_hook": "↩️",
        "lemon": "🍋",
        "leo": "♌️",
        "leopard": "🐆",
        "level_slider": "🎚",
        "libra": "♎️",
        "light_rail": "🚈",
        "link": "🔗",
        "lion": "🦁",
        "lips": "👄",
        "lipstick": "💄",
        "lizard": "🦎",
        "lock": "🔒",
        "lock_with_ink_pen": "🔏",
        "lollipop": "🍭",
        "loop": "➿",
        "loud_sound": "🔊",
        "loudspeaker": "📢",
        "love_hotel": "🏩",
        "love_letter": "💌",
        "low_brightness": "🔅",
        "lying_face": "🤥",
        "m": "Ⓜ️",
        "mag": "🔍",
        "mag_right": "🔎",
        "mahjong": "🀄️",
        "mailbox": "📫",
        "mailbox_closed": "📪",
        "mailbox_with_mail": "📬",
        "mailbox_with_no_mail": "📭",
        "man": "👨",
        "man_artist": "👨&zwj;🎨",
        "man_astronaut": "👨&zwj;🚀",
        "man_cartwheeling": "🤸&zwj;♂️",
        "man_cook": "👨&zwj;🍳",
        "man_dancing": "🕺",
        "man_facepalming": "🤦&zwj;♂️",
        "man_factory_worker": "👨&zwj;🏭",
        "man_farmer": "👨&zwj;🌾",
        "man_firefighter": "👨&zwj;🚒",
        "man_health_worker": "👨&zwj;⚕️",
        "man_in_tuxedo": "🤵",
        "man_judge": "👨&zwj;⚖️",
        "man_juggling": "🤹&zwj;♂️",
        "man_mechanic": "👨&zwj;🔧",
        "man_office_worker": "👨&zwj;💼",
        "man_pilot": "👨&zwj;✈️",
        "man_playing_handball": "🤾&zwj;♂️",
        "man_playing_water_polo": "🤽&zwj;♂️",
        "man_scientist": "👨&zwj;🔬",
        "man_shrugging": "🤷&zwj;♂️",
        "man_singer": "👨&zwj;🎤",
        "man_student": "👨&zwj;🎓",
        "man_teacher": "👨&zwj;🏫",
        "man_technologist": "👨&zwj;💻",
        "man_with_gua_pi_mao": "👲",
        "man_with_turban": "👳",
        "tangerine": "🍊",
        "mans_shoe": "👞",
        "mantelpiece_clock": "🕰",
        "maple_leaf": "🍁",
        "martial_arts_uniform": "🥋",
        "mask": "😷",
        "massage_woman": "💆",
        "massage_man": "💆&zwj;♂️",
        "meat_on_bone": "🍖",
        "medal_military": "🎖",
        "medal_sports": "🏅",
        "mega": "📣",
        "melon": "🍈",
        "memo": "📝",
        "men_wrestling": "🤼&zwj;♂️",
        "menorah": "🕎",
        "mens": "🚹",
        "metal": "🤘",
        "metro": "🚇",
        "microphone": "🎤",
        "microscope": "🔬",
        "milk_glass": "🥛",
        "milky_way": "🌌",
        "minibus": "🚐",
        "minidisc": "💽",
        "mobile_phone_off": "📴",
        "money_mouth_face": "🤑",
        "money_with_wings": "💸",
        "moneybag": "💰",
        "monkey": "🐒",
        "monkey_face": "🐵",
        "monorail": "🚝",
        "moon": "🌔",
        "mortar_board": "🎓",
        "mosque": "🕌",
        "motor_boat": "🛥",
        "motor_scooter": "🛵",
        "motorcycle": "🏍",
        "motorway": "🛣",
        "mount_fuji": "🗻",
        "mountain": "⛰",
        "mountain_biking_man": "🚵",
        "mountain_biking_woman": "🚵&zwj;♀️",
        "mountain_cableway": "🚠",
        "mountain_railway": "🚞",
        "mountain_snow": "🏔",
        "mouse": "🐭",
        "mouse2": "🐁",
        "movie_camera": "🎥",
        "moyai": "🗿",
        "mrs_claus": "🤶",
        "muscle": "💪",
        "mushroom": "🍄",
        "musical_keyboard": "🎹",
        "musical_note": "🎵",
        "musical_score": "🎼",
        "mute": "🔇",
        "nail_care": "💅",
        "name_badge": "📛",
        "national_park": "🏞",
        "nauseated_face": "🤢",
        "necktie": "👔",
        "negative_squared_cross_mark": "❎",
        "nerd_face": "🤓",
        "neutral_face": "😐",
        "new": "🆕",
        "new_moon": "🌑",
        "new_moon_with_face": "🌚",
        "newspaper": "📰",
        "newspaper_roll": "🗞",
        "next_track_button": "⏭",
        "ng": "🆖",
        "no_good_man": "🙅&zwj;♂️",
        "no_good_woman": "🙅",
        "night_with_stars": "🌃",
        "no_bell": "🔕",
        "no_bicycles": "🚳",
        "no_entry": "⛔️",
        "no_entry_sign": "🚫",
        "no_mobile_phones": "📵",
        "no_mouth": "😶",
        "no_pedestrians": "🚷",
        "no_smoking": "🚭",
        "non-potable_water": "🚱",
        "nose": "👃",
        "notebook": "📓",
        "notebook_with_decorative_cover": "📔",
        "notes": "🎶",
        "nut_and_bolt": "🔩",
        "o": "⭕️",
        "o2": "🅾️",
        "ocean": "🌊",
        "octopus": "🐙",
        "oden": "🍢",
        "office": "🏢",
        "oil_drum": "🛢",
        "ok": "🆗",
        "ok_hand": "👌",
        "ok_man": "🙆&zwj;♂️",
        "ok_woman": "🙆",
        "old_key": "🗝",
        "older_man": "👴",
        "older_woman": "👵",
        "om": "🕉",
        "on": "🔛",
        "oncoming_automobile": "🚘",
        "oncoming_bus": "🚍",
        "oncoming_police_car": "🚔",
        "oncoming_taxi": "🚖",
        "open_file_folder": "📂",
        "open_hands": "👐",
        "open_mouth": "😮",
        "open_umbrella": "☂️",
        "ophiuchus": "⛎",
        "orange_book": "📙",
        "orthodox_cross": "☦️",
        "outbox_tray": "📤",
        "owl": "🦉",
        "ox": "🐂",
        "package": "📦",
        "page_facing_up": "📄",
        "page_with_curl": "📃",
        "pager": "📟",
        "paintbrush": "🖌",
        "palm_tree": "🌴",
        "pancakes": "🥞",
        "panda_face": "🐼",
        "paperclip": "📎",
        "paperclips": "🖇",
        "parasol_on_ground": "⛱",
        "parking": "🅿️",
        "part_alternation_mark": "〽️",
        "partly_sunny": "⛅️",
        "passenger_ship": "🛳",
        "passport_control": "🛂",
        "pause_button": "⏸",
        "peace_symbol": "☮️",
        "peach": "🍑",
        "peanuts": "🥜",
        "pear": "🍐",
        "pen": "🖊",
        "pencil2": "✏️",
        "penguin": "🐧",
        "pensive": "😔",
        "performing_arts": "🎭",
        "persevere": "😣",
        "person_fencing": "🤺",
        "pouting_woman": "🙎",
        "phone": "☎️",
        "pick": "⛏",
        "pig": "🐷",
        "pig2": "🐖",
        "pig_nose": "🐽",
        "pill": "💊",
        "pineapple": "🍍",
        "ping_pong": "🏓",
        "pisces": "♓️",
        "pizza": "🍕",
        "place_of_worship": "🛐",
        "plate_with_cutlery": "🍽",
        "play_or_pause_button": "⏯",
        "point_down": "👇",
        "point_left": "👈",
        "point_right": "👉",
        "point_up": "☝️",
        "point_up_2": "👆",
        "police_car": "🚓",
        "policewoman": "👮&zwj;♀️",
        "poodle": "🐩",
        "popcorn": "🍿",
        "post_office": "🏣",
        "postal_horn": "📯",
        "postbox": "📮",
        "potable_water": "🚰",
        "potato": "🥔",
        "pouch": "👝",
        "poultry_leg": "🍗",
        "pound": "💷",
        "rage": "😡",
        "pouting_cat": "😾",
        "pouting_man": "🙎&zwj;♂️",
        "pray": "🙏",
        "prayer_beads": "📿",
        "pregnant_woman": "🤰",
        "previous_track_button": "⏮",
        "prince": "🤴",
        "princess": "👸",
        "printer": "🖨",
        "purple_heart": "💜",
        "purse": "👛",
        "pushpin": "📌",
        "put_litter_in_its_place": "🚮",
        "question": "❓",
        "rabbit": "🐰",
        "rabbit2": "🐇",
        "racehorse": "🐎",
        "racing_car": "🏎",
        "radio": "📻",
        "radio_button": "🔘",
        "radioactive": "☢️",
        "railway_car": "🚃",
        "railway_track": "🛤",
        "rainbow": "🌈",
        "rainbow_flag": "🏳️&zwj;🌈",
        "raised_back_of_hand": "🤚",
        "raised_hand_with_fingers_splayed": "🖐",
        "raised_hands": "🙌",
        "raising_hand_woman": "🙋",
        "raising_hand_man": "🙋&zwj;♂️",
        "ram": "🐏",
        "ramen": "🍜",
        "rat": "🐀",
        "record_button": "⏺",
        "recycle": "♻️",
        "red_circle": "🔴",
        "registered": "®️",
        "relaxed": "☺️",
        "relieved": "😌",
        "reminder_ribbon": "🎗",
        "repeat": "🔁",
        "repeat_one": "🔂",
        "rescue_worker_helmet": "⛑",
        "restroom": "🚻",
        "revolving_hearts": "💞",
        "rewind": "⏪",
        "rhinoceros": "🦏",
        "ribbon": "🎀",
        "rice": "🍚",
        "rice_ball": "🍙",
        "rice_cracker": "🍘",
        "rice_scene": "🎑",
        "right_anger_bubble": "🗯",
        "ring": "💍",
        "robot": "🤖",
        "rocket": "🚀",
        "rofl": "🤣",
        "roll_eyes": "🙄",
        "roller_coaster": "🎢",
        "rooster": "🐓",
        "rose": "🌹",
        "rosette": "🏵",
        "rotating_light": "🚨",
        "round_pushpin": "📍",
        "rowing_man": "🚣",
        "rowing_woman": "🚣&zwj;♀️",
        "rugby_football": "🏉",
        "running_man": "🏃",
        "running_shirt_with_sash": "🎽",
        "running_woman": "🏃&zwj;♀️",
        "sa": "🈂️",
        "sagittarius": "♐️",
        "sake": "🍶",
        "sandal": "👡",
        "santa": "🎅",
        "satellite": "📡",
        "saxophone": "🎷",
        "school": "🏫",
        "school_satchel": "🎒",
        "scissors": "✂️",
        "scorpion": "🦂",
        "scorpius": "♏️",
        "scream": "😱",
        "scream_cat": "🙀",
        "scroll": "📜",
        "seat": "💺",
        "secret": "㊙️",
        "see_no_evil": "🙈",
        "seedling": "🌱",
        "selfie": "🤳",
        "shallow_pan_of_food": "🥘",
        "shamrock": "☘️",
        "shark": "🦈",
        "shaved_ice": "🍧",
        "sheep": "🐑",
        "shell": "🐚",
        "shield": "🛡",
        "shinto_shrine": "⛩",
        "ship": "🚢",
        "shirt": "👕",
        "shopping": "🛍",
        "shopping_cart": "🛒",
        "shower": "🚿",
        "shrimp": "🦐",
        "signal_strength": "📶",
        "six_pointed_star": "🔯",
        "ski": "🎿",
        "skier": "⛷",
        "skull": "💀",
        "skull_and_crossbones": "☠️",
        "sleeping": "😴",
        "sleeping_bed": "🛌",
        "sleepy": "😪",
        "slightly_frowning_face": "🙁",
        "slightly_smiling_face": "🙂",
        "slot_machine": "🎰",
        "small_airplane": "🛩",
        "small_blue_diamond": "🔹",
        "small_orange_diamond": "🔸",
        "small_red_triangle": "🔺",
        "small_red_triangle_down": "🔻",
        "smile": "😄",
        "smile_cat": "😸",
        "smiley": "😃",
        "smiley_cat": "😺",
        "smiling_imp": "😈",
        "smirk": "😏",
        "smirk_cat": "😼",
        "smoking": "🚬",
        "snail": "🐌",
        "snake": "🐍",
        "sneezing_face": "🤧",
        "snowboarder": "🏂",
        "snowflake": "❄️",
        "snowman": "⛄️",
        "snowman_with_snow": "☃️",
        "sob": "😭",
        "soccer": "⚽️",
        "soon": "🔜",
        "sos": "🆘",
        "sound": "🔉",
        "space_invader": "👾",
        "spades": "♠️",
        "spaghetti": "🍝",
        "sparkle": "❇️",
        "sparkler": "🎇",
        "sparkles": "✨",
        "sparkling_heart": "💖",
        "speak_no_evil": "🙊",
        "speaker": "🔈",
        "speaking_head": "🗣",
        "speech_balloon": "💬",
        "speedboat": "🚤",
        "spider": "🕷",
        "spider_web": "🕸",
        "spiral_calendar": "🗓",
        "spiral_notepad": "🗒",
        "spoon": "🥄",
        "squid": "🦑",
        "stadium": "🏟",
        "star": "⭐️",
        "star2": "🌟",
        "star_and_crescent": "☪️",
        "star_of_david": "✡️",
        "stars": "🌠",
        "station": "🚉",
        "statue_of_liberty": "🗽",
        "steam_locomotive": "🚂",
        "stew": "🍲",
        "stop_button": "⏹",
        "stop_sign": "🛑",
        "stopwatch": "⏱",
        "straight_ruler": "📏",
        "strawberry": "🍓",
        "stuck_out_tongue": "😛",
        "stuck_out_tongue_closed_eyes": "😝",
        "stuck_out_tongue_winking_eye": "😜",
        "studio_microphone": "🎙",
        "stuffed_flatbread": "🥙",
        "sun_behind_large_cloud": "🌥",
        "sun_behind_rain_cloud": "🌦",
        "sun_behind_small_cloud": "🌤",
        "sun_with_face": "🌞",
        "sunflower": "🌻",
        "sunglasses": "😎",
        "sunny": "☀️",
        "sunrise": "🌅",
        "sunrise_over_mountains": "🌄",
        "surfing_man": "🏄",
        "surfing_woman": "🏄&zwj;♀️",
        "sushi": "🍣",
        "suspension_railway": "🚟",
        "sweat": "😓",
        "sweat_drops": "💦",
        "sweat_smile": "😅",
        "sweet_potato": "🍠",
        "swimming_man": "🏊",
        "swimming_woman": "🏊&zwj;♀️",
        "symbols": "🔣",
        "synagogue": "🕍",
        "syringe": "💉",
        "taco": "🌮",
        "tada": "🎉",
        "tanabata_tree": "🎋",
        "taurus": "♉️",
        "taxi": "🚕",
        "tea": "🍵",
        "telephone_receiver": "📞",
        "telescope": "🔭",
        "tennis": "🎾",
        "tent": "⛺️",
        "thermometer": "🌡",
        "thinking": "🤔",
        "thought_balloon": "💭",
        "ticket": "🎫",
        "tickets": "🎟",
        "tiger": "🐯",
        "tiger2": "🐅",
        "timer_clock": "⏲",
        "tipping_hand_man": "💁&zwj;♂️",
        "tired_face": "😫",
        "tm": "™️",
        "toilet": "🚽",
        "tokyo_tower": "🗼",
        "tomato": "🍅",
        "tongue": "👅",
        "top": "🔝",
        "tophat": "🎩",
        "tornado": "🌪",
        "trackball": "🖲",
        "tractor": "🚜",
        "traffic_light": "🚥",
        "train": "🚋",
        "train2": "🚆",
        "tram": "🚊",
        "triangular_flag_on_post": "🚩",
        "triangular_ruler": "📐",
        "trident": "🔱",
        "triumph": "😤",
        "trolleybus": "🚎",
        "trophy": "🏆",
        "tropical_drink": "🍹",
        "tropical_fish": "🐠",
        "truck": "🚚",
        "trumpet": "🎺",
        "tulip": "🌷",
        "tumbler_glass": "🥃",
        "turkey": "🦃",
        "turtle": "🐢",
        "tv": "📺",
        "twisted_rightwards_arrows": "🔀",
        "two_hearts": "💕",
        "two_men_holding_hands": "👬",
        "two_women_holding_hands": "👭",
        "u5272": "🈹",
        "u5408": "🈴",
        "u55b6": "🈺",
        "u6307": "🈯️",
        "u6708": "🈷️",
        "u6709": "🈶",
        "u6e80": "🈵",
        "u7121": "🈚️",
        "u7533": "🈸",
        "u7981": "🈲",
        "u7a7a": "🈳",
        "umbrella": "☔️",
        "unamused": "😒",
        "underage": "🔞",
        "unicorn": "🦄",
        "unlock": "🔓",
        "up": "🆙",
        "upside_down_face": "🙃",
        "v": "✌️",
        "vertical_traffic_light": "🚦",
        "vhs": "📼",
        "vibration_mode": "📳",
        "video_camera": "📹",
        "video_game": "🎮",
        "violin": "🎻",
        "virgo": "♍️",
        "volcano": "🌋",
        "volleyball": "🏐",
        "vs": "🆚",
        "vulcan_salute": "🖖",
        "walking_man": "🚶",
        "walking_woman": "🚶&zwj;♀️",
        "waning_crescent_moon": "🌘",
        "waning_gibbous_moon": "🌖",
        "warning": "⚠️",
        "wastebasket": "🗑",
        "watch": "⌚️",
        "water_buffalo": "🐃",
        "watermelon": "🍉",
        "wave": "👋",
        "wavy_dash": "〰️",
        "waxing_crescent_moon": "🌒",
        "wc": "🚾",
        "weary": "😩",
        "wedding": "💒",
        "weight_lifting_man": "🏋️",
        "weight_lifting_woman": "🏋️&zwj;♀️",
        "whale": "🐳",
        "whale2": "🐋",
        "wheel_of_dharma": "☸️",
        "wheelchair": "♿️",
        "white_check_mark": "✅",
        "white_circle": "⚪️",
        "white_flag": "🏳️",
        "white_flower": "💮",
        "white_large_square": "⬜️",
        "white_medium_small_square": "◽️",
        "white_medium_square": "◻️",
        "white_small_square": "▫️",
        "white_square_button": "🔳",
        "wilted_flower": "🥀",
        "wind_chime": "🎐",
        "wind_face": "🌬",
        "wine_glass": "🍷",
        "wink": "😉",
        "wolf": "🐺",
        "woman": "👩",
        "woman_artist": "👩&zwj;🎨",
        "woman_astronaut": "👩&zwj;🚀",
        "woman_cartwheeling": "🤸&zwj;♀️",
        "woman_cook": "👩&zwj;🍳",
        "woman_facepalming": "🤦&zwj;♀️",
        "woman_factory_worker": "👩&zwj;🏭",
        "woman_farmer": "👩&zwj;🌾",
        "woman_firefighter": "👩&zwj;🚒",
        "woman_health_worker": "👩&zwj;⚕️",
        "woman_judge": "👩&zwj;⚖️",
        "woman_juggling": "🤹&zwj;♀️",
        "woman_mechanic": "👩&zwj;🔧",
        "woman_office_worker": "👩&zwj;💼",
        "woman_pilot": "👩&zwj;✈️",
        "woman_playing_handball": "🤾&zwj;♀️",
        "woman_playing_water_polo": "🤽&zwj;♀️",
        "woman_scientist": "👩&zwj;🔬",
        "woman_shrugging": "🤷&zwj;♀️",
        "woman_singer": "👩&zwj;🎤",
        "woman_student": "👩&zwj;🎓",
        "woman_teacher": "👩&zwj;🏫",
        "woman_technologist": "👩&zwj;💻",
        "woman_with_turban": "👳&zwj;♀️",
        "womans_clothes": "👚",
        "womans_hat": "👒",
        "women_wrestling": "🤼&zwj;♀️",
        "womens": "🚺",
        "world_map": "🗺",
        "worried": "😟",
        "wrench": "🔧",
        "writing_hand": "✍️",
        "x": "❌",
        "yellow_heart": "💛",
        "yen": "💴",
        "yin_yang": "☯️",
        "yum": "😋",
        "zap": "⚡️",
        "zipper_mouth_face": "🤐",
        "zzz": "💤",
        /* special emojis :P */
        "octocat": '<img alt=":octocat:" height="20" width="20" align="absmiddle" src="https://assets-cdn.github.com/images/icons/emoji/octocat.png">',
        "showdown": `<span style="font-family: 'Anonymous Pro', monospace; text-decoration: underline; text-decoration-style: dashed; text-decoration-color: #3e8b8a;text-underline-position: under;">S</span>`
      };
      showdown2.Converter = function(converterOptions) {
        "use strict";
        var options = {}, langExtensions = [], outputModifiers = [], listeners = {}, setConvFlavor = setFlavor, metadata = {
          parsed: {},
          raw: "",
          format: ""
        };
        _constructor();
        function _constructor() {
          converterOptions = converterOptions || {};
          for (var gOpt in globalOptions) {
            if (globalOptions.hasOwnProperty(gOpt)) {
              options[gOpt] = globalOptions[gOpt];
            }
          }
          if (typeof converterOptions === "object") {
            for (var opt in converterOptions) {
              if (converterOptions.hasOwnProperty(opt)) {
                options[opt] = converterOptions[opt];
              }
            }
          } else {
            throw Error("Converter expects the passed parameter to be an object, but " + typeof converterOptions + " was passed instead.");
          }
          if (options.extensions) {
            showdown2.helper.forEach(options.extensions, _parseExtension);
          }
        }
        function _parseExtension(ext, name) {
          name = name || null;
          if (showdown2.helper.isString(ext)) {
            ext = showdown2.helper.stdExtName(ext);
            name = ext;
            if (showdown2.extensions[ext]) {
              console.warn("DEPRECATION WARNING: " + ext + " is an old extension that uses a deprecated loading method.Please inform the developer that the extension should be updated!");
              legacyExtensionLoading(showdown2.extensions[ext], ext);
              return;
            } else if (!showdown2.helper.isUndefined(extensions[ext])) {
              ext = extensions[ext];
            } else {
              throw Error('Extension "' + ext + '" could not be loaded. It was either not found or is not a valid extension.');
            }
          }
          if (typeof ext === "function") {
            ext = ext();
          }
          if (!showdown2.helper.isArray(ext)) {
            ext = [ext];
          }
          var validExt = validate(ext, name);
          if (!validExt.valid) {
            throw Error(validExt.error);
          }
          for (var i = 0; i < ext.length; ++i) {
            switch (ext[i].type) {
              case "lang":
                langExtensions.push(ext[i]);
                break;
              case "output":
                outputModifiers.push(ext[i]);
                break;
            }
            if (ext[i].hasOwnProperty("listeners")) {
              for (var ln in ext[i].listeners) {
                if (ext[i].listeners.hasOwnProperty(ln)) {
                  listen(ln, ext[i].listeners[ln]);
                }
              }
            }
          }
        }
        function legacyExtensionLoading(ext, name) {
          if (typeof ext === "function") {
            ext = ext(new showdown2.Converter());
          }
          if (!showdown2.helper.isArray(ext)) {
            ext = [ext];
          }
          var valid = validate(ext, name);
          if (!valid.valid) {
            throw Error(valid.error);
          }
          for (var i = 0; i < ext.length; ++i) {
            switch (ext[i].type) {
              case "lang":
                langExtensions.push(ext[i]);
                break;
              case "output":
                outputModifiers.push(ext[i]);
                break;
              default:
                throw Error("Extension loader error: Type unrecognized!!!");
            }
          }
        }
        function listen(name, callback) {
          if (!showdown2.helper.isString(name)) {
            throw Error("Invalid argument in converter.listen() method: name must be a string, but " + typeof name + " given");
          }
          if (typeof callback !== "function") {
            throw Error("Invalid argument in converter.listen() method: callback must be a function, but " + typeof callback + " given");
          }
          if (!listeners.hasOwnProperty(name)) {
            listeners[name] = [];
          }
          listeners[name].push(callback);
        }
        function rTrimInputText(text2) {
          var rsp = text2.match(/^\s*/)[0].length, rgx = new RegExp("^\\s{0," + rsp + "}", "gm");
          return text2.replace(rgx, "");
        }
        this._dispatch = function dispatch2(evtName, text2, options2, globals) {
          if (listeners.hasOwnProperty(evtName)) {
            for (var ei = 0; ei < listeners[evtName].length; ++ei) {
              var nText = listeners[evtName][ei](evtName, text2, this, options2, globals);
              if (nText && typeof nText !== "undefined") {
                text2 = nText;
              }
            }
          }
          return text2;
        };
        this.listen = function(name, callback) {
          listen(name, callback);
          return this;
        };
        this.makeHtml = function(text2) {
          if (!text2) {
            return text2;
          }
          var globals = {
            gHtmlBlocks: [],
            gHtmlMdBlocks: [],
            gHtmlSpans: [],
            gUrls: {},
            gTitles: {},
            gDimensions: {},
            gListLevel: 0,
            hashLinkCounts: {},
            langExtensions,
            outputModifiers,
            converter: this,
            ghCodeBlocks: [],
            metadata: {
              parsed: {},
              raw: "",
              format: ""
            }
          };
          text2 = text2.replace(/¨/g, "¨T");
          text2 = text2.replace(/\$/g, "¨D");
          text2 = text2.replace(/\r\n/g, "\n");
          text2 = text2.replace(/\r/g, "\n");
          text2 = text2.replace(/\u00A0/g, "&nbsp;");
          if (options.smartIndentationFix) {
            text2 = rTrimInputText(text2);
          }
          text2 = "\n\n" + text2 + "\n\n";
          text2 = showdown2.subParser("detab")(text2, options, globals);
          text2 = text2.replace(/^[ \t]+$/mg, "");
          showdown2.helper.forEach(langExtensions, function(ext) {
            text2 = showdown2.subParser("runExtension")(ext, text2, options, globals);
          });
          text2 = showdown2.subParser("metadata")(text2, options, globals);
          text2 = showdown2.subParser("hashPreCodeTags")(text2, options, globals);
          text2 = showdown2.subParser("githubCodeBlocks")(text2, options, globals);
          text2 = showdown2.subParser("hashHTMLBlocks")(text2, options, globals);
          text2 = showdown2.subParser("hashCodeTags")(text2, options, globals);
          text2 = showdown2.subParser("stripLinkDefinitions")(text2, options, globals);
          text2 = showdown2.subParser("blockGamut")(text2, options, globals);
          text2 = showdown2.subParser("unhashHTMLSpans")(text2, options, globals);
          text2 = showdown2.subParser("unescapeSpecialChars")(text2, options, globals);
          text2 = text2.replace(/¨D/g, "$$");
          text2 = text2.replace(/¨T/g, "¨");
          text2 = showdown2.subParser("completeHTMLDocument")(text2, options, globals);
          showdown2.helper.forEach(outputModifiers, function(ext) {
            text2 = showdown2.subParser("runExtension")(ext, text2, options, globals);
          });
          metadata = globals.metadata;
          return text2;
        };
        this.makeMarkdown = this.makeMd = function(src, HTMLParser) {
          src = src.replace(/\r\n/g, "\n");
          src = src.replace(/\r/g, "\n");
          src = src.replace(/>[ \t]+</, ">¨NBSP;<");
          if (!HTMLParser) {
            if (window && window.document) {
              HTMLParser = window.document;
            } else {
              throw new Error("HTMLParser is undefined. If in a webworker or nodejs environment, you need to provide a WHATWG DOM and HTML such as JSDOM");
            }
          }
          var doc = HTMLParser.createElement("div");
          doc.innerHTML = src;
          var globals = {
            preList: substitutePreCodeTags(doc)
          };
          clean(doc);
          var nodes = doc.childNodes, mdDoc = "";
          for (var i = 0; i < nodes.length; i++) {
            mdDoc += showdown2.subParser("makeMarkdown.node")(nodes[i], globals);
          }
          function clean(node) {
            for (var n = 0; n < node.childNodes.length; ++n) {
              var child = node.childNodes[n];
              if (child.nodeType === 3) {
                if (!/\S/.test(child.nodeValue)) {
                  node.removeChild(child);
                  --n;
                } else {
                  child.nodeValue = child.nodeValue.split("\n").join(" ");
                  child.nodeValue = child.nodeValue.replace(/(\s)+/g, "$1");
                }
              } else if (child.nodeType === 1) {
                clean(child);
              }
            }
          }
          function substitutePreCodeTags(doc2) {
            var pres = doc2.querySelectorAll("pre"), presPH = [];
            for (var i2 = 0; i2 < pres.length; ++i2) {
              if (pres[i2].childElementCount === 1 && pres[i2].firstChild.tagName.toLowerCase() === "code") {
                var content = pres[i2].firstChild.innerHTML.trim(), language = pres[i2].firstChild.getAttribute("data-language") || "";
                if (language === "") {
                  var classes = pres[i2].firstChild.className.split(" ");
                  for (var c = 0; c < classes.length; ++c) {
                    var matches = classes[c].match(/^language-(.+)$/);
                    if (matches !== null) {
                      language = matches[1];
                      break;
                    }
                  }
                }
                content = showdown2.helper.unescapeHTMLEntities(content);
                presPH.push(content);
                pres[i2].outerHTML = '<precode language="' + language + '" precodenum="' + i2.toString() + '"></precode>';
              } else {
                presPH.push(pres[i2].innerHTML);
                pres[i2].innerHTML = "";
                pres[i2].setAttribute("prenum", i2.toString());
              }
            }
            return presPH;
          }
          return mdDoc;
        };
        this.setOption = function(key, value) {
          options[key] = value;
        };
        this.getOption = function(key) {
          return options[key];
        };
        this.getOptions = function() {
          return options;
        };
        this.addExtension = function(extension, name) {
          name = name || null;
          _parseExtension(extension, name);
        };
        this.useExtension = function(extensionName) {
          _parseExtension(extensionName);
        };
        this.setFlavor = function(name) {
          if (!flavor.hasOwnProperty(name)) {
            throw Error(name + " flavor was not found");
          }
          var preset = flavor[name];
          setConvFlavor = name;
          for (var option in preset) {
            if (preset.hasOwnProperty(option)) {
              options[option] = preset[option];
            }
          }
        };
        this.getFlavor = function() {
          return setConvFlavor;
        };
        this.removeExtension = function(extension) {
          if (!showdown2.helper.isArray(extension)) {
            extension = [extension];
          }
          for (var a = 0; a < extension.length; ++a) {
            var ext = extension[a];
            for (var i = 0; i < langExtensions.length; ++i) {
              if (langExtensions[i] === ext) {
                langExtensions[i].splice(i, 1);
              }
            }
            for (var ii = 0; ii < outputModifiers.length; ++i) {
              if (outputModifiers[ii] === ext) {
                outputModifiers[ii].splice(i, 1);
              }
            }
          }
        };
        this.getAllExtensions = function() {
          return {
            language: langExtensions,
            output: outputModifiers
          };
        };
        this.getMetadata = function(raw) {
          if (raw) {
            return metadata.raw;
          } else {
            return metadata.parsed;
          }
        };
        this.getMetadataFormat = function() {
          return metadata.format;
        };
        this._setMetadataPair = function(key, value) {
          metadata.parsed[key] = value;
        };
        this._setMetadataFormat = function(format) {
          metadata.format = format;
        };
        this._setMetadataRaw = function(raw) {
          metadata.raw = raw;
        };
      };
      showdown2.subParser("anchors", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("anchors.before", text2, options, globals);
        var writeAnchorTag = function(wholeMatch, linkText, linkId, url, m5, m6, title) {
          if (showdown2.helper.isUndefined(title)) {
            title = "";
          }
          linkId = linkId.toLowerCase();
          if (wholeMatch.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
            url = "";
          } else if (!url) {
            if (!linkId) {
              linkId = linkText.toLowerCase().replace(/ ?\n/g, " ");
            }
            url = "#" + linkId;
            if (!showdown2.helper.isUndefined(globals.gUrls[linkId])) {
              url = globals.gUrls[linkId];
              if (!showdown2.helper.isUndefined(globals.gTitles[linkId])) {
                title = globals.gTitles[linkId];
              }
            } else {
              return wholeMatch;
            }
          }
          url = url.replace(showdown2.helper.regexes.asteriskDashAndColon, showdown2.helper.escapeCharactersCallback);
          var result = '<a href="' + url + '"';
          if (title !== "" && title !== null) {
            title = title.replace(/"/g, "&quot;");
            title = title.replace(showdown2.helper.regexes.asteriskDashAndColon, showdown2.helper.escapeCharactersCallback);
            result += ' title="' + title + '"';
          }
          if (options.openLinksInNewWindow && !/^#/.test(url)) {
            result += ' rel="noopener noreferrer" target="¨E95Eblank"';
          }
          result += ">" + linkText + "</a>";
          return result;
        };
        text2 = text2.replace(/\[((?:\[[^\]]*]|[^\[\]])*)] ?(?:\n *)?\[(.*?)]()()()()/g, writeAnchorTag);
        text2 = text2.replace(
          /\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<([^>]*)>(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g,
          writeAnchorTag
        );
        text2 = text2.replace(
          /\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g,
          writeAnchorTag
        );
        text2 = text2.replace(/\[([^\[\]]+)]()()()()()/g, writeAnchorTag);
        if (options.ghMentions) {
          text2 = text2.replace(/(^|\s)(\\)?(@([a-z\d]+(?:[a-z\d.-]+?[a-z\d]+)*))/gmi, function(wm, st, escape, mentions, username) {
            if (escape === "\\") {
              return st + mentions;
            }
            if (!showdown2.helper.isString(options.ghMentionsLink)) {
              throw new Error("ghMentionsLink option must be a string");
            }
            var lnk = options.ghMentionsLink.replace(/\{u}/g, username), target = "";
            if (options.openLinksInNewWindow) {
              target = ' rel="noopener noreferrer" target="¨E95Eblank"';
            }
            return st + '<a href="' + lnk + '"' + target + ">" + mentions + "</a>";
          });
        }
        text2 = globals.converter._dispatch("anchors.after", text2, options, globals);
        return text2;
      });
      var simpleURLRegex = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+?\.[^'">\s]+?)()(\1)?(?=\s|$)(?!["<>])/gi, simpleURLRegex2 = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+?)([.!?,()\[\]])?(\1)?(?=\s|$)(?!["<>])/gi, delimUrlRegex = /()<(((https?|ftp|dict):\/\/|www\.)[^'">\s]+)()>()/gi, simpleMailRegex = /(^|\s)(?:mailto:)?([A-Za-z0-9!#$%&'*+-/=?^_`{|}~.]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)(?=$|\s)/gmi, delimMailRegex = /<()(?:mailto:)?([-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi, replaceLink = function(options) {
        "use strict";
        return function(wm, leadingMagicChars, link, m2, m3, trailingPunctuation, trailingMagicChars) {
          link = link.replace(showdown2.helper.regexes.asteriskDashAndColon, showdown2.helper.escapeCharactersCallback);
          var lnkTxt = link, append = "", target = "", lmc = leadingMagicChars || "", tmc = trailingMagicChars || "";
          if (/^www\./i.test(link)) {
            link = link.replace(/^www\./i, "http://www.");
          }
          if (options.excludeTrailingPunctuationFromURLs && trailingPunctuation) {
            append = trailingPunctuation;
          }
          if (options.openLinksInNewWindow) {
            target = ' rel="noopener noreferrer" target="¨E95Eblank"';
          }
          return lmc + '<a href="' + link + '"' + target + ">" + lnkTxt + "</a>" + append + tmc;
        };
      }, replaceMail = function(options, globals) {
        "use strict";
        return function(wholeMatch, b, mail) {
          var href = "mailto:";
          b = b || "";
          mail = showdown2.subParser("unescapeSpecialChars")(mail, options, globals);
          if (options.encodeEmails) {
            href = showdown2.helper.encodeEmailAddress(href + mail);
            mail = showdown2.helper.encodeEmailAddress(mail);
          } else {
            href = href + mail;
          }
          return b + '<a href="' + href + '">' + mail + "</a>";
        };
      };
      showdown2.subParser("autoLinks", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("autoLinks.before", text2, options, globals);
        text2 = text2.replace(delimUrlRegex, replaceLink(options));
        text2 = text2.replace(delimMailRegex, replaceMail(options, globals));
        text2 = globals.converter._dispatch("autoLinks.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("simplifiedAutoLinks", function(text2, options, globals) {
        "use strict";
        if (!options.simplifiedAutoLink) {
          return text2;
        }
        text2 = globals.converter._dispatch("simplifiedAutoLinks.before", text2, options, globals);
        if (options.excludeTrailingPunctuationFromURLs) {
          text2 = text2.replace(simpleURLRegex2, replaceLink(options));
        } else {
          text2 = text2.replace(simpleURLRegex, replaceLink(options));
        }
        text2 = text2.replace(simpleMailRegex, replaceMail(options, globals));
        text2 = globals.converter._dispatch("simplifiedAutoLinks.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("blockGamut", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("blockGamut.before", text2, options, globals);
        text2 = showdown2.subParser("blockQuotes")(text2, options, globals);
        text2 = showdown2.subParser("headers")(text2, options, globals);
        text2 = showdown2.subParser("horizontalRule")(text2, options, globals);
        text2 = showdown2.subParser("lists")(text2, options, globals);
        text2 = showdown2.subParser("codeBlocks")(text2, options, globals);
        text2 = showdown2.subParser("tables")(text2, options, globals);
        text2 = showdown2.subParser("hashHTMLBlocks")(text2, options, globals);
        text2 = showdown2.subParser("paragraphs")(text2, options, globals);
        text2 = globals.converter._dispatch("blockGamut.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("blockQuotes", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("blockQuotes.before", text2, options, globals);
        text2 = text2 + "\n\n";
        var rgx = /(^ {0,3}>[ \t]?.+\n(.+\n)*\n*)+/gm;
        if (options.splitAdjacentBlockquotes) {
          rgx = /^ {0,3}>[\s\S]*?(?:\n\n)/gm;
        }
        text2 = text2.replace(rgx, function(bq) {
          bq = bq.replace(/^[ \t]*>[ \t]?/gm, "");
          bq = bq.replace(/¨0/g, "");
          bq = bq.replace(/^[ \t]+$/gm, "");
          bq = showdown2.subParser("githubCodeBlocks")(bq, options, globals);
          bq = showdown2.subParser("blockGamut")(bq, options, globals);
          bq = bq.replace(/(^|\n)/g, "$1  ");
          bq = bq.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function(wholeMatch, m1) {
            var pre = m1;
            pre = pre.replace(/^  /mg, "¨0");
            pre = pre.replace(/¨0/g, "");
            return pre;
          });
          return showdown2.subParser("hashBlock")("<blockquote>\n" + bq + "\n</blockquote>", options, globals);
        });
        text2 = globals.converter._dispatch("blockQuotes.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("codeBlocks", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("codeBlocks.before", text2, options, globals);
        text2 += "¨0";
        var pattern = /(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=¨0))/g;
        text2 = text2.replace(pattern, function(wholeMatch, m1, m2) {
          var codeblock = m1, nextChar = m2, end = "\n";
          codeblock = showdown2.subParser("outdent")(codeblock, options, globals);
          codeblock = showdown2.subParser("encodeCode")(codeblock, options, globals);
          codeblock = showdown2.subParser("detab")(codeblock, options, globals);
          codeblock = codeblock.replace(/^\n+/g, "");
          codeblock = codeblock.replace(/\n+$/g, "");
          if (options.omitExtraWLInCodeBlocks) {
            end = "";
          }
          codeblock = "<pre><code>" + codeblock + end + "</code></pre>";
          return showdown2.subParser("hashBlock")(codeblock, options, globals) + nextChar;
        });
        text2 = text2.replace(/¨0/, "");
        text2 = globals.converter._dispatch("codeBlocks.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("codeSpans", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("codeSpans.before", text2, options, globals);
        if (typeof text2 === "undefined") {
          text2 = "";
        }
        text2 = text2.replace(
          /(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
          function(wholeMatch, m1, m2, m3) {
            var c = m3;
            c = c.replace(/^([ \t]*)/g, "");
            c = c.replace(/[ \t]*$/g, "");
            c = showdown2.subParser("encodeCode")(c, options, globals);
            c = m1 + "<code>" + c + "</code>";
            c = showdown2.subParser("hashHTMLSpans")(c, options, globals);
            return c;
          }
        );
        text2 = globals.converter._dispatch("codeSpans.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("completeHTMLDocument", function(text2, options, globals) {
        "use strict";
        if (!options.completeHTMLDocument) {
          return text2;
        }
        text2 = globals.converter._dispatch("completeHTMLDocument.before", text2, options, globals);
        var doctype = "html", doctypeParsed = "<!DOCTYPE HTML>\n", title = "", charset = '<meta charset="utf-8">\n', lang = "", metadata = "";
        if (typeof globals.metadata.parsed.doctype !== "undefined") {
          doctypeParsed = "<!DOCTYPE " + globals.metadata.parsed.doctype + ">\n";
          doctype = globals.metadata.parsed.doctype.toString().toLowerCase();
          if (doctype === "html" || doctype === "html5") {
            charset = '<meta charset="utf-8">';
          }
        }
        for (var meta in globals.metadata.parsed) {
          if (globals.metadata.parsed.hasOwnProperty(meta)) {
            switch (meta.toLowerCase()) {
              case "doctype":
                break;
              case "title":
                title = "<title>" + globals.metadata.parsed.title + "</title>\n";
                break;
              case "charset":
                if (doctype === "html" || doctype === "html5") {
                  charset = '<meta charset="' + globals.metadata.parsed.charset + '">\n';
                } else {
                  charset = '<meta name="charset" content="' + globals.metadata.parsed.charset + '">\n';
                }
                break;
              case "language":
              case "lang":
                lang = ' lang="' + globals.metadata.parsed[meta] + '"';
                metadata += '<meta name="' + meta + '" content="' + globals.metadata.parsed[meta] + '">\n';
                break;
              default:
                metadata += '<meta name="' + meta + '" content="' + globals.metadata.parsed[meta] + '">\n';
            }
          }
        }
        text2 = doctypeParsed + "<html" + lang + ">\n<head>\n" + title + charset + metadata + "</head>\n<body>\n" + text2.trim() + "\n</body>\n</html>";
        text2 = globals.converter._dispatch("completeHTMLDocument.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("detab", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("detab.before", text2, options, globals);
        text2 = text2.replace(/\t(?=\t)/g, "    ");
        text2 = text2.replace(/\t/g, "¨A¨B");
        text2 = text2.replace(/¨B(.+?)¨A/g, function(wholeMatch, m1) {
          var leadingText = m1, numSpaces = 4 - leadingText.length % 4;
          for (var i = 0; i < numSpaces; i++) {
            leadingText += " ";
          }
          return leadingText;
        });
        text2 = text2.replace(/¨A/g, "    ");
        text2 = text2.replace(/¨B/g, "");
        text2 = globals.converter._dispatch("detab.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("ellipsis", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("ellipsis.before", text2, options, globals);
        text2 = text2.replace(/\.\.\./g, "…");
        text2 = globals.converter._dispatch("ellipsis.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("emoji", function(text2, options, globals) {
        "use strict";
        if (!options.emoji) {
          return text2;
        }
        text2 = globals.converter._dispatch("emoji.before", text2, options, globals);
        var emojiRgx = /:([\S]+?):/g;
        text2 = text2.replace(emojiRgx, function(wm, emojiCode) {
          if (showdown2.helper.emojis.hasOwnProperty(emojiCode)) {
            return showdown2.helper.emojis[emojiCode];
          }
          return wm;
        });
        text2 = globals.converter._dispatch("emoji.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("encodeAmpsAndAngles", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("encodeAmpsAndAngles.before", text2, options, globals);
        text2 = text2.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, "&amp;");
        text2 = text2.replace(/<(?![a-z\/?$!])/gi, "&lt;");
        text2 = text2.replace(/</g, "&lt;");
        text2 = text2.replace(/>/g, "&gt;");
        text2 = globals.converter._dispatch("encodeAmpsAndAngles.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("encodeBackslashEscapes", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("encodeBackslashEscapes.before", text2, options, globals);
        text2 = text2.replace(/\\(\\)/g, showdown2.helper.escapeCharactersCallback);
        text2 = text2.replace(/\\([`*_{}\[\]()>#+.!~=|-])/g, showdown2.helper.escapeCharactersCallback);
        text2 = globals.converter._dispatch("encodeBackslashEscapes.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("encodeCode", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("encodeCode.before", text2, options, globals);
        text2 = text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([*_{}\[\]\\=~-])/g, showdown2.helper.escapeCharactersCallback);
        text2 = globals.converter._dispatch("encodeCode.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("escapeSpecialCharsWithinTagAttributes", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("escapeSpecialCharsWithinTagAttributes.before", text2, options, globals);
        var tags = /<\/?[a-z\d_:-]+(?:[\s]+[\s\S]+?)?>/gi, comments = /<!(--(?:(?:[^>-]|-[^>])(?:[^-]|-[^-])*)--)>/gi;
        text2 = text2.replace(tags, function(wholeMatch) {
          return wholeMatch.replace(/(.)<\/?code>(?=.)/g, "$1`").replace(/([\\`*_~=|])/g, showdown2.helper.escapeCharactersCallback);
        });
        text2 = text2.replace(comments, function(wholeMatch) {
          return wholeMatch.replace(/([\\`*_~=|])/g, showdown2.helper.escapeCharactersCallback);
        });
        text2 = globals.converter._dispatch("escapeSpecialCharsWithinTagAttributes.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("githubCodeBlocks", function(text2, options, globals) {
        "use strict";
        if (!options.ghCodeBlocks) {
          return text2;
        }
        text2 = globals.converter._dispatch("githubCodeBlocks.before", text2, options, globals);
        text2 += "¨0";
        text2 = text2.replace(/(?:^|\n)(?: {0,3})(```+|~~~+)(?: *)([^\s`~]*)\n([\s\S]*?)\n(?: {0,3})\1/g, function(wholeMatch, delim, language, codeblock) {
          var end = options.omitExtraWLInCodeBlocks ? "" : "\n";
          codeblock = showdown2.subParser("encodeCode")(codeblock, options, globals);
          codeblock = showdown2.subParser("detab")(codeblock, options, globals);
          codeblock = codeblock.replace(/^\n+/g, "");
          codeblock = codeblock.replace(/\n+$/g, "");
          codeblock = "<pre><code" + (language ? ' class="' + language + " language-" + language + '"' : "") + ">" + codeblock + end + "</code></pre>";
          codeblock = showdown2.subParser("hashBlock")(codeblock, options, globals);
          return "\n\n¨G" + (globals.ghCodeBlocks.push({ text: wholeMatch, codeblock }) - 1) + "G\n\n";
        });
        text2 = text2.replace(/¨0/, "");
        return globals.converter._dispatch("githubCodeBlocks.after", text2, options, globals);
      });
      showdown2.subParser("hashBlock", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("hashBlock.before", text2, options, globals);
        text2 = text2.replace(/(^\n+|\n+$)/g, "");
        text2 = "\n\n¨K" + (globals.gHtmlBlocks.push(text2) - 1) + "K\n\n";
        text2 = globals.converter._dispatch("hashBlock.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("hashCodeTags", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("hashCodeTags.before", text2, options, globals);
        var repFunc = function(wholeMatch, match, left, right) {
          var codeblock = left + showdown2.subParser("encodeCode")(match, options, globals) + right;
          return "¨C" + (globals.gHtmlSpans.push(codeblock) - 1) + "C";
        };
        text2 = showdown2.helper.replaceRecursiveRegExp(text2, repFunc, "<code\\b[^>]*>", "</code>", "gim");
        text2 = globals.converter._dispatch("hashCodeTags.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("hashElement", function(text2, options, globals) {
        "use strict";
        return function(wholeMatch, m1) {
          var blockText = m1;
          blockText = blockText.replace(/\n\n/g, "\n");
          blockText = blockText.replace(/^\n/, "");
          blockText = blockText.replace(/\n+$/g, "");
          blockText = "\n\n¨K" + (globals.gHtmlBlocks.push(blockText) - 1) + "K\n\n";
          return blockText;
        };
      });
      showdown2.subParser("hashHTMLBlocks", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("hashHTMLBlocks.before", text2, options, globals);
        var blockTags = [
          "pre",
          "div",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "blockquote",
          "table",
          "dl",
          "ol",
          "ul",
          "script",
          "noscript",
          "form",
          "fieldset",
          "iframe",
          "math",
          "style",
          "section",
          "header",
          "footer",
          "nav",
          "article",
          "aside",
          "address",
          "audio",
          "canvas",
          "figure",
          "hgroup",
          "output",
          "video",
          "p"
        ], repFunc = function(wholeMatch, match, left, right) {
          var txt = wholeMatch;
          if (left.search(/\bmarkdown\b/) !== -1) {
            txt = left + globals.converter.makeHtml(match) + right;
          }
          return "\n\n¨K" + (globals.gHtmlBlocks.push(txt) - 1) + "K\n\n";
        };
        if (options.backslashEscapesHTMLTags) {
          text2 = text2.replace(/\\<(\/?[^>]+?)>/g, function(wm, inside) {
            return "&lt;" + inside + "&gt;";
          });
        }
        for (var i = 0; i < blockTags.length; ++i) {
          var opTagPos, rgx1 = new RegExp("^ {0,3}(<" + blockTags[i] + "\\b[^>]*>)", "im"), patLeft = "<" + blockTags[i] + "\\b[^>]*>", patRight = "</" + blockTags[i] + ">";
          while ((opTagPos = showdown2.helper.regexIndexOf(text2, rgx1)) !== -1) {
            var subTexts = showdown2.helper.splitAtIndex(text2, opTagPos), newSubText1 = showdown2.helper.replaceRecursiveRegExp(subTexts[1], repFunc, patLeft, patRight, "im");
            if (newSubText1 === subTexts[1]) {
              break;
            }
            text2 = subTexts[0].concat(newSubText1);
          }
        }
        text2 = text2.replace(
          /(\n {0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,
          showdown2.subParser("hashElement")(text2, options, globals)
        );
        text2 = showdown2.helper.replaceRecursiveRegExp(text2, function(txt) {
          return "\n\n¨K" + (globals.gHtmlBlocks.push(txt) - 1) + "K\n\n";
        }, "^ {0,3}<!--", "-->", "gm");
        text2 = text2.replace(
          /(?:\n\n)( {0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,
          showdown2.subParser("hashElement")(text2, options, globals)
        );
        text2 = globals.converter._dispatch("hashHTMLBlocks.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("hashHTMLSpans", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("hashHTMLSpans.before", text2, options, globals);
        function hashHTMLSpan(html2) {
          return "¨C" + (globals.gHtmlSpans.push(html2) - 1) + "C";
        }
        text2 = text2.replace(/<[^>]+?\/>/gi, function(wm) {
          return hashHTMLSpan(wm);
        });
        text2 = text2.replace(/<([^>]+?)>[\s\S]*?<\/\1>/g, function(wm) {
          return hashHTMLSpan(wm);
        });
        text2 = text2.replace(/<([^>]+?)\s[^>]+?>[\s\S]*?<\/\1>/g, function(wm) {
          return hashHTMLSpan(wm);
        });
        text2 = text2.replace(/<[^>]+?>/gi, function(wm) {
          return hashHTMLSpan(wm);
        });
        text2 = globals.converter._dispatch("hashHTMLSpans.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("unhashHTMLSpans", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("unhashHTMLSpans.before", text2, options, globals);
        for (var i = 0; i < globals.gHtmlSpans.length; ++i) {
          var repText = globals.gHtmlSpans[i], limit = 0;
          while (/¨C(\d+)C/.test(repText)) {
            var num = RegExp.$1;
            repText = repText.replace("¨C" + num + "C", globals.gHtmlSpans[num]);
            if (limit === 10) {
              console.error("maximum nesting of 10 spans reached!!!");
              break;
            }
            ++limit;
          }
          text2 = text2.replace("¨C" + i + "C", repText);
        }
        text2 = globals.converter._dispatch("unhashHTMLSpans.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("hashPreCodeTags", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("hashPreCodeTags.before", text2, options, globals);
        var repFunc = function(wholeMatch, match, left, right) {
          var codeblock = left + showdown2.subParser("encodeCode")(match, options, globals) + right;
          return "\n\n¨G" + (globals.ghCodeBlocks.push({ text: wholeMatch, codeblock }) - 1) + "G\n\n";
        };
        text2 = showdown2.helper.replaceRecursiveRegExp(text2, repFunc, "^ {0,3}<pre\\b[^>]*>\\s*<code\\b[^>]*>", "^ {0,3}</code>\\s*</pre>", "gim");
        text2 = globals.converter._dispatch("hashPreCodeTags.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("headers", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("headers.before", text2, options, globals);
        var headerLevelStart = isNaN(parseInt(options.headerLevelStart)) ? 1 : parseInt(options.headerLevelStart), setextRegexH1 = options.smoothLivePreview ? /^(.+)[ \t]*\n={2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n=+[ \t]*\n+/gm, setextRegexH2 = options.smoothLivePreview ? /^(.+)[ \t]*\n-{2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n-+[ \t]*\n+/gm;
        text2 = text2.replace(setextRegexH1, function(wholeMatch, m1) {
          var spanGamut = showdown2.subParser("spanGamut")(m1, options, globals), hID = options.noHeaderId ? "" : ' id="' + headerId(m1) + '"', hLevel = headerLevelStart, hashBlock = "<h" + hLevel + hID + ">" + spanGamut + "</h" + hLevel + ">";
          return showdown2.subParser("hashBlock")(hashBlock, options, globals);
        });
        text2 = text2.replace(setextRegexH2, function(matchFound, m1) {
          var spanGamut = showdown2.subParser("spanGamut")(m1, options, globals), hID = options.noHeaderId ? "" : ' id="' + headerId(m1) + '"', hLevel = headerLevelStart + 1, hashBlock = "<h" + hLevel + hID + ">" + spanGamut + "</h" + hLevel + ">";
          return showdown2.subParser("hashBlock")(hashBlock, options, globals);
        });
        var atxStyle = options.requireSpaceBeforeHeadingText ? /^(#{1,6})[ \t]+(.+?)[ \t]*#*\n+/gm : /^(#{1,6})[ \t]*(.+?)[ \t]*#*\n+/gm;
        text2 = text2.replace(atxStyle, function(wholeMatch, m1, m2) {
          var hText = m2;
          if (options.customizedHeaderId) {
            hText = m2.replace(/\s?\{([^{]+?)}\s*$/, "");
          }
          var span = showdown2.subParser("spanGamut")(hText, options, globals), hID = options.noHeaderId ? "" : ' id="' + headerId(m2) + '"', hLevel = headerLevelStart - 1 + m1.length, header = "<h" + hLevel + hID + ">" + span + "</h" + hLevel + ">";
          return showdown2.subParser("hashBlock")(header, options, globals);
        });
        function headerId(m) {
          var title, prefix;
          if (options.customizedHeaderId) {
            var match = m.match(/\{([^{]+?)}\s*$/);
            if (match && match[1]) {
              m = match[1];
            }
          }
          title = m;
          if (showdown2.helper.isString(options.prefixHeaderId)) {
            prefix = options.prefixHeaderId;
          } else if (options.prefixHeaderId === true) {
            prefix = "section-";
          } else {
            prefix = "";
          }
          if (!options.rawPrefixHeaderId) {
            title = prefix + title;
          }
          if (options.ghCompatibleHeaderId) {
            title = title.replace(/ /g, "-").replace(/&amp;/g, "").replace(/¨T/g, "").replace(/¨D/g, "").replace(/[&+$,\/:;=?@"#{}|^¨~\[\]`\\*)(%.!'<>]/g, "").toLowerCase();
          } else if (options.rawHeaderId) {
            title = title.replace(/ /g, "-").replace(/&amp;/g, "&").replace(/¨T/g, "¨").replace(/¨D/g, "$").replace(/["']/g, "-").toLowerCase();
          } else {
            title = title.replace(/[^\w]/g, "").toLowerCase();
          }
          if (options.rawPrefixHeaderId) {
            title = prefix + title;
          }
          if (globals.hashLinkCounts[title]) {
            title = title + "-" + globals.hashLinkCounts[title]++;
          } else {
            globals.hashLinkCounts[title] = 1;
          }
          return title;
        }
        text2 = globals.converter._dispatch("headers.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("horizontalRule", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("horizontalRule.before", text2, options, globals);
        var key = showdown2.subParser("hashBlock")("<hr />", options, globals);
        text2 = text2.replace(/^ {0,2}( ?-){3,}[ \t]*$/gm, key);
        text2 = text2.replace(/^ {0,2}( ?\*){3,}[ \t]*$/gm, key);
        text2 = text2.replace(/^ {0,2}( ?_){3,}[ \t]*$/gm, key);
        text2 = globals.converter._dispatch("horizontalRule.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("images", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("images.before", text2, options, globals);
        var inlineRegExp = /!\[([^\]]*?)][ \t]*()\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g, crazyRegExp = /!\[([^\]]*?)][ \t]*()\([ \t]?<([^>]*)>(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(?:(["'])([^"]*?)\6))?[ \t]?\)/g, base64RegExp = /!\[([^\]]*?)][ \t]*()\([ \t]?<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g, referenceRegExp = /!\[([^\]]*?)] ?(?:\n *)?\[([\s\S]*?)]()()()()()/g, refShortcutRegExp = /!\[([^\[\]]+)]()()()()()/g;
        function writeImageTagBase64(wholeMatch, altText, linkId, url, width, height, m5, title) {
          url = url.replace(/\s/g, "");
          return writeImageTag(wholeMatch, altText, linkId, url, width, height, m5, title);
        }
        function writeImageTag(wholeMatch, altText, linkId, url, width, height, m5, title) {
          var gUrls = globals.gUrls, gTitles = globals.gTitles, gDims = globals.gDimensions;
          linkId = linkId.toLowerCase();
          if (!title) {
            title = "";
          }
          if (wholeMatch.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
            url = "";
          } else if (url === "" || url === null) {
            if (linkId === "" || linkId === null) {
              linkId = altText.toLowerCase().replace(/ ?\n/g, " ");
            }
            url = "#" + linkId;
            if (!showdown2.helper.isUndefined(gUrls[linkId])) {
              url = gUrls[linkId];
              if (!showdown2.helper.isUndefined(gTitles[linkId])) {
                title = gTitles[linkId];
              }
              if (!showdown2.helper.isUndefined(gDims[linkId])) {
                width = gDims[linkId].width;
                height = gDims[linkId].height;
              }
            } else {
              return wholeMatch;
            }
          }
          altText = altText.replace(/"/g, "&quot;").replace(showdown2.helper.regexes.asteriskDashAndColon, showdown2.helper.escapeCharactersCallback);
          url = url.replace(showdown2.helper.regexes.asteriskDashAndColon, showdown2.helper.escapeCharactersCallback);
          var result = '<img src="' + url + '" alt="' + altText + '"';
          if (title && showdown2.helper.isString(title)) {
            title = title.replace(/"/g, "&quot;").replace(showdown2.helper.regexes.asteriskDashAndColon, showdown2.helper.escapeCharactersCallback);
            result += ' title="' + title + '"';
          }
          if (width && height) {
            width = width === "*" ? "auto" : width;
            height = height === "*" ? "auto" : height;
            result += ' width="' + width + '"';
            result += ' height="' + height + '"';
          }
          result += " />";
          return result;
        }
        text2 = text2.replace(referenceRegExp, writeImageTag);
        text2 = text2.replace(base64RegExp, writeImageTagBase64);
        text2 = text2.replace(crazyRegExp, writeImageTag);
        text2 = text2.replace(inlineRegExp, writeImageTag);
        text2 = text2.replace(refShortcutRegExp, writeImageTag);
        text2 = globals.converter._dispatch("images.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("italicsAndBold", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("italicsAndBold.before", text2, options, globals);
        function parseInside(txt, left, right) {
          return left + txt + right;
        }
        if (options.literalMidWordUnderscores) {
          text2 = text2.replace(/\b___(\S[\s\S]*?)___\b/g, function(wm, txt) {
            return parseInside(txt, "<strong><em>", "</em></strong>");
          });
          text2 = text2.replace(/\b__(\S[\s\S]*?)__\b/g, function(wm, txt) {
            return parseInside(txt, "<strong>", "</strong>");
          });
          text2 = text2.replace(/\b_(\S[\s\S]*?)_\b/g, function(wm, txt) {
            return parseInside(txt, "<em>", "</em>");
          });
        } else {
          text2 = text2.replace(/___(\S[\s\S]*?)___/g, function(wm, m) {
            return /\S$/.test(m) ? parseInside(m, "<strong><em>", "</em></strong>") : wm;
          });
          text2 = text2.replace(/__(\S[\s\S]*?)__/g, function(wm, m) {
            return /\S$/.test(m) ? parseInside(m, "<strong>", "</strong>") : wm;
          });
          text2 = text2.replace(/_([^\s_][\s\S]*?)_/g, function(wm, m) {
            return /\S$/.test(m) ? parseInside(m, "<em>", "</em>") : wm;
          });
        }
        if (options.literalMidWordAsterisks) {
          text2 = text2.replace(/([^*]|^)\B\*\*\*(\S[\s\S]*?)\*\*\*\B(?!\*)/g, function(wm, lead, txt) {
            return parseInside(txt, lead + "<strong><em>", "</em></strong>");
          });
          text2 = text2.replace(/([^*]|^)\B\*\*(\S[\s\S]*?)\*\*\B(?!\*)/g, function(wm, lead, txt) {
            return parseInside(txt, lead + "<strong>", "</strong>");
          });
          text2 = text2.replace(/([^*]|^)\B\*(\S[\s\S]*?)\*\B(?!\*)/g, function(wm, lead, txt) {
            return parseInside(txt, lead + "<em>", "</em>");
          });
        } else {
          text2 = text2.replace(/\*\*\*(\S[\s\S]*?)\*\*\*/g, function(wm, m) {
            return /\S$/.test(m) ? parseInside(m, "<strong><em>", "</em></strong>") : wm;
          });
          text2 = text2.replace(/\*\*(\S[\s\S]*?)\*\*/g, function(wm, m) {
            return /\S$/.test(m) ? parseInside(m, "<strong>", "</strong>") : wm;
          });
          text2 = text2.replace(/\*([^\s*][\s\S]*?)\*/g, function(wm, m) {
            return /\S$/.test(m) ? parseInside(m, "<em>", "</em>") : wm;
          });
        }
        text2 = globals.converter._dispatch("italicsAndBold.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("lists", function(text2, options, globals) {
        "use strict";
        function processListItems(listStr, trimTrailing) {
          globals.gListLevel++;
          listStr = listStr.replace(/\n{2,}$/, "\n");
          listStr += "¨0";
          var rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0| {0,3}([*+-]|\d+[.])[ \t]+))/gm, isParagraphed = /\n[ \t]*\n(?!¨0)/.test(listStr);
          if (options.disableForced4SpacesIndentedSublists) {
            rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0|\2([*+-]|\d+[.])[ \t]+))/gm;
          }
          listStr = listStr.replace(rgx, function(wholeMatch, m1, m2, m3, m4, taskbtn, checked) {
            checked = checked && checked.trim() !== "";
            var item = showdown2.subParser("outdent")(m4, options, globals), bulletStyle = "";
            if (taskbtn && options.tasklists) {
              bulletStyle = ' class="task-list-item" style="list-style-type: none;"';
              item = item.replace(/^[ \t]*\[(x|X| )?]/m, function() {
                var otp = '<input type="checkbox" disabled style="margin: 0px 0.35em 0.25em -1.6em; vertical-align: middle;"';
                if (checked) {
                  otp += " checked";
                }
                otp += ">";
                return otp;
              });
            }
            item = item.replace(/^([-*+]|\d\.)[ \t]+[\S\n ]*/g, function(wm2) {
              return "¨A" + wm2;
            });
            if (m1 || item.search(/\n{2,}/) > -1) {
              item = showdown2.subParser("githubCodeBlocks")(item, options, globals);
              item = showdown2.subParser("blockGamut")(item, options, globals);
            } else {
              item = showdown2.subParser("lists")(item, options, globals);
              item = item.replace(/\n$/, "");
              item = showdown2.subParser("hashHTMLBlocks")(item, options, globals);
              item = item.replace(/\n\n+/g, "\n\n");
              if (isParagraphed) {
                item = showdown2.subParser("paragraphs")(item, options, globals);
              } else {
                item = showdown2.subParser("spanGamut")(item, options, globals);
              }
            }
            item = item.replace("¨A", "");
            item = "<li" + bulletStyle + ">" + item + "</li>\n";
            return item;
          });
          listStr = listStr.replace(/¨0/g, "");
          globals.gListLevel--;
          if (trimTrailing) {
            listStr = listStr.replace(/\s+$/, "");
          }
          return listStr;
        }
        function styleStartNumber(list, listType) {
          if (listType === "ol") {
            var res = list.match(/^ *(\d+)\./);
            if (res && res[1] !== "1") {
              return ' start="' + res[1] + '"';
            }
          }
          return "";
        }
        function parseConsecutiveLists(list, listType, trimTrailing) {
          var olRgx = options.disableForced4SpacesIndentedSublists ? /^ ?\d+\.[ \t]/gm : /^ {0,3}\d+\.[ \t]/gm, ulRgx = options.disableForced4SpacesIndentedSublists ? /^ ?[*+-][ \t]/gm : /^ {0,3}[*+-][ \t]/gm, counterRxg = listType === "ul" ? olRgx : ulRgx, result = "";
          if (list.search(counterRxg) !== -1) {
            (function parseCL(txt) {
              var pos = txt.search(counterRxg), style2 = styleStartNumber(list, listType);
              if (pos !== -1) {
                result += "\n\n<" + listType + style2 + ">\n" + processListItems(txt.slice(0, pos), !!trimTrailing) + "</" + listType + ">\n";
                listType = listType === "ul" ? "ol" : "ul";
                counterRxg = listType === "ul" ? olRgx : ulRgx;
                parseCL(txt.slice(pos));
              } else {
                result += "\n\n<" + listType + style2 + ">\n" + processListItems(txt, !!trimTrailing) + "</" + listType + ">\n";
              }
            })(list);
          } else {
            var style = styleStartNumber(list, listType);
            result = "\n\n<" + listType + style + ">\n" + processListItems(list, !!trimTrailing) + "</" + listType + ">\n";
          }
          return result;
        }
        text2 = globals.converter._dispatch("lists.before", text2, options, globals);
        text2 += "¨0";
        if (globals.gListLevel) {
          text2 = text2.replace(
            /^(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
            function(wholeMatch, list, m2) {
              var listType = m2.search(/[*+-]/g) > -1 ? "ul" : "ol";
              return parseConsecutiveLists(list, listType, true);
            }
          );
        } else {
          text2 = text2.replace(
            /(\n\n|^\n?)(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
            function(wholeMatch, m1, list, m3) {
              var listType = m3.search(/[*+-]/g) > -1 ? "ul" : "ol";
              return parseConsecutiveLists(list, listType, false);
            }
          );
        }
        text2 = text2.replace(/¨0/, "");
        text2 = globals.converter._dispatch("lists.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("metadata", function(text2, options, globals) {
        "use strict";
        if (!options.metadata) {
          return text2;
        }
        text2 = globals.converter._dispatch("metadata.before", text2, options, globals);
        function parseMetadataContents(content) {
          globals.metadata.raw = content;
          content = content.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
          content = content.replace(/\n {4}/g, " ");
          content.replace(/^([\S ]+): +([\s\S]+?)$/gm, function(wm, key, value) {
            globals.metadata.parsed[key] = value;
            return "";
          });
        }
        text2 = text2.replace(/^\s*«««+(\S*?)\n([\s\S]+?)\n»»»+\n/, function(wholematch, format, content) {
          parseMetadataContents(content);
          return "¨M";
        });
        text2 = text2.replace(/^\s*---+(\S*?)\n([\s\S]+?)\n---+\n/, function(wholematch, format, content) {
          if (format) {
            globals.metadata.format = format;
          }
          parseMetadataContents(content);
          return "¨M";
        });
        text2 = text2.replace(/¨M/g, "");
        text2 = globals.converter._dispatch("metadata.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("outdent", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("outdent.before", text2, options, globals);
        text2 = text2.replace(/^(\t|[ ]{1,4})/gm, "¨0");
        text2 = text2.replace(/¨0/g, "");
        text2 = globals.converter._dispatch("outdent.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("paragraphs", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("paragraphs.before", text2, options, globals);
        text2 = text2.replace(/^\n+/g, "");
        text2 = text2.replace(/\n+$/g, "");
        var grafs = text2.split(/\n{2,}/g), grafsOut = [], end = grafs.length;
        for (var i = 0; i < end; i++) {
          var str = grafs[i];
          if (str.search(/¨(K|G)(\d+)\1/g) >= 0) {
            grafsOut.push(str);
          } else if (str.search(/\S/) >= 0) {
            str = showdown2.subParser("spanGamut")(str, options, globals);
            str = str.replace(/^([ \t]*)/g, "<p>");
            str += "</p>";
            grafsOut.push(str);
          }
        }
        end = grafsOut.length;
        for (i = 0; i < end; i++) {
          var blockText = "", grafsOutIt = grafsOut[i], codeFlag = false;
          while (/¨(K|G)(\d+)\1/.test(grafsOutIt)) {
            var delim = RegExp.$1, num = RegExp.$2;
            if (delim === "K") {
              blockText = globals.gHtmlBlocks[num];
            } else {
              if (codeFlag) {
                blockText = showdown2.subParser("encodeCode")(globals.ghCodeBlocks[num].text, options, globals);
              } else {
                blockText = globals.ghCodeBlocks[num].codeblock;
              }
            }
            blockText = blockText.replace(/\$/g, "$$$$");
            grafsOutIt = grafsOutIt.replace(/(\n\n)?¨(K|G)\d+\2(\n\n)?/, blockText);
            if (/^<pre\b[^>]*>\s*<code\b[^>]*>/.test(grafsOutIt)) {
              codeFlag = true;
            }
          }
          grafsOut[i] = grafsOutIt;
        }
        text2 = grafsOut.join("\n");
        text2 = text2.replace(/^\n+/g, "");
        text2 = text2.replace(/\n+$/g, "");
        return globals.converter._dispatch("paragraphs.after", text2, options, globals);
      });
      showdown2.subParser("runExtension", function(ext, text2, options, globals) {
        "use strict";
        if (ext.filter) {
          text2 = ext.filter(text2, globals.converter, options);
        } else if (ext.regex) {
          var re = ext.regex;
          if (!(re instanceof RegExp)) {
            re = new RegExp(re, "g");
          }
          text2 = text2.replace(re, ext.replace);
        }
        return text2;
      });
      showdown2.subParser("spanGamut", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("spanGamut.before", text2, options, globals);
        text2 = showdown2.subParser("codeSpans")(text2, options, globals);
        text2 = showdown2.subParser("escapeSpecialCharsWithinTagAttributes")(text2, options, globals);
        text2 = showdown2.subParser("encodeBackslashEscapes")(text2, options, globals);
        text2 = showdown2.subParser("images")(text2, options, globals);
        text2 = showdown2.subParser("anchors")(text2, options, globals);
        text2 = showdown2.subParser("autoLinks")(text2, options, globals);
        text2 = showdown2.subParser("simplifiedAutoLinks")(text2, options, globals);
        text2 = showdown2.subParser("emoji")(text2, options, globals);
        text2 = showdown2.subParser("underline")(text2, options, globals);
        text2 = showdown2.subParser("italicsAndBold")(text2, options, globals);
        text2 = showdown2.subParser("strikethrough")(text2, options, globals);
        text2 = showdown2.subParser("ellipsis")(text2, options, globals);
        text2 = showdown2.subParser("hashHTMLSpans")(text2, options, globals);
        text2 = showdown2.subParser("encodeAmpsAndAngles")(text2, options, globals);
        if (options.simpleLineBreaks) {
          if (!/\n\n¨K/.test(text2)) {
            text2 = text2.replace(/\n+/g, "<br />\n");
          }
        } else {
          text2 = text2.replace(/  +\n/g, "<br />\n");
        }
        text2 = globals.converter._dispatch("spanGamut.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("strikethrough", function(text2, options, globals) {
        "use strict";
        function parseInside(txt) {
          if (options.simplifiedAutoLink) {
            txt = showdown2.subParser("simplifiedAutoLinks")(txt, options, globals);
          }
          return "<del>" + txt + "</del>";
        }
        if (options.strikethrough) {
          text2 = globals.converter._dispatch("strikethrough.before", text2, options, globals);
          text2 = text2.replace(/(?:~){2}([\s\S]+?)(?:~){2}/g, function(wm, txt) {
            return parseInside(txt);
          });
          text2 = globals.converter._dispatch("strikethrough.after", text2, options, globals);
        }
        return text2;
      });
      showdown2.subParser("stripLinkDefinitions", function(text2, options, globals) {
        "use strict";
        var regex = /^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?([^>\s]+)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n+|(?=¨0))/gm, base64Regex = /^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n\n|(?=¨0)|(?=\n\[))/gm;
        text2 += "¨0";
        var replaceFunc = function(wholeMatch, linkId, url, width, height, blankLines, title) {
          linkId = linkId.toLowerCase();
          if (url.match(/^data:.+?\/.+?;base64,/)) {
            globals.gUrls[linkId] = url.replace(/\s/g, "");
          } else {
            globals.gUrls[linkId] = showdown2.subParser("encodeAmpsAndAngles")(url, options, globals);
          }
          if (blankLines) {
            return blankLines + title;
          } else {
            if (title) {
              globals.gTitles[linkId] = title.replace(/"|'/g, "&quot;");
            }
            if (options.parseImgDimensions && width && height) {
              globals.gDimensions[linkId] = {
                width,
                height
              };
            }
          }
          return "";
        };
        text2 = text2.replace(base64Regex, replaceFunc);
        text2 = text2.replace(regex, replaceFunc);
        text2 = text2.replace(/¨0/, "");
        return text2;
      });
      showdown2.subParser("tables", function(text2, options, globals) {
        "use strict";
        if (!options.tables) {
          return text2;
        }
        var tableRgx = /^ {0,3}\|?.+\|.+\n {0,3}\|?[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*(?:[-=]){2,}[\s\S]+?(?:\n\n|¨0)/gm, singeColTblRgx = /^ {0,3}\|.+\|[ \t]*\n {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n( {0,3}\|.+\|[ \t]*\n)*(?:\n|¨0)/gm;
        function parseStyles(sLine) {
          if (/^:[ \t]*--*$/.test(sLine)) {
            return ' style="text-align:left;"';
          } else if (/^--*[ \t]*:[ \t]*$/.test(sLine)) {
            return ' style="text-align:right;"';
          } else if (/^:[ \t]*--*[ \t]*:$/.test(sLine)) {
            return ' style="text-align:center;"';
          } else {
            return "";
          }
        }
        function parseHeaders(header, style) {
          var id = "";
          header = header.trim();
          if (options.tablesHeaderId || options.tableHeaderId) {
            id = ' id="' + header.replace(/ /g, "_").toLowerCase() + '"';
          }
          header = showdown2.subParser("spanGamut")(header, options, globals);
          return "<th" + id + style + ">" + header + "</th>\n";
        }
        function parseCells(cell, style) {
          var subText = showdown2.subParser("spanGamut")(cell, options, globals);
          return "<td" + style + ">" + subText + "</td>\n";
        }
        function buildTable(headers, cells) {
          var tb = "<table>\n<thead>\n<tr>\n", tblLgn = headers.length;
          for (var i = 0; i < tblLgn; ++i) {
            tb += headers[i];
          }
          tb += "</tr>\n</thead>\n<tbody>\n";
          for (i = 0; i < cells.length; ++i) {
            tb += "<tr>\n";
            for (var ii = 0; ii < tblLgn; ++ii) {
              tb += cells[i][ii];
            }
            tb += "</tr>\n";
          }
          tb += "</tbody>\n</table>\n";
          return tb;
        }
        function parseTable(rawTable) {
          var i, tableLines = rawTable.split("\n");
          for (i = 0; i < tableLines.length; ++i) {
            if (/^ {0,3}\|/.test(tableLines[i])) {
              tableLines[i] = tableLines[i].replace(/^ {0,3}\|/, "");
            }
            if (/\|[ \t]*$/.test(tableLines[i])) {
              tableLines[i] = tableLines[i].replace(/\|[ \t]*$/, "");
            }
            tableLines[i] = showdown2.subParser("codeSpans")(tableLines[i], options, globals);
          }
          var rawHeaders = tableLines[0].split("|").map(function(s) {
            return s.trim();
          }), rawStyles = tableLines[1].split("|").map(function(s) {
            return s.trim();
          }), rawCells = [], headers = [], styles = [], cells = [];
          tableLines.shift();
          tableLines.shift();
          for (i = 0; i < tableLines.length; ++i) {
            if (tableLines[i].trim() === "") {
              continue;
            }
            rawCells.push(
              tableLines[i].split("|").map(function(s) {
                return s.trim();
              })
            );
          }
          if (rawHeaders.length < rawStyles.length) {
            return rawTable;
          }
          for (i = 0; i < rawStyles.length; ++i) {
            styles.push(parseStyles(rawStyles[i]));
          }
          for (i = 0; i < rawHeaders.length; ++i) {
            if (showdown2.helper.isUndefined(styles[i])) {
              styles[i] = "";
            }
            headers.push(parseHeaders(rawHeaders[i], styles[i]));
          }
          for (i = 0; i < rawCells.length; ++i) {
            var row = [];
            for (var ii = 0; ii < headers.length; ++ii) {
              if (showdown2.helper.isUndefined(rawCells[i][ii])) {
              }
              row.push(parseCells(rawCells[i][ii], styles[ii]));
            }
            cells.push(row);
          }
          return buildTable(headers, cells);
        }
        text2 = globals.converter._dispatch("tables.before", text2, options, globals);
        text2 = text2.replace(/\\(\|)/g, showdown2.helper.escapeCharactersCallback);
        text2 = text2.replace(tableRgx, parseTable);
        text2 = text2.replace(singeColTblRgx, parseTable);
        text2 = globals.converter._dispatch("tables.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("underline", function(text2, options, globals) {
        "use strict";
        if (!options.underline) {
          return text2;
        }
        text2 = globals.converter._dispatch("underline.before", text2, options, globals);
        if (options.literalMidWordUnderscores) {
          text2 = text2.replace(/\b___(\S[\s\S]*?)___\b/g, function(wm, txt) {
            return "<u>" + txt + "</u>";
          });
          text2 = text2.replace(/\b__(\S[\s\S]*?)__\b/g, function(wm, txt) {
            return "<u>" + txt + "</u>";
          });
        } else {
          text2 = text2.replace(/___(\S[\s\S]*?)___/g, function(wm, m) {
            return /\S$/.test(m) ? "<u>" + m + "</u>" : wm;
          });
          text2 = text2.replace(/__(\S[\s\S]*?)__/g, function(wm, m) {
            return /\S$/.test(m) ? "<u>" + m + "</u>" : wm;
          });
        }
        text2 = text2.replace(/(_)/g, showdown2.helper.escapeCharactersCallback);
        text2 = globals.converter._dispatch("underline.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("unescapeSpecialChars", function(text2, options, globals) {
        "use strict";
        text2 = globals.converter._dispatch("unescapeSpecialChars.before", text2, options, globals);
        text2 = text2.replace(/¨E(\d+)E/g, function(wholeMatch, m1) {
          var charCodeToReplace = parseInt(m1);
          return String.fromCharCode(charCodeToReplace);
        });
        text2 = globals.converter._dispatch("unescapeSpecialChars.after", text2, options, globals);
        return text2;
      });
      showdown2.subParser("makeMarkdown.blockquote", function(node, globals) {
        "use strict";
        var txt = "";
        if (node.hasChildNodes()) {
          var children = node.childNodes, childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            var innerTxt = showdown2.subParser("makeMarkdown.node")(children[i], globals);
            if (innerTxt === "") {
              continue;
            }
            txt += innerTxt;
          }
        }
        txt = txt.trim();
        txt = "> " + txt.split("\n").join("\n> ");
        return txt;
      });
      showdown2.subParser("makeMarkdown.codeBlock", function(node, globals) {
        "use strict";
        var lang = node.getAttribute("language"), num = node.getAttribute("precodenum");
        return "```" + lang + "\n" + globals.preList[num] + "\n```";
      });
      showdown2.subParser("makeMarkdown.codeSpan", function(node) {
        "use strict";
        return "`" + node.innerHTML + "`";
      });
      showdown2.subParser("makeMarkdown.emphasis", function(node, globals) {
        "use strict";
        var txt = "";
        if (node.hasChildNodes()) {
          txt += "*";
          var children = node.childNodes, childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown2.subParser("makeMarkdown.node")(children[i], globals);
          }
          txt += "*";
        }
        return txt;
      });
      showdown2.subParser("makeMarkdown.header", function(node, globals, headerLevel) {
        "use strict";
        var headerMark = new Array(headerLevel + 1).join("#"), txt = "";
        if (node.hasChildNodes()) {
          txt = headerMark + " ";
          var children = node.childNodes, childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown2.subParser("makeMarkdown.node")(children[i], globals);
          }
        }
        return txt;
      });
      showdown2.subParser("makeMarkdown.hr", function() {
        "use strict";
        return "---";
      });
      showdown2.subParser("makeMarkdown.image", function(node) {
        "use strict";
        var txt = "";
        if (node.hasAttribute("src")) {
          txt += "![" + node.getAttribute("alt") + "](";
          txt += "<" + node.getAttribute("src") + ">";
          if (node.hasAttribute("width") && node.hasAttribute("height")) {
            txt += " =" + node.getAttribute("width") + "x" + node.getAttribute("height");
          }
          if (node.hasAttribute("title")) {
            txt += ' "' + node.getAttribute("title") + '"';
          }
          txt += ")";
        }
        return txt;
      });
      showdown2.subParser("makeMarkdown.links", function(node, globals) {
        "use strict";
        var txt = "";
        if (node.hasChildNodes() && node.hasAttribute("href")) {
          var children = node.childNodes, childrenLength = children.length;
          txt = "[";
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown2.subParser("makeMarkdown.node")(children[i], globals);
          }
          txt += "](";
          txt += "<" + node.getAttribute("href") + ">";
          if (node.hasAttribute("title")) {
            txt += ' "' + node.getAttribute("title") + '"';
          }
          txt += ")";
        }
        return txt;
      });
      showdown2.subParser("makeMarkdown.list", function(node, globals, type) {
        "use strict";
        var txt = "";
        if (!node.hasChildNodes()) {
          return "";
        }
        var listItems = node.childNodes, listItemsLenght = listItems.length, listNum = node.getAttribute("start") || 1;
        for (var i = 0; i < listItemsLenght; ++i) {
          if (typeof listItems[i].tagName === "undefined" || listItems[i].tagName.toLowerCase() !== "li") {
            continue;
          }
          var bullet = "";
          if (type === "ol") {
            bullet = listNum.toString() + ". ";
          } else {
            bullet = "- ";
          }
          txt += bullet + showdown2.subParser("makeMarkdown.listItem")(listItems[i], globals);
          ++listNum;
        }
        txt += "\n<!-- -->\n";
        return txt.trim();
      });
      showdown2.subParser("makeMarkdown.listItem", function(node, globals) {
        "use strict";
        var listItemTxt = "";
        var children = node.childNodes, childrenLenght = children.length;
        for (var i = 0; i < childrenLenght; ++i) {
          listItemTxt += showdown2.subParser("makeMarkdown.node")(children[i], globals);
        }
        if (!/\n$/.test(listItemTxt)) {
          listItemTxt += "\n";
        } else {
          listItemTxt = listItemTxt.split("\n").join("\n    ").replace(/^ {4}$/gm, "").replace(/\n\n+/g, "\n\n");
        }
        return listItemTxt;
      });
      showdown2.subParser("makeMarkdown.node", function(node, globals, spansOnly) {
        "use strict";
        spansOnly = spansOnly || false;
        var txt = "";
        if (node.nodeType === 3) {
          return showdown2.subParser("makeMarkdown.txt")(node, globals);
        }
        if (node.nodeType === 8) {
          return "<!--" + node.data + "-->\n\n";
        }
        if (node.nodeType !== 1) {
          return "";
        }
        var tagName = node.tagName.toLowerCase();
        switch (tagName) {
          case "h1":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.header")(node, globals, 1) + "\n\n";
            }
            break;
          case "h2":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.header")(node, globals, 2) + "\n\n";
            }
            break;
          case "h3":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.header")(node, globals, 3) + "\n\n";
            }
            break;
          case "h4":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.header")(node, globals, 4) + "\n\n";
            }
            break;
          case "h5":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.header")(node, globals, 5) + "\n\n";
            }
            break;
          case "h6":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.header")(node, globals, 6) + "\n\n";
            }
            break;
          case "p":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.paragraph")(node, globals) + "\n\n";
            }
            break;
          case "blockquote":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.blockquote")(node, globals) + "\n\n";
            }
            break;
          case "hr":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.hr")(node, globals) + "\n\n";
            }
            break;
          case "ol":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.list")(node, globals, "ol") + "\n\n";
            }
            break;
          case "ul":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.list")(node, globals, "ul") + "\n\n";
            }
            break;
          case "precode":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.codeBlock")(node, globals) + "\n\n";
            }
            break;
          case "pre":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.pre")(node, globals) + "\n\n";
            }
            break;
          case "table":
            if (!spansOnly) {
              txt = showdown2.subParser("makeMarkdown.table")(node, globals) + "\n\n";
            }
            break;
          case "code":
            txt = showdown2.subParser("makeMarkdown.codeSpan")(node, globals);
            break;
          case "em":
          case "i":
            txt = showdown2.subParser("makeMarkdown.emphasis")(node, globals);
            break;
          case "strong":
          case "b":
            txt = showdown2.subParser("makeMarkdown.strong")(node, globals);
            break;
          case "del":
            txt = showdown2.subParser("makeMarkdown.strikethrough")(node, globals);
            break;
          case "a":
            txt = showdown2.subParser("makeMarkdown.links")(node, globals);
            break;
          case "img":
            txt = showdown2.subParser("makeMarkdown.image")(node, globals);
            break;
          default:
            txt = node.outerHTML + "\n\n";
        }
        return txt;
      });
      showdown2.subParser("makeMarkdown.paragraph", function(node, globals) {
        "use strict";
        var txt = "";
        if (node.hasChildNodes()) {
          var children = node.childNodes, childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown2.subParser("makeMarkdown.node")(children[i], globals);
          }
        }
        txt = txt.trim();
        return txt;
      });
      showdown2.subParser("makeMarkdown.pre", function(node, globals) {
        "use strict";
        var num = node.getAttribute("prenum");
        return "<pre>" + globals.preList[num] + "</pre>";
      });
      showdown2.subParser("makeMarkdown.strikethrough", function(node, globals) {
        "use strict";
        var txt = "";
        if (node.hasChildNodes()) {
          txt += "~~";
          var children = node.childNodes, childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown2.subParser("makeMarkdown.node")(children[i], globals);
          }
          txt += "~~";
        }
        return txt;
      });
      showdown2.subParser("makeMarkdown.strong", function(node, globals) {
        "use strict";
        var txt = "";
        if (node.hasChildNodes()) {
          txt += "**";
          var children = node.childNodes, childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown2.subParser("makeMarkdown.node")(children[i], globals);
          }
          txt += "**";
        }
        return txt;
      });
      showdown2.subParser("makeMarkdown.table", function(node, globals) {
        "use strict";
        var txt = "", tableArray = [[], []], headings = node.querySelectorAll("thead>tr>th"), rows = node.querySelectorAll("tbody>tr"), i, ii;
        for (i = 0; i < headings.length; ++i) {
          var headContent = showdown2.subParser("makeMarkdown.tableCell")(headings[i], globals), allign = "---";
          if (headings[i].hasAttribute("style")) {
            var style = headings[i].getAttribute("style").toLowerCase().replace(/\s/g, "");
            switch (style) {
              case "text-align:left;":
                allign = ":---";
                break;
              case "text-align:right;":
                allign = "---:";
                break;
              case "text-align:center;":
                allign = ":---:";
                break;
            }
          }
          tableArray[0][i] = headContent.trim();
          tableArray[1][i] = allign;
        }
        for (i = 0; i < rows.length; ++i) {
          var r = tableArray.push([]) - 1, cols = rows[i].getElementsByTagName("td");
          for (ii = 0; ii < headings.length; ++ii) {
            var cellContent = " ";
            if (typeof cols[ii] !== "undefined") {
              cellContent = showdown2.subParser("makeMarkdown.tableCell")(cols[ii], globals);
            }
            tableArray[r].push(cellContent);
          }
        }
        var cellSpacesCount = 3;
        for (i = 0; i < tableArray.length; ++i) {
          for (ii = 0; ii < tableArray[i].length; ++ii) {
            var strLen = tableArray[i][ii].length;
            if (strLen > cellSpacesCount) {
              cellSpacesCount = strLen;
            }
          }
        }
        for (i = 0; i < tableArray.length; ++i) {
          for (ii = 0; ii < tableArray[i].length; ++ii) {
            if (i === 1) {
              if (tableArray[i][ii].slice(-1) === ":") {
                tableArray[i][ii] = showdown2.helper.padEnd(tableArray[i][ii].slice(-1), cellSpacesCount - 1, "-") + ":";
              } else {
                tableArray[i][ii] = showdown2.helper.padEnd(tableArray[i][ii], cellSpacesCount, "-");
              }
            } else {
              tableArray[i][ii] = showdown2.helper.padEnd(tableArray[i][ii], cellSpacesCount);
            }
          }
          txt += "| " + tableArray[i].join(" | ") + " |\n";
        }
        return txt.trim();
      });
      showdown2.subParser("makeMarkdown.tableCell", function(node, globals) {
        "use strict";
        var txt = "";
        if (!node.hasChildNodes()) {
          return "";
        }
        var children = node.childNodes, childrenLength = children.length;
        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown2.subParser("makeMarkdown.node")(children[i], globals, true);
        }
        return txt.trim();
      });
      showdown2.subParser("makeMarkdown.txt", function(node) {
        "use strict";
        var txt = node.nodeValue;
        txt = txt.replace(/ +/g, " ");
        txt = txt.replace(/¨NBSP;/g, " ");
        txt = showdown2.helper.unescapeHTMLEntities(txt);
        txt = txt.replace(/([*_~|`])/g, "\\$1");
        txt = txt.replace(/^(\s*)>/g, "\\$1>");
        txt = txt.replace(/^#/gm, "\\#");
        txt = txt.replace(/^(\s*)([-=]{3,})(\s*)$/, "$1\\$2$3");
        txt = txt.replace(/^( {0,3}\d+)\./gm, "$1\\.");
        txt = txt.replace(/^( {0,3})([+-])/gm, "$1\\$2");
        txt = txt.replace(/]([\s]*)\(/g, "\\]$1\\(");
        txt = txt.replace(/^ {0,3}\[([\S \t]*?)]:/gm, "\\[$1]:");
        return txt;
      });
      var root = this;
      if (typeof define === "function" && define.amd) {
        define(function() {
          "use strict";
          return showdown2;
        });
      } else if (typeof module !== "undefined" && module.exports) {
        module.exports = showdown2;
      } else {
        root.showdown = showdown2;
      }
    }).call(exports);
  }
});

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/i18n/build-module/sprintf.js
var import_sprintf_js = __toESM(require_sprintf());
var logErrorOnce = memize(console.error);
function sprintf(format, ...args) {
  try {
    return import_sprintf_js.default.sprintf(format, ...args);
  } catch (error) {
    if (error instanceof Error) {
      logErrorOnce("sprintf error: \n\n" + error.toString());
    }
    return format;
  }
}

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/i18n/build-module/create-i18n.js
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
  const __2 = (text2, domain) => {
    let translation = dcnpgettext(domain, void 0, text2);
    if (!hooks) {
      return translation;
    }
    translation = /** @type {string} */
    /** @type {*} */
    hooks.applyFilters("i18n.gettext", translation, text2, domain);
    return (
      /** @type {string} */
      /** @type {*} */
      hooks.applyFilters("i18n.gettext_" + getFilterDomain(domain), translation, text2, domain)
    );
  };
  const _x2 = (text2, context, domain) => {
    let translation = dcnpgettext(domain, context, text2);
    if (!hooks) {
      return translation;
    }
    translation = /** @type {string} */
    /** @type {*} */
    hooks.applyFilters("i18n.gettext_with_context", translation, text2, context, domain);
    return (
      /** @type {string} */
      /** @type {*} */
      hooks.applyFilters("i18n.gettext_with_context_" + getFilterDomain(domain), translation, text2, context, domain)
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

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/i18n/build-module/default-i18n.js
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

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/element/build-module/react.js
var import_react = __toESM(require_react());

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/element/build-module/react-platform.js
var import_react_dom = __toESM(require_react_dom());
var import_client = __toESM(require_client());

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/element/build-module/platform.js
var Platform = {
  OS: "web",
  select: (spec) => "web" in spec ? spec.web : spec.default,
  isWeb: true
};
var platform_default = Platform;

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/element/build-module/raw-html.js
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

// ../../node_modules/@wordpress/blocks/node_modules/@wordpress/element/build-module/serialize.js
var {
  Provider,
  Consumer
} = (0, import_react.createContext)(void 0);
var ForwardRef = (0, import_react.forwardRef)(() => {
  return null;
});
var ATTRIBUTES_TYPES = /* @__PURE__ */ new Set(["string", "boolean", "number"]);
var SELF_CLOSING_TAGS = /* @__PURE__ */ new Set(["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"]);
var BOOLEAN_ATTRIBUTES = /* @__PURE__ */ new Set(["allowfullscreen", "allowpaymentrequest", "allowusermedia", "async", "autofocus", "autoplay", "checked", "controls", "default", "defer", "disabled", "download", "formnovalidate", "hidden", "ismap", "itemscope", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "selected", "typemustmatch"]);
var ENUMERATED_ATTRIBUTES = /* @__PURE__ */ new Set(["autocapitalize", "autocomplete", "charset", "contenteditable", "crossorigin", "decoding", "dir", "draggable", "enctype", "formenctype", "formmethod", "http-equiv", "inputmode", "kind", "method", "preload", "scope", "shape", "spellcheck", "translate", "type", "wrap"]);
var CSS_PROPERTIES_SUPPORTS_UNITLESS = /* @__PURE__ */ new Set(["animation", "animationIterationCount", "baselineShift", "borderImageOutset", "borderImageSlice", "borderImageWidth", "columnCount", "cx", "cy", "fillOpacity", "flexGrow", "flexShrink", "floodOpacity", "fontWeight", "gridColumnEnd", "gridColumnStart", "gridRowEnd", "gridRowStart", "lineHeight", "opacity", "order", "orphans", "r", "rx", "ry", "shapeImageThreshold", "stopOpacity", "strokeDasharray", "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth", "tabSize", "widows", "x", "y", "zIndex", "zoom"]);
function hasPrefix(string2, prefixes) {
  return prefixes.some((prefix) => string2.indexOf(prefix) === 0);
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
  if (typeof value === "number" && 0 !== value && !CSS_PROPERTIES_SUPPORTS_UNITLESS.has(property)) {
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
  } = (
    /** @type {{type?: any, props?: any}} */
    element
  );
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
  const instance = new /** @type {import('react').ComponentClass} */
  Component2(props, legacyContext);
  if (typeof // Ignore reason: Current prettier reformats parens and mangles type assertion
  // prettier-ignore
  /** @type {{getChildContext?: () => unknown}} */
  instance.getChildContext === "function") {
    Object.assign(
      legacyContext,
      /** @type {{getChildContext?: () => unknown}} */
      instance.getChildContext()
    );
  }
  const html2 = renderElement(instance.render(), context, legacyContext);
  return html2;
}
function renderChildren(children, context, legacyContext = {}) {
  let result = "";
  children = Array.isArray(children) ? children : [children];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
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
  for (const property in style) {
    const value = style[property];
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

// ../../node_modules/@wordpress/blocks/build-module/api/constants.js
var BLOCK_ICON_DEFAULT = "block-default";
var DEPRECATED_ENTRY_KEYS = ["attributes", "supports", "save", "migrate", "isEligible", "apiVersion"];
var __EXPERIMENTAL_STYLE_PROPERTY = {
  // Kept for back-compatibility purposes.
  "--wp--style--color--link": {
    value: ["color", "link"],
    support: ["color", "link"]
  },
  aspectRatio: {
    value: ["dimensions", "aspectRatio"],
    support: ["dimensions", "aspectRatio"],
    useEngine: true
  },
  background: {
    value: ["color", "gradient"],
    support: ["color", "gradients"],
    useEngine: true
  },
  backgroundColor: {
    value: ["color", "background"],
    support: ["color", "background"],
    requiresOptOut: true,
    useEngine: true
  },
  backgroundImage: {
    value: ["background", "backgroundImage"],
    support: ["background", "backgroundImage"],
    useEngine: true
  },
  backgroundRepeat: {
    value: ["background", "backgroundRepeat"],
    support: ["background", "backgroundRepeat"],
    useEngine: true
  },
  backgroundSize: {
    value: ["background", "backgroundSize"],
    support: ["background", "backgroundSize"],
    useEngine: true
  },
  backgroundPosition: {
    value: ["background", "backgroundPosition"],
    support: ["background", "backgroundPosition"],
    useEngine: true
  },
  borderColor: {
    value: ["border", "color"],
    support: ["__experimentalBorder", "color"],
    useEngine: true
  },
  borderRadius: {
    value: ["border", "radius"],
    support: ["__experimentalBorder", "radius"],
    properties: {
      borderTopLeftRadius: "topLeft",
      borderTopRightRadius: "topRight",
      borderBottomLeftRadius: "bottomLeft",
      borderBottomRightRadius: "bottomRight"
    },
    useEngine: true
  },
  borderStyle: {
    value: ["border", "style"],
    support: ["__experimentalBorder", "style"],
    useEngine: true
  },
  borderWidth: {
    value: ["border", "width"],
    support: ["__experimentalBorder", "width"],
    useEngine: true
  },
  borderTopColor: {
    value: ["border", "top", "color"],
    support: ["__experimentalBorder", "color"],
    useEngine: true
  },
  borderTopStyle: {
    value: ["border", "top", "style"],
    support: ["__experimentalBorder", "style"],
    useEngine: true
  },
  borderTopWidth: {
    value: ["border", "top", "width"],
    support: ["__experimentalBorder", "width"],
    useEngine: true
  },
  borderRightColor: {
    value: ["border", "right", "color"],
    support: ["__experimentalBorder", "color"],
    useEngine: true
  },
  borderRightStyle: {
    value: ["border", "right", "style"],
    support: ["__experimentalBorder", "style"],
    useEngine: true
  },
  borderRightWidth: {
    value: ["border", "right", "width"],
    support: ["__experimentalBorder", "width"],
    useEngine: true
  },
  borderBottomColor: {
    value: ["border", "bottom", "color"],
    support: ["__experimentalBorder", "color"],
    useEngine: true
  },
  borderBottomStyle: {
    value: ["border", "bottom", "style"],
    support: ["__experimentalBorder", "style"],
    useEngine: true
  },
  borderBottomWidth: {
    value: ["border", "bottom", "width"],
    support: ["__experimentalBorder", "width"],
    useEngine: true
  },
  borderLeftColor: {
    value: ["border", "left", "color"],
    support: ["__experimentalBorder", "color"],
    useEngine: true
  },
  borderLeftStyle: {
    value: ["border", "left", "style"],
    support: ["__experimentalBorder", "style"],
    useEngine: true
  },
  borderLeftWidth: {
    value: ["border", "left", "width"],
    support: ["__experimentalBorder", "width"],
    useEngine: true
  },
  color: {
    value: ["color", "text"],
    support: ["color", "text"],
    requiresOptOut: true,
    useEngine: true
  },
  columnCount: {
    value: ["typography", "textColumns"],
    support: ["typography", "textColumns"],
    useEngine: true
  },
  filter: {
    value: ["filter", "duotone"],
    support: ["filter", "duotone"]
  },
  linkColor: {
    value: ["elements", "link", "color", "text"],
    support: ["color", "link"]
  },
  captionColor: {
    value: ["elements", "caption", "color", "text"],
    support: ["color", "caption"]
  },
  buttonColor: {
    value: ["elements", "button", "color", "text"],
    support: ["color", "button"]
  },
  buttonBackgroundColor: {
    value: ["elements", "button", "color", "background"],
    support: ["color", "button"]
  },
  headingColor: {
    value: ["elements", "heading", "color", "text"],
    support: ["color", "heading"]
  },
  headingBackgroundColor: {
    value: ["elements", "heading", "color", "background"],
    support: ["color", "heading"]
  },
  fontFamily: {
    value: ["typography", "fontFamily"],
    support: ["typography", "__experimentalFontFamily"],
    useEngine: true
  },
  fontSize: {
    value: ["typography", "fontSize"],
    support: ["typography", "fontSize"],
    useEngine: true
  },
  fontStyle: {
    value: ["typography", "fontStyle"],
    support: ["typography", "__experimentalFontStyle"],
    useEngine: true
  },
  fontWeight: {
    value: ["typography", "fontWeight"],
    support: ["typography", "__experimentalFontWeight"],
    useEngine: true
  },
  lineHeight: {
    value: ["typography", "lineHeight"],
    support: ["typography", "lineHeight"],
    useEngine: true
  },
  margin: {
    value: ["spacing", "margin"],
    support: ["spacing", "margin"],
    properties: {
      marginTop: "top",
      marginRight: "right",
      marginBottom: "bottom",
      marginLeft: "left"
    },
    useEngine: true
  },
  minHeight: {
    value: ["dimensions", "minHeight"],
    support: ["dimensions", "minHeight"],
    useEngine: true
  },
  padding: {
    value: ["spacing", "padding"],
    support: ["spacing", "padding"],
    properties: {
      paddingTop: "top",
      paddingRight: "right",
      paddingBottom: "bottom",
      paddingLeft: "left"
    },
    useEngine: true
  },
  textAlign: {
    value: ["typography", "textAlign"],
    support: ["typography", "textAlign"],
    useEngine: false
  },
  textDecoration: {
    value: ["typography", "textDecoration"],
    support: ["typography", "__experimentalTextDecoration"],
    useEngine: true
  },
  textTransform: {
    value: ["typography", "textTransform"],
    support: ["typography", "__experimentalTextTransform"],
    useEngine: true
  },
  letterSpacing: {
    value: ["typography", "letterSpacing"],
    support: ["typography", "__experimentalLetterSpacing"],
    useEngine: true
  },
  writingMode: {
    value: ["typography", "writingMode"],
    support: ["typography", "__experimentalWritingMode"],
    useEngine: true
  },
  "--wp--style--root--padding": {
    value: ["spacing", "padding"],
    support: ["spacing", "padding"],
    properties: {
      "--wp--style--root--padding-top": "top",
      "--wp--style--root--padding-right": "right",
      "--wp--style--root--padding-bottom": "bottom",
      "--wp--style--root--padding-left": "left"
    },
    rootOnly: true
  }
};
var __EXPERIMENTAL_ELEMENTS = {
  link: "a:where(:not(.wp-element-button))",
  heading: "h1, h2, h3, h4, h5, h6",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  button: ".wp-element-button, .wp-block-button__link",
  caption: ".wp-element-caption, .wp-block-audio figcaption, .wp-block-embed figcaption, .wp-block-gallery figcaption, .wp-block-image figcaption, .wp-block-table figcaption, .wp-block-video figcaption",
  cite: "cite"
};
var __EXPERIMENTAL_PATHS_WITH_OVERRIDE = {
  "color.duotone": true,
  "color.gradients": true,
  "color.palette": true,
  "dimensions.aspectRatios": true,
  "typography.fontSizes": true,
  "spacing.spacingSizes": true
};

// ../../node_modules/@wordpress/blocks/build-module/lock-unlock.js
var {
  lock,
  unlock
} = __dangerousOptInToUnstableAPIsOnlyForCoreModules("I acknowledge private features are not for use in themes or plugins and doing so will break in the next version of WordPress.", "@wordpress/blocks");

// ../../node_modules/@wordpress/blocks/build-module/api/registration.js
var i18nBlockSchema = {
  title: "block title",
  description: "block description",
  keywords: ["block keyword"],
  styles: [{
    label: "block style label"
  }],
  variations: [{
    title: "block variation title",
    description: "block variation description",
    keywords: ["block variation keyword"]
  }]
};
function isObject(object) {
  return object !== null && typeof object === "object";
}
function unstable__bootstrapServerSideBlockDefinitions(definitions) {
  const {
    addBootstrappedBlockType: addBootstrappedBlockType2
  } = unlock(dispatch(store));
  for (const [name, blockType] of Object.entries(definitions)) {
    addBootstrappedBlockType2(name, blockType);
  }
}
function getBlockSettingsFromMetadata({
  textdomain,
  ...metadata
}) {
  const allowedFields = ["apiVersion", "title", "category", "parent", "ancestor", "icon", "description", "keywords", "attributes", "providesContext", "usesContext", "selectors", "supports", "styles", "example", "variations", "blockHooks", "allowedBlocks"];
  const settings = Object.fromEntries(Object.entries(metadata).filter(([key]) => allowedFields.includes(key)));
  if (textdomain) {
    Object.keys(i18nBlockSchema).forEach((key) => {
      if (!settings[key]) {
        return;
      }
      settings[key] = translateBlockSettingUsingI18nSchema(i18nBlockSchema[key], settings[key], textdomain);
    });
  }
  return settings;
}
function registerBlockType(blockNameOrMetadata, settings) {
  const name = isObject(blockNameOrMetadata) ? blockNameOrMetadata.name : blockNameOrMetadata;
  if (typeof name !== "string") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block names must be strings.") : void 0;
    return;
  }
  if (!/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(name)) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block names must contain a namespace prefix, include only lowercase alphanumeric characters or dashes, and start with a letter. Example: my-plugin/my-custom-block") : void 0;
    return;
  }
  if (select(store).getBlockType(name)) {
    globalThis.SCRIPT_DEBUG === true ? warning('Block "' + name + '" is already registered.') : void 0;
    return;
  }
  const {
    addBootstrappedBlockType: addBootstrappedBlockType2,
    addUnprocessedBlockType: addUnprocessedBlockType2
  } = unlock(dispatch(store));
  if (isObject(blockNameOrMetadata)) {
    const metadata = getBlockSettingsFromMetadata(blockNameOrMetadata);
    addBootstrappedBlockType2(name, metadata);
  }
  addUnprocessedBlockType2(name, settings);
  return select(store).getBlockType(name);
}
function translateBlockSettingUsingI18nSchema(i18nSchema, settingValue, textdomain) {
  if (typeof i18nSchema === "string" && typeof settingValue === "string") {
    return _x(settingValue, i18nSchema, textdomain);
  }
  if (Array.isArray(i18nSchema) && i18nSchema.length && Array.isArray(settingValue)) {
    return settingValue.map((value) => translateBlockSettingUsingI18nSchema(i18nSchema[0], value, textdomain));
  }
  if (isObject(i18nSchema) && Object.entries(i18nSchema).length && isObject(settingValue)) {
    return Object.keys(settingValue).reduce((accumulator, key) => {
      if (!i18nSchema[key]) {
        accumulator[key] = settingValue[key];
        return accumulator;
      }
      accumulator[key] = translateBlockSettingUsingI18nSchema(i18nSchema[key], settingValue[key], textdomain);
      return accumulator;
    }, {});
  }
  return settingValue;
}
function registerBlockCollection(namespace, {
  title,
  icon
}) {
  dispatch(store).addBlockCollection(namespace, title, icon);
}
function unregisterBlockType(name) {
  const oldBlock = select(store).getBlockType(name);
  if (!oldBlock) {
    globalThis.SCRIPT_DEBUG === true ? warning('Block "' + name + '" is not registered.') : void 0;
    return;
  }
  dispatch(store).removeBlockTypes(name);
  return oldBlock;
}
function setFreeformContentHandlerName(blockName) {
  dispatch(store).setFreeformFallbackBlockName(blockName);
}
function getFreeformContentHandlerName() {
  return select(store).getFreeformFallbackBlockName();
}
function getGroupingBlockName() {
  return select(store).getGroupingBlockName();
}
function setUnregisteredTypeHandlerName(blockName) {
  dispatch(store).setUnregisteredFallbackBlockName(blockName);
}
function getUnregisteredTypeHandlerName() {
  return select(store).getUnregisteredFallbackBlockName();
}
function setDefaultBlockName(name) {
  dispatch(store).setDefaultBlockName(name);
}
function setGroupingBlockName(name) {
  dispatch(store).setGroupingBlockName(name);
}
function getDefaultBlockName() {
  return select(store).getDefaultBlockName();
}
function getBlockType(name) {
  var _a;
  return (_a = select(store)) == null ? void 0 : _a.getBlockType(name);
}
function getBlockTypes() {
  return select(store).getBlockTypes();
}
function getBlockSupport(nameOrType, feature, defaultSupports) {
  return select(store).getBlockSupport(nameOrType, feature, defaultSupports);
}
function hasBlockSupport(nameOrType, feature, defaultSupports) {
  return select(store).hasBlockSupport(nameOrType, feature, defaultSupports);
}
function isReusableBlock(blockOrType) {
  return (blockOrType == null ? void 0 : blockOrType.name) === "core/block";
}
function isTemplatePart(blockOrType) {
  return (blockOrType == null ? void 0 : blockOrType.name) === "core/template-part";
}
var getChildBlockNames = (blockName) => {
  return select(store).getChildBlockNames(blockName);
};
var hasChildBlocks = (blockName) => {
  return select(store).hasChildBlocks(blockName);
};
var hasChildBlocksWithInserterSupport = (blockName) => {
  return select(store).hasChildBlocksWithInserterSupport(blockName);
};
var registerBlockStyle = (blockNames, styleVariation) => {
  dispatch(store).addBlockStyles(blockNames, styleVariation);
};
var unregisterBlockStyle = (blockName, styleVariationName) => {
  dispatch(store).removeBlockStyles(blockName, styleVariationName);
};
var getBlockVariations = (blockName, scope) => {
  return select(store).getBlockVariations(blockName, scope);
};
var registerBlockVariation = (blockName, variation) => {
  if (typeof variation.name !== "string") {
    globalThis.SCRIPT_DEBUG === true ? warning("Variation names must be unique strings.") : void 0;
  }
  dispatch(store).addBlockVariations(blockName, variation);
};
var unregisterBlockVariation = (blockName, variationName) => {
  dispatch(store).removeBlockVariations(blockName, variationName);
};
var registerBlockBindingsSource = (source) => {
  const {
    name,
    label,
    usesContext,
    getValues,
    setValues,
    canUserEditValue,
    getFieldsList
  } = source;
  const existingSource = unlock(select(store)).getBlockBindingsSource(name);
  if (existingSource == null ? void 0 : existingSource.getValues) {
    globalThis.SCRIPT_DEBUG === true ? warning('Block bindings source "' + name + '" is already registered.') : void 0;
    return;
  }
  if (!name) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source must contain a name.") : void 0;
    return;
  }
  if (typeof name !== "string") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source name must be a string.") : void 0;
    return;
  }
  if (/[A-Z]+/.test(name)) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source name must not contain uppercase characters.") : void 0;
    return;
  }
  if (!/^[a-z0-9/-]+$/.test(name)) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source name must contain only valid characters: lowercase characters, hyphens, or digits. Example: my-plugin/my-custom-source.") : void 0;
    return;
  }
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(name)) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source name must contain a namespace and valid characters. Example: my-plugin/my-custom-source.") : void 0;
    return;
  }
  if (label && (existingSource == null ? void 0 : existingSource.label)) {
    globalThis.SCRIPT_DEBUG === true ? warning('Block bindings "' + name + '" source label is already defined in the server.') : void 0;
    return;
  }
  if (!label && !(existingSource == null ? void 0 : existingSource.label)) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source must contain a label.") : void 0;
    return;
  }
  if (label && typeof label !== "string") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source label must be a string.") : void 0;
    return;
  }
  if (usesContext && !Array.isArray(usesContext)) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source usesContext must be an array.") : void 0;
    return;
  }
  if (getValues && typeof getValues !== "function") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source getValues must be a function.") : void 0;
    return;
  }
  if (setValues && typeof setValues !== "function") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source setValues must be a function.") : void 0;
    return;
  }
  if (canUserEditValue && typeof canUserEditValue !== "function") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source canUserEditValue must be a function.") : void 0;
    return;
  }
  if (getFieldsList && typeof getFieldsList !== "function") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block bindings source getFieldsList must be a function.") : void 0;
    return;
  }
  return unlock(dispatch(store)).addBlockBindingsSource(source);
};
function unregisterBlockBindingsSource(name) {
  const oldSource = getBlockBindingsSource(name);
  if (!oldSource) {
    globalThis.SCRIPT_DEBUG === true ? warning('Block bindings source "' + name + '" is not registered.') : void 0;
    return;
  }
  unlock(dispatch(store)).removeBlockBindingsSource(name);
}
function getBlockBindingsSource(name) {
  return unlock(select(store)).getBlockBindingsSource(name);
}
function getBlockBindingsSources() {
  return unlock(select(store)).getAllBlockBindingsSources();
}

// ../../node_modules/@wordpress/blocks/build-module/api/utils.js
k([names_default, a11y_default]);
var ICON_COLORS = ["#191e23", "#f8f9f9"];
function isUnmodifiedAttribute(attributeDefinition, value) {
  if (attributeDefinition.hasOwnProperty("default")) {
    return value === attributeDefinition.default;
  }
  if (attributeDefinition.type === "rich-text") {
    return !(value == null ? void 0 : value.length);
  }
  return value === void 0;
}
function isUnmodifiedBlock(block) {
  var _a;
  var _getBlockType$attribu;
  return Object.entries((_getBlockType$attribu = (_a = getBlockType(block.name)) == null ? void 0 : _a.attributes) !== null && _getBlockType$attribu !== void 0 ? _getBlockType$attribu : {}).every(([key, definition]) => {
    const value = block.attributes[key];
    return isUnmodifiedAttribute(definition, value);
  });
}
function isUnmodifiedDefaultBlock(block) {
  return block.name === getDefaultBlockName() && isUnmodifiedBlock(block);
}
function isUnmodifiedBlockContent(block) {
  const contentAttributes = getBlockAttributesNamesByRole(block.name, "content");
  if (contentAttributes.length === 0) {
    return isUnmodifiedBlock(block);
  }
  return contentAttributes.every((key) => {
    var _a;
    const definition = (_a = getBlockType(block.name)) == null ? void 0 : _a.attributes[key];
    const value = block.attributes[key];
    return isUnmodifiedAttribute(definition, value);
  });
}
function isValidIcon(icon) {
  return !!icon && (typeof icon === "string" || (0, import_react.isValidElement)(icon) || typeof icon === "function" || icon instanceof import_react.Component);
}
function normalizeIconObject(icon) {
  icon = icon || BLOCK_ICON_DEFAULT;
  if (isValidIcon(icon)) {
    return {
      src: icon
    };
  }
  if ("background" in icon) {
    const colordBgColor = w(icon.background);
    const getColorContrast = (iconColor) => colordBgColor.contrast(iconColor);
    const maxContrast = Math.max(...ICON_COLORS.map(getColorContrast));
    return {
      ...icon,
      foreground: icon.foreground ? icon.foreground : ICON_COLORS.find((iconColor) => getColorContrast(iconColor) === maxContrast),
      shadowColor: colordBgColor.alpha(0.3).toRgbString()
    };
  }
  return icon;
}
function normalizeBlockType(blockTypeOrName) {
  if (typeof blockTypeOrName === "string") {
    return getBlockType(blockTypeOrName);
  }
  return blockTypeOrName;
}
function getBlockLabel(blockType, attributes, context = "visual") {
  const {
    __experimentalLabel: getLabel,
    title
  } = blockType;
  const label = getLabel && getLabel(attributes, {
    context
  });
  if (!label) {
    return title;
  }
  if (label.toPlainText) {
    return label.toPlainText();
  }
  return stripHTML(label);
}
function getAccessibleBlockLabel(blockType, attributes, position, direction = "vertical") {
  const title = blockType == null ? void 0 : blockType.title;
  const label = blockType ? getBlockLabel(blockType, attributes, "accessibility") : "";
  const hasPosition = position !== void 0;
  const hasLabel = label && label !== title;
  if (hasPosition && direction === "vertical") {
    if (hasLabel) {
      return sprintf(
        /* translators: accessibility text. 1: The block title. 2: The block row number. 3: The block label.. */
        __("%1$s Block. Row %2$d. %3$s"),
        title,
        position,
        label
      );
    }
    return sprintf(
      /* translators: accessibility text. 1: The block title. 2: The block row number. */
      __("%1$s Block. Row %2$d"),
      title,
      position
    );
  } else if (hasPosition && direction === "horizontal") {
    if (hasLabel) {
      return sprintf(
        /* translators: accessibility text. 1: The block title. 2: The block column number. 3: The block label.. */
        __("%1$s Block. Column %2$d. %3$s"),
        title,
        position,
        label
      );
    }
    return sprintf(
      /* translators: accessibility text. 1: The block title. 2: The block column number. */
      __("%1$s Block. Column %2$d"),
      title,
      position
    );
  }
  if (hasLabel) {
    return sprintf(
      /* translators: accessibility text. %1: The block title. %2: The block label. */
      __("%1$s Block. %2$s"),
      title,
      label
    );
  }
  return sprintf(
    /* translators: accessibility text. %s: The block title. */
    __("%s Block"),
    title
  );
}
function getDefault(attributeSchema) {
  if (attributeSchema.default !== void 0) {
    return attributeSchema.default;
  }
  if (attributeSchema.type === "rich-text") {
    return new RichTextData();
  }
}
function __experimentalSanitizeBlockAttributes(name, attributes) {
  const blockType = getBlockType(name);
  if (void 0 === blockType) {
    throw new Error(`Block type '${name}' is not registered.`);
  }
  return Object.entries(blockType.attributes).reduce((accumulator, [key, schema]) => {
    const value = attributes[key];
    if (void 0 !== value) {
      if (schema.type === "rich-text") {
        if (value instanceof RichTextData) {
          accumulator[key] = value;
        } else if (typeof value === "string") {
          accumulator[key] = RichTextData.fromHTMLString(value);
        }
      } else if (schema.type === "string" && value instanceof RichTextData) {
        accumulator[key] = value.toHTMLString();
      } else {
        accumulator[key] = value;
      }
    } else {
      const _default = getDefault(schema);
      if (void 0 !== _default) {
        accumulator[key] = _default;
      }
    }
    if (["node", "children"].indexOf(schema.source) !== -1) {
      if (typeof accumulator[key] === "string") {
        accumulator[key] = [accumulator[key]];
      } else if (!Array.isArray(accumulator[key])) {
        accumulator[key] = [];
      }
    }
    return accumulator;
  }, {});
}
function getBlockAttributesNamesByRole(name, role) {
  var _a;
  const attributes = (_a = getBlockType(name)) == null ? void 0 : _a.attributes;
  if (!attributes) {
    return [];
  }
  const attributesNames = Object.keys(attributes);
  if (!role) {
    return attributesNames;
  }
  return attributesNames.filter((attributeName) => {
    const attribute = attributes[attributeName];
    if ((attribute == null ? void 0 : attribute.role) === role) {
      return true;
    }
    if ((attribute == null ? void 0 : attribute.__experimentalRole) === role) {
      deprecated("__experimentalRole attribute", {
        since: "6.7",
        version: "6.8",
        alternative: "role attribute",
        hint: `Check the block.json of the ${name} block.`
      });
      return true;
    }
    return false;
  });
}
var __experimentalGetBlockAttributesNamesByRole = (...args) => {
  deprecated("__experimentalGetBlockAttributesNamesByRole", {
    since: "6.7",
    version: "6.8",
    alternative: "getBlockAttributesNamesByRole"
  });
  return getBlockAttributesNamesByRole(...args);
};
function omit(object, keys) {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}

// ../../node_modules/@wordpress/blocks/build-module/store/reducer.js
var DEFAULT_CATEGORIES = [{
  slug: "text",
  title: __("Text")
}, {
  slug: "media",
  title: __("Media")
}, {
  slug: "design",
  title: __("Design")
}, {
  slug: "widgets",
  title: __("Widgets")
}, {
  slug: "theme",
  title: __("Theme")
}, {
  slug: "embed",
  title: __("Embeds")
}, {
  slug: "reusable",
  title: __("Reusable blocks")
}];
function keyBlockTypesByName(types) {
  return types.reduce((newBlockTypes, block) => ({
    ...newBlockTypes,
    [block.name]: block
  }), {});
}
function getUniqueItemsByName(items) {
  return items.reduce((acc, currentItem) => {
    if (!acc.some((item) => item.name === currentItem.name)) {
      acc.push(currentItem);
    }
    return acc;
  }, []);
}
function bootstrappedBlockTypes(state = {}, action) {
  switch (action.type) {
    case "ADD_BOOTSTRAPPED_BLOCK_TYPE":
      const {
        name,
        blockType
      } = action;
      const serverDefinition = state[name];
      let newDefinition;
      if (serverDefinition) {
        if (serverDefinition.blockHooks === void 0 && blockType.blockHooks) {
          newDefinition = {
            ...serverDefinition,
            ...newDefinition,
            blockHooks: blockType.blockHooks
          };
        }
        if (serverDefinition.allowedBlocks === void 0 && blockType.allowedBlocks) {
          newDefinition = {
            ...serverDefinition,
            ...newDefinition,
            allowedBlocks: blockType.allowedBlocks
          };
        }
      } else {
        newDefinition = Object.fromEntries(Object.entries(blockType).filter(([, value]) => value !== null && value !== void 0).map(([key, value]) => [camelCase(key), value]));
        newDefinition.name = name;
      }
      if (newDefinition) {
        return {
          ...state,
          [name]: newDefinition
        };
      }
      return state;
    case "REMOVE_BLOCK_TYPES":
      return omit(state, action.names);
  }
  return state;
}
function unprocessedBlockTypes(state = {}, action) {
  switch (action.type) {
    case "ADD_UNPROCESSED_BLOCK_TYPE":
      return {
        ...state,
        [action.name]: action.blockType
      };
    case "REMOVE_BLOCK_TYPES":
      return omit(state, action.names);
  }
  return state;
}
function blockTypes(state = {}, action) {
  switch (action.type) {
    case "ADD_BLOCK_TYPES":
      return {
        ...state,
        ...keyBlockTypesByName(action.blockTypes)
      };
    case "REMOVE_BLOCK_TYPES":
      return omit(state, action.names);
  }
  return state;
}
function blockStyles(state = {}, action) {
  var _state$action$blockNa;
  switch (action.type) {
    case "ADD_BLOCK_TYPES":
      return {
        ...state,
        ...Object.fromEntries(Object.entries(keyBlockTypesByName(action.blockTypes)).map(([name, blockType]) => {
          var _blockType$styles, _state$blockType$name;
          return [name, getUniqueItemsByName([...((_blockType$styles = blockType.styles) !== null && _blockType$styles !== void 0 ? _blockType$styles : []).map((style) => ({
            ...style,
            source: "block"
          })), ...((_state$blockType$name = state[blockType.name]) !== null && _state$blockType$name !== void 0 ? _state$blockType$name : []).filter(({
            source
          }) => "block" !== source)])];
        }))
      };
    case "ADD_BLOCK_STYLES":
      const updatedStyles = {};
      action.blockNames.forEach((blockName) => {
        var _state$blockName;
        updatedStyles[blockName] = getUniqueItemsByName([...(_state$blockName = state[blockName]) !== null && _state$blockName !== void 0 ? _state$blockName : [], ...action.styles]);
      });
      return {
        ...state,
        ...updatedStyles
      };
    case "REMOVE_BLOCK_STYLES":
      return {
        ...state,
        [action.blockName]: ((_state$action$blockNa = state[action.blockName]) !== null && _state$action$blockNa !== void 0 ? _state$action$blockNa : []).filter((style) => action.styleNames.indexOf(style.name) === -1)
      };
  }
  return state;
}
function blockVariations(state = {}, action) {
  var _state$action$blockNa2, _state$action$blockNa3;
  switch (action.type) {
    case "ADD_BLOCK_TYPES":
      return {
        ...state,
        ...Object.fromEntries(Object.entries(keyBlockTypesByName(action.blockTypes)).map(([name, blockType]) => {
          var _blockType$variations, _state$blockType$name2;
          return [name, getUniqueItemsByName([...((_blockType$variations = blockType.variations) !== null && _blockType$variations !== void 0 ? _blockType$variations : []).map((variation) => ({
            ...variation,
            source: "block"
          })), ...((_state$blockType$name2 = state[blockType.name]) !== null && _state$blockType$name2 !== void 0 ? _state$blockType$name2 : []).filter(({
            source
          }) => "block" !== source)])];
        }))
      };
    case "ADD_BLOCK_VARIATIONS":
      return {
        ...state,
        [action.blockName]: getUniqueItemsByName([...(_state$action$blockNa2 = state[action.blockName]) !== null && _state$action$blockNa2 !== void 0 ? _state$action$blockNa2 : [], ...action.variations])
      };
    case "REMOVE_BLOCK_VARIATIONS":
      return {
        ...state,
        [action.blockName]: ((_state$action$blockNa3 = state[action.blockName]) !== null && _state$action$blockNa3 !== void 0 ? _state$action$blockNa3 : []).filter((variation) => action.variationNames.indexOf(variation.name) === -1)
      };
  }
  return state;
}
function createBlockNameSetterReducer(setActionType) {
  return (state = null, action) => {
    switch (action.type) {
      case "REMOVE_BLOCK_TYPES":
        if (action.names.indexOf(state) !== -1) {
          return null;
        }
        return state;
      case setActionType:
        return action.name || null;
    }
    return state;
  };
}
var defaultBlockName = createBlockNameSetterReducer("SET_DEFAULT_BLOCK_NAME");
var freeformFallbackBlockName = createBlockNameSetterReducer("SET_FREEFORM_FALLBACK_BLOCK_NAME");
var unregisteredFallbackBlockName = createBlockNameSetterReducer("SET_UNREGISTERED_FALLBACK_BLOCK_NAME");
var groupingBlockName = createBlockNameSetterReducer("SET_GROUPING_BLOCK_NAME");
function categories(state = DEFAULT_CATEGORIES, action) {
  switch (action.type) {
    case "SET_CATEGORIES":
      const uniqueCategories = /* @__PURE__ */ new Map();
      (action.categories || []).forEach((category) => {
        uniqueCategories.set(category.slug, category);
      });
      return [...uniqueCategories.values()];
    case "UPDATE_CATEGORY": {
      if (!action.category || !Object.keys(action.category).length) {
        return state;
      }
      const categoryToChange = state.find(({
        slug
      }) => slug === action.slug);
      if (categoryToChange) {
        return state.map((category) => {
          if (category.slug === action.slug) {
            return {
              ...category,
              ...action.category
            };
          }
          return category;
        });
      }
    }
  }
  return state;
}
function collections(state = {}, action) {
  switch (action.type) {
    case "ADD_BLOCK_COLLECTION":
      return {
        ...state,
        [action.namespace]: {
          title: action.title,
          icon: action.icon
        }
      };
    case "REMOVE_BLOCK_COLLECTION":
      return omit(state, action.namespace);
  }
  return state;
}
function getMergedUsesContext(existingUsesContext = [], newUsesContext = []) {
  const mergedArrays = Array.from(new Set(existingUsesContext.concat(newUsesContext)));
  return mergedArrays.length > 0 ? mergedArrays : void 0;
}
function blockBindingsSources(state = {}, action) {
  var _a, _b, _c;
  switch (action.type) {
    case "ADD_BLOCK_BINDINGS_SOURCE":
      let getFieldsList;
      if (globalThis.IS_GUTENBERG_PLUGIN) {
        getFieldsList = action.getFieldsList;
      } else if (action.name === "core/post-meta") {
        getFieldsList = action.getFieldsList;
      }
      return {
        ...state,
        [action.name]: {
          // Don't override the label if it's already set.
          label: ((_a = state[action.name]) == null ? void 0 : _a.label) || action.label,
          usesContext: getMergedUsesContext((_b = state[action.name]) == null ? void 0 : _b.usesContext, action.usesContext),
          getValues: action.getValues,
          setValues: action.setValues,
          // Only set `canUserEditValue` if `setValues` is also defined.
          canUserEditValue: action.setValues && action.canUserEditValue,
          getFieldsList
        }
      };
    case "ADD_BOOTSTRAPPED_BLOCK_BINDINGS_SOURCE":
      return {
        ...state,
        [action.name]: {
          /*
           * Keep the exisitng properties in case the source has been registered
           * in the client before bootstrapping.
           */
          ...state[action.name],
          label: action.label,
          usesContext: getMergedUsesContext((_c = state[action.name]) == null ? void 0 : _c.usesContext, action.usesContext)
        }
      };
    case "REMOVE_BLOCK_BINDINGS_SOURCE":
      return omit(state, action.name);
  }
  return state;
}
var reducer_default = combineReducers({
  bootstrappedBlockTypes,
  unprocessedBlockTypes,
  blockTypes,
  blockStyles,
  blockVariations,
  defaultBlockName,
  freeformFallbackBlockName,
  unregisteredFallbackBlockName,
  groupingBlockName,
  categories,
  collections,
  blockBindingsSources
});

// ../../node_modules/@wordpress/blocks/build-module/store/selectors.js
var selectors_exports = {};
__export(selectors_exports, {
  __experimentalHasContentRoleAttribute: () => __experimentalHasContentRoleAttribute,
  getActiveBlockVariation: () => getActiveBlockVariation,
  getBlockStyles: () => getBlockStyles,
  getBlockSupport: () => getBlockSupport2,
  getBlockType: () => getBlockType2,
  getBlockTypes: () => getBlockTypes2,
  getBlockVariations: () => getBlockVariations2,
  getCategories: () => getCategories,
  getChildBlockNames: () => getChildBlockNames2,
  getCollections: () => getCollections,
  getDefaultBlockName: () => getDefaultBlockName2,
  getDefaultBlockVariation: () => getDefaultBlockVariation,
  getFreeformFallbackBlockName: () => getFreeformFallbackBlockName,
  getGroupingBlockName: () => getGroupingBlockName2,
  getUnregisteredFallbackBlockName: () => getUnregisteredFallbackBlockName,
  hasBlockSupport: () => hasBlockSupport2,
  hasChildBlocks: () => hasChildBlocks2,
  hasChildBlocksWithInserterSupport: () => hasChildBlocksWithInserterSupport2,
  isMatchingSearchTerm: () => isMatchingSearchTerm
});
var import_remove_accents = __toESM(require_remove_accents());

// ../../node_modules/@wordpress/blocks/build-module/store/utils.js
var getValueFromObjectPath = (object, path, defaultValue) => {
  var _value;
  const normalizedPath = Array.isArray(path) ? path : path.split(".");
  let value = object;
  normalizedPath.forEach((fieldName) => {
    value = value == null ? void 0 : value[fieldName];
  });
  return (_value = value) !== null && _value !== void 0 ? _value : defaultValue;
};
function isObject2(candidate) {
  return typeof candidate === "object" && candidate.constructor === Object && candidate !== null;
}
function matchesAttributes(blockAttributes, variationAttributes) {
  if (isObject2(blockAttributes) && isObject2(variationAttributes)) {
    return Object.entries(variationAttributes).every(([key, value]) => matchesAttributes(blockAttributes == null ? void 0 : blockAttributes[key], value));
  }
  return blockAttributes === variationAttributes;
}

// ../../node_modules/@wordpress/blocks/build-module/store/private-selectors.js
var private_selectors_exports = {};
__export(private_selectors_exports, {
  getAllBlockBindingsSources: () => getAllBlockBindingsSources,
  getBlockBindingsSource: () => getBlockBindingsSource2,
  getBootstrappedBlockType: () => getBootstrappedBlockType,
  getSupportedStyles: () => getSupportedStyles,
  getUnprocessedBlockTypes: () => getUnprocessedBlockTypes,
  hasContentRoleAttribute: () => hasContentRoleAttribute
});
var ROOT_BLOCK_SUPPORTS = ["background", "backgroundColor", "color", "linkColor", "captionColor", "buttonColor", "headingColor", "fontFamily", "fontSize", "fontStyle", "fontWeight", "lineHeight", "padding", "contentSize", "wideSize", "blockGap", "textDecoration", "textTransform", "letterSpacing"];
function filterElementBlockSupports(blockSupports, name, element) {
  return blockSupports.filter((support) => {
    if (support === "fontSize" && element === "heading") {
      return false;
    }
    if (support === "textDecoration" && !name && element !== "link") {
      return false;
    }
    if (support === "textTransform" && !name && !(["heading", "h1", "h2", "h3", "h4", "h5", "h6"].includes(element) || element === "button" || element === "caption" || element === "text")) {
      return false;
    }
    if (support === "letterSpacing" && !name && !(["heading", "h1", "h2", "h3", "h4", "h5", "h6"].includes(element) || element === "button" || element === "caption" || element === "text")) {
      return false;
    }
    if (support === "textColumns" && !name) {
      return false;
    }
    return true;
  });
}
var getSupportedStyles = rememo_default((state, name, element) => {
  var _a, _b, _c;
  if (!name) {
    return filterElementBlockSupports(ROOT_BLOCK_SUPPORTS, name, element);
  }
  const blockType = getBlockType2(state, name);
  if (!blockType) {
    return [];
  }
  const supportKeys = [];
  if ((_b = (_a = blockType == null ? void 0 : blockType.supports) == null ? void 0 : _a.spacing) == null ? void 0 : _b.blockGap) {
    supportKeys.push("blockGap");
  }
  if ((_c = blockType == null ? void 0 : blockType.supports) == null ? void 0 : _c.shadow) {
    supportKeys.push("shadow");
  }
  Object.keys(__EXPERIMENTAL_STYLE_PROPERTY).forEach((styleName) => {
    if (!__EXPERIMENTAL_STYLE_PROPERTY[styleName].support) {
      return;
    }
    if (__EXPERIMENTAL_STYLE_PROPERTY[styleName].requiresOptOut) {
      if (__EXPERIMENTAL_STYLE_PROPERTY[styleName].support[0] in blockType.supports && getValueFromObjectPath(blockType.supports, __EXPERIMENTAL_STYLE_PROPERTY[styleName].support) !== false) {
        supportKeys.push(styleName);
        return;
      }
    }
    if (getValueFromObjectPath(blockType.supports, __EXPERIMENTAL_STYLE_PROPERTY[styleName].support, false)) {
      supportKeys.push(styleName);
    }
  });
  return filterElementBlockSupports(supportKeys, name, element);
}, (state, name) => [state.blockTypes[name]]);
function getBootstrappedBlockType(state, name) {
  return state.bootstrappedBlockTypes[name];
}
function getUnprocessedBlockTypes(state) {
  return state.unprocessedBlockTypes;
}
function getAllBlockBindingsSources(state) {
  return state.blockBindingsSources;
}
function getBlockBindingsSource2(state, sourceName) {
  return state.blockBindingsSources[sourceName];
}
var hasContentRoleAttribute = (state, blockTypeName) => {
  const blockType = getBlockType2(state, blockTypeName);
  if (!blockType) {
    return false;
  }
  return Object.values(blockType.attributes).some(({
    role,
    __experimentalRole
  }) => {
    if (role === "content") {
      return true;
    }
    if (__experimentalRole === "content") {
      deprecated("__experimentalRole attribute", {
        since: "6.7",
        version: "6.8",
        alternative: "role attribute",
        hint: `Check the block.json of the ${blockTypeName} block.`
      });
      return true;
    }
    return false;
  });
};

// ../../node_modules/@wordpress/blocks/build-module/store/selectors.js
var getNormalizedBlockType = (state, nameOrType) => "string" === typeof nameOrType ? getBlockType2(state, nameOrType) : nameOrType;
var getBlockTypes2 = rememo_default((state) => Object.values(state.blockTypes), (state) => [state.blockTypes]);
function getBlockType2(state, name) {
  return state.blockTypes[name];
}
function getBlockStyles(state, name) {
  return state.blockStyles[name];
}
var getBlockVariations2 = rememo_default((state, blockName, scope) => {
  const variations = state.blockVariations[blockName];
  if (!variations || !scope) {
    return variations;
  }
  return variations.filter((variation) => {
    return (variation.scope || ["block", "inserter"]).includes(scope);
  });
}, (state, blockName) => [state.blockVariations[blockName]]);
function getActiveBlockVariation(state, blockName, attributes, scope) {
  var _a;
  const variations = getBlockVariations2(state, blockName, scope);
  if (!variations) {
    return variations;
  }
  const blockType = getBlockType2(state, blockName);
  const attributeKeys = Object.keys((blockType == null ? void 0 : blockType.attributes) || {});
  let match;
  let maxMatchedAttributes = 0;
  for (const variation of variations) {
    if (Array.isArray(variation.isActive)) {
      const definedAttributes = variation.isActive.filter((attribute) => {
        const topLevelAttribute = attribute.split(".")[0];
        return attributeKeys.includes(topLevelAttribute);
      });
      const definedAttributesLength = definedAttributes.length;
      if (definedAttributesLength === 0) {
        continue;
      }
      const isMatch = definedAttributes.every((attribute) => {
        const variationAttributeValue = getValueFromObjectPath(variation.attributes, attribute);
        if (variationAttributeValue === void 0) {
          return false;
        }
        let blockAttributeValue = getValueFromObjectPath(attributes, attribute);
        if (blockAttributeValue instanceof RichTextData) {
          blockAttributeValue = blockAttributeValue.toHTMLString();
        }
        return matchesAttributes(blockAttributeValue, variationAttributeValue);
      });
      if (isMatch && definedAttributesLength > maxMatchedAttributes) {
        match = variation;
        maxMatchedAttributes = definedAttributesLength;
      }
    } else if ((_a = variation.isActive) == null ? void 0 : _a.call(variation, attributes, variation.attributes)) {
      return match || variation;
    }
  }
  return match;
}
function getDefaultBlockVariation(state, blockName, scope) {
  const variations = getBlockVariations2(state, blockName, scope);
  const defaultVariation = [...variations].reverse().find(({
    isDefault
  }) => !!isDefault);
  return defaultVariation || variations[0];
}
function getCategories(state) {
  return state.categories;
}
function getCollections(state) {
  return state.collections;
}
function getDefaultBlockName2(state) {
  return state.defaultBlockName;
}
function getFreeformFallbackBlockName(state) {
  return state.freeformFallbackBlockName;
}
function getUnregisteredFallbackBlockName(state) {
  return state.unregisteredFallbackBlockName;
}
function getGroupingBlockName2(state) {
  return state.groupingBlockName;
}
var getChildBlockNames2 = rememo_default((state, blockName) => {
  return getBlockTypes2(state).filter((blockType) => {
    var _a;
    return (_a = blockType.parent) == null ? void 0 : _a.includes(blockName);
  }).map(({
    name
  }) => name);
}, (state) => [state.blockTypes]);
var getBlockSupport2 = (state, nameOrType, feature, defaultSupports) => {
  const blockType = getNormalizedBlockType(state, nameOrType);
  if (!(blockType == null ? void 0 : blockType.supports)) {
    return defaultSupports;
  }
  return getValueFromObjectPath(blockType.supports, feature, defaultSupports);
};
function hasBlockSupport2(state, nameOrType, feature, defaultSupports) {
  return !!getBlockSupport2(state, nameOrType, feature, defaultSupports);
}
function getNormalizedSearchTerm(term) {
  return (0, import_remove_accents.default)(term !== null && term !== void 0 ? term : "").toLowerCase().trim();
}
function isMatchingSearchTerm(state, nameOrType, searchTerm = "") {
  var _a;
  const blockType = getNormalizedBlockType(state, nameOrType);
  const normalizedSearchTerm = getNormalizedSearchTerm(searchTerm);
  const isSearchMatch = (candidate) => getNormalizedSearchTerm(candidate).includes(normalizedSearchTerm);
  return isSearchMatch(blockType.title) || ((_a = blockType.keywords) == null ? void 0 : _a.some(isSearchMatch)) || isSearchMatch(blockType.category) || typeof blockType.description === "string" && isSearchMatch(blockType.description);
}
var hasChildBlocks2 = (state, blockName) => {
  return getChildBlockNames2(state, blockName).length > 0;
};
var hasChildBlocksWithInserterSupport2 = (state, blockName) => {
  return getChildBlockNames2(state, blockName).some((childBlockName) => {
    return hasBlockSupport2(state, childBlockName, "inserter", true);
  });
};
var __experimentalHasContentRoleAttribute = (...args) => {
  deprecated("__experimentalHasContentRoleAttribute", {
    since: "6.7",
    version: "6.8",
    hint: "This is a private selector."
  });
  return hasContentRoleAttribute(...args);
};

// ../../node_modules/@wordpress/blocks/build-module/store/actions.js
var actions_exports = {};
__export(actions_exports, {
  __experimentalReapplyBlockFilters: () => __experimentalReapplyBlockFilters,
  addBlockCollection: () => addBlockCollection,
  addBlockStyles: () => addBlockStyles,
  addBlockTypes: () => addBlockTypes,
  addBlockVariations: () => addBlockVariations,
  reapplyBlockTypeFilters: () => reapplyBlockTypeFilters,
  removeBlockCollection: () => removeBlockCollection,
  removeBlockStyles: () => removeBlockStyles,
  removeBlockTypes: () => removeBlockTypes,
  removeBlockVariations: () => removeBlockVariations,
  setCategories: () => setCategories,
  setDefaultBlockName: () => setDefaultBlockName2,
  setFreeformFallbackBlockName: () => setFreeformFallbackBlockName,
  setGroupingBlockName: () => setGroupingBlockName2,
  setUnregisteredFallbackBlockName: () => setUnregisteredFallbackBlockName,
  updateCategory: () => updateCategory
});

// ../../node_modules/@wordpress/blocks/build-module/store/process-block-type.js
var import_react_is = __toESM(require_react_is());
var LEGACY_CATEGORY_MAPPING = {
  common: "text",
  formatting: "text",
  layout: "design"
};
function mergeBlockVariations(bootstrappedVariations = [], clientVariations = []) {
  const result = [...bootstrappedVariations];
  clientVariations.forEach((clientVariation) => {
    const index = result.findIndex((bootstrappedVariation) => bootstrappedVariation.name === clientVariation.name);
    if (index !== -1) {
      result[index] = {
        ...result[index],
        ...clientVariation
      };
    } else {
      result.push(clientVariation);
    }
  });
  return result;
}
var processBlockType = (name, blockSettings) => ({
  select: select2
}) => {
  const bootstrappedBlockType = select2.getBootstrappedBlockType(name);
  const blockType = {
    name,
    icon: BLOCK_ICON_DEFAULT,
    keywords: [],
    attributes: {},
    providesContext: {},
    usesContext: [],
    selectors: {},
    supports: {},
    styles: [],
    blockHooks: {},
    save: () => null,
    ...bootstrappedBlockType,
    ...blockSettings,
    // blockType.variations can be defined as a filePath.
    variations: mergeBlockVariations(Array.isArray(bootstrappedBlockType == null ? void 0 : bootstrappedBlockType.variations) ? bootstrappedBlockType.variations : [], Array.isArray(blockSettings == null ? void 0 : blockSettings.variations) ? blockSettings.variations : [])
  };
  const settings = applyFilters("blocks.registerBlockType", blockType, name, null);
  if (settings.description && typeof settings.description !== "string") {
    deprecated("Declaring non-string block descriptions", {
      since: "6.2"
    });
  }
  if (settings.deprecated) {
    settings.deprecated = settings.deprecated.map((deprecation) => Object.fromEntries(Object.entries(
      // Only keep valid deprecation keys.
      applyFilters(
        "blocks.registerBlockType",
        // Merge deprecation keys with pre-filter settings
        // so that filters that depend on specific keys being
        // present don't fail.
        {
          // Omit deprecation keys here so that deprecations
          // can opt out of specific keys like "supports".
          ...omit(blockType, DEPRECATED_ENTRY_KEYS),
          ...deprecation
        },
        blockType.name,
        deprecation
      )
    ).filter(([key]) => DEPRECATED_ENTRY_KEYS.includes(key))));
  }
  if (!isPlainObject(settings)) {
    globalThis.SCRIPT_DEBUG === true ? warning("Block settings must be a valid object.") : void 0;
    return;
  }
  if (typeof settings.save !== "function") {
    globalThis.SCRIPT_DEBUG === true ? warning('The "save" property must be a valid function.') : void 0;
    return;
  }
  if ("edit" in settings && !(0, import_react_is.isValidElementType)(settings.edit)) {
    globalThis.SCRIPT_DEBUG === true ? warning('The "edit" property must be a valid component.') : void 0;
    return;
  }
  if (LEGACY_CATEGORY_MAPPING.hasOwnProperty(settings.category)) {
    settings.category = LEGACY_CATEGORY_MAPPING[settings.category];
  }
  if ("category" in settings && !select2.getCategories().some(({
    slug
  }) => slug === settings.category)) {
    globalThis.SCRIPT_DEBUG === true ? warning('The block "' + name + '" is registered with an invalid category "' + settings.category + '".') : void 0;
    delete settings.category;
  }
  if (!("title" in settings) || settings.title === "") {
    globalThis.SCRIPT_DEBUG === true ? warning('The block "' + name + '" must have a title.') : void 0;
    return;
  }
  if (typeof settings.title !== "string") {
    globalThis.SCRIPT_DEBUG === true ? warning("Block titles must be strings.") : void 0;
    return;
  }
  settings.icon = normalizeIconObject(settings.icon);
  if (!isValidIcon(settings.icon.src)) {
    globalThis.SCRIPT_DEBUG === true ? warning("The icon passed is invalid. The icon should be a string, an element, a function, or an object following the specifications documented in https://developer.wordpress.org/block-editor/developers/block-api/block-registration/#icon-optional") : void 0;
    return;
  }
  return settings;
};

// ../../node_modules/@wordpress/blocks/build-module/store/actions.js
function addBlockTypes(blockTypes2) {
  return {
    type: "ADD_BLOCK_TYPES",
    blockTypes: Array.isArray(blockTypes2) ? blockTypes2 : [blockTypes2]
  };
}
function reapplyBlockTypeFilters() {
  return ({
    dispatch: dispatch2,
    select: select2
  }) => {
    const processedBlockTypes = [];
    for (const [name, settings] of Object.entries(select2.getUnprocessedBlockTypes())) {
      const result = dispatch2(processBlockType(name, settings));
      if (result) {
        processedBlockTypes.push(result);
      }
    }
    if (!processedBlockTypes.length) {
      return;
    }
    dispatch2.addBlockTypes(processedBlockTypes);
  };
}
function __experimentalReapplyBlockFilters() {
  deprecated('wp.data.dispatch( "core/blocks" ).__experimentalReapplyBlockFilters', {
    since: "6.4",
    alternative: "reapplyBlockFilters"
  });
  return reapplyBlockTypeFilters();
}
function removeBlockTypes(names) {
  return {
    type: "REMOVE_BLOCK_TYPES",
    names: Array.isArray(names) ? names : [names]
  };
}
function addBlockStyles(blockNames, styles) {
  return {
    type: "ADD_BLOCK_STYLES",
    styles: Array.isArray(styles) ? styles : [styles],
    blockNames: Array.isArray(blockNames) ? blockNames : [blockNames]
  };
}
function removeBlockStyles(blockName, styleNames) {
  return {
    type: "REMOVE_BLOCK_STYLES",
    styleNames: Array.isArray(styleNames) ? styleNames : [styleNames],
    blockName
  };
}
function addBlockVariations(blockName, variations) {
  return {
    type: "ADD_BLOCK_VARIATIONS",
    variations: Array.isArray(variations) ? variations : [variations],
    blockName
  };
}
function removeBlockVariations(blockName, variationNames) {
  return {
    type: "REMOVE_BLOCK_VARIATIONS",
    variationNames: Array.isArray(variationNames) ? variationNames : [variationNames],
    blockName
  };
}
function setDefaultBlockName2(name) {
  return {
    type: "SET_DEFAULT_BLOCK_NAME",
    name
  };
}
function setFreeformFallbackBlockName(name) {
  return {
    type: "SET_FREEFORM_FALLBACK_BLOCK_NAME",
    name
  };
}
function setUnregisteredFallbackBlockName(name) {
  return {
    type: "SET_UNREGISTERED_FALLBACK_BLOCK_NAME",
    name
  };
}
function setGroupingBlockName2(name) {
  return {
    type: "SET_GROUPING_BLOCK_NAME",
    name
  };
}
function setCategories(categories2) {
  return {
    type: "SET_CATEGORIES",
    categories: categories2
  };
}
function updateCategory(slug, category) {
  return {
    type: "UPDATE_CATEGORY",
    slug,
    category
  };
}
function addBlockCollection(namespace, title, icon) {
  return {
    type: "ADD_BLOCK_COLLECTION",
    namespace,
    title,
    icon
  };
}
function removeBlockCollection(namespace) {
  return {
    type: "REMOVE_BLOCK_COLLECTION",
    namespace
  };
}

// ../../node_modules/@wordpress/blocks/build-module/store/private-actions.js
var private_actions_exports = {};
__export(private_actions_exports, {
  addBlockBindingsSource: () => addBlockBindingsSource,
  addBootstrappedBlockBindingsSource: () => addBootstrappedBlockBindingsSource,
  addBootstrappedBlockType: () => addBootstrappedBlockType,
  addUnprocessedBlockType: () => addUnprocessedBlockType,
  removeBlockBindingsSource: () => removeBlockBindingsSource
});
function addBootstrappedBlockType(name, blockType) {
  return {
    type: "ADD_BOOTSTRAPPED_BLOCK_TYPE",
    name,
    blockType
  };
}
function addUnprocessedBlockType(name, blockType) {
  return ({
    dispatch: dispatch2
  }) => {
    dispatch2({
      type: "ADD_UNPROCESSED_BLOCK_TYPE",
      name,
      blockType
    });
    const processedBlockType = dispatch2(processBlockType(name, blockType));
    if (!processedBlockType) {
      return;
    }
    dispatch2.addBlockTypes(processedBlockType);
  };
}
function addBlockBindingsSource(source) {
  return {
    type: "ADD_BLOCK_BINDINGS_SOURCE",
    name: source.name,
    label: source.label,
    usesContext: source.usesContext,
    getValues: source.getValues,
    setValues: source.setValues,
    canUserEditValue: source.canUserEditValue,
    getFieldsList: source.getFieldsList
  };
}
function removeBlockBindingsSource(name) {
  return {
    type: "REMOVE_BLOCK_BINDINGS_SOURCE",
    name
  };
}
function addBootstrappedBlockBindingsSource(source) {
  return {
    type: "ADD_BOOTSTRAPPED_BLOCK_BINDINGS_SOURCE",
    name: source.name,
    label: source.label,
    usesContext: source.usesContext
  };
}

// ../../node_modules/@wordpress/blocks/build-module/store/constants.js
var STORE_NAME = "core/blocks";

// ../../node_modules/@wordpress/blocks/build-module/store/index.js
var store = createReduxStore(STORE_NAME, {
  reducer: reducer_default,
  selectors: selectors_exports,
  actions: actions_exports
});
register(store);
unlock(store).registerPrivateSelectors(private_selectors_exports);
unlock(store).registerPrivateActions(private_actions_exports);

// ../../node_modules/@wordpress/blocks/build-module/api/factory.js
function createBlock(name, attributes = {}, innerBlocks = []) {
  const sanitizedAttributes = __experimentalSanitizeBlockAttributes(name, attributes);
  const clientId = v4_default();
  return {
    clientId,
    name,
    isValid: true,
    attributes: sanitizedAttributes,
    innerBlocks
  };
}
function createBlocksFromInnerBlocksTemplate(innerBlocksOrTemplate = []) {
  return innerBlocksOrTemplate.map((innerBlock) => {
    const innerBlockTemplate = Array.isArray(innerBlock) ? innerBlock : [innerBlock.name, innerBlock.attributes, innerBlock.innerBlocks];
    const [name, attributes, innerBlocks = []] = innerBlockTemplate;
    return createBlock(name, attributes, createBlocksFromInnerBlocksTemplate(innerBlocks));
  });
}
function __experimentalCloneSanitizedBlock(block, mergeAttributes = {}, newInnerBlocks) {
  const clientId = v4_default();
  const sanitizedAttributes = __experimentalSanitizeBlockAttributes(block.name, {
    ...block.attributes,
    ...mergeAttributes
  });
  return {
    ...block,
    clientId,
    attributes: sanitizedAttributes,
    innerBlocks: newInnerBlocks || block.innerBlocks.map((innerBlock) => __experimentalCloneSanitizedBlock(innerBlock))
  };
}
function cloneBlock(block, mergeAttributes = {}, newInnerBlocks) {
  const clientId = v4_default();
  return {
    ...block,
    clientId,
    attributes: {
      ...block.attributes,
      ...mergeAttributes
    },
    innerBlocks: newInnerBlocks || block.innerBlocks.map((innerBlock) => cloneBlock(innerBlock))
  };
}
var isPossibleTransformForSource = (transform, direction, blocks) => {
  if (!blocks.length) {
    return false;
  }
  const isMultiBlock = blocks.length > 1;
  const firstBlockName = blocks[0].name;
  const isValidForMultiBlocks = isWildcardBlockTransform(transform) || !isMultiBlock || transform.isMultiBlock;
  if (!isValidForMultiBlocks) {
    return false;
  }
  if (!isWildcardBlockTransform(transform) && !blocks.every((block) => block.name === firstBlockName)) {
    return false;
  }
  const isBlockType = transform.type === "block";
  if (!isBlockType) {
    return false;
  }
  const sourceBlock = blocks[0];
  const hasMatchingName = direction !== "from" || transform.blocks.indexOf(sourceBlock.name) !== -1 || isWildcardBlockTransform(transform);
  if (!hasMatchingName) {
    return false;
  }
  if (!isMultiBlock && direction === "from" && isContainerGroupBlock(sourceBlock.name) && isContainerGroupBlock(transform.blockName)) {
    return false;
  }
  if (!maybeCheckTransformIsMatch(transform, blocks)) {
    return false;
  }
  return true;
};
var getBlockTypesForPossibleFromTransforms = (blocks) => {
  if (!blocks.length) {
    return [];
  }
  const allBlockTypes = getBlockTypes();
  const blockTypesWithPossibleFromTransforms = allBlockTypes.filter((blockType) => {
    const fromTransforms = getBlockTransforms("from", blockType.name);
    return !!findTransform(fromTransforms, (transform) => {
      return isPossibleTransformForSource(transform, "from", blocks);
    });
  });
  return blockTypesWithPossibleFromTransforms;
};
var getBlockTypesForPossibleToTransforms = (blocks) => {
  if (!blocks.length) {
    return [];
  }
  const sourceBlock = blocks[0];
  const blockType = getBlockType(sourceBlock.name);
  const transformsTo = blockType ? getBlockTransforms("to", blockType.name) : [];
  const possibleTransforms = transformsTo.filter((transform) => {
    return transform && isPossibleTransformForSource(transform, "to", blocks);
  });
  const blockNames = possibleTransforms.map((transformation) => transformation.blocks).flat();
  return blockNames.map(getBlockType);
};
var isWildcardBlockTransform = (t) => t && t.type === "block" && Array.isArray(t.blocks) && t.blocks.includes("*");
var isContainerGroupBlock = (name) => name === getGroupingBlockName();
function getPossibleBlockTransformations(blocks) {
  if (!blocks.length) {
    return [];
  }
  const blockTypesForFromTransforms = getBlockTypesForPossibleFromTransforms(blocks);
  const blockTypesForToTransforms = getBlockTypesForPossibleToTransforms(blocks);
  return [.../* @__PURE__ */ new Set([...blockTypesForFromTransforms, ...blockTypesForToTransforms])];
}
function findTransform(transforms, predicate) {
  const hooks = createHooks_default();
  for (let i = 0; i < transforms.length; i++) {
    const candidate = transforms[i];
    if (predicate(candidate)) {
      hooks.addFilter("transform", "transform/" + i.toString(), (result) => result ? result : candidate, candidate.priority);
    }
  }
  return hooks.applyFilters("transform", null);
}
function getBlockTransforms(direction, blockTypeOrName) {
  if (blockTypeOrName === void 0) {
    return getBlockTypes().map(({
      name
    }) => getBlockTransforms(direction, name)).flat();
  }
  const blockType = normalizeBlockType(blockTypeOrName);
  const {
    name: blockName,
    transforms
  } = blockType || {};
  if (!transforms || !Array.isArray(transforms[direction])) {
    return [];
  }
  const usingMobileTransformations = transforms.supportedMobileTransforms && Array.isArray(transforms.supportedMobileTransforms);
  const filteredTransforms = usingMobileTransformations ? transforms[direction].filter((t) => {
    if (t.type === "raw") {
      return true;
    }
    if (t.type === "prefix") {
      return true;
    }
    if (!t.blocks || !t.blocks.length) {
      return false;
    }
    if (isWildcardBlockTransform(t)) {
      return true;
    }
    return t.blocks.every((transformBlockName) => transforms.supportedMobileTransforms.includes(transformBlockName));
  }) : transforms[direction];
  return filteredTransforms.map((transform) => ({
    ...transform,
    blockName,
    usingMobileTransformations
  }));
}
function maybeCheckTransformIsMatch(transform, blocks) {
  if (typeof transform.isMatch !== "function") {
    return true;
  }
  const sourceBlock = blocks[0];
  const attributes = transform.isMultiBlock ? blocks.map((block2) => block2.attributes) : sourceBlock.attributes;
  const block = transform.isMultiBlock ? blocks : sourceBlock;
  return transform.isMatch(attributes, block);
}
function switchToBlockType(blocks, name) {
  const blocksArray = Array.isArray(blocks) ? blocks : [blocks];
  const isMultiBlock = blocksArray.length > 1;
  const firstBlock = blocksArray[0];
  const sourceName = firstBlock.name;
  const transformationsFrom = getBlockTransforms("from", name);
  const transformationsTo = getBlockTransforms("to", sourceName);
  const transformation = findTransform(transformationsTo, (t) => t.type === "block" && (isWildcardBlockTransform(t) || t.blocks.indexOf(name) !== -1) && (!isMultiBlock || t.isMultiBlock) && maybeCheckTransformIsMatch(t, blocksArray)) || findTransform(transformationsFrom, (t) => t.type === "block" && (isWildcardBlockTransform(t) || t.blocks.indexOf(sourceName) !== -1) && (!isMultiBlock || t.isMultiBlock) && maybeCheckTransformIsMatch(t, blocksArray));
  if (!transformation) {
    return null;
  }
  let transformationResults;
  if (transformation.isMultiBlock) {
    if ("__experimentalConvert" in transformation) {
      transformationResults = transformation.__experimentalConvert(blocksArray);
    } else {
      transformationResults = transformation.transform(blocksArray.map((currentBlock) => currentBlock.attributes), blocksArray.map((currentBlock) => currentBlock.innerBlocks));
    }
  } else if ("__experimentalConvert" in transformation) {
    transformationResults = transformation.__experimentalConvert(firstBlock);
  } else {
    transformationResults = transformation.transform(firstBlock.attributes, firstBlock.innerBlocks);
  }
  if (transformationResults === null || typeof transformationResults !== "object") {
    return null;
  }
  transformationResults = Array.isArray(transformationResults) ? transformationResults : [transformationResults];
  if (transformationResults.some((result) => !getBlockType(result.name))) {
    return null;
  }
  const hasSwitchedBlock = transformationResults.some((result) => result.name === name);
  if (!hasSwitchedBlock) {
    return null;
  }
  const ret = transformationResults.map((result, index, results) => {
    return applyFilters("blocks.switchToBlockType.transformedBlock", result, blocks, index, results);
  });
  return ret;
}
var getBlockFromExample = (name, example) => {
  try {
    var _example$innerBlocks;
    return createBlock(name, example.attributes, ((_example$innerBlocks = example.innerBlocks) !== null && _example$innerBlocks !== void 0 ? _example$innerBlocks : []).map((innerBlock) => getBlockFromExample(innerBlock.name, innerBlock)));
  } catch {
    return createBlock("core/missing", {
      originalName: name,
      originalContent: "",
      originalUndelimitedContent: ""
    });
  }
};

// ../../node_modules/@wordpress/block-serialization-default-parser/build-module/index.js
var document2;
var offset;
var output;
var stack;
var tokenizer = /<!--\s+(\/)?wp:([a-z][a-z0-9_-]*\/)?([a-z][a-z0-9_-]*)\s+({(?:(?=([^}]+|}+(?=})|(?!}\s+\/?-->)[^])*)\5|[^]*?)}\s+)?(\/)?-->/g;
function Block(blockName, attrs2, innerBlocks, innerHTML, innerContent) {
  return {
    blockName,
    attrs: attrs2,
    innerBlocks,
    innerHTML,
    innerContent
  };
}
function Freeform(innerHTML) {
  return Block(null, {}, [], innerHTML, [innerHTML]);
}
function Frame(block, tokenStart, tokenLength, prevOffset, leadingHtmlStart) {
  return {
    block,
    tokenStart,
    tokenLength,
    prevOffset: prevOffset || tokenStart + tokenLength,
    leadingHtmlStart
  };
}
var parse = (doc) => {
  document2 = doc;
  offset = 0;
  output = [];
  stack = [];
  tokenizer.lastIndex = 0;
  do {
  } while (proceed());
  return output;
};
function proceed() {
  const stackDepth = stack.length;
  const next2 = nextToken();
  const [tokenType, blockName, attrs2, startOffset, tokenLength] = next2;
  const leadingHtmlStart = startOffset > offset ? offset : null;
  switch (tokenType) {
    case "no-more-tokens":
      if (0 === stackDepth) {
        addFreeform();
        return false;
      }
      if (1 === stackDepth) {
        addBlockFromStack();
        return false;
      }
      while (0 < stack.length) {
        addBlockFromStack();
      }
      return false;
    case "void-block":
      if (0 === stackDepth) {
        if (null !== leadingHtmlStart) {
          output.push(Freeform(document2.substr(leadingHtmlStart, startOffset - leadingHtmlStart)));
        }
        output.push(Block(blockName, attrs2, [], "", []));
        offset = startOffset + tokenLength;
        return true;
      }
      addInnerBlock(Block(blockName, attrs2, [], "", []), startOffset, tokenLength);
      offset = startOffset + tokenLength;
      return true;
    case "block-opener":
      stack.push(Frame(Block(blockName, attrs2, [], "", []), startOffset, tokenLength, startOffset + tokenLength, leadingHtmlStart));
      offset = startOffset + tokenLength;
      return true;
    case "block-closer":
      if (0 === stackDepth) {
        addFreeform();
        return false;
      }
      if (1 === stackDepth) {
        addBlockFromStack(startOffset);
        offset = startOffset + tokenLength;
        return true;
      }
      const stackTop = stack.pop();
      const html2 = document2.substr(stackTop.prevOffset, startOffset - stackTop.prevOffset);
      stackTop.block.innerHTML += html2;
      stackTop.block.innerContent.push(html2);
      stackTop.prevOffset = startOffset + tokenLength;
      addInnerBlock(stackTop.block, stackTop.tokenStart, stackTop.tokenLength, startOffset + tokenLength);
      offset = startOffset + tokenLength;
      return true;
    default:
      addFreeform();
      return false;
  }
}
function parseJSON(input) {
  try {
    return JSON.parse(input);
  } catch (e) {
    return null;
  }
}
function nextToken() {
  const matches = tokenizer.exec(document2);
  if (null === matches) {
    return ["no-more-tokens", "", null, 0, 0];
  }
  const startedAt = matches.index;
  const [match, closerMatch, namespaceMatch, nameMatch, attrsMatch, , voidMatch] = matches;
  const length = match.length;
  const isCloser = !!closerMatch;
  const isVoid = !!voidMatch;
  const namespace = namespaceMatch || "core/";
  const name = namespace + nameMatch;
  const hasAttrs = !!attrsMatch;
  const attrs2 = hasAttrs ? parseJSON(attrsMatch) : {};
  if (isCloser && (isVoid || hasAttrs)) {
  }
  if (isVoid) {
    return ["void-block", name, attrs2, startedAt, length];
  }
  if (isCloser) {
    return ["block-closer", name, null, startedAt, length];
  }
  return ["block-opener", name, attrs2, startedAt, length];
}
function addFreeform(rawLength) {
  const length = rawLength ? rawLength : document2.length - offset;
  if (0 === length) {
    return;
  }
  output.push(Freeform(document2.substr(offset, length)));
}
function addInnerBlock(block, tokenStart, tokenLength, lastOffset) {
  const parent = stack[stack.length - 1];
  parent.block.innerBlocks.push(block);
  const html2 = document2.substr(parent.prevOffset, tokenStart - parent.prevOffset);
  if (html2) {
    parent.block.innerHTML += html2;
    parent.block.innerContent.push(html2);
  }
  parent.block.innerContent.push(null);
  parent.prevOffset = lastOffset ? lastOffset : tokenStart + tokenLength;
}
function addBlockFromStack(endOffset) {
  const {
    block,
    leadingHtmlStart,
    prevOffset,
    tokenStart
  } = stack.pop();
  const html2 = endOffset ? document2.substr(prevOffset, endOffset - prevOffset) : document2.substr(prevOffset);
  if (html2) {
    block.innerHTML += html2;
    block.innerContent.push(html2);
  }
  if (null !== leadingHtmlStart) {
    output.push(Freeform(document2.substr(leadingHtmlStart, tokenStart - leadingHtmlStart)));
  }
  output.push(block);
}

// ../../node_modules/@wordpress/autop/build-module/index.js
var htmlSplitRegex = (() => {
  const comments = "!(?:-(?!->)[^\\-]*)*(?:-->)?";
  const cdata = "!\\[CDATA\\[[^\\]]*(?:](?!]>)[^\\]]*)*?(?:]]>)?";
  const escaped = "(?=!--|!\\[CDATA\\[)((?=!-)" + // If yes, which type?
  comments + "|" + cdata + ")";
  const regex = "(<(" + // Conditional expression follows.
  escaped + // Find end of escaped element.
  "|[^>]*>?))";
  return new RegExp(regex);
})();
function htmlSplit(input) {
  const parts = [];
  let workingInput = input;
  let match;
  while (match = workingInput.match(htmlSplitRegex)) {
    const index = match.index;
    parts.push(workingInput.slice(0, index));
    parts.push(match[0]);
    workingInput = workingInput.slice(index + match[0].length);
  }
  if (workingInput.length) {
    parts.push(workingInput);
  }
  return parts;
}
function replaceInHtmlTags(haystack, replacePairs) {
  const textArr = htmlSplit(haystack);
  let changed = false;
  const needles = Object.keys(replacePairs);
  for (let i = 1; i < textArr.length; i += 2) {
    for (let j = 0; j < needles.length; j++) {
      const needle = needles[j];
      if (-1 !== textArr[i].indexOf(needle)) {
        textArr[i] = textArr[i].replace(new RegExp(needle, "g"), replacePairs[needle]);
        changed = true;
        break;
      }
    }
  }
  if (changed) {
    haystack = textArr.join("");
  }
  return haystack;
}
function autop(text2, br = true) {
  const preTags = [];
  if (text2.trim() === "") {
    return "";
  }
  text2 = text2 + "\n";
  if (text2.indexOf("<pre") !== -1) {
    const textParts = text2.split("</pre>");
    const lastText = textParts.pop();
    text2 = "";
    for (let i = 0; i < textParts.length; i++) {
      const textPart = textParts[i];
      const start = textPart.indexOf("<pre");
      if (start === -1) {
        text2 += textPart;
        continue;
      }
      const name = "<pre wp-pre-tag-" + i + "></pre>";
      preTags.push([name, textPart.substr(start) + "</pre>"]);
      text2 += textPart.substr(0, start) + name;
    }
    text2 += lastText;
  }
  text2 = text2.replace(/<br\s*\/?>\s*<br\s*\/?>/g, "\n\n");
  const allBlocks = "(?:table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|math|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary)";
  text2 = text2.replace(new RegExp("(<" + allBlocks + "[\\s/>])", "g"), "\n\n$1");
  text2 = text2.replace(new RegExp("(</" + allBlocks + ">)", "g"), "$1\n\n");
  text2 = text2.replace(/\r\n|\r/g, "\n");
  text2 = replaceInHtmlTags(text2, {
    "\n": " <!-- wpnl --> "
  });
  if (text2.indexOf("<option") !== -1) {
    text2 = text2.replace(/\s*<option/g, "<option");
    text2 = text2.replace(/<\/option>\s*/g, "</option>");
  }
  if (text2.indexOf("</object>") !== -1) {
    text2 = text2.replace(/(<object[^>]*>)\s*/g, "$1");
    text2 = text2.replace(/\s*<\/object>/g, "</object>");
    text2 = text2.replace(/\s*(<\/?(?:param|embed)[^>]*>)\s*/g, "$1");
  }
  if (text2.indexOf("<source") !== -1 || text2.indexOf("<track") !== -1) {
    text2 = text2.replace(/([<\[](?:audio|video)[^>\]]*[>\]])\s*/g, "$1");
    text2 = text2.replace(/\s*([<\[]\/(?:audio|video)[>\]])/g, "$1");
    text2 = text2.replace(/\s*(<(?:source|track)[^>]*>)\s*/g, "$1");
  }
  if (text2.indexOf("<figcaption") !== -1) {
    text2 = text2.replace(/\s*(<figcaption[^>]*>)/, "$1");
    text2 = text2.replace(/<\/figcaption>\s*/, "</figcaption>");
  }
  text2 = text2.replace(/\n\n+/g, "\n\n");
  const texts = text2.split(/\n\s*\n/).filter(Boolean);
  text2 = "";
  texts.forEach((textPiece) => {
    text2 += "<p>" + textPiece.replace(/^\n*|\n*$/g, "") + "</p>\n";
  });
  text2 = text2.replace(/<p>\s*<\/p>/g, "");
  text2 = text2.replace(/<p>([^<]+)<\/(div|address|form)>/g, "<p>$1</p></$2>");
  text2 = text2.replace(new RegExp("<p>\\s*(</?" + allBlocks + "[^>]*>)\\s*</p>", "g"), "$1");
  text2 = text2.replace(/<p>(<li.+?)<\/p>/g, "$1");
  text2 = text2.replace(/<p><blockquote([^>]*)>/gi, "<blockquote$1><p>");
  text2 = text2.replace(/<\/blockquote><\/p>/g, "</p></blockquote>");
  text2 = text2.replace(new RegExp("<p>\\s*(</?" + allBlocks + "[^>]*>)", "g"), "$1");
  text2 = text2.replace(new RegExp("(</?" + allBlocks + "[^>]*>)\\s*</p>", "g"), "$1");
  if (br) {
    text2 = text2.replace(/<(script|style).*?<\/\\1>/g, (match) => match[0].replace(/\n/g, "<WPPreserveNewline />"));
    text2 = text2.replace(/<br>|<br\/>/g, "<br />");
    text2 = text2.replace(/(<br \/>)?\s*\n/g, (a, b) => b ? a : "<br />\n");
    text2 = text2.replace(/<WPPreserveNewline \/>/g, "\n");
  }
  text2 = text2.replace(new RegExp("(</?" + allBlocks + "[^>]*>)\\s*<br />", "g"), "$1");
  text2 = text2.replace(/<br \/>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)[^>]*>)/g, "$1");
  text2 = text2.replace(/\n<\/p>$/g, "</p>");
  preTags.forEach((preTag) => {
    const [name, original] = preTag;
    text2 = text2.replace(name, original);
  });
  if (-1 !== text2.indexOf("<!-- wpnl -->")) {
    text2 = text2.replace(/\s?<!-- wpnl -->\s?/g, "\n");
  }
  return text2;
}
function removep(html2) {
  const blocklist = "blockquote|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|th|td|h[1-6]|fieldset|figure";
  const blocklist1 = blocklist + "|div|p";
  const blocklist2 = blocklist + "|pre";
  const preserve = [];
  let preserveLinebreaks = false;
  let preserveBr = false;
  if (!html2) {
    return "";
  }
  if (html2.indexOf("<script") !== -1 || html2.indexOf("<style") !== -1) {
    html2 = html2.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, (match) => {
      preserve.push(match);
      return "<wp-preserve>";
    });
  }
  if (html2.indexOf("<pre") !== -1) {
    preserveLinebreaks = true;
    html2 = html2.replace(/<pre[^>]*>[\s\S]+?<\/pre>/g, (a) => {
      a = a.replace(/<br ?\/?>(\r\n|\n)?/g, "<wp-line-break>");
      a = a.replace(/<\/?p( [^>]*)?>(\r\n|\n)?/g, "<wp-line-break>");
      return a.replace(/\r?\n/g, "<wp-line-break>");
    });
  }
  if (html2.indexOf("[caption") !== -1) {
    preserveBr = true;
    html2 = html2.replace(/\[caption[\s\S]+?\[\/caption\]/g, (a) => {
      return a.replace(/<br([^>]*)>/g, "<wp-temp-br$1>").replace(/[\r\n\t]+/, "");
    });
  }
  html2 = html2.replace(new RegExp("\\s*</(" + blocklist1 + ")>\\s*", "g"), "</$1>\n");
  html2 = html2.replace(new RegExp("\\s*<((?:" + blocklist1 + ")(?: [^>]*)?)>", "g"), "\n<$1>");
  html2 = html2.replace(/(<p [^>]+>[\s\S]*?)<\/p>/g, "$1</p#>");
  html2 = html2.replace(/<div( [^>]*)?>\s*<p>/gi, "<div$1>\n\n");
  html2 = html2.replace(/\s*<p>/gi, "");
  html2 = html2.replace(/\s*<\/p>\s*/gi, "\n\n");
  html2 = html2.replace(/\n[\s\u00a0]+\n/g, "\n\n");
  html2 = html2.replace(/(\s*)<br ?\/?>\s*/gi, (_, space) => {
    if (space && space.indexOf("\n") !== -1) {
      return "\n\n";
    }
    return "\n";
  });
  html2 = html2.replace(/\s*<div/g, "\n<div");
  html2 = html2.replace(/<\/div>\s*/g, "</div>\n");
  html2 = html2.replace(/\s*\[caption([^\[]+)\[\/caption\]\s*/gi, "\n\n[caption$1[/caption]\n\n");
  html2 = html2.replace(/caption\]\n\n+\[caption/g, "caption]\n\n[caption");
  html2 = html2.replace(new RegExp("\\s*<((?:" + blocklist2 + ")(?: [^>]*)?)\\s*>", "g"), "\n<$1>");
  html2 = html2.replace(new RegExp("\\s*</(" + blocklist2 + ")>\\s*", "g"), "</$1>\n");
  html2 = html2.replace(/<((li|dt|dd)[^>]*)>/g, " 	<$1>");
  if (html2.indexOf("<option") !== -1) {
    html2 = html2.replace(/\s*<option/g, "\n<option");
    html2 = html2.replace(/\s*<\/select>/g, "\n</select>");
  }
  if (html2.indexOf("<hr") !== -1) {
    html2 = html2.replace(/\s*<hr( [^>]*)?>\s*/g, "\n\n<hr$1>\n\n");
  }
  if (html2.indexOf("<object") !== -1) {
    html2 = html2.replace(/<object[\s\S]+?<\/object>/g, (a) => {
      return a.replace(/[\r\n]+/g, "");
    });
  }
  html2 = html2.replace(/<\/p#>/g, "</p>\n");
  html2 = html2.replace(/\s*(<p [^>]+>[\s\S]*?<\/p>)/g, "\n$1");
  html2 = html2.replace(/^\s+/, "");
  html2 = html2.replace(/[\s\u00a0]+$/, "");
  if (preserveLinebreaks) {
    html2 = html2.replace(/<wp-line-break>/g, "\n");
  }
  if (preserveBr) {
    html2 = html2.replace(/<wp-temp-br([^>]*)>/g, "<br$1>");
  }
  if (preserve.length) {
    html2 = html2.replace(/<wp-preserve>/g, () => {
      return preserve.shift();
    });
  }
  return html2;
}

// ../../node_modules/@wordpress/blocks/build-module/api/parser/serialize-raw-block.js
function serializeRawBlock(rawBlock, options = {}) {
  const {
    isCommentDelimited = true
  } = options;
  const {
    blockName,
    attrs: attrs2 = {},
    innerBlocks = [],
    innerContent = []
  } = rawBlock;
  let childIndex = 0;
  const content = innerContent.map((item) => (
    // `null` denotes a nested block, otherwise we have an HTML fragment.
    item !== null ? item : serializeRawBlock(innerBlocks[childIndex++], options)
  )).join("\n").replace(/\n+/g, "\n").trim();
  return isCommentDelimited ? getCommentDelimitedContent(blockName, attrs2, content) : content;
}

// ../../node_modules/@wordpress/blocks/build-module/api/serializer.js
var import_jsx_runtime = __toESM(require_jsx_runtime());
function getBlockDefaultClassName(blockName) {
  const className = "wp-block-" + blockName.replace(/\//, "-").replace(/^core-/, "");
  return applyFilters("blocks.getBlockDefaultClassName", className, blockName);
}
function getBlockMenuDefaultClassName(blockName) {
  const className = "editor-block-list-item-" + blockName.replace(/\//, "-").replace(/^core-/, "");
  return applyFilters("blocks.getBlockMenuDefaultClassName", className, blockName);
}
var blockPropsProvider = {};
var innerBlocksPropsProvider = {};
function getBlockProps(props = {}) {
  const {
    blockType,
    attributes
  } = blockPropsProvider;
  return getBlockProps.skipFilters ? props : applyFilters("blocks.getSaveContent.extraProps", {
    ...props
  }, blockType, attributes);
}
function getInnerBlocksProps(props = {}) {
  const {
    innerBlocks
  } = innerBlocksPropsProvider;
  if (!Array.isArray(innerBlocks)) {
    return {
      ...props,
      children: innerBlocks
    };
  }
  const html2 = serialize(innerBlocks, {
    isInnerBlocks: true
  });
  const children = (0, import_jsx_runtime.jsx)(RawHTML, {
    children: html2
  });
  return {
    ...props,
    children
  };
}
function getSaveElement(blockTypeOrName, attributes, innerBlocks = []) {
  const blockType = normalizeBlockType(blockTypeOrName);
  if (!(blockType == null ? void 0 : blockType.save)) {
    return null;
  }
  let {
    save
  } = blockType;
  if (save.prototype instanceof import_react.Component) {
    const instance = new save({
      attributes
    });
    save = instance.render.bind(instance);
  }
  blockPropsProvider.blockType = blockType;
  blockPropsProvider.attributes = attributes;
  innerBlocksPropsProvider.innerBlocks = innerBlocks;
  let element = save({
    attributes,
    innerBlocks
  });
  if (element !== null && typeof element === "object" && hasFilter("blocks.getSaveContent.extraProps") && !(blockType.apiVersion > 1)) {
    const props = applyFilters("blocks.getSaveContent.extraProps", {
      ...element.props
    }, blockType, attributes);
    if (!isShallowEqual(props, element.props)) {
      element = (0, import_react.cloneElement)(element, props);
    }
  }
  return applyFilters("blocks.getSaveElement", element, blockType, attributes);
}
function getSaveContent(blockTypeOrName, attributes, innerBlocks) {
  const blockType = normalizeBlockType(blockTypeOrName);
  return serialize_default(getSaveElement(blockType, attributes, innerBlocks));
}
function getCommentAttributes(blockType, attributes) {
  var _blockType$attributes;
  return Object.entries((_blockType$attributes = blockType.attributes) !== null && _blockType$attributes !== void 0 ? _blockType$attributes : {}).reduce((accumulator, [key, attributeSchema]) => {
    const value = attributes[key];
    if (void 0 === value) {
      return accumulator;
    }
    if (attributeSchema.source !== void 0) {
      return accumulator;
    }
    if (attributeSchema.role === "local") {
      return accumulator;
    }
    if (attributeSchema.__experimentalRole === "local") {
      deprecated("__experimentalRole attribute", {
        since: "6.7",
        version: "6.8",
        alternative: "role attribute",
        hint: `Check the block.json of the ${blockType == null ? void 0 : blockType.name} block.`
      });
      return accumulator;
    }
    if ("default" in attributeSchema && JSON.stringify(attributeSchema.default) === JSON.stringify(value)) {
      return accumulator;
    }
    accumulator[key] = value;
    return accumulator;
  }, {});
}
function serializeAttributes(attributes) {
  return JSON.stringify(attributes).replace(/--/g, "\\u002d\\u002d").replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\\"/g, "\\u0022");
}
function getBlockInnerHTML(block) {
  let saveContent = block.originalContent;
  if (block.isValid || block.innerBlocks.length) {
    try {
      saveContent = getSaveContent(block.name, block.attributes, block.innerBlocks);
    } catch (error) {
    }
  }
  return saveContent;
}
function getCommentDelimitedContent(rawBlockName, attributes, content) {
  const serializedAttributes = attributes && Object.entries(attributes).length ? serializeAttributes(attributes) + " " : "";
  const blockName = (rawBlockName == null ? void 0 : rawBlockName.startsWith("core/")) ? rawBlockName.slice(5) : rawBlockName;
  if (!content) {
    return `<!-- wp:${blockName} ${serializedAttributes}/-->`;
  }
  return `<!-- wp:${blockName} ${serializedAttributes}-->
` + content + `
<!-- /wp:${blockName} -->`;
}
function serializeBlock(block, {
  isInnerBlocks = false
} = {}) {
  if (!block.isValid && block.__unstableBlockSource) {
    return serializeRawBlock(block.__unstableBlockSource);
  }
  const blockName = block.name;
  const saveContent = getBlockInnerHTML(block);
  if (blockName === getUnregisteredTypeHandlerName() || !isInnerBlocks && blockName === getFreeformContentHandlerName()) {
    return saveContent;
  }
  const blockType = getBlockType(blockName);
  if (!blockType) {
    return saveContent;
  }
  const saveAttributes = getCommentAttributes(blockType, block.attributes);
  return getCommentDelimitedContent(blockName, saveAttributes, saveContent);
}
function __unstableSerializeAndClean(blocks) {
  if (blocks.length === 1 && isUnmodifiedDefaultBlock(blocks[0])) {
    blocks = [];
  }
  let content = serialize(blocks);
  if (blocks.length === 1 && blocks[0].name === getFreeformContentHandlerName() && blocks[0].name === "core/freeform") {
    content = removep(content);
  }
  return content;
}
function serialize(blocks, options) {
  const blocksArray = Array.isArray(blocks) ? blocks : [blocks];
  return blocksArray.map((block) => serializeBlock(block, options)).join("\n\n");
}

// ../../node_modules/simple-html-tokenizer/dist/es6/index.js
var HEXCHARCODE = /^#[xX]([A-Fa-f0-9]+)$/;
var CHARCODE = /^#([0-9]+)$/;
var NAMED = /^([A-Za-z0-9]+)$/;
var EntityParser = (
  /** @class */
  function() {
    function EntityParser2(named) {
      this.named = named;
    }
    EntityParser2.prototype.parse = function(entity) {
      if (!entity) {
        return;
      }
      var matches = entity.match(HEXCHARCODE);
      if (matches) {
        return String.fromCharCode(parseInt(matches[1], 16));
      }
      matches = entity.match(CHARCODE);
      if (matches) {
        return String.fromCharCode(parseInt(matches[1], 10));
      }
      matches = entity.match(NAMED);
      if (matches) {
        return this.named[matches[1]];
      }
    };
    return EntityParser2;
  }()
);
var WSP = /[\t\n\f ]/;
var ALPHA = /[A-Za-z]/;
var CRLF = /\r\n?/g;
function isSpace(char) {
  return WSP.test(char);
}
function isAlpha(char) {
  return ALPHA.test(char);
}
function preprocessInput(input) {
  return input.replace(CRLF, "\n");
}
var EventedTokenizer = (
  /** @class */
  function() {
    function EventedTokenizer2(delegate, entityParser, mode) {
      if (mode === void 0) {
        mode = "precompile";
      }
      this.delegate = delegate;
      this.entityParser = entityParser;
      this.mode = mode;
      this.state = "beforeData";
      this.line = -1;
      this.column = -1;
      this.input = "";
      this.index = -1;
      this.tagNameBuffer = "";
      this.states = {
        beforeData: function() {
          var char = this.peek();
          if (char === "<" && !this.isIgnoredEndTag()) {
            this.transitionTo(
              "tagOpen"
              /* tagOpen */
            );
            this.markTagStart();
            this.consume();
          } else {
            if (this.mode === "precompile" && char === "\n") {
              var tag = this.tagNameBuffer.toLowerCase();
              if (tag === "pre" || tag === "textarea") {
                this.consume();
              }
            }
            this.transitionTo(
              "data"
              /* data */
            );
            this.delegate.beginData();
          }
        },
        data: function() {
          var char = this.peek();
          var tag = this.tagNameBuffer;
          if (char === "<" && !this.isIgnoredEndTag()) {
            this.delegate.finishData();
            this.transitionTo(
              "tagOpen"
              /* tagOpen */
            );
            this.markTagStart();
            this.consume();
          } else if (char === "&" && tag !== "script" && tag !== "style") {
            this.consume();
            this.delegate.appendToData(this.consumeCharRef() || "&");
          } else {
            this.consume();
            this.delegate.appendToData(char);
          }
        },
        tagOpen: function() {
          var char = this.consume();
          if (char === "!") {
            this.transitionTo(
              "markupDeclarationOpen"
              /* markupDeclarationOpen */
            );
          } else if (char === "/") {
            this.transitionTo(
              "endTagOpen"
              /* endTagOpen */
            );
          } else if (char === "@" || char === ":" || isAlpha(char)) {
            this.transitionTo(
              "tagName"
              /* tagName */
            );
            this.tagNameBuffer = "";
            this.delegate.beginStartTag();
            this.appendToTagName(char);
          }
        },
        markupDeclarationOpen: function() {
          var char = this.consume();
          if (char === "-" && this.peek() === "-") {
            this.consume();
            this.transitionTo(
              "commentStart"
              /* commentStart */
            );
            this.delegate.beginComment();
          } else {
            var maybeDoctype = char.toUpperCase() + this.input.substring(this.index, this.index + 6).toUpperCase();
            if (maybeDoctype === "DOCTYPE") {
              this.consume();
              this.consume();
              this.consume();
              this.consume();
              this.consume();
              this.consume();
              this.transitionTo(
                "doctype"
                /* doctype */
              );
              if (this.delegate.beginDoctype)
                this.delegate.beginDoctype();
            }
          }
        },
        doctype: function() {
          var char = this.consume();
          if (isSpace(char)) {
            this.transitionTo(
              "beforeDoctypeName"
              /* beforeDoctypeName */
            );
          }
        },
        beforeDoctypeName: function() {
          var char = this.consume();
          if (isSpace(char)) {
            return;
          } else {
            this.transitionTo(
              "doctypeName"
              /* doctypeName */
            );
            if (this.delegate.appendToDoctypeName)
              this.delegate.appendToDoctypeName(char.toLowerCase());
          }
        },
        doctypeName: function() {
          var char = this.consume();
          if (isSpace(char)) {
            this.transitionTo(
              "afterDoctypeName"
              /* afterDoctypeName */
            );
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            if (this.delegate.appendToDoctypeName)
              this.delegate.appendToDoctypeName(char.toLowerCase());
          }
        },
        afterDoctypeName: function() {
          var char = this.consume();
          if (isSpace(char)) {
            return;
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            var nextSixChars = char.toUpperCase() + this.input.substring(this.index, this.index + 5).toUpperCase();
            var isPublic = nextSixChars.toUpperCase() === "PUBLIC";
            var isSystem = nextSixChars.toUpperCase() === "SYSTEM";
            if (isPublic || isSystem) {
              this.consume();
              this.consume();
              this.consume();
              this.consume();
              this.consume();
              this.consume();
            }
            if (isPublic) {
              this.transitionTo(
                "afterDoctypePublicKeyword"
                /* afterDoctypePublicKeyword */
              );
            } else if (isSystem) {
              this.transitionTo(
                "afterDoctypeSystemKeyword"
                /* afterDoctypeSystemKeyword */
              );
            }
          }
        },
        afterDoctypePublicKeyword: function() {
          var char = this.peek();
          if (isSpace(char)) {
            this.transitionTo(
              "beforeDoctypePublicIdentifier"
              /* beforeDoctypePublicIdentifier */
            );
            this.consume();
          } else if (char === '"') {
            this.transitionTo(
              "doctypePublicIdentifierDoubleQuoted"
              /* doctypePublicIdentifierDoubleQuoted */
            );
            this.consume();
          } else if (char === "'") {
            this.transitionTo(
              "doctypePublicIdentifierSingleQuoted"
              /* doctypePublicIdentifierSingleQuoted */
            );
            this.consume();
          } else if (char === ">") {
            this.consume();
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          }
        },
        doctypePublicIdentifierDoubleQuoted: function() {
          var char = this.consume();
          if (char === '"') {
            this.transitionTo(
              "afterDoctypePublicIdentifier"
              /* afterDoctypePublicIdentifier */
            );
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            if (this.delegate.appendToDoctypePublicIdentifier)
              this.delegate.appendToDoctypePublicIdentifier(char);
          }
        },
        doctypePublicIdentifierSingleQuoted: function() {
          var char = this.consume();
          if (char === "'") {
            this.transitionTo(
              "afterDoctypePublicIdentifier"
              /* afterDoctypePublicIdentifier */
            );
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            if (this.delegate.appendToDoctypePublicIdentifier)
              this.delegate.appendToDoctypePublicIdentifier(char);
          }
        },
        afterDoctypePublicIdentifier: function() {
          var char = this.consume();
          if (isSpace(char)) {
            this.transitionTo(
              "betweenDoctypePublicAndSystemIdentifiers"
              /* betweenDoctypePublicAndSystemIdentifiers */
            );
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else if (char === '"') {
            this.transitionTo(
              "doctypeSystemIdentifierDoubleQuoted"
              /* doctypeSystemIdentifierDoubleQuoted */
            );
          } else if (char === "'") {
            this.transitionTo(
              "doctypeSystemIdentifierSingleQuoted"
              /* doctypeSystemIdentifierSingleQuoted */
            );
          }
        },
        betweenDoctypePublicAndSystemIdentifiers: function() {
          var char = this.consume();
          if (isSpace(char)) {
            return;
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else if (char === '"') {
            this.transitionTo(
              "doctypeSystemIdentifierDoubleQuoted"
              /* doctypeSystemIdentifierDoubleQuoted */
            );
          } else if (char === "'") {
            this.transitionTo(
              "doctypeSystemIdentifierSingleQuoted"
              /* doctypeSystemIdentifierSingleQuoted */
            );
          }
        },
        doctypeSystemIdentifierDoubleQuoted: function() {
          var char = this.consume();
          if (char === '"') {
            this.transitionTo(
              "afterDoctypeSystemIdentifier"
              /* afterDoctypeSystemIdentifier */
            );
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            if (this.delegate.appendToDoctypeSystemIdentifier)
              this.delegate.appendToDoctypeSystemIdentifier(char);
          }
        },
        doctypeSystemIdentifierSingleQuoted: function() {
          var char = this.consume();
          if (char === "'") {
            this.transitionTo(
              "afterDoctypeSystemIdentifier"
              /* afterDoctypeSystemIdentifier */
            );
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            if (this.delegate.appendToDoctypeSystemIdentifier)
              this.delegate.appendToDoctypeSystemIdentifier(char);
          }
        },
        afterDoctypeSystemIdentifier: function() {
          var char = this.consume();
          if (isSpace(char)) {
            return;
          } else if (char === ">") {
            if (this.delegate.endDoctype)
              this.delegate.endDoctype();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          }
        },
        commentStart: function() {
          var char = this.consume();
          if (char === "-") {
            this.transitionTo(
              "commentStartDash"
              /* commentStartDash */
            );
          } else if (char === ">") {
            this.delegate.finishComment();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.delegate.appendToCommentData(char);
            this.transitionTo(
              "comment"
              /* comment */
            );
          }
        },
        commentStartDash: function() {
          var char = this.consume();
          if (char === "-") {
            this.transitionTo(
              "commentEnd"
              /* commentEnd */
            );
          } else if (char === ">") {
            this.delegate.finishComment();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.delegate.appendToCommentData("-");
            this.transitionTo(
              "comment"
              /* comment */
            );
          }
        },
        comment: function() {
          var char = this.consume();
          if (char === "-") {
            this.transitionTo(
              "commentEndDash"
              /* commentEndDash */
            );
          } else {
            this.delegate.appendToCommentData(char);
          }
        },
        commentEndDash: function() {
          var char = this.consume();
          if (char === "-") {
            this.transitionTo(
              "commentEnd"
              /* commentEnd */
            );
          } else {
            this.delegate.appendToCommentData("-" + char);
            this.transitionTo(
              "comment"
              /* comment */
            );
          }
        },
        commentEnd: function() {
          var char = this.consume();
          if (char === ">") {
            this.delegate.finishComment();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.delegate.appendToCommentData("--" + char);
            this.transitionTo(
              "comment"
              /* comment */
            );
          }
        },
        tagName: function() {
          var char = this.consume();
          if (isSpace(char)) {
            this.transitionTo(
              "beforeAttributeName"
              /* beforeAttributeName */
            );
          } else if (char === "/") {
            this.transitionTo(
              "selfClosingStartTag"
              /* selfClosingStartTag */
            );
          } else if (char === ">") {
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.appendToTagName(char);
          }
        },
        endTagName: function() {
          var char = this.consume();
          if (isSpace(char)) {
            this.transitionTo(
              "beforeAttributeName"
              /* beforeAttributeName */
            );
            this.tagNameBuffer = "";
          } else if (char === "/") {
            this.transitionTo(
              "selfClosingStartTag"
              /* selfClosingStartTag */
            );
            this.tagNameBuffer = "";
          } else if (char === ">") {
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
            this.tagNameBuffer = "";
          } else {
            this.appendToTagName(char);
          }
        },
        beforeAttributeName: function() {
          var char = this.peek();
          if (isSpace(char)) {
            this.consume();
            return;
          } else if (char === "/") {
            this.transitionTo(
              "selfClosingStartTag"
              /* selfClosingStartTag */
            );
            this.consume();
          } else if (char === ">") {
            this.consume();
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else if (char === "=") {
            this.delegate.reportSyntaxError("attribute name cannot start with equals sign");
            this.transitionTo(
              "attributeName"
              /* attributeName */
            );
            this.delegate.beginAttribute();
            this.consume();
            this.delegate.appendToAttributeName(char);
          } else {
            this.transitionTo(
              "attributeName"
              /* attributeName */
            );
            this.delegate.beginAttribute();
          }
        },
        attributeName: function() {
          var char = this.peek();
          if (isSpace(char)) {
            this.transitionTo(
              "afterAttributeName"
              /* afterAttributeName */
            );
            this.consume();
          } else if (char === "/") {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.transitionTo(
              "selfClosingStartTag"
              /* selfClosingStartTag */
            );
          } else if (char === "=") {
            this.transitionTo(
              "beforeAttributeValue"
              /* beforeAttributeValue */
            );
            this.consume();
          } else if (char === ">") {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else if (char === '"' || char === "'" || char === "<") {
            this.delegate.reportSyntaxError(char + " is not a valid character within attribute names");
            this.consume();
            this.delegate.appendToAttributeName(char);
          } else {
            this.consume();
            this.delegate.appendToAttributeName(char);
          }
        },
        afterAttributeName: function() {
          var char = this.peek();
          if (isSpace(char)) {
            this.consume();
            return;
          } else if (char === "/") {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.transitionTo(
              "selfClosingStartTag"
              /* selfClosingStartTag */
            );
          } else if (char === "=") {
            this.consume();
            this.transitionTo(
              "beforeAttributeValue"
              /* beforeAttributeValue */
            );
          } else if (char === ">") {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.transitionTo(
              "attributeName"
              /* attributeName */
            );
            this.delegate.beginAttribute();
            this.consume();
            this.delegate.appendToAttributeName(char);
          }
        },
        beforeAttributeValue: function() {
          var char = this.peek();
          if (isSpace(char)) {
            this.consume();
          } else if (char === '"') {
            this.transitionTo(
              "attributeValueDoubleQuoted"
              /* attributeValueDoubleQuoted */
            );
            this.delegate.beginAttributeValue(true);
            this.consume();
          } else if (char === "'") {
            this.transitionTo(
              "attributeValueSingleQuoted"
              /* attributeValueSingleQuoted */
            );
            this.delegate.beginAttributeValue(true);
            this.consume();
          } else if (char === ">") {
            this.delegate.beginAttributeValue(false);
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.transitionTo(
              "attributeValueUnquoted"
              /* attributeValueUnquoted */
            );
            this.delegate.beginAttributeValue(false);
            this.consume();
            this.delegate.appendToAttributeValue(char);
          }
        },
        attributeValueDoubleQuoted: function() {
          var char = this.consume();
          if (char === '"') {
            this.delegate.finishAttributeValue();
            this.transitionTo(
              "afterAttributeValueQuoted"
              /* afterAttributeValueQuoted */
            );
          } else if (char === "&") {
            this.delegate.appendToAttributeValue(this.consumeCharRef() || "&");
          } else {
            this.delegate.appendToAttributeValue(char);
          }
        },
        attributeValueSingleQuoted: function() {
          var char = this.consume();
          if (char === "'") {
            this.delegate.finishAttributeValue();
            this.transitionTo(
              "afterAttributeValueQuoted"
              /* afterAttributeValueQuoted */
            );
          } else if (char === "&") {
            this.delegate.appendToAttributeValue(this.consumeCharRef() || "&");
          } else {
            this.delegate.appendToAttributeValue(char);
          }
        },
        attributeValueUnquoted: function() {
          var char = this.peek();
          if (isSpace(char)) {
            this.delegate.finishAttributeValue();
            this.consume();
            this.transitionTo(
              "beforeAttributeName"
              /* beforeAttributeName */
            );
          } else if (char === "/") {
            this.delegate.finishAttributeValue();
            this.consume();
            this.transitionTo(
              "selfClosingStartTag"
              /* selfClosingStartTag */
            );
          } else if (char === "&") {
            this.consume();
            this.delegate.appendToAttributeValue(this.consumeCharRef() || "&");
          } else if (char === ">") {
            this.delegate.finishAttributeValue();
            this.consume();
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.consume();
            this.delegate.appendToAttributeValue(char);
          }
        },
        afterAttributeValueQuoted: function() {
          var char = this.peek();
          if (isSpace(char)) {
            this.consume();
            this.transitionTo(
              "beforeAttributeName"
              /* beforeAttributeName */
            );
          } else if (char === "/") {
            this.consume();
            this.transitionTo(
              "selfClosingStartTag"
              /* selfClosingStartTag */
            );
          } else if (char === ">") {
            this.consume();
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.transitionTo(
              "beforeAttributeName"
              /* beforeAttributeName */
            );
          }
        },
        selfClosingStartTag: function() {
          var char = this.peek();
          if (char === ">") {
            this.consume();
            this.delegate.markTagAsSelfClosing();
            this.delegate.finishTag();
            this.transitionTo(
              "beforeData"
              /* beforeData */
            );
          } else {
            this.transitionTo(
              "beforeAttributeName"
              /* beforeAttributeName */
            );
          }
        },
        endTagOpen: function() {
          var char = this.consume();
          if (char === "@" || char === ":" || isAlpha(char)) {
            this.transitionTo(
              "endTagName"
              /* endTagName */
            );
            this.tagNameBuffer = "";
            this.delegate.beginEndTag();
            this.appendToTagName(char);
          }
        }
      };
      this.reset();
    }
    EventedTokenizer2.prototype.reset = function() {
      this.transitionTo(
        "beforeData"
        /* beforeData */
      );
      this.input = "";
      this.tagNameBuffer = "";
      this.index = 0;
      this.line = 1;
      this.column = 0;
      this.delegate.reset();
    };
    EventedTokenizer2.prototype.transitionTo = function(state) {
      this.state = state;
    };
    EventedTokenizer2.prototype.tokenize = function(input) {
      this.reset();
      this.tokenizePart(input);
      this.tokenizeEOF();
    };
    EventedTokenizer2.prototype.tokenizePart = function(input) {
      this.input += preprocessInput(input);
      while (this.index < this.input.length) {
        var handler = this.states[this.state];
        if (handler !== void 0) {
          handler.call(this);
        } else {
          throw new Error("unhandled state " + this.state);
        }
      }
    };
    EventedTokenizer2.prototype.tokenizeEOF = function() {
      this.flushData();
    };
    EventedTokenizer2.prototype.flushData = function() {
      if (this.state === "data") {
        this.delegate.finishData();
        this.transitionTo(
          "beforeData"
          /* beforeData */
        );
      }
    };
    EventedTokenizer2.prototype.peek = function() {
      return this.input.charAt(this.index);
    };
    EventedTokenizer2.prototype.consume = function() {
      var char = this.peek();
      this.index++;
      if (char === "\n") {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      return char;
    };
    EventedTokenizer2.prototype.consumeCharRef = function() {
      var endIndex = this.input.indexOf(";", this.index);
      if (endIndex === -1) {
        return;
      }
      var entity = this.input.slice(this.index, endIndex);
      var chars = this.entityParser.parse(entity);
      if (chars) {
        var count = entity.length;
        while (count) {
          this.consume();
          count--;
        }
        this.consume();
        return chars;
      }
    };
    EventedTokenizer2.prototype.markTagStart = function() {
      this.delegate.tagOpen();
    };
    EventedTokenizer2.prototype.appendToTagName = function(char) {
      this.tagNameBuffer += char;
      this.delegate.appendToTagName(char);
    };
    EventedTokenizer2.prototype.isIgnoredEndTag = function() {
      var tag = this.tagNameBuffer;
      return tag === "title" && this.input.substring(this.index, this.index + 8) !== "</title>" || tag === "style" && this.input.substring(this.index, this.index + 8) !== "</style>" || tag === "script" && this.input.substring(this.index, this.index + 9) !== "<\/script>";
    };
    return EventedTokenizer2;
  }()
);
var Tokenizer = (
  /** @class */
  function() {
    function Tokenizer2(entityParser, options) {
      if (options === void 0) {
        options = {};
      }
      this.options = options;
      this.token = null;
      this.startLine = 1;
      this.startColumn = 0;
      this.tokens = [];
      this.tokenizer = new EventedTokenizer(this, entityParser, options.mode);
      this._currentAttribute = void 0;
    }
    Tokenizer2.prototype.tokenize = function(input) {
      this.tokens = [];
      this.tokenizer.tokenize(input);
      return this.tokens;
    };
    Tokenizer2.prototype.tokenizePart = function(input) {
      this.tokens = [];
      this.tokenizer.tokenizePart(input);
      return this.tokens;
    };
    Tokenizer2.prototype.tokenizeEOF = function() {
      this.tokens = [];
      this.tokenizer.tokenizeEOF();
      return this.tokens[0];
    };
    Tokenizer2.prototype.reset = function() {
      this.token = null;
      this.startLine = 1;
      this.startColumn = 0;
    };
    Tokenizer2.prototype.current = function() {
      var token = this.token;
      if (token === null) {
        throw new Error("token was unexpectedly null");
      }
      if (arguments.length === 0) {
        return token;
      }
      for (var i = 0; i < arguments.length; i++) {
        if (token.type === arguments[i]) {
          return token;
        }
      }
      throw new Error("token type was unexpectedly " + token.type);
    };
    Tokenizer2.prototype.push = function(token) {
      this.token = token;
      this.tokens.push(token);
    };
    Tokenizer2.prototype.currentAttribute = function() {
      return this._currentAttribute;
    };
    Tokenizer2.prototype.addLocInfo = function() {
      if (this.options.loc) {
        this.current().loc = {
          start: {
            line: this.startLine,
            column: this.startColumn
          },
          end: {
            line: this.tokenizer.line,
            column: this.tokenizer.column
          }
        };
      }
      this.startLine = this.tokenizer.line;
      this.startColumn = this.tokenizer.column;
    };
    Tokenizer2.prototype.beginDoctype = function() {
      this.push({
        type: "Doctype",
        name: ""
      });
    };
    Tokenizer2.prototype.appendToDoctypeName = function(char) {
      this.current(
        "Doctype"
        /* Doctype */
      ).name += char;
    };
    Tokenizer2.prototype.appendToDoctypePublicIdentifier = function(char) {
      var doctype = this.current(
        "Doctype"
        /* Doctype */
      );
      if (doctype.publicIdentifier === void 0) {
        doctype.publicIdentifier = char;
      } else {
        doctype.publicIdentifier += char;
      }
    };
    Tokenizer2.prototype.appendToDoctypeSystemIdentifier = function(char) {
      var doctype = this.current(
        "Doctype"
        /* Doctype */
      );
      if (doctype.systemIdentifier === void 0) {
        doctype.systemIdentifier = char;
      } else {
        doctype.systemIdentifier += char;
      }
    };
    Tokenizer2.prototype.endDoctype = function() {
      this.addLocInfo();
    };
    Tokenizer2.prototype.beginData = function() {
      this.push({
        type: "Chars",
        chars: ""
      });
    };
    Tokenizer2.prototype.appendToData = function(char) {
      this.current(
        "Chars"
        /* Chars */
      ).chars += char;
    };
    Tokenizer2.prototype.finishData = function() {
      this.addLocInfo();
    };
    Tokenizer2.prototype.beginComment = function() {
      this.push({
        type: "Comment",
        chars: ""
      });
    };
    Tokenizer2.prototype.appendToCommentData = function(char) {
      this.current(
        "Comment"
        /* Comment */
      ).chars += char;
    };
    Tokenizer2.prototype.finishComment = function() {
      this.addLocInfo();
    };
    Tokenizer2.prototype.tagOpen = function() {
    };
    Tokenizer2.prototype.beginStartTag = function() {
      this.push({
        type: "StartTag",
        tagName: "",
        attributes: [],
        selfClosing: false
      });
    };
    Tokenizer2.prototype.beginEndTag = function() {
      this.push({
        type: "EndTag",
        tagName: ""
      });
    };
    Tokenizer2.prototype.finishTag = function() {
      this.addLocInfo();
    };
    Tokenizer2.prototype.markTagAsSelfClosing = function() {
      this.current(
        "StartTag"
        /* StartTag */
      ).selfClosing = true;
    };
    Tokenizer2.prototype.appendToTagName = function(char) {
      this.current(
        "StartTag",
        "EndTag"
        /* EndTag */
      ).tagName += char;
    };
    Tokenizer2.prototype.beginAttribute = function() {
      this._currentAttribute = ["", "", false];
    };
    Tokenizer2.prototype.appendToAttributeName = function(char) {
      this.currentAttribute()[0] += char;
    };
    Tokenizer2.prototype.beginAttributeValue = function(isQuoted) {
      this.currentAttribute()[2] = isQuoted;
    };
    Tokenizer2.prototype.appendToAttributeValue = function(char) {
      this.currentAttribute()[1] += char;
    };
    Tokenizer2.prototype.finishAttributeValue = function() {
      this.current(
        "StartTag"
        /* StartTag */
      ).attributes.push(this._currentAttribute);
    };
    Tokenizer2.prototype.reportSyntaxError = function(message) {
      this.current().syntaxError = message;
    };
    return Tokenizer2;
  }()
);

// ../../node_modules/@wordpress/blocks/build-module/api/validation/index.js
var import_es6 = __toESM(require_es6());

// ../../node_modules/@wordpress/blocks/build-module/api/validation/logger.js
function createLogger() {
  function createLogHandler(logger) {
    let log2 = (message, ...args) => logger("Block validation: " + message, ...args);
    if (false) {
      log2 = (...args) => logger(null.format(...args));
    }
    return log2;
  }
  return {
    // eslint-disable-next-line no-console
    error: createLogHandler(console.error),
    // eslint-disable-next-line no-console
    warning: createLogHandler(console.warn),
    getItems() {
      return [];
    }
  };
}
function createQueuedLogger() {
  const queue = [];
  const logger = createLogger();
  return {
    error(...args) {
      queue.push({
        log: logger.error,
        args
      });
    },
    warning(...args) {
      queue.push({
        log: logger.warning,
        args
      });
    },
    getItems() {
      return queue;
    }
  };
}

// ../../node_modules/@wordpress/blocks/build-module/api/validation/index.js
var identity = (x) => x;
var REGEXP_WHITESPACE = /[\t\n\r\v\f ]+/g;
var REGEXP_ONLY_WHITESPACE = /^[\t\n\r\v\f ]*$/;
var REGEXP_STYLE_URL_TYPE = /^url\s*\(['"\s]*(.*?)['"\s]*\)$/;
var BOOLEAN_ATTRIBUTES2 = ["allowfullscreen", "allowpaymentrequest", "allowusermedia", "async", "autofocus", "autoplay", "checked", "controls", "default", "defer", "disabled", "download", "formnovalidate", "hidden", "ismap", "itemscope", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "selected", "typemustmatch"];
var ENUMERATED_ATTRIBUTES2 = ["autocapitalize", "autocomplete", "charset", "contenteditable", "crossorigin", "decoding", "dir", "draggable", "enctype", "formenctype", "formmethod", "http-equiv", "inputmode", "kind", "method", "preload", "scope", "shape", "spellcheck", "translate", "type", "wrap"];
var MEANINGFUL_ATTRIBUTES = [...BOOLEAN_ATTRIBUTES2, ...ENUMERATED_ATTRIBUTES2];
var TEXT_NORMALIZATIONS = [identity, getTextWithCollapsedWhitespace];
var REGEXP_NAMED_CHARACTER_REFERENCE = /^[\da-z]+$/i;
var REGEXP_DECIMAL_CHARACTER_REFERENCE = /^#\d+$/;
var REGEXP_HEXADECIMAL_CHARACTER_REFERENCE = /^#x[\da-f]+$/i;
function isValidCharacterReference(text2) {
  return REGEXP_NAMED_CHARACTER_REFERENCE.test(text2) || REGEXP_DECIMAL_CHARACTER_REFERENCE.test(text2) || REGEXP_HEXADECIMAL_CHARACTER_REFERENCE.test(text2);
}
var DecodeEntityParser = class {
  /**
   * Returns a substitute string for an entity string sequence between `&`
   * and `;`, or undefined if no substitution should occur.
   *
   * @param {string} entity Entity fragment discovered in HTML.
   *
   * @return {string | undefined} Entity substitute value.
   */
  parse(entity) {
    if (isValidCharacterReference(entity)) {
      return decodeEntities("&" + entity + ";");
    }
  }
};
function getTextPiecesSplitOnWhitespace(text2) {
  return text2.trim().split(REGEXP_WHITESPACE);
}
function getTextWithCollapsedWhitespace(text2) {
  return getTextPiecesSplitOnWhitespace(text2).join(" ");
}
function getMeaningfulAttributePairs(token) {
  return token.attributes.filter((pair) => {
    const [key, value] = pair;
    return value || key.indexOf("data-") === 0 || MEANINGFUL_ATTRIBUTES.includes(key);
  });
}
function isEquivalentTextTokens(actual, expected, logger = createLogger()) {
  let actualChars = actual.chars;
  let expectedChars = expected.chars;
  for (let i = 0; i < TEXT_NORMALIZATIONS.length; i++) {
    const normalize = TEXT_NORMALIZATIONS[i];
    actualChars = normalize(actualChars);
    expectedChars = normalize(expectedChars);
    if (actualChars === expectedChars) {
      return true;
    }
  }
  logger.warning("Expected text `%s`, saw `%s`.", expected.chars, actual.chars);
  return false;
}
function getNormalizedLength(value) {
  if (0 === parseFloat(value)) {
    return "0";
  }
  if (value.indexOf(".") === 0) {
    return "0" + value;
  }
  return value;
}
function getNormalizedStyleValue(value) {
  const textPieces = getTextPiecesSplitOnWhitespace(value);
  const normalizedPieces = textPieces.map(getNormalizedLength);
  const result = normalizedPieces.join(" ");
  return result.replace(REGEXP_STYLE_URL_TYPE, "url($1)");
}
function getStyleProperties(text2) {
  const pairs = text2.replace(/;?\s*$/, "").split(";").map((style) => {
    const [key, ...valueParts] = style.split(":");
    const value = valueParts.join(":");
    return [key.trim(), getNormalizedStyleValue(value.trim())];
  });
  return Object.fromEntries(pairs);
}
var isEqualAttributesOfName = {
  class: (actual, expected) => {
    const [actualPieces, expectedPieces] = [actual, expected].map(getTextPiecesSplitOnWhitespace);
    const actualDiff = actualPieces.filter((c) => !expectedPieces.includes(c));
    const expectedDiff = expectedPieces.filter((c) => !actualPieces.includes(c));
    return actualDiff.length === 0 && expectedDiff.length === 0;
  },
  style: (actual, expected) => {
    return (0, import_es6.default)(...[actual, expected].map(getStyleProperties));
  },
  // For each boolean attribute, mere presence of attribute in both is enough
  // to assume equivalence.
  ...Object.fromEntries(BOOLEAN_ATTRIBUTES2.map((attribute) => [attribute, () => true]))
};
function isEqualTagAttributePairs(actual, expected, logger = createLogger()) {
  if (actual.length !== expected.length) {
    logger.warning("Expected attributes %o, instead saw %o.", expected, actual);
    return false;
  }
  const expectedAttributes = {};
  for (let i = 0; i < expected.length; i++) {
    expectedAttributes[expected[i][0].toLowerCase()] = expected[i][1];
  }
  for (let i = 0; i < actual.length; i++) {
    const [name, actualValue] = actual[i];
    const nameLower = name.toLowerCase();
    if (!expectedAttributes.hasOwnProperty(nameLower)) {
      logger.warning("Encountered unexpected attribute `%s`.", name);
      return false;
    }
    const expectedValue = expectedAttributes[nameLower];
    const isEqualAttributes = isEqualAttributesOfName[nameLower];
    if (isEqualAttributes) {
      if (!isEqualAttributes(actualValue, expectedValue)) {
        logger.warning("Expected attribute `%s` of value `%s`, saw `%s`.", name, expectedValue, actualValue);
        return false;
      }
    } else if (actualValue !== expectedValue) {
      logger.warning("Expected attribute `%s` of value `%s`, saw `%s`.", name, expectedValue, actualValue);
      return false;
    }
  }
  return true;
}
var isEqualTokensOfType = {
  StartTag: (actual, expected, logger = createLogger()) => {
    if (actual.tagName !== expected.tagName && // Optimization: Use short-circuit evaluation to defer case-
    // insensitive check on the assumption that the majority case will
    // have exactly equal tag names.
    actual.tagName.toLowerCase() !== expected.tagName.toLowerCase()) {
      logger.warning("Expected tag name `%s`, instead saw `%s`.", expected.tagName, actual.tagName);
      return false;
    }
    return isEqualTagAttributePairs(...[actual, expected].map(getMeaningfulAttributePairs), logger);
  },
  Chars: isEquivalentTextTokens,
  Comment: isEquivalentTextTokens
};
function getNextNonWhitespaceToken(tokens) {
  let token;
  while (token = tokens.shift()) {
    if (token.type !== "Chars") {
      return token;
    }
    if (!REGEXP_ONLY_WHITESPACE.test(token.chars)) {
      return token;
    }
  }
}
function getHTMLTokens(html2, logger = createLogger()) {
  try {
    return new Tokenizer(new DecodeEntityParser()).tokenize(html2);
  } catch (e) {
    logger.warning("Malformed HTML detected: %s", html2);
  }
  return null;
}
function isClosedByToken(currentToken, nextToken2) {
  if (!currentToken.selfClosing) {
    return false;
  }
  if (nextToken2 && nextToken2.tagName === currentToken.tagName && nextToken2.type === "EndTag") {
    return true;
  }
  return false;
}
function isEquivalentHTML(actual, expected, logger = createLogger()) {
  if (actual === expected) {
    return true;
  }
  const [actualTokens, expectedTokens] = [actual, expected].map((html2) => getHTMLTokens(html2, logger));
  if (!actualTokens || !expectedTokens) {
    return false;
  }
  let actualToken, expectedToken;
  while (actualToken = getNextNonWhitespaceToken(actualTokens)) {
    expectedToken = getNextNonWhitespaceToken(expectedTokens);
    if (!expectedToken) {
      logger.warning("Expected end of content, instead saw %o.", actualToken);
      return false;
    }
    if (actualToken.type !== expectedToken.type) {
      logger.warning("Expected token of type `%s` (%o), instead saw `%s` (%o).", expectedToken.type, expectedToken, actualToken.type, actualToken);
      return false;
    }
    const isEqualTokens = isEqualTokensOfType[actualToken.type];
    if (isEqualTokens && !isEqualTokens(actualToken, expectedToken, logger)) {
      return false;
    }
    if (isClosedByToken(actualToken, expectedTokens[0])) {
      getNextNonWhitespaceToken(expectedTokens);
    } else if (isClosedByToken(expectedToken, actualTokens[0])) {
      getNextNonWhitespaceToken(actualTokens);
    }
  }
  if (expectedToken = getNextNonWhitespaceToken(expectedTokens)) {
    logger.warning("Expected %o, instead saw end of content.", expectedToken);
    return false;
  }
  return true;
}
function validateBlock(block, blockTypeOrName = block.name) {
  const isFallbackBlock = block.name === getFreeformContentHandlerName() || block.name === getUnregisteredTypeHandlerName();
  if (isFallbackBlock) {
    return [true, []];
  }
  const logger = createQueuedLogger();
  const blockType = normalizeBlockType(blockTypeOrName);
  let generatedBlockContent;
  try {
    generatedBlockContent = getSaveContent(blockType, block.attributes);
  } catch (error) {
    logger.error("Block validation failed because an error occurred while generating block content:\n\n%s", error.toString());
    return [false, logger.getItems()];
  }
  const isValid = isEquivalentHTML(block.originalContent, generatedBlockContent, logger);
  if (!isValid) {
    logger.error("Block validation failed for `%s` (%o).\n\nContent generated by `save` function:\n\n%s\n\nContent retrieved from post body:\n\n%s", blockType.name, blockType, generatedBlockContent, block.originalContent);
  }
  return [isValid, logger.getItems()];
}
function isValidBlockContent(blockTypeOrName, attributes, originalBlockContent) {
  deprecated("isValidBlockContent introduces opportunity for data loss", {
    since: "12.6",
    plugin: "Gutenberg",
    alternative: "validateBlock"
  });
  const blockType = normalizeBlockType(blockTypeOrName);
  const block = {
    name: blockType.name,
    attributes,
    innerBlocks: [],
    originalContent: originalBlockContent
  };
  const [isValid] = validateBlock(block, blockType);
  return isValid;
}

// ../../node_modules/@wordpress/blocks/build-module/api/parser/convert-legacy-block.js
function convertLegacyBlockNameAndAttributes(name, attributes) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const newAttributes = {
    ...attributes
  };
  if ("core/cover-image" === name) {
    name = "core/cover";
  }
  if ("core/text" === name || "core/cover-text" === name) {
    name = "core/paragraph";
  }
  if (name && name.indexOf("core/social-link-") === 0) {
    newAttributes.service = name.substring(17);
    name = "core/social-link";
  }
  if (name && name.indexOf("core-embed/") === 0) {
    const providerSlug = name.substring(11);
    const deprecated2 = {
      speaker: "speaker-deck",
      polldaddy: "crowdsignal"
    };
    newAttributes.providerNameSlug = providerSlug in deprecated2 ? deprecated2[providerSlug] : providerSlug;
    if (!["amazon-kindle", "wordpress"].includes(providerSlug)) {
      newAttributes.responsive = true;
    }
    name = "core/embed";
  }
  if (name === "core/post-comment-author") {
    name = "core/comment-author-name";
  }
  if (name === "core/post-comment-content") {
    name = "core/comment-content";
  }
  if (name === "core/post-comment-date") {
    name = "core/comment-date";
  }
  if (name === "core/comments-query-loop") {
    name = "core/comments";
    const {
      className = ""
    } = newAttributes;
    if (!className.includes("wp-block-comments-query-loop")) {
      newAttributes.className = ["wp-block-comments-query-loop", className].join(" ");
    }
  }
  if (name === "core/post-comments") {
    name = "core/comments";
    newAttributes.legacy = true;
  }
  if (((_a = attributes.layout) == null ? void 0 : _a.type) === "grid" && typeof ((_b = attributes.layout) == null ? void 0 : _b.columnCount) === "string") {
    newAttributes.layout = {
      ...newAttributes.layout,
      columnCount: parseInt(attributes.layout.columnCount, 10)
    };
  }
  if (typeof ((_d = (_c = attributes.style) == null ? void 0 : _c.layout) == null ? void 0 : _d.columnSpan) === "string") {
    const columnSpanNumber = parseInt(attributes.style.layout.columnSpan, 10);
    newAttributes.style = {
      ...newAttributes.style,
      layout: {
        ...newAttributes.style.layout,
        columnSpan: isNaN(columnSpanNumber) ? void 0 : columnSpanNumber
      }
    };
  }
  if (typeof ((_f = (_e = attributes.style) == null ? void 0 : _e.layout) == null ? void 0 : _f.rowSpan) === "string") {
    const rowSpanNumber = parseInt(attributes.style.layout.rowSpan, 10);
    newAttributes.style = {
      ...newAttributes.style,
      layout: {
        ...newAttributes.style.layout,
        rowSpan: isNaN(rowSpanNumber) ? void 0 : rowSpanNumber
      }
    };
  }
  if (globalThis.IS_GUTENBERG_PLUGIN) {
    if (((_g = newAttributes.metadata) == null ? void 0 : _g.bindings) && (name === "core/paragraph" || name === "core/heading" || name === "core/image" || name === "core/button") && ((_h = newAttributes.metadata.bindings.__default) == null ? void 0 : _h.source) !== "core/pattern-overrides") {
      const bindings = ["content", "url", "title", "id", "alt", "text", "linkTarget"];
      let hasPatternOverrides = false;
      bindings.forEach((binding) => {
        var _a2;
        if (((_a2 = newAttributes.metadata.bindings[binding]) == null ? void 0 : _a2.source) === "core/pattern-overrides") {
          hasPatternOverrides = true;
          newAttributes.metadata = {
            ...newAttributes.metadata,
            bindings: {
              ...newAttributes.metadata.bindings
            }
          };
          delete newAttributes.metadata.bindings[binding];
        }
      });
      if (hasPatternOverrides) {
        newAttributes.metadata.bindings.__default = {
          source: "core/pattern-overrides"
        };
      }
    }
  }
  return [name, newAttributes];
}

// ../../node_modules/hpq/es/get-path.js
function getPath(object, path) {
  var segments = path.split(".");
  var segment;
  while (segment = segments.shift()) {
    if (!(segment in object)) {
      return;
    }
    object = object[segment];
  }
  return object;
}

// ../../node_modules/hpq/es/index.js
var getDocument = /* @__PURE__ */ function() {
  var doc;
  return function() {
    if (!doc) {
      doc = document.implementation.createHTMLDocument("");
    }
    return doc;
  };
}();
function parse2(source, matchers) {
  if (!matchers) {
    return;
  }
  if ("string" === typeof source) {
    var doc = getDocument();
    doc.body.innerHTML = source;
    source = doc.body;
  }
  if (typeof matchers === "function") {
    return matchers(source);
  }
  if (Object !== matchers.constructor) {
    return;
  }
  return Object.keys(matchers).reduce(function(memo2, key) {
    var inner = matchers[key];
    memo2[key] = parse2(source, inner);
    return memo2;
  }, {});
}
function prop(arg1, arg2) {
  var name;
  var selector;
  if (1 === arguments.length) {
    name = arg1;
    selector = void 0;
  } else {
    name = arg2;
    selector = arg1;
  }
  return function(node) {
    var match = node;
    if (selector) {
      match = node.querySelector(selector);
    }
    if (match) {
      return getPath(match, name);
    }
  };
}
function attr(arg1, arg2) {
  var name;
  var selector;
  if (1 === arguments.length) {
    name = arg1;
    selector = void 0;
  } else {
    name = arg2;
    selector = arg1;
  }
  return function(node) {
    var attributes = prop(selector, "attributes")(node);
    if (attributes && Object.prototype.hasOwnProperty.call(attributes, name)) {
      return attributes[name].value;
    }
  };
}
function text(selector) {
  return prop(selector, "textContent");
}
function query(selector, matchers) {
  return function(node) {
    var matches = node.querySelectorAll(selector);
    return [].map.call(matches, function(match) {
      return parse2(match, matchers);
    });
  };
}

// ../../node_modules/@wordpress/blocks/build-module/api/children.js
function getSerializeCapableElement(children) {
  return children;
}
function getChildrenArray(children) {
  deprecated("wp.blocks.children.getChildrenArray", {
    since: "6.1",
    version: "6.3",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  return children;
}
function concat(...blockNodes) {
  deprecated("wp.blocks.children.concat", {
    since: "6.1",
    version: "6.3",
    alternative: "wp.richText.concat",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  const result = [];
  for (let i = 0; i < blockNodes.length; i++) {
    const blockNode = Array.isArray(blockNodes[i]) ? blockNodes[i] : [blockNodes[i]];
    for (let j = 0; j < blockNode.length; j++) {
      const child = blockNode[j];
      const canConcatToPreviousString = typeof child === "string" && typeof result[result.length - 1] === "string";
      if (canConcatToPreviousString) {
        result[result.length - 1] += child;
      } else {
        result.push(child);
      }
    }
  }
  return result;
}
function fromDOM2(domNodes) {
  deprecated("wp.blocks.children.fromDOM", {
    since: "6.1",
    version: "6.3",
    alternative: "wp.richText.create",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  const result = [];
  for (let i = 0; i < domNodes.length; i++) {
    try {
      result.push(fromDOM(domNodes[i]));
    } catch (error) {
    }
  }
  return result;
}
function toHTML(children) {
  deprecated("wp.blocks.children.toHTML", {
    since: "6.1",
    version: "6.3",
    alternative: "wp.richText.toHTMLString",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  const element = getSerializeCapableElement(children);
  return serialize_default(element);
}
function matcher(selector) {
  deprecated("wp.blocks.children.matcher", {
    since: "6.1",
    version: "6.3",
    alternative: "html source",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  return (domNode) => {
    let match = domNode;
    if (selector) {
      match = domNode.querySelector(selector);
    }
    if (match) {
      return fromDOM2(match.childNodes);
    }
    return [];
  };
}
var children_default = {
  concat,
  getChildrenArray,
  fromDOM: fromDOM2,
  toHTML,
  matcher
};

// ../../node_modules/@wordpress/blocks/build-module/api/node.js
function isNodeOfType(node, type) {
  deprecated("wp.blocks.node.isNodeOfType", {
    since: "6.1",
    version: "6.3",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  return node && node.type === type;
}
function getNamedNodeMapAsObject(nodeMap) {
  const result = {};
  for (let i = 0; i < nodeMap.length; i++) {
    const {
      name,
      value
    } = nodeMap[i];
    result[name] = value;
  }
  return result;
}
function fromDOM(domNode) {
  deprecated("wp.blocks.node.fromDOM", {
    since: "6.1",
    version: "6.3",
    alternative: "wp.richText.create",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  if (domNode.nodeType === domNode.TEXT_NODE) {
    return domNode.nodeValue;
  }
  if (domNode.nodeType !== domNode.ELEMENT_NODE) {
    throw new TypeError("A block node can only be created from a node of type text or element.");
  }
  return {
    type: domNode.nodeName.toLowerCase(),
    props: {
      ...getNamedNodeMapAsObject(domNode.attributes),
      children: fromDOM2(domNode.childNodes)
    }
  };
}
function toHTML2(node) {
  deprecated("wp.blocks.node.toHTML", {
    since: "6.1",
    version: "6.3",
    alternative: "wp.richText.toHTMLString",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  return toHTML([node]);
}
function matcher2(selector) {
  deprecated("wp.blocks.node.matcher", {
    since: "6.1",
    version: "6.3",
    alternative: "html source",
    link: "https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/introducing-attributes-and-editable-fields/"
  });
  return (domNode) => {
    let match = domNode;
    if (selector) {
      match = domNode.querySelector(selector);
    }
    try {
      return fromDOM(match);
    } catch (error) {
      return null;
    }
  };
}
var node_default = {
  isNodeOfType,
  fromDOM,
  toHTML: toHTML2,
  matcher: matcher2
};

// ../../node_modules/@wordpress/blocks/build-module/api/matchers.js
function html(selector, multilineTag) {
  return (domNode) => {
    let match = domNode;
    if (selector) {
      match = domNode.querySelector(selector);
    }
    if (!match) {
      return "";
    }
    if (multilineTag) {
      let value = "";
      const length = match.children.length;
      for (let index = 0; index < length; index++) {
        const child = match.children[index];
        if (child.nodeName.toLowerCase() !== multilineTag) {
          continue;
        }
        value += child.outerHTML;
      }
      return value;
    }
    return match.innerHTML;
  };
}
var richText = (selector, preserveWhiteSpace) => (el) => {
  const target = selector ? el.querySelector(selector) : el;
  return target ? RichTextData.fromHTMLElement(target, {
    preserveWhiteSpace
  }) : RichTextData.empty();
};

// ../../node_modules/@wordpress/blocks/build-module/api/parser/get-block-attributes.js
var toBooleanAttributeMatcher = (matcher3) => (value) => matcher3(value) !== void 0;
function isOfType(value, type) {
  switch (type) {
    case "rich-text":
      return value instanceof RichTextData;
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return !!value && value.constructor === Object;
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "integer":
    case "number":
      return typeof value === "number";
  }
  return true;
}
function isOfTypes(value, types) {
  return types.some((type) => isOfType(value, type));
}
function getBlockAttribute(attributeKey, attributeSchema, innerDOM, commentAttributes, innerHTML) {
  let value;
  switch (attributeSchema.source) {
    case void 0:
      value = commentAttributes ? commentAttributes[attributeKey] : void 0;
      break;
    case "raw":
      value = innerHTML;
      break;
    case "attribute":
    case "property":
    case "html":
    case "text":
    case "rich-text":
    case "children":
    case "node":
    case "query":
    case "tag":
      value = parseWithAttributeSchema(innerDOM, attributeSchema);
      break;
  }
  if (!isValidByType(value, attributeSchema.type) || !isValidByEnum(value, attributeSchema.enum)) {
    value = void 0;
  }
  if (value === void 0) {
    value = getDefault(attributeSchema);
  }
  return value;
}
function isValidByType(value, type) {
  return type === void 0 || isOfTypes(value, Array.isArray(type) ? type : [type]);
}
function isValidByEnum(value, enumSet) {
  return !Array.isArray(enumSet) || enumSet.includes(value);
}
var matcherFromSource = memize((sourceConfig) => {
  switch (sourceConfig.source) {
    case "attribute": {
      let matcher3 = attr(sourceConfig.selector, sourceConfig.attribute);
      if (sourceConfig.type === "boolean") {
        matcher3 = toBooleanAttributeMatcher(matcher3);
      }
      return matcher3;
    }
    case "html":
      return html(sourceConfig.selector, sourceConfig.multiline);
    case "text":
      return text(sourceConfig.selector);
    case "rich-text":
      return richText(sourceConfig.selector, sourceConfig.__unstablePreserveWhiteSpace);
    case "children":
      return matcher(sourceConfig.selector);
    case "node":
      return matcher2(sourceConfig.selector);
    case "query":
      const subMatchers = Object.fromEntries(Object.entries(sourceConfig.query).map(([key, subSourceConfig]) => [key, matcherFromSource(subSourceConfig)]));
      return query(sourceConfig.selector, subMatchers);
    case "tag": {
      const matcher3 = prop(sourceConfig.selector, "nodeName");
      return (domNode) => {
        var _a;
        return (_a = matcher3(domNode)) == null ? void 0 : _a.toLowerCase();
      };
    }
    default:
      console.error(`Unknown source type "${sourceConfig.source}"`);
  }
});
function parseHtml(innerHTML) {
  return parse2(innerHTML, (h) => h);
}
function parseWithAttributeSchema(innerHTML, attributeSchema) {
  return matcherFromSource(attributeSchema)(parseHtml(innerHTML));
}
function getBlockAttributes(blockTypeOrName, innerHTML, attributes = {}) {
  var _blockType$attributes;
  const doc = parseHtml(innerHTML);
  const blockType = normalizeBlockType(blockTypeOrName);
  const blockAttributes = Object.fromEntries(Object.entries((_blockType$attributes = blockType.attributes) !== null && _blockType$attributes !== void 0 ? _blockType$attributes : {}).map(([key, schema]) => [key, getBlockAttribute(key, schema, doc, attributes, innerHTML)]));
  return applyFilters("blocks.getBlockAttributes", blockAttributes, blockType, innerHTML, attributes);
}

// ../../node_modules/@wordpress/blocks/build-module/api/parser/fix-custom-classname.js
var CLASS_ATTR_SCHEMA = {
  type: "string",
  source: "attribute",
  selector: "[data-custom-class-name] > *",
  attribute: "class"
};
function getHTMLRootElementClasses(innerHTML) {
  const parsed = parseWithAttributeSchema(`<div data-custom-class-name>${innerHTML}</div>`, CLASS_ATTR_SCHEMA);
  return parsed ? parsed.trim().split(/\s+/) : [];
}
function fixCustomClassname(blockAttributes, blockType, innerHTML) {
  if (!hasBlockSupport(blockType, "customClassName", true)) {
    return blockAttributes;
  }
  const modifiedBlockAttributes = {
    ...blockAttributes
  };
  const {
    className: omittedClassName,
    ...attributesSansClassName
  } = modifiedBlockAttributes;
  const serialized = getSaveContent(blockType, attributesSansClassName);
  const defaultClasses = getHTMLRootElementClasses(serialized);
  const actualClasses = getHTMLRootElementClasses(innerHTML);
  const customClasses = actualClasses.filter((className) => !defaultClasses.includes(className));
  if (customClasses.length) {
    modifiedBlockAttributes.className = customClasses.join(" ");
  } else if (serialized) {
    delete modifiedBlockAttributes.className;
  }
  return modifiedBlockAttributes;
}

// ../../node_modules/@wordpress/blocks/build-module/api/parser/apply-built-in-validation-fixes.js
function applyBuiltInValidationFixes(block, blockType) {
  const updatedBlockAttributes = fixCustomClassname(block.attributes, blockType, block.originalContent);
  return {
    ...block,
    attributes: updatedBlockAttributes
  };
}

// ../../node_modules/@wordpress/blocks/build-module/api/parser/apply-block-deprecated-versions.js
function stubFalse() {
  return false;
}
function applyBlockDeprecatedVersions(block, rawBlock, blockType) {
  const parsedAttributes = rawBlock.attrs;
  const {
    deprecated: deprecatedDefinitions
  } = blockType;
  if (!deprecatedDefinitions || !deprecatedDefinitions.length) {
    return block;
  }
  for (let i = 0; i < deprecatedDefinitions.length; i++) {
    const {
      isEligible = stubFalse
    } = deprecatedDefinitions[i];
    if (block.isValid && !isEligible(parsedAttributes, block.innerBlocks, {
      blockNode: rawBlock,
      block
    })) {
      continue;
    }
    const deprecatedBlockType = Object.assign(omit(blockType, DEPRECATED_ENTRY_KEYS), deprecatedDefinitions[i]);
    let migratedBlock = {
      ...block,
      attributes: getBlockAttributes(deprecatedBlockType, block.originalContent, parsedAttributes)
    };
    let [isValid] = validateBlock(migratedBlock, deprecatedBlockType);
    if (!isValid) {
      migratedBlock = applyBuiltInValidationFixes(migratedBlock, deprecatedBlockType);
      [isValid] = validateBlock(migratedBlock, deprecatedBlockType);
    }
    if (!isValid) {
      continue;
    }
    let migratedInnerBlocks = migratedBlock.innerBlocks;
    let migratedAttributes = migratedBlock.attributes;
    const {
      migrate
    } = deprecatedBlockType;
    if (migrate) {
      let migrated = migrate(migratedAttributes, block.innerBlocks);
      if (!Array.isArray(migrated)) {
        migrated = [migrated];
      }
      [migratedAttributes = parsedAttributes, migratedInnerBlocks = block.innerBlocks] = migrated;
    }
    block = {
      ...block,
      attributes: migratedAttributes,
      innerBlocks: migratedInnerBlocks,
      isValid: true,
      validationIssues: []
    };
  }
  return block;
}

// ../../node_modules/@wordpress/blocks/build-module/api/parser/index.js
function convertLegacyBlocks(rawBlock) {
  const [correctName, correctedAttributes] = convertLegacyBlockNameAndAttributes(rawBlock.blockName, rawBlock.attrs);
  return {
    ...rawBlock,
    blockName: correctName,
    attrs: correctedAttributes
  };
}
function normalizeRawBlock(rawBlock, options) {
  const fallbackBlockName = getFreeformContentHandlerName();
  const rawBlockName = rawBlock.blockName || getFreeformContentHandlerName();
  const rawAttributes = rawBlock.attrs || {};
  const rawInnerBlocks = rawBlock.innerBlocks || [];
  let rawInnerHTML = rawBlock.innerHTML.trim();
  if (rawBlockName === fallbackBlockName && rawBlockName === "core/freeform" && !(options == null ? void 0 : options.__unstableSkipAutop)) {
    rawInnerHTML = autop(rawInnerHTML).trim();
  }
  return {
    ...rawBlock,
    blockName: rawBlockName,
    attrs: rawAttributes,
    innerHTML: rawInnerHTML,
    innerBlocks: rawInnerBlocks
  };
}
function createMissingBlockType(rawBlock) {
  const unregisteredFallbackBlock = getUnregisteredTypeHandlerName() || getFreeformContentHandlerName();
  const originalUndelimitedContent = serializeRawBlock(rawBlock, {
    isCommentDelimited: false
  });
  const originalContent = serializeRawBlock(rawBlock, {
    isCommentDelimited: true
  });
  return {
    blockName: unregisteredFallbackBlock,
    attrs: {
      originalName: rawBlock.blockName,
      originalContent,
      originalUndelimitedContent
    },
    innerHTML: rawBlock.blockName ? originalContent : rawBlock.innerHTML,
    innerBlocks: rawBlock.innerBlocks,
    innerContent: rawBlock.innerContent
  };
}
function applyBlockValidation(unvalidatedBlock, blockType) {
  const [isValid] = validateBlock(unvalidatedBlock, blockType);
  if (isValid) {
    return {
      ...unvalidatedBlock,
      isValid,
      validationIssues: []
    };
  }
  const fixedBlock = applyBuiltInValidationFixes(unvalidatedBlock, blockType);
  const [isFixedValid, validationIssues] = validateBlock(fixedBlock, blockType);
  return {
    ...fixedBlock,
    isValid: isFixedValid,
    validationIssues
  };
}
function parseRawBlock(rawBlock, options) {
  let normalizedBlock = normalizeRawBlock(rawBlock, options);
  normalizedBlock = convertLegacyBlocks(normalizedBlock);
  let blockType = getBlockType(normalizedBlock.blockName);
  if (!blockType) {
    normalizedBlock = createMissingBlockType(normalizedBlock);
    blockType = getBlockType(normalizedBlock.blockName);
  }
  const isFallbackBlock = normalizedBlock.blockName === getFreeformContentHandlerName() || normalizedBlock.blockName === getUnregisteredTypeHandlerName();
  if (!blockType || !normalizedBlock.innerHTML && isFallbackBlock) {
    return;
  }
  const parsedInnerBlocks = normalizedBlock.innerBlocks.map((innerBlock) => parseRawBlock(innerBlock, options)).filter((innerBlock) => !!innerBlock);
  const parsedBlock = createBlock(normalizedBlock.blockName, getBlockAttributes(blockType, normalizedBlock.innerHTML, normalizedBlock.attrs), parsedInnerBlocks);
  parsedBlock.originalContent = normalizedBlock.innerHTML;
  const validatedBlock = applyBlockValidation(parsedBlock, blockType);
  const {
    validationIssues
  } = validatedBlock;
  const updatedBlock = applyBlockDeprecatedVersions(validatedBlock, normalizedBlock, blockType);
  if (!updatedBlock.isValid) {
    updatedBlock.__unstableBlockSource = rawBlock;
  }
  if (!validatedBlock.isValid && updatedBlock.isValid && !(options == null ? void 0 : options.__unstableSkipMigrationLogs)) {
    console.groupCollapsed("Updated Block: %s", blockType.name);
    console.info("Block successfully updated for `%s` (%o).\n\nNew content generated by `save` function:\n\n%s\n\nContent retrieved from post body:\n\n%s", blockType.name, blockType, getSaveContent(blockType, updatedBlock.attributes), updatedBlock.originalContent);
    console.groupEnd();
  } else if (!validatedBlock.isValid && !updatedBlock.isValid) {
    validationIssues.forEach(({
      log: log2,
      args
    }) => log2(...args));
  }
  return updatedBlock;
}
function parse3(content, options) {
  return parse(content).reduce((accumulator, rawBlock) => {
    const block = parseRawBlock(rawBlock, options);
    if (block) {
      accumulator.push(block);
    }
    return accumulator;
  }, []);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/get-raw-transforms.js
function getRawTransforms() {
  return getBlockTransforms("from").filter(({
    type
  }) => type === "raw").map((transform) => {
    return transform.isMatch ? transform : {
      ...transform,
      isMatch: (node) => transform.selector && node.matches(transform.selector)
    };
  });
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/html-to-blocks.js
function htmlToBlocks(html2, handler) {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html2;
  return Array.from(doc.body.children).flatMap((node) => {
    const rawTransform = findTransform(getRawTransforms(), ({
      isMatch
    }) => isMatch(node));
    if (!rawTransform) {
      if (platform_default.isNative) {
        return parse3(`<!-- wp:html -->${node.outerHTML}<!-- /wp:html -->`);
      }
      return createBlock(
        // Should not be hardcoded.
        "core/html",
        getBlockAttributes("core/html", node.outerHTML)
      );
    }
    const {
      transform,
      blockName
    } = rawTransform;
    if (transform) {
      const block = transform(node, handler);
      if (node.hasAttribute("class")) {
        block.attributes.className = node.getAttribute("class");
      }
      return block;
    }
    return createBlock(blockName, getBlockAttributes(blockName, node.outerHTML));
  });
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/normalise-blocks.js
function normaliseBlocks(HTML, options = {}) {
  const decuDoc = document.implementation.createHTMLDocument("");
  const accuDoc = document.implementation.createHTMLDocument("");
  const decu = decuDoc.body;
  const accu = accuDoc.body;
  decu.innerHTML = HTML;
  while (decu.firstChild) {
    const node = decu.firstChild;
    if (node.nodeType === node.TEXT_NODE) {
      if (isEmpty(node)) {
        decu.removeChild(node);
      } else {
        if (!accu.lastChild || accu.lastChild.nodeName !== "P") {
          accu.appendChild(accuDoc.createElement("P"));
        }
        accu.lastChild.appendChild(node);
      }
    } else if (node.nodeType === node.ELEMENT_NODE) {
      if (node.nodeName === "BR") {
        if (node.nextSibling && node.nextSibling.nodeName === "BR") {
          accu.appendChild(accuDoc.createElement("P"));
          decu.removeChild(node.nextSibling);
        }
        if (accu.lastChild && accu.lastChild.nodeName === "P" && accu.lastChild.hasChildNodes()) {
          accu.lastChild.appendChild(node);
        } else {
          decu.removeChild(node);
        }
      } else if (node.nodeName === "P") {
        if (isEmpty(node) && !options.raw) {
          decu.removeChild(node);
        } else {
          accu.appendChild(node);
        }
      } else if (isPhrasingContent(node)) {
        if (!accu.lastChild || accu.lastChild.nodeName !== "P") {
          accu.appendChild(accuDoc.createElement("P"));
        }
        accu.lastChild.appendChild(node);
      } else {
        accu.appendChild(node);
      }
    } else {
      decu.removeChild(node);
    }
  }
  return accu.innerHTML;
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/special-comment-converter.js
function specialCommentConverter(node, doc) {
  if (node.nodeType !== node.COMMENT_NODE) {
    return;
  }
  if (node.nodeValue !== "nextpage" && node.nodeValue.indexOf("more") !== 0) {
    return;
  }
  const block = createBlock2(node, doc);
  if (!node.parentNode || node.parentNode.nodeName !== "P") {
    replace(node, block);
  } else {
    const childNodes = Array.from(node.parentNode.childNodes);
    const nodeIndex = childNodes.indexOf(node);
    const wrapperNode = node.parentNode.parentNode || doc.body;
    const paragraphBuilder = (acc, child) => {
      if (!acc) {
        acc = doc.createElement("p");
      }
      acc.appendChild(child);
      return acc;
    };
    [childNodes.slice(0, nodeIndex).reduce(paragraphBuilder, null), block, childNodes.slice(nodeIndex + 1).reduce(paragraphBuilder, null)].forEach((element) => element && wrapperNode.insertBefore(element, node.parentNode));
    remove(node.parentNode);
  }
}
function createBlock2(commentNode, doc) {
  if (commentNode.nodeValue === "nextpage") {
    return createNextpage(doc);
  }
  const customText = commentNode.nodeValue.slice(4).trim();
  let sibling = commentNode;
  let noTeaser = false;
  while (sibling = sibling.nextSibling) {
    if (sibling.nodeType === sibling.COMMENT_NODE && sibling.nodeValue === "noteaser") {
      noTeaser = true;
      remove(sibling);
      break;
    }
  }
  return createMore(customText, noTeaser, doc);
}
function createMore(customText, noTeaser, doc) {
  const node = doc.createElement("wp-block");
  node.dataset.block = "core/more";
  if (customText) {
    node.dataset.customText = customText;
  }
  if (noTeaser) {
    node.dataset.noTeaser = "";
  }
  return node;
}
function createNextpage(doc) {
  const node = doc.createElement("wp-block");
  node.dataset.block = "core/nextpage";
  return node;
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/list-reducer.js
function isList(node) {
  return node.nodeName === "OL" || node.nodeName === "UL";
}
function shallowTextContent(element) {
  return Array.from(element.childNodes).map(({
    nodeValue = ""
  }) => nodeValue).join("");
}
function listReducer(node) {
  if (!isList(node)) {
    return;
  }
  const list = node;
  const prevElement = node.previousElementSibling;
  if (prevElement && prevElement.nodeName === node.nodeName && list.children.length === 1) {
    while (list.firstChild) {
      prevElement.appendChild(list.firstChild);
    }
    list.parentNode.removeChild(list);
  }
  const parentElement = node.parentNode;
  if (parentElement && parentElement.nodeName === "LI" && parentElement.children.length === 1 && !/\S/.test(shallowTextContent(parentElement))) {
    const parentListItem = parentElement;
    const prevListItem = parentListItem.previousElementSibling;
    const parentList = parentListItem.parentNode;
    if (prevListItem) {
      prevListItem.appendChild(list);
      parentList.removeChild(parentListItem);
    }
  }
  if (parentElement && isList(parentElement)) {
    const prevListItem = node.previousElementSibling;
    if (prevListItem) {
      prevListItem.appendChild(node);
    } else {
      unwrap(node);
    }
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/blockquote-normaliser.js
function blockquoteNormaliser(options) {
  return (node) => {
    if (node.nodeName !== "BLOCKQUOTE") {
      return;
    }
    node.innerHTML = normaliseBlocks(node.innerHTML, options);
  };
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/figure-content-reducer.js
function isFigureContent(node, schema) {
  var _a;
  var _schema$figure$childr;
  const tag = node.nodeName.toLowerCase();
  if (tag === "figcaption" || isTextContent(node)) {
    return false;
  }
  return tag in ((_schema$figure$childr = (_a = schema == null ? void 0 : schema.figure) == null ? void 0 : _a.children) !== null && _schema$figure$childr !== void 0 ? _schema$figure$childr : {});
}
function canHaveAnchor(node, schema) {
  var _a, _b, _c;
  var _schema$figure$childr2;
  const tag = node.nodeName.toLowerCase();
  return tag in ((_schema$figure$childr2 = (_c = (_b = (_a = schema == null ? void 0 : schema.figure) == null ? void 0 : _a.children) == null ? void 0 : _b.a) == null ? void 0 : _c.children) !== null && _schema$figure$childr2 !== void 0 ? _schema$figure$childr2 : {});
}
function wrapFigureContent(element, beforeElement = element) {
  const figure = element.ownerDocument.createElement("figure");
  beforeElement.parentNode.insertBefore(figure, beforeElement);
  figure.appendChild(element);
}
function figureContentReducer(node, doc, schema) {
  if (!isFigureContent(node, schema)) {
    return;
  }
  let nodeToInsert = node;
  const parentNode = node.parentNode;
  if (canHaveAnchor(node, schema) && parentNode.nodeName === "A" && parentNode.childNodes.length === 1) {
    nodeToInsert = node.parentNode;
  }
  const wrapper = nodeToInsert.closest("p,div");
  if (wrapper) {
    if (!node.classList) {
      wrapFigureContent(nodeToInsert, wrapper);
    } else if (node.classList.contains("alignright") || node.classList.contains("alignleft") || node.classList.contains("aligncenter") || !wrapper.textContent.trim()) {
      wrapFigureContent(nodeToInsert, wrapper);
    }
  } else {
    wrapFigureContent(nodeToInsert);
  }
}

// ../../node_modules/@wordpress/shortcode/build-module/index.js
function next(tag, text2, index = 0) {
  const re = regexp(tag);
  re.lastIndex = index;
  const match = re.exec(text2);
  if (!match) {
    return;
  }
  if ("[" === match[1] && "]" === match[7]) {
    return next(tag, text2, re.lastIndex);
  }
  const result = {
    index: match.index,
    content: match[0],
    shortcode: fromMatch(match)
  };
  if (match[1]) {
    result.content = result.content.slice(1);
    result.index++;
  }
  if (match[7]) {
    result.content = result.content.slice(0, -1);
  }
  return result;
}
function replace2(tag, text2, callback) {
  return text2.replace(regexp(tag), function(match, left, $3, attrs2, slash, content, closing, right) {
    if (left === "[" && right === "]") {
      return match;
    }
    const result = callback(fromMatch(arguments));
    return result || result === "" ? left + result + right : match;
  });
}
function string(options) {
  return new shortcode(options).string();
}
function regexp(tag) {
  return new RegExp("\\[(\\[?)(" + tag + ")(?![\\w-])([^\\]\\/]*(?:\\/(?!\\])[^\\]\\/]*)*?)(?:(\\/)\\]|\\](?:([^\\[]*(?:\\[(?!\\/\\2\\])[^\\[]*)*)(\\[\\/\\2\\]))?)(\\]?)", "g");
}
var attrs = memize((text2) => {
  const named = {};
  const numeric = [];
  const pattern = /([\w-]+)\s*=\s*"([^"]*)"(?:\s|$)|([\w-]+)\s*=\s*'([^']*)'(?:\s|$)|([\w-]+)\s*=\s*([^\s'"]+)(?:\s|$)|"([^"]*)"(?:\s|$)|'([^']*)'(?:\s|$)|(\S+)(?:\s|$)/g;
  text2 = text2.replace(/[\u00a0\u200b]/g, " ");
  let match;
  while (match = pattern.exec(text2)) {
    if (match[1]) {
      named[match[1].toLowerCase()] = match[2];
    } else if (match[3]) {
      named[match[3].toLowerCase()] = match[4];
    } else if (match[5]) {
      named[match[5].toLowerCase()] = match[6];
    } else if (match[7]) {
      numeric.push(match[7]);
    } else if (match[8]) {
      numeric.push(match[8]);
    } else if (match[9]) {
      numeric.push(match[9]);
    }
  }
  return {
    named,
    numeric
  };
});
function fromMatch(match) {
  let type;
  if (match[4]) {
    type = "self-closing";
  } else if (match[6]) {
    type = "closed";
  } else {
    type = "single";
  }
  return new shortcode({
    tag: match[2],
    attrs: match[3],
    type,
    content: match[5]
  });
}
var shortcode = Object.assign(function(options) {
  const {
    tag,
    attrs: attributes,
    type,
    content
  } = options || {};
  Object.assign(this, {
    tag,
    type,
    content
  });
  this.attrs = {
    named: {},
    numeric: []
  };
  if (!attributes) {
    return;
  }
  const attributeTypes = ["named", "numeric"];
  if (typeof attributes === "string") {
    this.attrs = attrs(attributes);
  } else if (attributes.length === attributeTypes.length && attributeTypes.every((t, key) => t === attributes[key])) {
    this.attrs = attributes;
  } else {
    Object.entries(attributes).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
}, {
  next,
  replace: replace2,
  string,
  regexp,
  attrs,
  fromMatch
});
Object.assign(shortcode.prototype, {
  /**
   * Get a shortcode attribute.
   *
   * Automatically detects whether `attr` is named or numeric and routes it
   * accordingly.
   *
   * @param {(number|string)} attr Attribute key.
   *
   * @return {string} Attribute value.
   */
  get(attr2) {
    return this.attrs[typeof attr2 === "number" ? "numeric" : "named"][attr2];
  },
  /**
   * Set a shortcode attribute.
   *
   * Automatically detects whether `attr` is named or numeric and routes it
   * accordingly.
   *
   * @param {(number|string)} attr  Attribute key.
   * @param {string}          value Attribute value.
   *
   * @return {InstanceType< import('./types').shortcode >} Shortcode instance.
   */
  set(attr2, value) {
    this.attrs[typeof attr2 === "number" ? "numeric" : "named"][attr2] = value;
    return this;
  },
  /**
   * Transform the shortcode into a string.
   *
   * @return {string} String representation of the shortcode.
   */
  string() {
    let text2 = "[" + this.tag;
    this.attrs.numeric.forEach((value) => {
      if (/\s/.test(value)) {
        text2 += ' "' + value + '"';
      } else {
        text2 += " " + value;
      }
    });
    Object.entries(this.attrs.named).forEach(([name, value]) => {
      text2 += " " + name + '="' + value + '"';
    });
    if ("single" === this.type) {
      return text2 + "]";
    } else if ("self-closing" === this.type) {
      return text2 + " /]";
    }
    text2 += "]";
    if (this.content) {
      text2 += this.content;
    }
    return text2 + "[/" + this.tag + "]";
  }
});

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/shortcode-converter.js
var castArray = (maybeArray) => Array.isArray(maybeArray) ? maybeArray : [maybeArray];
var beforeLineRegexp = /(\n|<p>)\s*$/;
var afterLineRegexp = /^\s*(\n|<\/p>)/;
function segmentHTMLToShortcodeBlock(HTML, lastIndex = 0, excludedBlockNames = []) {
  var _a;
  const transformsFrom = getBlockTransforms("from");
  const transformation = findTransform(transformsFrom, (transform) => excludedBlockNames.indexOf(transform.blockName) === -1 && transform.type === "shortcode" && castArray(transform.tag).some((tag) => regexp(tag).test(HTML)));
  if (!transformation) {
    return [HTML];
  }
  const transformTags = castArray(transformation.tag);
  const transformTag = transformTags.find((tag) => regexp(tag).test(HTML));
  let match;
  const previousIndex = lastIndex;
  if (match = next(transformTag, HTML, lastIndex)) {
    lastIndex = match.index + match.content.length;
    const beforeHTML = HTML.substr(0, match.index);
    const afterHTML = HTML.substr(lastIndex);
    if (!((_a = match.shortcode.content) == null ? void 0 : _a.includes("<")) && !(beforeLineRegexp.test(beforeHTML) && afterLineRegexp.test(afterHTML))) {
      return segmentHTMLToShortcodeBlock(HTML, lastIndex);
    }
    if (transformation.isMatch && !transformation.isMatch(match.shortcode.attrs)) {
      return segmentHTMLToShortcodeBlock(HTML, previousIndex, [...excludedBlockNames, transformation.blockName]);
    }
    let blocks = [];
    if (typeof transformation.transform === "function") {
      blocks = [].concat(transformation.transform(match.shortcode.attrs, match));
      blocks = blocks.map((block) => {
        block.originalContent = match.shortcode.content;
        return applyBuiltInValidationFixes(block, getBlockType(block.name));
      });
    } else {
      const attributes = Object.fromEntries(Object.entries(transformation.attributes).filter(([, schema]) => schema.shortcode).map(([key, schema]) => [key, schema.shortcode(match.shortcode.attrs, match)]));
      const blockType = getBlockType(transformation.blockName);
      if (!blockType) {
        return [HTML];
      }
      const transformationBlockType = {
        ...blockType,
        attributes: transformation.attributes
      };
      let block = createBlock(transformation.blockName, getBlockAttributes(transformationBlockType, match.shortcode.content, attributes));
      block.originalContent = match.shortcode.content;
      block = applyBuiltInValidationFixes(block, transformationBlockType);
      blocks = [block];
    }
    return [...segmentHTMLToShortcodeBlock(beforeHTML.replace(beforeLineRegexp, "")), ...blocks, ...segmentHTMLToShortcodeBlock(afterHTML.replace(afterLineRegexp, ""))];
  }
  return [HTML];
}
var shortcode_converter_default = segmentHTMLToShortcodeBlock;

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/utils.js
function getBlockContentSchemaFromTransforms(transforms, context) {
  const phrasingContentSchema = getPhrasingContentSchema(context);
  const schemaArgs = {
    phrasingContentSchema,
    isPaste: context === "paste"
  };
  const schemas = transforms.map(({
    isMatch,
    blockName,
    schema
  }) => {
    const hasAnchorSupport = hasBlockSupport(blockName, "anchor");
    schema = typeof schema === "function" ? schema(schemaArgs) : schema;
    if (!hasAnchorSupport && !isMatch) {
      return schema;
    }
    if (!schema) {
      return {};
    }
    return Object.fromEntries(Object.entries(schema).map(([key, value]) => {
      let attributes = value.attributes || [];
      if (hasAnchorSupport) {
        attributes = [...attributes, "id"];
      }
      return [key, {
        ...value,
        attributes,
        isMatch: isMatch ? isMatch : void 0
      }];
    }));
  });
  function mergeTagNameSchemaProperties(objValue, srcValue, key) {
    switch (key) {
      case "children": {
        if (objValue === "*" || srcValue === "*") {
          return "*";
        }
        return {
          ...objValue,
          ...srcValue
        };
      }
      case "attributes":
      case "require": {
        return [...objValue || [], ...srcValue || []];
      }
      case "isMatch": {
        if (!objValue || !srcValue) {
          return void 0;
        }
        return (...args) => {
          return objValue(...args) || srcValue(...args);
        };
      }
    }
  }
  function mergeTagNameSchemas(a, b) {
    for (const key in b) {
      a[key] = a[key] ? mergeTagNameSchemaProperties(a[key], b[key], key) : {
        ...b[key]
      };
    }
    return a;
  }
  function mergeSchemas(a, b) {
    for (const key in b) {
      a[key] = a[key] ? mergeTagNameSchemas(a[key], b[key]) : {
        ...b[key]
      };
    }
    return a;
  }
  return schemas.reduce(mergeSchemas, {});
}
function getBlockContentSchema(context) {
  return getBlockContentSchemaFromTransforms(getRawTransforms(), context);
}
function isPlain(HTML) {
  return !/<(?!br[ />])/i.test(HTML);
}
function deepFilterNodeList(nodeList, filters, doc, schema) {
  Array.from(nodeList).forEach((node) => {
    deepFilterNodeList(node.childNodes, filters, doc, schema);
    filters.forEach((item) => {
      if (!doc.contains(node)) {
        return;
      }
      item(node, doc, schema);
    });
  });
}
function deepFilterHTML(HTML, filters = [], schema) {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = HTML;
  deepFilterNodeList(doc.body.childNodes, filters, doc, schema);
  return doc.body.innerHTML;
}
function getSibling(node, which) {
  const sibling = node[`${which}Sibling`];
  if (sibling && isPhrasingContent(sibling)) {
    return sibling;
  }
  const {
    parentNode
  } = node;
  if (!parentNode || !isPhrasingContent(parentNode)) {
    return;
  }
  return getSibling(parentNode, which);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/comment-remover.js
function commentRemover(node) {
  if (node.nodeType === node.COMMENT_NODE) {
    remove(node);
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/is-inline-content.js
function isInline(node, contextTag) {
  if (isTextContent(node)) {
    return true;
  }
  if (!contextTag) {
    return false;
  }
  const tag = node.nodeName.toLowerCase();
  const inlineAllowedTagGroups = [["ul", "li", "ol"], ["h1", "h2", "h3", "h4", "h5", "h6"]];
  return inlineAllowedTagGroups.some((tagGroup) => [tag, contextTag].filter((t) => !tagGroup.includes(t)).length === 0);
}
function deepCheck(nodes, contextTag) {
  return nodes.every((node) => isInline(node, contextTag) && deepCheck(Array.from(node.children), contextTag));
}
function isDoubleBR(node) {
  return node.nodeName === "BR" && node.previousSibling && node.previousSibling.nodeName === "BR";
}
function isInlineContent(HTML, contextTag) {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = HTML;
  const nodes = Array.from(doc.body.children);
  return !nodes.some(isDoubleBR) && deepCheck(nodes, contextTag);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/phrasing-content-reducer.js
function phrasingContentReducer(node, doc) {
  if (node.nodeName === "SPAN" && node.style) {
    const {
      fontWeight,
      fontStyle,
      textDecorationLine,
      textDecoration,
      verticalAlign
    } = node.style;
    if (fontWeight === "bold" || fontWeight === "700") {
      wrap(doc.createElement("strong"), node);
    }
    if (fontStyle === "italic") {
      wrap(doc.createElement("em"), node);
    }
    if (textDecorationLine === "line-through" || textDecoration.includes("line-through")) {
      wrap(doc.createElement("s"), node);
    }
    if (verticalAlign === "super") {
      wrap(doc.createElement("sup"), node);
    } else if (verticalAlign === "sub") {
      wrap(doc.createElement("sub"), node);
    }
  } else if (node.nodeName === "B") {
    node = replaceTag(node, "strong");
  } else if (node.nodeName === "I") {
    node = replaceTag(node, "em");
  } else if (node.nodeName === "A") {
    if (node.target && node.target.toLowerCase() === "_blank") {
      node.rel = "noreferrer noopener";
    } else {
      node.removeAttribute("target");
      node.removeAttribute("rel");
    }
    if (node.name && !node.id) {
      node.id = node.name;
    }
    if (node.id && !node.ownerDocument.querySelector(`[href="#${node.id}"]`)) {
      node.removeAttribute("id");
    }
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/head-remover.js
function headRemover(node) {
  if (node.nodeName !== "SCRIPT" && node.nodeName !== "NOSCRIPT" && node.nodeName !== "TEMPLATE" && node.nodeName !== "STYLE") {
    return;
  }
  node.parentNode.removeChild(node);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/ms-list-ignore.js
function msListIgnore(node) {
  if (node.nodeType !== node.ELEMENT_NODE) {
    return;
  }
  const style = node.getAttribute("style");
  if (!style || !style.includes("mso-list")) {
    return;
  }
  const rules = style.split(";").reduce((acc, rule) => {
    const [key, value] = rule.split(":");
    if (key && value) {
      acc[key.trim().toLowerCase()] = value.trim().toLowerCase();
    }
    return acc;
  }, {});
  if (rules["mso-list"] === "ignore") {
    node.remove();
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/ms-list-converter.js
function isList2(node) {
  return node.nodeName === "OL" || node.nodeName === "UL";
}
function msListConverter(node, doc) {
  if (node.nodeName !== "P") {
    return;
  }
  const style = node.getAttribute("style");
  if (!style || !style.includes("mso-list")) {
    return;
  }
  const prevNode = node.previousElementSibling;
  if (!prevNode || !isList2(prevNode)) {
    const type = node.textContent.trim().slice(0, 1);
    const isNumeric = /[1iIaA]/.test(type);
    const newListNode = doc.createElement(isNumeric ? "ol" : "ul");
    if (isNumeric) {
      newListNode.setAttribute("type", type);
    }
    node.parentNode.insertBefore(newListNode, node);
  }
  const listNode = node.previousElementSibling;
  const listType = listNode.nodeName;
  const listItem = doc.createElement("li");
  let receivingNode = listNode;
  listItem.innerHTML = deepFilterHTML(node.innerHTML, [msListIgnore]);
  const matches = /mso-list\s*:[^;]+level([0-9]+)/i.exec(style);
  let level = matches ? parseInt(matches[1], 10) - 1 || 0 : 0;
  while (level--) {
    receivingNode = receivingNode.lastChild || receivingNode;
    if (isList2(receivingNode)) {
      receivingNode = receivingNode.lastChild || receivingNode;
    }
  }
  if (!isList2(receivingNode)) {
    receivingNode = receivingNode.appendChild(doc.createElement(listType));
  }
  receivingNode.appendChild(listItem);
  node.parentNode.removeChild(node);
}

// ../../node_modules/@wordpress/blob/build-module/index.js
var cache = {};
function createBlobURL(file) {
  const url = window.URL.createObjectURL(file);
  cache[url] = file;
  return url;
}
function isBlobURL(url) {
  if (!url || !url.indexOf) {
    return false;
  }
  return url.indexOf("blob:") === 0;
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/image-corrector.js
function imageCorrector(node) {
  if (node.nodeName !== "IMG") {
    return;
  }
  if (node.src.indexOf("file:") === 0) {
    node.src = "";
  }
  if (node.src.indexOf("data:") === 0) {
    const [properties, data] = node.src.split(",");
    const [type] = properties.slice(5).split(";");
    if (!data || !type) {
      node.src = "";
      return;
    }
    let decoded;
    try {
      decoded = atob(data);
    } catch (e) {
      node.src = "";
      return;
    }
    const uint8Array = new Uint8Array(decoded.length);
    for (let i = 0; i < uint8Array.length; i++) {
      uint8Array[i] = decoded.charCodeAt(i);
    }
    const name = type.replace("/", ".");
    const file = new window.File([uint8Array], name, {
      type
    });
    node.src = createBlobURL(file);
  }
  if (node.height === 1 || node.width === 1) {
    node.parentNode.removeChild(node);
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/div-normaliser.js
function divNormaliser(node) {
  if (node.nodeName !== "DIV") {
    return;
  }
  node.innerHTML = normaliseBlocks(node.innerHTML);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/markdown-converter.js
var import_showdown = __toESM(require_showdown());
var converter = new import_showdown.default.Converter({
  noHeaderId: true,
  tables: true,
  literalMidWordUnderscores: true,
  omitExtraWLInCodeBlocks: true,
  simpleLineBreaks: true,
  strikethrough: true
});
function slackMarkdownVariantCorrector(text2) {
  return text2.replace(/((?:^|\n)```)([^\n`]+)(```(?:$|\n))/, (match, p1, p2, p3) => `${p1}
${p2}
${p3}`);
}
function bulletsToAsterisks(text2) {
  return text2.replace(/(^|\n)•( +)/g, "$1*$2");
}
function markdownConverter(text2) {
  return converter.makeHtml(slackMarkdownVariantCorrector(bulletsToAsterisks(text2)));
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/iframe-remover.js
function iframeRemover(node) {
  if (node.nodeName === "IFRAME") {
    const text2 = node.ownerDocument.createTextNode(node.src);
    node.parentNode.replaceChild(text2, node);
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/google-docs-uid-remover.js
function googleDocsUIdRemover(node) {
  if (!node.id || node.id.indexOf("docs-internal-guid-") !== 0) {
    return;
  }
  if (node.tagName === "B") {
    unwrap(node);
  } else {
    node.removeAttribute("id");
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/html-formatting-remover.js
function isFormattingSpace(character) {
  return character === " " || character === "\r" || character === "\n" || character === "	";
}
function htmlFormattingRemover(node) {
  if (node.nodeType !== node.TEXT_NODE) {
    return;
  }
  let parent = node;
  while (parent = parent.parentNode) {
    if (parent.nodeType === parent.ELEMENT_NODE && parent.nodeName === "PRE") {
      return;
    }
  }
  let newData = node.data.replace(/[ \r\n\t]+/g, " ");
  if (newData[0] === " ") {
    const previousSibling = getSibling(node, "previous");
    if (!previousSibling || previousSibling.nodeName === "BR" || previousSibling.textContent.slice(-1) === " ") {
      newData = newData.slice(1);
    }
  }
  if (newData[newData.length - 1] === " ") {
    const nextSibling = getSibling(node, "next");
    if (!nextSibling || nextSibling.nodeName === "BR" || nextSibling.nodeType === nextSibling.TEXT_NODE && isFormattingSpace(nextSibling.textContent[0])) {
      newData = newData.slice(0, -1);
    }
  }
  if (!newData) {
    node.parentNode.removeChild(node);
  } else {
    node.data = newData;
  }
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/br-remover.js
function brRemover(node) {
  if (node.nodeName !== "BR") {
    return;
  }
  if (getSibling(node, "next")) {
    return;
  }
  node.parentNode.removeChild(node);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/empty-paragraph-remover.js
function emptyParagraphRemover(node) {
  if (node.nodeName !== "P") {
    return;
  }
  if (node.hasChildNodes()) {
    return;
  }
  node.parentNode.removeChild(node);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/slack-paragraph-corrector.js
function slackParagraphCorrector(node) {
  if (node.nodeName !== "SPAN") {
    return;
  }
  if (node.getAttribute("data-stringify-type") !== "paragraph-break") {
    return;
  }
  const {
    parentNode
  } = node;
  parentNode.insertBefore(node.ownerDocument.createElement("br"), node);
  parentNode.insertBefore(node.ownerDocument.createElement("br"), node);
  parentNode.removeChild(node);
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/paste-handler.js
var log = (...args) => {
  var _a, _b;
  return (_b = (_a = window == null ? void 0 : window.console) == null ? void 0 : _a.log) == null ? void 0 : _b.call(_a, ...args);
};
function filterInlineHTML(HTML) {
  HTML = deepFilterHTML(HTML, [headRemover, googleDocsUIdRemover, msListIgnore, phrasingContentReducer, commentRemover]);
  HTML = removeInvalidHTML(HTML, getPhrasingContentSchema("paste"), {
    inline: true
  });
  HTML = deepFilterHTML(HTML, [htmlFormattingRemover, brRemover]);
  log("Processed inline HTML:\n\n", HTML);
  return HTML;
}
function pasteHandler({
  HTML = "",
  plainText = "",
  mode = "AUTO",
  tagName
}) {
  HTML = HTML.replace(/<meta[^>]+>/g, "");
  HTML = HTML.replace(/^\s*<html[^>]*>\s*<body[^>]*>(?:\s*<!--\s*StartFragment\s*-->)?/i, "");
  HTML = HTML.replace(/(?:<!--\s*EndFragment\s*-->\s*)?<\/body>\s*<\/html>\s*$/i, "");
  if (mode !== "INLINE") {
    const content = HTML ? HTML : plainText;
    if (content.indexOf("<!-- wp:") !== -1) {
      const parseResult = parse3(content);
      const isSingleFreeFormBlock = parseResult.length === 1 && parseResult[0].name === "core/freeform";
      if (!isSingleFreeFormBlock) {
        return parseResult;
      }
    }
  }
  if (String.prototype.normalize) {
    HTML = HTML.normalize();
  }
  HTML = deepFilterHTML(HTML, [slackParagraphCorrector]);
  const isPlainText = plainText && (!HTML || isPlain(HTML));
  if (isPlainText) {
    HTML = plainText;
    if (!/^\s+$/.test(plainText)) {
      HTML = markdownConverter(HTML);
    }
  }
  const pieces = shortcode_converter_default(HTML);
  const hasShortcodes = pieces.length > 1;
  if (isPlainText && !hasShortcodes) {
    if (mode === "AUTO" && plainText.indexOf("\n") === -1 && plainText.indexOf("<p>") !== 0 && HTML.indexOf("<p>") === 0) {
      mode = "INLINE";
    }
  }
  if (mode === "INLINE") {
    return filterInlineHTML(HTML);
  }
  if (mode === "AUTO" && !hasShortcodes && isInlineContent(HTML, tagName)) {
    return filterInlineHTML(HTML);
  }
  const phrasingContentSchema = getPhrasingContentSchema("paste");
  const blockContentSchema = getBlockContentSchema("paste");
  const blocks = pieces.map((piece) => {
    if (typeof piece !== "string") {
      return piece;
    }
    const filters = [googleDocsUIdRemover, msListConverter, headRemover, listReducer, imageCorrector, phrasingContentReducer, specialCommentConverter, commentRemover, iframeRemover, figureContentReducer, blockquoteNormaliser(), divNormaliser];
    const schema = {
      ...blockContentSchema,
      // Keep top-level phrasing content, normalised by `normaliseBlocks`.
      ...phrasingContentSchema
    };
    piece = deepFilterHTML(piece, filters, blockContentSchema);
    piece = removeInvalidHTML(piece, schema);
    piece = normaliseBlocks(piece);
    piece = deepFilterHTML(piece, [htmlFormattingRemover, brRemover, emptyParagraphRemover], blockContentSchema);
    log("Processed HTML piece:\n\n", piece);
    return htmlToBlocks(piece, pasteHandler);
  }).flat().filter(Boolean);
  if (mode === "AUTO" && blocks.length === 1 && hasBlockSupport(blocks[0].name, "__unstablePasteTextInline", false)) {
    const trimRegex = /^[\n]+|[\n]+$/g;
    const trimmedPlainText = plainText.replace(trimRegex, "");
    if (trimmedPlainText !== "" && trimmedPlainText.indexOf("\n") === -1) {
      return removeInvalidHTML(getBlockInnerHTML(blocks[0]), phrasingContentSchema).replace(trimRegex, "");
    }
  }
  return blocks;
}

// ../../node_modules/@wordpress/blocks/build-module/api/raw-handling/index.js
function deprecatedGetPhrasingContentSchema(context) {
  deprecated("wp.blocks.getPhrasingContentSchema", {
    since: "5.6",
    alternative: "wp.dom.getPhrasingContentSchema"
  });
  return getPhrasingContentSchema(context);
}
function rawHandler({
  HTML = ""
}) {
  if (HTML.indexOf("<!-- wp:") !== -1) {
    const parseResult = parse3(HTML);
    const isSingleFreeFormBlock = parseResult.length === 1 && parseResult[0].name === "core/freeform";
    if (!isSingleFreeFormBlock) {
      return parseResult;
    }
  }
  const pieces = shortcode_converter_default(HTML);
  const blockContentSchema = getBlockContentSchema();
  return pieces.map((piece) => {
    if (typeof piece !== "string") {
      return piece;
    }
    const filters = [
      // Needed to adjust invalid lists.
      listReducer,
      // Needed to create more and nextpage blocks.
      specialCommentConverter,
      // Needed to create media blocks.
      figureContentReducer,
      // Needed to create the quote block, which cannot handle text
      // without wrapper paragraphs.
      blockquoteNormaliser({
        raw: true
      })
    ];
    piece = deepFilterHTML(piece, filters, blockContentSchema);
    piece = normaliseBlocks(piece, {
      raw: true
    });
    return htmlToBlocks(piece, rawHandler);
  }).flat().filter(Boolean);
}

// ../../node_modules/@wordpress/blocks/build-module/api/categories.js
function getCategories2() {
  return select(store).getCategories();
}
function setCategories2(categories2) {
  dispatch(store).setCategories(categories2);
}
function updateCategory2(slug, category) {
  dispatch(store).updateCategory(slug, category);
}

// ../../node_modules/@wordpress/blocks/build-module/api/templates.js
function doBlocksMatchTemplate(blocks = [], template = []) {
  return blocks.length === template.length && template.every(([name, , innerBlocksTemplate], index) => {
    const block = blocks[index];
    return name === block.name && doBlocksMatchTemplate(block.innerBlocks, innerBlocksTemplate);
  });
}
var isHTMLAttribute = (attributeDefinition) => (attributeDefinition == null ? void 0 : attributeDefinition.source) === "html";
var isQueryAttribute = (attributeDefinition) => (attributeDefinition == null ? void 0 : attributeDefinition.source) === "query";
function normalizeAttributes(schema, values) {
  if (!values) {
    return {};
  }
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, normalizeAttribute(schema[key], value)]));
}
function normalizeAttribute(definition, value) {
  if (isHTMLAttribute(definition) && Array.isArray(value)) {
    return serialize_default(value);
  }
  if (isQueryAttribute(definition) && value) {
    return value.map((subValues) => {
      return normalizeAttributes(definition.query, subValues);
    });
  }
  return value;
}
function synchronizeBlocksWithTemplate(blocks = [], template) {
  if (!template) {
    return blocks;
  }
  return template.map(([name, attributes, innerBlocksTemplate], index) => {
    var _blockType$attributes;
    const block = blocks[index];
    if (block && block.name === name) {
      const innerBlocks = synchronizeBlocksWithTemplate(block.innerBlocks, innerBlocksTemplate);
      return {
        ...block,
        innerBlocks
      };
    }
    const blockType = getBlockType(name);
    const normalizedAttributes = normalizeAttributes((_blockType$attributes = blockType == null ? void 0 : blockType.attributes) !== null && _blockType$attributes !== void 0 ? _blockType$attributes : {}, attributes);
    let [blockName, blockAttributes] = convertLegacyBlockNameAndAttributes(name, normalizedAttributes);
    if (void 0 === getBlockType(blockName)) {
      blockAttributes = {
        originalName: name,
        originalContent: "",
        originalUndelimitedContent: ""
      };
      blockName = "core/missing";
    }
    return createBlock(blockName, blockAttributes, synchronizeBlocksWithTemplate([], innerBlocksTemplate));
  });
}

// ../../node_modules/@wordpress/blocks/build-module/api/index.js
var privateApis = {};
lock(privateApis, {
  isUnmodifiedBlockContent
});

// ../../node_modules/@wordpress/blocks/build-module/deprecated.js
function withBlockContentContext(OriginalComponent) {
  deprecated("wp.blocks.withBlockContentContext", {
    since: "6.1"
  });
  return OriginalComponent;
}

export {
  __EXPERIMENTAL_STYLE_PROPERTY,
  __EXPERIMENTAL_ELEMENTS,
  __EXPERIMENTAL_PATHS_WITH_OVERRIDE,
  unstable__bootstrapServerSideBlockDefinitions,
  registerBlockType,
  registerBlockCollection,
  unregisterBlockType,
  setFreeformContentHandlerName,
  getFreeformContentHandlerName,
  getGroupingBlockName,
  setUnregisteredTypeHandlerName,
  getUnregisteredTypeHandlerName,
  setDefaultBlockName,
  setGroupingBlockName,
  getDefaultBlockName,
  getBlockType,
  getBlockTypes,
  getBlockSupport,
  hasBlockSupport,
  isReusableBlock,
  isTemplatePart,
  getChildBlockNames,
  hasChildBlocks,
  hasChildBlocksWithInserterSupport,
  registerBlockStyle,
  unregisterBlockStyle,
  getBlockVariations,
  registerBlockVariation,
  unregisterBlockVariation,
  registerBlockBindingsSource,
  unregisterBlockBindingsSource,
  getBlockBindingsSource,
  getBlockBindingsSources,
  isUnmodifiedBlock,
  isUnmodifiedDefaultBlock,
  isValidIcon,
  normalizeIconObject,
  getBlockLabel,
  getAccessibleBlockLabel,
  __experimentalSanitizeBlockAttributes,
  getBlockAttributesNamesByRole,
  __experimentalGetBlockAttributesNamesByRole,
  store,
  createBlock,
  createBlocksFromInnerBlocksTemplate,
  __experimentalCloneSanitizedBlock,
  cloneBlock,
  getPossibleBlockTransformations,
  findTransform,
  getBlockTransforms,
  switchToBlockType,
  getBlockFromExample,
  parse,
  serializeRawBlock,
  getBlockDefaultClassName,
  getBlockMenuDefaultClassName,
  getBlockProps,
  getInnerBlocksProps,
  getSaveElement,
  getSaveContent,
  getBlockInnerHTML,
  __unstableSerializeAndClean,
  serialize,
  validateBlock,
  isValidBlockContent,
  children_default,
  node_default,
  parseWithAttributeSchema,
  getBlockAttributes,
  parse3 as parse2,
  isBlobURL,
  pasteHandler,
  deprecatedGetPhrasingContentSchema,
  rawHandler,
  getCategories2 as getCategories,
  setCategories2 as setCategories,
  updateCategory2 as updateCategory,
  doBlocksMatchTemplate,
  synchronizeBlocksWithTemplate,
  privateApis,
  withBlockContentContext
};
/*! Bundled license information:

react-is/cjs/react-is.development.js:
  (**
   * @license React
   * react-is.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

showdown/dist/showdown.js:
  (*! showdown v 1.9.1 - 02-11-2019 *)
*/
//# sourceMappingURL=chunk-IONKVQWE.js.map
