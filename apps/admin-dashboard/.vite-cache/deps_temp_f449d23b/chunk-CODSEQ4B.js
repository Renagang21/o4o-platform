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
  escapeAttribute,
  escapeHTML,
  escapeEditableHTML,
  isValidAttributeName
};
//# sourceMappingURL=chunk-CODSEQ4B.js.map
