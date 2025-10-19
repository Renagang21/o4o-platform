import {
  __assign
} from "./chunk-BHNNXGBB.js";

// ../../node_modules/is-plain-object/dist/is-plain-object.mjs
function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}
function isPlainObject(o) {
  var ctor, prot;
  if (isObject(o) === false) return false;
  ctor = o.constructor;
  if (ctor === void 0) return true;
  prot = ctor.prototype;
  if (isObject(prot) === false) return false;
  if (prot.hasOwnProperty("isPrototypeOf") === false) {
    return false;
  }
  return true;
}

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

// ../../node_modules/dot-case/dist.es2015/index.js
function dotCase(input, options) {
  if (options === void 0) {
    options = {};
  }
  return noCase(input, __assign({ delimiter: "." }, options));
}

// ../../node_modules/param-case/dist.es2015/index.js
function paramCase(input, options) {
  if (options === void 0) {
    options = {};
  }
  return dotCase(input, __assign({ delimiter: "-" }, options));
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

// ../../node_modules/camel-case/dist.es2015/index.js
function camelCaseTransform(input, index) {
  if (index === 0)
    return input.toLowerCase();
  return pascalCaseTransform(input, index);
}
function camelCase(input, options) {
  if (options === void 0) {
    options = {};
  }
  return pascalCase(input, __assign({ transform: camelCaseTransform }, options));
}

// ../../node_modules/@wordpress/escape-html/build-module/escape-greater.js
function __unstableEscapeGreaterThan(value) {
  return value.replace(/>/g, "&gt;");
}

// ../../node_modules/@wordpress/escape-html/build-module/index.js
var REGEXP_INVALID_ATTRIBUTE_NAME = /[\u007F-\u009F "'>/="\uFDD0-\uFDEF]/;
function escapeAmpersand(value) {
  return value.replace(/&(?!([a-z0-9]+|#[0-9]+|#x[a-f0-9]+);)/gi, "&amp;");
}
function escapeQuotationMark(value) {
  return value.replace(/"/g, "&quot;");
}
function escapeLessThan(value) {
  return value.replace(/</g, "&lt;");
}
function escapeAttribute(value) {
  return __unstableEscapeGreaterThan(escapeQuotationMark(escapeAmpersand(value)));
}
function escapeHTML(value) {
  return escapeLessThan(escapeAmpersand(value));
}
function escapeEditableHTML(value) {
  return escapeLessThan(value.replace(/&/g, "&amp;"));
}
function isValidAttributeName(name) {
  return !REGEXP_INVALID_ATTRIBUTE_NAME.test(name);
}

export {
  isPlainObject,
  noCase,
  pascalCase,
  camelCase,
  paramCase,
  escapeAttribute,
  escapeHTML,
  escapeEditableHTML,
  isValidAttributeName
};
/*! Bundled license information:

is-plain-object/dist/is-plain-object.mjs:
  (*!
   * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
   *
   * Copyright (c) 2014-2017, Jon Schlinkert.
   * Released under the MIT License.
   *)
*/
//# sourceMappingURL=chunk-TCNCY7PS.js.map
