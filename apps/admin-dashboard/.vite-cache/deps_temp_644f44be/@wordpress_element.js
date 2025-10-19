import {
  escapeAttribute,
  escapeHTML,
  isPlainObject,
  isValidAttributeName,
  paramCase
} from "./chunk-TCNCY7PS.js";
import {
  require_client
} from "./chunk-R3AENI7Z.js";
import "./chunk-BHNNXGBB.js";
import {
  require_react_dom
} from "./chunk-3KTXSWN7.js";
import {
  require_react
} from "./chunk-SB6OIMPW.js";
import {
  __toESM
} from "./chunk-OL46QLBJ.js";

// node_modules/@wordpress/element/build-module/react.js
var import_react = __toESM(require_react());
function concatChildren(...childrenArguments) {
  return childrenArguments.reduce((accumulator, children, i) => {
    import_react.Children.forEach(children, (child, j) => {
      if (child && "string" !== typeof child) {
        child = (0, import_react.cloneElement)(child, {
          key: [i, j].join()
        });
      }
      accumulator.push(child);
    });
    return accumulator;
  }, []);
}
function switchChildrenNodeName(children, nodeName) {
  return children && import_react.Children.map(children, (elt, index) => {
    if (typeof (elt == null ? void 0 : elt.valueOf()) === "string") {
      return (0, import_react.createElement)(nodeName, {
        key: index
      }, elt);
    }
    const {
      children: childrenProp,
      ...props
    } = elt.props;
    return (0, import_react.createElement)(nodeName, {
      key: index,
      ...props
    }, childrenProp);
  });
}

// node_modules/@wordpress/element/build-module/create-interpolate-element.js
var indoc;
var offset;
var output;
var stack;
var tokenizer = /<(\/)?(\w+)\s*(\/)?>/g;
function createFrame(element, tokenStart, tokenLength, prevOffset, leadingTextStart) {
  return {
    element,
    tokenStart,
    tokenLength,
    prevOffset,
    leadingTextStart,
    children: []
  };
}
var createInterpolateElement = (interpolatedString, conversionMap) => {
  indoc = interpolatedString;
  offset = 0;
  output = [];
  stack = [];
  tokenizer.lastIndex = 0;
  if (!isValidConversionMap(conversionMap)) {
    throw new TypeError("The conversionMap provided is not valid. It must be an object with values that are React Elements");
  }
  do {
  } while (proceed(conversionMap));
  return (0, import_react.createElement)(import_react.Fragment, null, ...output);
};
var isValidConversionMap = (conversionMap) => {
  const isObject = typeof conversionMap === "object";
  const values = isObject && Object.values(conversionMap);
  return isObject && values.length && values.every((element) => (0, import_react.isValidElement)(element));
};
function proceed(conversionMap) {
  const next = nextToken();
  const [tokenType, name, startOffset, tokenLength] = next;
  const stackDepth = stack.length;
  const leadingTextStart = startOffset > offset ? offset : null;
  if (!conversionMap[name]) {
    addText();
    return false;
  }
  switch (tokenType) {
    case "no-more-tokens":
      if (stackDepth !== 0) {
        const {
          leadingTextStart: stackLeadingText,
          tokenStart
        } = stack.pop();
        output.push(indoc.substr(stackLeadingText, tokenStart));
      }
      addText();
      return false;
    case "self-closed":
      if (0 === stackDepth) {
        if (null !== leadingTextStart) {
          output.push(indoc.substr(leadingTextStart, startOffset - leadingTextStart));
        }
        output.push(conversionMap[name]);
        offset = startOffset + tokenLength;
        return true;
      }
      addChild(createFrame(conversionMap[name], startOffset, tokenLength));
      offset = startOffset + tokenLength;
      return true;
    case "opener":
      stack.push(createFrame(conversionMap[name], startOffset, tokenLength, startOffset + tokenLength, leadingTextStart));
      offset = startOffset + tokenLength;
      return true;
    case "closer":
      if (1 === stackDepth) {
        closeOuterElement(startOffset);
        offset = startOffset + tokenLength;
        return true;
      }
      const stackTop = stack.pop();
      const text = indoc.substr(stackTop.prevOffset, startOffset - stackTop.prevOffset);
      stackTop.children.push(text);
      stackTop.prevOffset = startOffset + tokenLength;
      const frame = createFrame(stackTop.element, stackTop.tokenStart, stackTop.tokenLength, startOffset + tokenLength);
      frame.children = stackTop.children;
      addChild(frame);
      offset = startOffset + tokenLength;
      return true;
    default:
      addText();
      return false;
  }
}
function nextToken() {
  const matches = tokenizer.exec(indoc);
  if (null === matches) {
    return ["no-more-tokens"];
  }
  const startedAt = matches.index;
  const [match, isClosing, name, isSelfClosed] = matches;
  const length = match.length;
  if (isSelfClosed) {
    return ["self-closed", name, startedAt, length];
  }
  if (isClosing) {
    return ["closer", name, startedAt, length];
  }
  return ["opener", name, startedAt, length];
}
function addText() {
  const length = indoc.length - offset;
  if (0 === length) {
    return;
  }
  output.push(indoc.substr(offset, length));
}
function addChild(frame) {
  const {
    element,
    tokenStart,
    tokenLength,
    prevOffset,
    children
  } = frame;
  const parent = stack[stack.length - 1];
  const text = indoc.substr(parent.prevOffset, tokenStart - parent.prevOffset);
  if (text) {
    parent.children.push(text);
  }
  parent.children.push((0, import_react.cloneElement)(element, null, ...children));
  parent.prevOffset = prevOffset ? prevOffset : tokenStart + tokenLength;
}
function closeOuterElement(endOffset) {
  const {
    element,
    leadingTextStart,
    prevOffset,
    tokenStart,
    children
  } = stack.pop();
  const text = endOffset ? indoc.substr(prevOffset, endOffset - prevOffset) : indoc.substr(prevOffset);
  if (text) {
    children.push(text);
  }
  if (null !== leadingTextStart) {
    output.push(indoc.substr(leadingTextStart, tokenStart - leadingTextStart));
  }
  output.push((0, import_react.cloneElement)(element, null, ...children));
}
var create_interpolate_element_default = createInterpolateElement;

// node_modules/@wordpress/element/build-module/react-platform.js
var import_react_dom = __toESM(require_react_dom());
var import_client = __toESM(require_client());

// node_modules/@wordpress/element/build-module/utils.js
var isEmptyElement = (element) => {
  if (typeof element === "number") {
    return false;
  }
  if (typeof (element == null ? void 0 : element.valueOf()) === "string" || Array.isArray(element)) {
    return !element.length;
  }
  return !element;
};

// node_modules/@wordpress/element/build-module/platform.js
var Platform = {
  OS: "web",
  select: (spec) => "web" in spec ? spec.web : spec.default,
  isWeb: true
};
var platform_default = Platform;

// node_modules/@wordpress/element/build-module/raw-html.js
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

// node_modules/@wordpress/element/build-module/serialize.js
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
  const html = renderElement(instance.render(), context, legacyContext);
  return html;
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
var export_Children = import_react.Children;
var export_Component = import_react.Component;
var export_Fragment = import_react.Fragment;
var export_PureComponent = import_react.PureComponent;
var export_StrictMode = import_react.StrictMode;
var export_Suspense = import_react.Suspense;
var export_cloneElement = import_react.cloneElement;
var export_createContext = import_react.createContext;
var export_createElement = import_react.createElement;
var export_createPortal = import_react_dom.createPortal;
var export_createRef = import_react.createRef;
var export_createRoot = import_client.createRoot;
var export_findDOMNode = import_react_dom.findDOMNode;
var export_flushSync = import_react_dom.flushSync;
var export_forwardRef = import_react.forwardRef;
var export_hydrate = import_react_dom.hydrate;
var export_hydrateRoot = import_client.hydrateRoot;
var export_isValidElement = import_react.isValidElement;
var export_lazy = import_react.lazy;
var export_memo = import_react.memo;
var export_render = import_react_dom.render;
var export_startTransition = import_react.startTransition;
var export_unmountComponentAtNode = import_react_dom.unmountComponentAtNode;
var export_useCallback = import_react.useCallback;
var export_useContext = import_react.useContext;
var export_useDebugValue = import_react.useDebugValue;
var export_useDeferredValue = import_react.useDeferredValue;
var export_useEffect = import_react.useEffect;
var export_useId = import_react.useId;
var export_useImperativeHandle = import_react.useImperativeHandle;
var export_useInsertionEffect = import_react.useInsertionEffect;
var export_useLayoutEffect = import_react.useLayoutEffect;
var export_useMemo = import_react.useMemo;
var export_useReducer = import_react.useReducer;
var export_useRef = import_react.useRef;
var export_useState = import_react.useState;
var export_useSyncExternalStore = import_react.useSyncExternalStore;
var export_useTransition = import_react.useTransition;
export {
  export_Children as Children,
  export_Component as Component,
  export_Fragment as Fragment,
  platform_default as Platform,
  export_PureComponent as PureComponent,
  RawHTML,
  export_StrictMode as StrictMode,
  export_Suspense as Suspense,
  export_cloneElement as cloneElement,
  concatChildren,
  export_createContext as createContext,
  export_createElement as createElement,
  create_interpolate_element_default as createInterpolateElement,
  export_createPortal as createPortal,
  export_createRef as createRef,
  export_createRoot as createRoot,
  export_findDOMNode as findDOMNode,
  export_flushSync as flushSync,
  export_forwardRef as forwardRef,
  export_hydrate as hydrate,
  export_hydrateRoot as hydrateRoot,
  isEmptyElement,
  export_isValidElement as isValidElement,
  export_lazy as lazy,
  export_memo as memo,
  export_render as render,
  serialize_default as renderToString,
  export_startTransition as startTransition,
  switchChildrenNodeName,
  export_unmountComponentAtNode as unmountComponentAtNode,
  export_useCallback as useCallback,
  export_useContext as useContext,
  export_useDebugValue as useDebugValue,
  export_useDeferredValue as useDeferredValue,
  export_useEffect as useEffect,
  export_useId as useId,
  export_useImperativeHandle as useImperativeHandle,
  export_useInsertionEffect as useInsertionEffect,
  export_useLayoutEffect as useLayoutEffect,
  export_useMemo as useMemo,
  export_useReducer as useReducer,
  export_useRef as useRef,
  export_useState as useState,
  export_useSyncExternalStore as useSyncExternalStore,
  export_useTransition as useTransition
};
//# sourceMappingURL=@wordpress_element.js.map
