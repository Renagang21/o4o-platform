import {
  doAction
} from "./chunk-4FYQPERE.js";
import {
  __assign
} from "./chunk-EK6KJCHH.js";
import {
  require_jsx_runtime
} from "./chunk-ICGLOU7J.js";
import {
  require_react
} from "./chunk-Q5GEKUFB.js";
import {
  __commonJS,
  __export,
  __toESM
} from "./chunk-G3PMV62Z.js";

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
        (function() {
          var __webpack_modules__ = {
            /***/
            686: (
              /***/
              (function(__unused_webpack_module, __webpack_exports__, __webpack_require__2) {
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
                var Clipboard3 = (function(_Emitter) {
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
                })(tiny_emitter_default());
                var clipboard = Clipboard3;
              })
            ),
            /***/
            828: (
              /***/
              (function(module2) {
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
              })
            ),
            /***/
            438: (
              /***/
              (function(module2, __unused_webpack_exports, __webpack_require__2) {
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
              })
            ),
            /***/
            879: (
              /***/
              (function(__unused_webpack_module, exports2) {
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
              })
            ),
            /***/
            370: (
              /***/
              (function(module2, __unused_webpack_exports, __webpack_require__2) {
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
              })
            ),
            /***/
            817: (
              /***/
              (function(module2) {
                function select(element) {
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
                module2.exports = select;
              })
            ),
            /***/
            279: (
              /***/
              (function(module2) {
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
              })
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
          !(function() {
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
          })();
          !(function() {
            __webpack_require__.d = function(exports2, definition) {
              for (var key in definition) {
                if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports2, key)) {
                  Object.defineProperty(exports2, key, { enumerable: true, get: definition[key] });
                }
              }
            };
          })();
          !(function() {
            __webpack_require__.o = function(obj, prop) {
              return Object.prototype.hasOwnProperty.call(obj, prop);
            };
          })();
          return __webpack_require__(686);
        })().default
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
            Mousetrap3[method] = /* @__PURE__ */ (function(method2) {
              return function() {
                return documentMousetrap[method2].apply(documentMousetrap, arguments);
              };
            })(method);
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

// ../../node_modules/lower-case/dist.es2015/index.js
function lowerCase(str) {
  return str.toLowerCase();
}

// ../../node_modules/no-case/dist.es2015/index.js
var DEFAULT_SPLIT_REGEXP = [/([a-z0-9])([A-Z])/g, /([A-Z])([A-Z][a-z])/g];
var DEFAULT_STRIP_REGEXP = /[^A-Z0-9]+/gi;
function noCase(input, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.splitRegexp, splitRegexp = _a === void 0 ? DEFAULT_SPLIT_REGEXP : _a, _b = options.stripRegexp, stripRegexp = _b === void 0 ? DEFAULT_STRIP_REGEXP : _b, _c = options.transform, transform = _c === void 0 ? lowerCase : _c, _d = options.delimiter, delimiter = _d === void 0 ? " " : _d;
  var result = replace(replace(input, splitRegexp, "$1\0$2"), stripRegexp, "\0");
  var start = 0;
  var end = result.length;
  while (result.charAt(start) === "\0")
    start++;
  while (result.charAt(end - 1) === "\0")
    end--;
  return result.slice(start, end).split("\0").map(transform).join(delimiter);
}
function replace(input, re, value) {
  if (re instanceof RegExp)
    return input.replace(re, value);
  return re.reduce(function(input2, re2) {
    return input2.replace(re2, value);
  }, input);
}

// ../../node_modules/pascal-case/dist.es2015/index.js
function pascalCaseTransform(input, index) {
  var firstChar = input.charAt(0);
  var lowerChars = input.substr(1).toLowerCase();
  if (index > 0 && firstChar >= "0" && firstChar <= "9") {
    return "_" + firstChar + lowerChars;
  }
  return "" + firstChar.toUpperCase() + lowerChars;
}
function pascalCase(input, options) {
  if (options === void 0) {
    options = {};
  }
  return noCase(input, __assign({ delimiter: "", transform: pascalCaseTransform }, options));
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
var compose = basePipe(true);
var compose_default = compose;

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

// ../../node_modules/@wordpress/compose/build-module/higher-order/pure/index.js
import { Component } from "@wordpress/element";
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var pure = createHigherOrderComponent(function(WrappedComponent) {
  if (WrappedComponent.prototype instanceof Component) {
    return class extends WrappedComponent {
      shouldComponentUpdate(nextProps, nextState) {
        return !isShallowEqual(nextProps, this.props) || !isShallowEqual(nextState, this.state);
      }
    };
  }
  return class extends Component {
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

// ../../node_modules/@wordpress/compose/build-module/higher-order/with-global-events/index.js
import { Component as Component2, forwardRef } from "@wordpress/element";

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
    this.listeners[event.type]?.forEach((instance) => {
      instance.handleEvent(event);
    });
  }
};
var listener_default = Listener;

// ../../node_modules/@wordpress/compose/build-module/higher-order/with-global-events/index.js
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var listener = new listener_default();
function withGlobalEvents(eventTypesToHandlers) {
  deprecated("wp.compose.withGlobalEvents", {
    since: "5.7",
    alternative: "useEffect"
  });
  return createHigherOrderComponent((WrappedComponent) => {
    class Wrapper extends Component2 {
      constructor(props) {
        super(props);
        this.handleEvent = this.handleEvent.bind(this);
        this.handleRef = this.handleRef.bind(this);
      }
      componentDidMount() {
        Object.keys(eventTypesToHandlers).forEach((eventType) => {
          listener.add(eventType, this);
        });
      }
      componentWillUnmount() {
        Object.keys(eventTypesToHandlers).forEach((eventType) => {
          listener.remove(eventType, this);
        });
      }
      handleEvent(event) {
        const handler = eventTypesToHandlers[
          /** @type {keyof GlobalEventHandlersEventMap} */
          event.type
        ];
        if (typeof this.wrappedRef[handler] === "function") {
          this.wrappedRef[handler](event);
        }
      }
      handleRef(el) {
        this.wrappedRef = el;
        if (this.props.forwardedRef) {
          this.props.forwardedRef(el);
        }
      }
      render() {
        return (0, import_jsx_runtime3.jsx)(WrappedComponent, {
          ...this.props.ownProps,
          ref: this.handleRef
        });
      }
    }
    return forwardRef((props, ref) => {
      return (0, import_jsx_runtime3.jsx)(Wrapper, {
        ownProps: props,
        forwardedRef: ref
      });
    });
  }, "withGlobalEvents");
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-instance-id/index.js
import { useMemo } from "@wordpress/element";
var instanceMap = /* @__PURE__ */ new WeakMap();
function createId(object) {
  const instances = instanceMap.get(object) || 0;
  instanceMap.set(object, instances + 1);
  return instances;
}
function useInstanceId(object, prefix, preferredId) {
  return useMemo(() => {
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
import { Component as Component3 } from "@wordpress/element";
var import_jsx_runtime5 = __toESM(require_jsx_runtime());
var withSafeTimeout = createHigherOrderComponent((OriginalComponent) => {
  return class WrappedComponent extends Component3 {
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
import { Component as Component4 } from "@wordpress/element";
var import_jsx_runtime6 = __toESM(require_jsx_runtime());
function withState(initialState = {}) {
  deprecated("wp.compose.withState", {
    since: "5.8",
    alternative: "wp.element.useState"
  });
  return createHigherOrderComponent((OriginalComponent) => {
    return class WrappedComponent extends Component4 {
      constructor(props) {
        super(props);
        this.setState = this.setState.bind(this);
        this.state = initialState;
      }
      render() {
        return (0, import_jsx_runtime6.jsx)(OriginalComponent, {
          ...this.props,
          ...this.state,
          setState: this.setState
        });
      }
    };
  }, "withState");
}

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

// ../../node_modules/@wordpress/dom/build-module/index.js
var focus = {
  focusable: focusable_exports,
  tabbable: tabbable_exports
};

// ../../node_modules/@wordpress/compose/build-module/hooks/use-ref-effect/index.js
import { useCallback, useRef } from "@wordpress/element";
function useRefEffect(callback, dependencies) {
  const cleanupRef = useRef();
  return useCallback((node) => {
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
        nextElement?.focus();
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
import { useRef as useRef2, useEffect, useState } from "@wordpress/element";
function useCopyOnClick(ref, text, timeout = 4e3) {
  deprecated("wp.compose.useCopyOnClick", {
    since: "5.8",
    alternative: "wp.compose.useCopyToClipboard"
  });
  const clipboardRef = useRef2();
  const [hasCopied, setHasCopied] = useState(false);
  useEffect(() => {
    let timeoutId;
    if (!ref.current) {
      return;
    }
    clipboardRef.current = new import_clipboard.default(ref.current, {
      text: () => typeof text === "function" ? text() : text
    });
    clipboardRef.current.on("success", ({
      clearSelection,
      trigger
    }) => {
      clearSelection();
      if (trigger) {
        trigger.focus();
      }
      if (timeout) {
        setHasCopied(true);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setHasCopied(false), timeout);
      }
    });
    return () => {
      if (clipboardRef.current) {
        clipboardRef.current.destroy();
      }
      clearTimeout(timeoutId);
    };
  }, [text, timeout, setHasCopied]);
  return hasCopied;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-copy-to-clipboard/index.js
var import_clipboard2 = __toESM(require_clipboard());
import { useRef as useRef3, useLayoutEffect } from "@wordpress/element";
function useUpdatedRef(value) {
  const ref = useRef3(value);
  useLayoutEffect(() => {
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

// ../../node_modules/@wordpress/compose/build-module/hooks/use-dialog/index.js
import { useRef as useRef8, useEffect as useEffect5, useCallback as useCallback5 } from "@wordpress/element";

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/keycodes/build-module/index.js
import { __ } from "@wordpress/i18n";

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/keycodes/build-module/platform.js
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

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/keycodes/build-module/index.js
var ESCAPE = 27;
var PAGEUP = 33;
var PAGEDOWN = 34;
var END = 35;
var HOME = 36;
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
import { useRef as useRef4, useEffect as useEffect2 } from "@wordpress/element";
function useFocusOnMount(focusOnMount = "firstElement") {
  const focusOnMountRef = useRef4(focusOnMount);
  const setFocus = (target) => {
    target.focus({
      // When focusing newly mounted dialogs,
      // the position of the popover is often not right on the first render
      // This prevents the layout shifts when focusing the dialogs.
      preventScroll: true
    });
  };
  const timerIdRef = useRef4();
  useEffect2(() => {
    focusOnMountRef.current = focusOnMount;
  }, [focusOnMount]);
  return useRefEffect((node) => {
    var _node$ownerDocument$a;
    if (!node || focusOnMountRef.current === false) {
      return;
    }
    if (node.contains((_node$ownerDocument$a = node.ownerDocument?.activeElement) !== null && _node$ownerDocument$a !== void 0 ? _node$ownerDocument$a : null)) {
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
import { useRef as useRef5, useEffect as useEffect3, useCallback as useCallback2 } from "@wordpress/element";
var origin = null;
function useFocusReturn(onFocusReturn) {
  const ref = useRef5(null);
  const focusedBeforeMount = useRef5(null);
  const onFocusReturnRef = useRef5(onFocusReturn);
  useEffect3(() => {
    onFocusReturnRef.current = onFocusReturn;
  }, [onFocusReturn]);
  return useCallback2((node) => {
    if (node) {
      var _activeDocument$activ;
      ref.current = node;
      if (focusedBeforeMount.current) {
        return;
      }
      const activeDocument = node.ownerDocument.activeElement instanceof window.HTMLIFrameElement ? node.ownerDocument.activeElement.contentDocument : node.ownerDocument;
      focusedBeforeMount.current = (_activeDocument$activ = activeDocument?.activeElement) !== null && _activeDocument$activ !== void 0 ? _activeDocument$activ : null;
    } else if (focusedBeforeMount.current) {
      const isFocused = ref.current?.contains(ref.current?.ownerDocument.activeElement);
      if (ref.current?.isConnected && !isFocused) {
        var _origin;
        (_origin = origin) !== null && _origin !== void 0 ? _origin : origin = focusedBeforeMount.current;
        return;
      }
      if (onFocusReturnRef.current) {
        onFocusReturnRef.current();
      } else {
        (!focusedBeforeMount.current.isConnected ? origin : focusedBeforeMount.current)?.focus();
      }
      origin = null;
    }
  }, []);
}
var use_focus_return_default = useFocusReturn;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-focus-outside/index.js
import { useCallback as useCallback3, useEffect as useEffect4, useRef as useRef6 } from "@wordpress/element";
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
  const currentOnFocusOutsideRef = useRef6(onFocusOutside);
  useEffect4(() => {
    currentOnFocusOutsideRef.current = onFocusOutside;
  }, [onFocusOutside]);
  const preventBlurCheckRef = useRef6(false);
  const blurCheckTimeoutIdRef = useRef6();
  const cancelBlurCheck = useCallback3(() => {
    clearTimeout(blurCheckTimeoutIdRef.current);
  }, []);
  useEffect4(() => {
    return () => cancelBlurCheck();
  }, []);
  useEffect4(() => {
    if (!onFocusOutside) {
      cancelBlurCheck();
    }
  }, [onFocusOutside, cancelBlurCheck]);
  const normalizeButtonFocus = useCallback3((event) => {
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
  const queueBlurCheck = useCallback3((event) => {
    event.persist();
    if (preventBlurCheckRef.current) {
      return;
    }
    const ignoreForRelatedTarget = event.target.getAttribute("data-unstable-ignore-focus-outside-for-relatedtarget");
    if (ignoreForRelatedTarget && event.relatedTarget?.closest(ignoreForRelatedTarget)) {
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
import { useRef as useRef7, useCallback as useCallback4, useLayoutEffect as useLayoutEffect2 } from "@wordpress/element";
function assignRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && ref.hasOwnProperty("current")) {
    ref.current = value;
  }
}
function useMergeRefs(refs) {
  const element = useRef7();
  const isAttachedRef = useRef7(false);
  const didElementChangeRef = useRef7(false);
  const previousRefsRef = useRef7([]);
  const currentRefsRef = useRef7(refs);
  currentRefsRef.current = refs;
  useLayoutEffect2(() => {
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
  useLayoutEffect2(() => {
    didElementChangeRef.current = false;
  });
  return useCallback4((value) => {
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
  const currentOptions = useRef8();
  const {
    constrainTabbing = options.focusOnMount !== false
  } = options;
  useEffect5(() => {
    currentOptions.current = options;
  }, Object.values(options));
  const constrainedTabbingRef = use_constrained_tabbing_default();
  const focusOnMountRef = useFocusOnMount(options.focusOnMount);
  const focusReturnRef = use_focus_return_default();
  const focusOutsideProps = useFocusOutside((event) => {
    if (currentOptions.current?.__unstableOnClose) {
      currentOptions.current.__unstableOnClose("focus-outside", event);
    } else if (currentOptions.current?.onClose) {
      currentOptions.current.onClose();
    }
  });
  const closeOnEscapeRef = useCallback5((node) => {
    if (!node) {
      return;
    }
    node.addEventListener("keydown", (event) => {
      if (event.keyCode === ESCAPE && !event.defaultPrevented && currentOptions.current?.onClose) {
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
    if (isDisabledProp) {
      return;
    }
    const defaultView = node?.ownerDocument?.defaultView;
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
import { useRef as useRef9, useInsertionEffect, useCallback as useCallback6 } from "@wordpress/element";
function useEvent(callback) {
  const ref = useRef9(() => {
    throw new Error("Callbacks created with `useEvent` cannot be called during rendering.");
  });
  useInsertionEffect(() => {
    ref.current = callback;
  });
  return useCallback6((...args) => ref.current?.(...args), []);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-dragging/index.js
import { useCallback as useCallback7, useEffect as useEffect7, useRef as useRef10, useState as useState2 } from "@wordpress/element";

// ../../node_modules/@wordpress/compose/build-module/hooks/use-isomorphic-layout-effect/index.js
import { useEffect as useEffect6, useLayoutEffect as useLayoutEffect3 } from "@wordpress/element";
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect3 : useEffect6;
var use_isomorphic_layout_effect_default = useIsomorphicLayoutEffect;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-dragging/index.js
function useDragging({
  onDragStart,
  onDragMove,
  onDragEnd
}) {
  const [isDragging, setIsDragging] = useState2(false);
  const eventsRef = useRef10({
    onDragStart,
    onDragMove,
    onDragEnd
  });
  use_isomorphic_layout_effect_default(() => {
    eventsRef.current.onDragStart = onDragStart;
    eventsRef.current.onDragMove = onDragMove;
    eventsRef.current.onDragEnd = onDragEnd;
  }, [onDragStart, onDragMove, onDragEnd]);
  const onMouseMove = useCallback7((event) => eventsRef.current.onDragMove && eventsRef.current.onDragMove(event), []);
  const endDrag = useCallback7((event) => {
    if (eventsRef.current.onDragEnd) {
      eventsRef.current.onDragEnd(event);
    }
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", endDrag);
    setIsDragging(false);
  }, []);
  const startDrag = useCallback7((event) => {
    if (eventsRef.current.onDragStart) {
      eventsRef.current.onDragStart(event);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", endDrag);
    setIsDragging(true);
  }, []);
  useEffect7(() => {
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
import { useEffect as useEffect8, useRef as useRef11 } from "@wordpress/element";
function useKeyboardShortcut(shortcuts, callback, {
  bindGlobal = false,
  eventName = "keydown",
  isDisabled = false,
  // This is important for performance considerations.
  target
} = {}) {
  const currentCallbackRef = useRef11(callback);
  useEffect8(() => {
    currentCallbackRef.current = callback;
  }, [callback]);
  useEffect8(() => {
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
import { useMemo as useMemo2, useSyncExternalStore } from "@wordpress/element";
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
  const source = useMemo2(() => {
    const mediaQueryList = getMediaQueryList(query);
    return {
      /** @type {(onStoreChange: () => void) => () => void} */
      subscribe(onStoreChange) {
        if (!mediaQueryList) {
          return () => {
          };
        }
        mediaQueryList.addEventListener?.("change", onStoreChange);
        return () => {
          mediaQueryList.removeEventListener?.("change", onStoreChange);
        };
      },
      getValue() {
        var _mediaQueryList$match;
        return (_mediaQueryList$match = mediaQueryList?.matches) !== null && _mediaQueryList$match !== void 0 ? _mediaQueryList$match : false;
      }
    };
  }, [query]);
  return useSyncExternalStore(source.subscribe, source.getValue, () => false);
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-previous/index.js
import { useEffect as useEffect9, useRef as useRef12 } from "@wordpress/element";
function usePrevious(value) {
  const ref = useRef12();
  useEffect9(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-reduced-motion/index.js
var useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
var use_reduced_motion_default = useReducedMotion;

// ../../node_modules/@wordpress/undo-manager/build-module/index.js
function mergeHistoryChanges(changes1, changes2) {
  const newChanges = {
    ...changes1
  };
  Object.entries(changes2).forEach(([key, value]) => {
    if (newChanges[key]) {
      newChanges[key] = {
        ...newChanges[key],
        to: value.to
      };
    } else {
      newChanges[key] = value;
    }
  });
  return newChanges;
}
var addHistoryChangesIntoRecord = (record, changes) => {
  const existingChangesIndex = record?.findIndex(({
    id: recordIdentifier
  }) => {
    return typeof recordIdentifier === "string" ? recordIdentifier === changes.id : isShallowEqual(recordIdentifier, changes.id);
  });
  const nextRecord = [...record];
  if (existingChangesIndex !== -1) {
    nextRecord[existingChangesIndex] = {
      id: changes.id,
      changes: mergeHistoryChanges(nextRecord[existingChangesIndex].changes, changes.changes)
    };
  } else {
    nextRecord.push(changes);
  }
  return nextRecord;
};
function createUndoManager() {
  let history = [];
  let stagedRecord = [];
  let offset = 0;
  const dropPendingRedos = () => {
    history = history.slice(0, offset || void 0);
    offset = 0;
  };
  const appendStagedRecordToLatestHistoryRecord = () => {
    var _history$index;
    const index = history.length === 0 ? 0 : history.length - 1;
    let latestRecord = (_history$index = history[index]) !== null && _history$index !== void 0 ? _history$index : [];
    stagedRecord.forEach((changes) => {
      latestRecord = addHistoryChangesIntoRecord(latestRecord, changes);
    });
    stagedRecord = [];
    history[index] = latestRecord;
  };
  const isRecordEmpty = (record) => {
    const filteredRecord = record.filter(({
      changes
    }) => {
      return Object.values(changes).some(({
        from,
        to
      }) => typeof from !== "function" && typeof to !== "function" && !isShallowEqual(from, to));
    });
    return !filteredRecord.length;
  };
  return {
    addRecord(record, isStaged = false) {
      const isEmpty2 = !record || isRecordEmpty(record);
      if (isStaged) {
        if (isEmpty2) {
          return;
        }
        record.forEach((changes) => {
          stagedRecord = addHistoryChangesIntoRecord(stagedRecord, changes);
        });
      } else {
        dropPendingRedos();
        if (stagedRecord.length) {
          appendStagedRecordToLatestHistoryRecord();
        }
        if (isEmpty2) {
          return;
        }
        history.push(record);
      }
    },
    undo() {
      if (stagedRecord.length) {
        dropPendingRedos();
        appendStagedRecordToLatestHistoryRecord();
      }
      const undoRecord = history[history.length - 1 + offset];
      if (!undoRecord) {
        return;
      }
      offset -= 1;
      return undoRecord;
    },
    redo() {
      const redoRecord = history[history.length + offset];
      if (!redoRecord) {
        return;
      }
      offset += 1;
      return redoRecord;
    },
    hasUndo() {
      return !!history[history.length - 1 + offset];
    },
    hasRedo() {
      return !!history[history.length + offset];
    }
  };
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-state-with-history/index.js
import { useCallback as useCallback8, useReducer } from "@wordpress/element";
function undoRedoReducer(state, action) {
  switch (action.type) {
    case "UNDO": {
      const undoRecord = state.manager.undo();
      if (undoRecord) {
        return {
          ...state,
          value: undoRecord[0].changes.prop.from
        };
      }
      return state;
    }
    case "REDO": {
      const redoRecord = state.manager.redo();
      if (redoRecord) {
        return {
          ...state,
          value: redoRecord[0].changes.prop.to
        };
      }
      return state;
    }
    case "RECORD": {
      state.manager.addRecord([{
        id: "object",
        changes: {
          prop: {
            from: state.value,
            to: action.value
          }
        }
      }], action.isStaged);
      return {
        ...state,
        value: action.value
      };
    }
  }
  return state;
}
function initReducer(value) {
  return {
    manager: createUndoManager(),
    value
  };
}
function useStateWithHistory(initialValue) {
  const [state, dispatch] = useReducer(undoRedoReducer, initialValue, initReducer);
  return {
    value: state.value,
    setValue: useCallback8((newValue, isStaged) => {
      dispatch({
        type: "RECORD",
        value: newValue,
        isStaged
      });
    }, []),
    hasUndo: state.manager.hasUndo(),
    hasRedo: state.manager.hasRedo(),
    undo: useCallback8(() => {
      dispatch({
        type: "UNDO"
      });
    }, []),
    redo: useCallback8(() => {
      dispatch({
        type: "REDO"
      });
    }, [])
  };
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-viewport-match/index.js
import { createContext, useContext } from "@wordpress/element";
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
var ViewportMatchWidthContext = createContext(
  /** @type {null | number} */
  null
);
var useViewportMatch = (breakpoint, operator = ">=") => {
  const simulatedWidth = useContext(ViewportMatchWidthContext);
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
import { useRef as useRef13 } from "@wordpress/element";
function useResizeObserver(callback, resizeObserverOptions = {}) {
  const callbackEvent = useEvent(callback);
  const observedElementRef = useRef13();
  const resizeObserverRef = useRef13();
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
import { useCallback as useCallback9, useRef as useRef14, useState as useState3 } from "@wordpress/element";
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
  const [size, setSize] = useState3(NULL_SIZE);
  const previousSizeRef = useRef14(NULL_SIZE);
  const handleResize = useCallback9((newSize) => {
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

// ../../node_modules/@wordpress/compose/build-module/hooks/use-async-list/index.js
import { flushSync, useEffect as useEffect10, useState as useState4 } from "@wordpress/element";

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
  const [current, setCurrent] = useState4([]);
  useEffect10(() => {
    let firstItems = getFirstItemsPresentInState(list, current);
    if (firstItems.length < step) {
      firstItems = firstItems.concat(list.slice(firstItems.length, step));
    }
    setCurrent(firstItems);
    const asyncQueue = createQueue();
    for (let i = firstItems.length; i < list.length; i += step) {
      asyncQueue.add({}, () => {
        flushSync(() => {
          setCurrent((state) => [...state, ...list.slice(i, i + step)]);
        });
      });
    }
    return () => asyncQueue.reset();
  }, [list]);
  return current;
}
var use_async_list_default = useAsyncList;

// ../../node_modules/@wordpress/compose/build-module/hooks/use-warn-on-change/index.js
function useWarnOnChange(object, prefix = "Change detection") {
  const previousValues = usePrevious(object);
  Object.entries(previousValues !== null && previousValues !== void 0 ? previousValues : []).forEach(([key, value]) => {
    if (value !== object[
      /** @type {keyof typeof object} */
      key
    ]) {
      console.warn(
        `${prefix}: ${key} key changed:`,
        value,
        object[
          /** @type {keyof typeof object} */
          key
        ]
        /* eslint-enable jsdoc/check-types */
      );
    }
  });
}
var use_warn_on_change_default = useWarnOnChange;

// ../../node_modules/use-memo-one/dist/use-memo-one.esm.js
var import_react = __toESM(require_react());
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
  var initial = (0, import_react.useState)(function() {
    return {
      inputs,
      result: getResult()
    };
  })[0];
  var isFirstRun = (0, import_react.useRef)(true);
  var committed = (0, import_react.useRef)(initial);
  var useCache = isFirstRun.current || Boolean(inputs && committed.current.inputs && areInputsEqual(inputs, committed.current.inputs));
  var cache = useCache ? committed.current : {
    inputs,
    result: getResult()
  };
  (0, import_react.useEffect)(function() {
    isFirstRun.current = false;
    committed.current = cache;
  }, [cache]);
  return cache.result;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-debounce/index.js
import { useEffect as useEffect12 } from "@wordpress/element";
function useDebounce(fn, wait, options) {
  const debounced = useMemoOne(() => debounce(fn, wait !== null && wait !== void 0 ? wait : 0, options), [fn, wait, options]);
  useEffect12(() => () => debounced.cancel(), [debounced]);
  return debounced;
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-debounced-input/index.js
import { useEffect as useEffect13, useState as useState6 } from "@wordpress/element";
function useDebouncedInput(defaultValue = "") {
  const [input, setInput] = useState6(defaultValue);
  const [debouncedInput, setDebouncedState] = useState6(defaultValue);
  const setDebouncedInput = useDebounce(setDebouncedState, 250);
  useEffect13(() => {
    setDebouncedInput(input);
  }, [input, setDebouncedInput]);
  return [input, setInput, debouncedInput];
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-throttle/index.js
import { useEffect as useEffect14 } from "@wordpress/element";
function useThrottle(fn, wait, options) {
  const throttled = useMemoOne(() => throttle(fn, wait !== null && wait !== void 0 ? wait : 0, options), [fn, wait, options]);
  useEffect14(() => () => throttled.cancel(), [throttled]);
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
import { useState as useState7, useLayoutEffect as useLayoutEffect4 } from "@wordpress/element";
var DEFAULT_INIT_WINDOW_SIZE = 30;
function useFixedWindowList(elementRef, itemHeight, totalItems, options) {
  var _options$initWindowSi, _options$useWindowing;
  const initWindowSize = (_options$initWindowSi = options?.initWindowSize) !== null && _options$initWindowSi !== void 0 ? _options$initWindowSi : DEFAULT_INIT_WINDOW_SIZE;
  const useWindowing = (_options$useWindowing = options?.useWindowing) !== null && _options$useWindowing !== void 0 ? _options$useWindowing : true;
  const [fixedListWindow, setFixedListWindow] = useState7({
    visibleItems: initWindowSize,
    start: 0,
    end: initWindowSize,
    itemInView: (index) => {
      return index >= 0 && index <= initWindowSize;
    }
  });
  useLayoutEffect4(() => {
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
      const windowOverscan = initRender ? visibleItems : (_options$windowOversc = options?.windowOverscan) !== null && _options$windowOversc !== void 0 ? _options$windowOversc : visibleItems;
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
    scrollContainer?.addEventListener("scroll", debounceMeasureList);
    scrollContainer?.ownerDocument?.defaultView?.addEventListener("resize", debounceMeasureList);
    scrollContainer?.ownerDocument?.defaultView?.addEventListener("resize", debounceMeasureList);
    return () => {
      scrollContainer?.removeEventListener("scroll", debounceMeasureList);
      scrollContainer?.ownerDocument?.defaultView?.removeEventListener("resize", debounceMeasureList);
    };
  }, [itemHeight, elementRef, totalItems, options?.expandedState, options?.windowOverscan, useWindowing]);
  useLayoutEffect4(() => {
    if (!useWindowing) {
      return;
    }
    const scrollContainer = getScrollContainer(elementRef.current);
    const handleKeyDown = (event) => {
      switch (event.keyCode) {
        case HOME: {
          return scrollContainer?.scrollTo({
            top: 0
          });
        }
        case END: {
          return scrollContainer?.scrollTo({
            top: totalItems * itemHeight
          });
        }
        case PAGEUP: {
          return scrollContainer?.scrollTo({
            top: scrollContainer.scrollTop - fixedListWindow.visibleItems * itemHeight
          });
        }
        case PAGEDOWN: {
          return scrollContainer?.scrollTo({
            top: scrollContainer.scrollTop + fixedListWindow.visibleItems * itemHeight
          });
        }
      }
    };
    scrollContainer?.ownerDocument?.defaultView?.addEventListener("keydown", handleKeyDown);
    return () => {
      scrollContainer?.ownerDocument?.defaultView?.removeEventListener("keydown", handleKeyDown);
    };
  }, [totalItems, itemHeight, elementRef, fixedListWindow.visibleItems, useWindowing, options?.expandedState]);
  return [fixedListWindow, setFixedListWindow];
}

// ../../node_modules/@wordpress/compose/build-module/hooks/use-observable-value/index.js
import { useMemo as useMemo3, useSyncExternalStore as useSyncExternalStore2 } from "@wordpress/element";
function useObservableValue(map, name) {
  const [subscribe, getValue] = useMemo3(() => [(listener2) => map.subscribe(name, listener2), () => map.get(name)], [map, name]);
  return useSyncExternalStore2(subscribe, getValue, getValue);
}
export {
  use_dialog_default as __experimentalUseDialog,
  useDragging as __experimentalUseDragging,
  useDropZone as __experimentalUseDropZone,
  useFixedWindowList as __experimentalUseFixedWindowList,
  useFocusOutside as __experimentalUseFocusOutside,
  compose_default as compose,
  createHigherOrderComponent,
  debounce,
  if_condition_default as ifCondition,
  observableMap,
  pipe_default as pipe,
  pure_default as pure,
  throttle,
  use_async_list_default as useAsyncList,
  use_constrained_tabbing_default as useConstrainedTabbing,
  useCopyOnClick,
  useCopyToClipboard,
  useDebounce,
  useDebouncedInput,
  useDisabled,
  useEvent,
  useFocusOnMount,
  use_focus_return_default as useFocusReturn,
  useFocusableIframe,
  use_instance_id_default as useInstanceId,
  use_isomorphic_layout_effect_default as useIsomorphicLayoutEffect,
  use_keyboard_shortcut_default as useKeyboardShortcut,
  useMediaQuery,
  useMergeRefs,
  useObservableValue,
  usePrevious,
  use_reduced_motion_default as useReducedMotion,
  useRefEffect,
  useResizeObserver2 as useResizeObserver,
  useStateWithHistory,
  useThrottle,
  use_viewport_match_default as useViewportMatch,
  use_warn_on_change_default as useWarnOnChange,
  withGlobalEvents,
  with_instance_id_default as withInstanceId,
  with_safe_timeout_default as withSafeTimeout,
  withState
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
//# sourceMappingURL=@wordpress_compose.js.map
