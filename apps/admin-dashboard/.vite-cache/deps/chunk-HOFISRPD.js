import {
  require_react
} from "./chunk-X56C4N66.js";
import {
  __commonJS,
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
                  var isRTL = document.documentElement.getAttribute("dir") === "rtl";
                  var fakeElement = document.createElement("textarea");
                  fakeElement.style.fontSize = "12pt";
                  fakeElement.style.border = "0";
                  fakeElement.style.padding = "0";
                  fakeElement.style.margin = "0";
                  fakeElement.style.position = "absolute";
                  fakeElement.style[isRTL ? "right" : "left"] = "-9999px";
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
                var Clipboard = function(_Emitter) {
                  _inherits(Clipboard2, _Emitter);
                  var _super = _createSuper(Clipboard2);
                  function Clipboard2(trigger, options) {
                    var _this;
                    _classCallCheck(this, Clipboard2);
                    _this = _super.call(this);
                    _this.resolveOptions(options);
                    _this.listenClick(trigger);
                    return _this;
                  }
                  _createClass(Clipboard2, [{
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
                  return Clipboard2;
                }(tiny_emitter_default());
                var clipboard = Clipboard;
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
                  var listenerFn = listener.apply(this, arguments);
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
                function listener(element, selector, type, callback) {
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
                    function listener() {
                      self.off(name, listener);
                      callback.apply(ctx, arguments);
                    }
                    ;
                    listener._ = callback;
                    return this.on(name, listener, ctx);
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
        var modifiers = [];
        if (e.shiftKey) {
          modifiers.push("shift");
        }
        if (e.altKey) {
          modifiers.push("alt");
        }
        if (e.ctrlKey) {
          modifiers.push("ctrl");
        }
        if (e.metaKey) {
          modifiers.push("meta");
        }
        return modifiers;
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
      function _pickBestAction(key, modifiers, action) {
        if (!action) {
          action = _getReverseMap()[key] ? "keydown" : "keypress";
        }
        if (action == "keypress" && modifiers.length) {
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
        var modifiers = [];
        keys = _keysFromString(combination);
        for (i2 = 0; i2 < keys.length; ++i2) {
          key = keys[i2];
          if (_SPECIAL_ALIASES[key]) {
            key = _SPECIAL_ALIASES[key];
          }
          if (action && action != "keypress" && _SHIFT_MAP[key]) {
            key = _SHIFT_MAP[key];
            modifiers.push("shift");
          }
          if (_isModifier(key)) {
            modifiers.push(key);
          }
        }
        action = _pickBestAction(key, modifiers, action);
        return {
          key,
          modifiers,
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
      function Mousetrap2(targetElement) {
        var self = this;
        targetElement = targetElement || document2;
        if (!(self instanceof Mousetrap2)) {
          return new Mousetrap2(targetElement);
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
        function _getMatches(character, modifiers, e, sequenceName, combination, level) {
          var i2;
          var callback;
          var matches = [];
          var action = e.type;
          if (!self._callbacks[character]) {
            return [];
          }
          if (action == "keyup" && _isModifier(character)) {
            modifiers = [character];
          }
          for (i2 = 0; i2 < self._callbacks[character].length; ++i2) {
            callback = self._callbacks[character][i2];
            if (!sequenceName && callback.seq && _sequenceLevels[callback.seq] != callback.level) {
              continue;
            }
            if (action != callback.action) {
              continue;
            }
            if (action == "keypress" && !e.metaKey && !e.ctrlKey || _modifiersMatch(modifiers, callback.modifiers)) {
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
        self._handleKey = function(character, modifiers, e) {
          var callbacks = _getMatches(character, modifiers, e);
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
      Mousetrap2.prototype.bind = function(keys, callback, action) {
        var self = this;
        keys = keys instanceof Array ? keys : [keys];
        self._bindMultiple.call(self, keys, callback, action);
        return self;
      };
      Mousetrap2.prototype.unbind = function(keys, action) {
        var self = this;
        return self.bind.call(self, keys, function() {
        }, action);
      };
      Mousetrap2.prototype.trigger = function(keys, action) {
        var self = this;
        if (self._directMap[keys + ":" + action]) {
          self._directMap[keys + ":" + action]({}, keys);
        }
        return self;
      };
      Mousetrap2.prototype.reset = function() {
        var self = this;
        self._callbacks = {};
        self._directMap = {};
        return self;
      };
      Mousetrap2.prototype.stopCallback = function(e, element) {
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
      Mousetrap2.prototype.handleKey = function() {
        var self = this;
        return self._handleKey.apply(self, arguments);
      };
      Mousetrap2.addKeycodes = function(object) {
        for (var key in object) {
          if (object.hasOwnProperty(key)) {
            _MAP[key] = object[key];
          }
        }
        _REVERSE_MAP = null;
      };
      Mousetrap2.init = function() {
        var documentMousetrap = Mousetrap2(document2);
        for (var method in documentMousetrap) {
          if (method.charAt(0) !== "_") {
            Mousetrap2[method] = /* @__PURE__ */ function(method2) {
              return function() {
                return documentMousetrap[method2].apply(documentMousetrap, arguments);
              };
            }(method);
          }
        }
      };
      Mousetrap2.init();
      window2.Mousetrap = Mousetrap2;
      if (typeof module !== "undefined" && module.exports) {
        module.exports = Mousetrap2;
      }
      if (typeof define === "function" && define.amd) {
        define(function() {
          return Mousetrap2;
        });
      }
    })(typeof window !== "undefined" ? window : null, typeof window !== "undefined" ? document : null);
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
      var throttle = 125;
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
      var setInactive = debounce(function() {
        remainingTime = 22;
        throttle = 66;
        minThrottle = 0;
      });
      function debounce(fn) {
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
        if (throttle != 125) {
          remainingTime = 7;
          throttle = 125;
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
        throttleDelay = throttle - (Date.now() - taskStart);
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

// ../../node_modules/mousetrap/plugins/global-bind/mousetrap-global-bind.js
(function(Mousetrap2) {
  if (!Mousetrap2) {
    return;
  }
  var _globalCallbacks = {};
  var _originalStopCallback = Mousetrap2.prototype.stopCallback;
  Mousetrap2.prototype.stopCallback = function(e, element, combo, sequence) {
    var self = this;
    if (self.paused) {
      return true;
    }
    if (_globalCallbacks[combo] || _globalCallbacks[sequence]) {
      return false;
    }
    return _originalStopCallback.call(self, e, element, combo);
  };
  Mousetrap2.prototype.bindGlobal = function(keys, callback, action) {
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
  Mousetrap2.init();
})(typeof Mousetrap !== "undefined" ? Mousetrap : void 0);

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

export {
  require_equivalent_key_map,
  require_dist,
  isPromise,
  require_clipboard,
  require_mousetrap,
  require_requestidlecallback,
  useMemoOne,
  rememo_default,
  require_cjs
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
//# sourceMappingURL=chunk-HOFISRPD.js.map
