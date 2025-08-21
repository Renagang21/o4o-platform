import {
  require_clipboard,
  require_mousetrap,
  require_requestidlecallback,
  useMemoOne
} from "./chunk-MIUGM4IY.js";
import {
  defaultHooks,
  doAction
} from "./chunk-ATYMGCLF.js";
import {
  Tannin
} from "./chunk-VCN4ELHL.js";
import {
  pascalCase
} from "./chunk-NKPOOWK7.js";
import {
  require_client
} from "./chunk-YS4MI3ZJ.js";
import {
  require_react_dom
} from "./chunk-ZIK3TCYH.js";
import {
  require_jsx_runtime
} from "./chunk-6UTPAHLC.js";
import {
  require_react
} from "./chunk-X56C4N66.js";
import {
  __export,
  __toESM
} from "./chunk-OL46QLBJ.js";

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

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/element/build-module/react.js
var import_react = __toESM(require_react());

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/element/build-module/react-platform.js
var import_react_dom = __toESM(require_react_dom());
var import_client = __toESM(require_client());

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/element/build-module/serialize.js
var {
  Provider,
  Consumer
} = (0, import_react.createContext)(void 0);
var ForwardRef = (0, import_react.forwardRef)(() => {
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
function withGlobalEvents(eventTypesToHandlers) {
  deprecated("wp.compose.withGlobalEvents", {
    since: "5.7",
    alternative: "useEffect"
  });
  return createHigherOrderComponent((WrappedComponent) => {
    class Wrapper extends import_react.Component {
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
    return (0, import_react.forwardRef)((props, ref) => {
      return (0, import_jsx_runtime3.jsx)(Wrapper, {
        ownProps: props,
        forwardedRef: ref
      });
    });
  }, "withGlobalEvents");
}

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
function withState(initialState = {}) {
  deprecated("wp.compose.withState", {
    since: "5.8",
    alternative: "wp.element.useState"
  });
  return createHigherOrderComponent((OriginalComponent) => {
    return class WrappedComponent extends import_react.Component {
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
function useCopyOnClick(ref, text, timeout = 4e3) {
  deprecated("wp.compose.useCopyOnClick", {
    since: "5.8",
    alternative: "wp.compose.useCopyToClipboard"
  });
  const clipboardRef = (0, import_react.useRef)();
  const [hasCopied, setHasCopied] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
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

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/i18n/build-module/create-i18n.js
var DEFAULT_LOCALE_DATA = {
  "": {
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
  const getFilterDomain = (domain) => domain || "default";
  const __2 = (text, domain) => {
    let translation = dcnpgettext(domain, void 0, text);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.gettext", translation, text, domain);
    return hooks.applyFilters("i18n.gettext_" + getFilterDomain(domain), translation, text, domain);
  };
  const _x2 = (text, context, domain) => {
    let translation = dcnpgettext(domain, context, text);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.gettext_with_context", translation, text, context, domain);
    return hooks.applyFilters("i18n.gettext_with_context_" + getFilterDomain(domain), translation, text, context, domain);
  };
  const _n2 = (single, plural, number, domain) => {
    let translation = dcnpgettext(domain, void 0, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.ngettext", translation, single, plural, number, domain);
    return hooks.applyFilters("i18n.ngettext_" + getFilterDomain(domain), translation, single, plural, number, domain);
  };
  const _nx2 = (single, plural, number, context, domain) => {
    let translation = dcnpgettext(domain, context, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.ngettext_with_context", translation, single, plural, number, context, domain);
    return hooks.applyFilters("i18n.ngettext_with_context_" + getFilterDomain(domain), translation, single, plural, number, context, domain);
  };
  const isRTL3 = () => {
    return "rtl" === _x2("ltr", "text direction");
  };
  const hasTranslation2 = (single, context, domain) => {
    var _a, _b;
    const key = context ? context + "" + single : single;
    let result = !!((_b = (_a = tannin.data) == null ? void 0 : _a[domain !== null && domain !== void 0 ? domain : "default"]) == null ? void 0 : _b[key]);
    if (hooks) {
      result = hooks.applyFilters("i18n.has_translation", result, single, context, domain);
      result = hooks.applyFilters("i18n.has_translation_" + getFilterDomain(domain), result, single, context, domain);
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
    isRTL: isRTL3,
    hasTranslation: hasTranslation2
  };
};

// ../../node_modules/@wordpress/compose/node_modules/@wordpress/i18n/build-module/default-i18n.js
var i18n = createI18n(void 0, void 0, defaultHooks);
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
    return () => cancelBlurCheck();
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
  const existingChangesIndex = record == null ? void 0 : record.findIndex(({
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
  const [state, dispatch] = (0, import_react.useReducer)(undoRedoReducer, initialValue, initReducer);
  return {
    value: state.value,
    setValue: (0, import_react.useCallback)((newValue, isStaged) => {
      dispatch({
        type: "RECORD",
        value: newValue,
        isStaged
      });
    }, []),
    hasUndo: state.manager.hasUndo(),
    hasRedo: state.manager.hasRedo(),
    undo: (0, import_react.useCallback)(() => {
      dispatch({
        type: "UNDO"
      });
    }, []),
    redo: (0, import_react.useCallback)(() => {
      dispatch({
        type: "REDO"
      });
    }, [])
  };
}

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
  pure_default,
  withGlobalEvents,
  use_instance_id_default,
  with_instance_id_default,
  with_safe_timeout_default,
  withState,
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
  useCopyOnClick,
  useCopyToClipboard,
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
  useMediaQuery,
  usePrevious,
  use_reduced_motion_default,
  useStateWithHistory,
  use_viewport_match_default,
  useResizeObserver2 as useResizeObserver,
  createQueue,
  use_async_list_default,
  use_warn_on_change_default,
  useDebounce,
  useDebouncedInput,
  useThrottle,
  useDropZone,
  useFocusableIframe,
  useFixedWindowList,
  useObservableValue
};
//# sourceMappingURL=chunk-CJZLLV6N.js.map
