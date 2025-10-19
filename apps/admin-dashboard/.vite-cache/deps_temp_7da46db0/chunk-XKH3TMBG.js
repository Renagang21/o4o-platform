import {
  BACKSPACE,
  DELETE,
  LEFT,
  RIGHT,
  combineReducers,
  createReduxStore,
  import_react,
  register,
  rememo_default,
  select,
  useMergeRefs,
  usePrevious,
  useRefEffect,
  useRegistry
} from "./chunk-6PYQ5DCB.js";
import {
  __
} from "./chunk-VY73N4T2.js";
import {
  escapeAttribute,
  escapeEditableHTML,
  isValidAttributeName
} from "./chunk-KA2FDFUH.js";
import {
  __commonJS,
  __export,
  __privateAdd,
  __privateGet,
  __privateSet
} from "./chunk-OL46QLBJ.js";

// ../../node_modules/remove-accents/index.js
var require_remove_accents = __commonJS({
  "../../node_modules/remove-accents/index.js"(exports, module) {
    var characterMap = {
      "À": "A",
      "Á": "A",
      "Â": "A",
      "Ã": "A",
      "Ä": "A",
      "Å": "A",
      "Ấ": "A",
      "Ắ": "A",
      "Ẳ": "A",
      "Ẵ": "A",
      "Ặ": "A",
      "Æ": "AE",
      "Ầ": "A",
      "Ằ": "A",
      "Ȃ": "A",
      "Ả": "A",
      "Ạ": "A",
      "Ẩ": "A",
      "Ẫ": "A",
      "Ậ": "A",
      "Ç": "C",
      "Ḉ": "C",
      "È": "E",
      "É": "E",
      "Ê": "E",
      "Ë": "E",
      "Ế": "E",
      "Ḗ": "E",
      "Ề": "E",
      "Ḕ": "E",
      "Ḝ": "E",
      "Ȇ": "E",
      "Ẻ": "E",
      "Ẽ": "E",
      "Ẹ": "E",
      "Ể": "E",
      "Ễ": "E",
      "Ệ": "E",
      "Ì": "I",
      "Í": "I",
      "Î": "I",
      "Ï": "I",
      "Ḯ": "I",
      "Ȋ": "I",
      "Ỉ": "I",
      "Ị": "I",
      "Ð": "D",
      "Ñ": "N",
      "Ò": "O",
      "Ó": "O",
      "Ô": "O",
      "Õ": "O",
      "Ö": "O",
      "Ø": "O",
      "Ố": "O",
      "Ṍ": "O",
      "Ṓ": "O",
      "Ȏ": "O",
      "Ỏ": "O",
      "Ọ": "O",
      "Ổ": "O",
      "Ỗ": "O",
      "Ộ": "O",
      "Ờ": "O",
      "Ở": "O",
      "Ỡ": "O",
      "Ớ": "O",
      "Ợ": "O",
      "Ù": "U",
      "Ú": "U",
      "Û": "U",
      "Ü": "U",
      "Ủ": "U",
      "Ụ": "U",
      "Ử": "U",
      "Ữ": "U",
      "Ự": "U",
      "Ý": "Y",
      "à": "a",
      "á": "a",
      "â": "a",
      "ã": "a",
      "ä": "a",
      "å": "a",
      "ấ": "a",
      "ắ": "a",
      "ẳ": "a",
      "ẵ": "a",
      "ặ": "a",
      "æ": "ae",
      "ầ": "a",
      "ằ": "a",
      "ȃ": "a",
      "ả": "a",
      "ạ": "a",
      "ẩ": "a",
      "ẫ": "a",
      "ậ": "a",
      "ç": "c",
      "ḉ": "c",
      "è": "e",
      "é": "e",
      "ê": "e",
      "ë": "e",
      "ế": "e",
      "ḗ": "e",
      "ề": "e",
      "ḕ": "e",
      "ḝ": "e",
      "ȇ": "e",
      "ẻ": "e",
      "ẽ": "e",
      "ẹ": "e",
      "ể": "e",
      "ễ": "e",
      "ệ": "e",
      "ì": "i",
      "í": "i",
      "î": "i",
      "ï": "i",
      "ḯ": "i",
      "ȋ": "i",
      "ỉ": "i",
      "ị": "i",
      "ð": "d",
      "ñ": "n",
      "ò": "o",
      "ó": "o",
      "ô": "o",
      "õ": "o",
      "ö": "o",
      "ø": "o",
      "ố": "o",
      "ṍ": "o",
      "ṓ": "o",
      "ȏ": "o",
      "ỏ": "o",
      "ọ": "o",
      "ổ": "o",
      "ỗ": "o",
      "ộ": "o",
      "ờ": "o",
      "ở": "o",
      "ỡ": "o",
      "ớ": "o",
      "ợ": "o",
      "ù": "u",
      "ú": "u",
      "û": "u",
      "ü": "u",
      "ủ": "u",
      "ụ": "u",
      "ử": "u",
      "ữ": "u",
      "ự": "u",
      "ý": "y",
      "ÿ": "y",
      "Ā": "A",
      "ā": "a",
      "Ă": "A",
      "ă": "a",
      "Ą": "A",
      "ą": "a",
      "Ć": "C",
      "ć": "c",
      "Ĉ": "C",
      "ĉ": "c",
      "Ċ": "C",
      "ċ": "c",
      "Č": "C",
      "č": "c",
      "C̆": "C",
      "c̆": "c",
      "Ď": "D",
      "ď": "d",
      "Đ": "D",
      "đ": "d",
      "Ē": "E",
      "ē": "e",
      "Ĕ": "E",
      "ĕ": "e",
      "Ė": "E",
      "ė": "e",
      "Ę": "E",
      "ę": "e",
      "Ě": "E",
      "ě": "e",
      "Ĝ": "G",
      "Ǵ": "G",
      "ĝ": "g",
      "ǵ": "g",
      "Ğ": "G",
      "ğ": "g",
      "Ġ": "G",
      "ġ": "g",
      "Ģ": "G",
      "ģ": "g",
      "Ĥ": "H",
      "ĥ": "h",
      "Ħ": "H",
      "ħ": "h",
      "Ḫ": "H",
      "ḫ": "h",
      "Ĩ": "I",
      "ĩ": "i",
      "Ī": "I",
      "ī": "i",
      "Ĭ": "I",
      "ĭ": "i",
      "Į": "I",
      "į": "i",
      "İ": "I",
      "ı": "i",
      "Ĳ": "IJ",
      "ĳ": "ij",
      "Ĵ": "J",
      "ĵ": "j",
      "Ķ": "K",
      "ķ": "k",
      "Ḱ": "K",
      "ḱ": "k",
      "K̆": "K",
      "k̆": "k",
      "Ĺ": "L",
      "ĺ": "l",
      "Ļ": "L",
      "ļ": "l",
      "Ľ": "L",
      "ľ": "l",
      "Ŀ": "L",
      "ŀ": "l",
      "Ł": "l",
      "ł": "l",
      "Ḿ": "M",
      "ḿ": "m",
      "M̆": "M",
      "m̆": "m",
      "Ń": "N",
      "ń": "n",
      "Ņ": "N",
      "ņ": "n",
      "Ň": "N",
      "ň": "n",
      "ŉ": "n",
      "N̆": "N",
      "n̆": "n",
      "Ō": "O",
      "ō": "o",
      "Ŏ": "O",
      "ŏ": "o",
      "Ő": "O",
      "ő": "o",
      "Œ": "OE",
      "œ": "oe",
      "P̆": "P",
      "p̆": "p",
      "Ŕ": "R",
      "ŕ": "r",
      "Ŗ": "R",
      "ŗ": "r",
      "Ř": "R",
      "ř": "r",
      "R̆": "R",
      "r̆": "r",
      "Ȓ": "R",
      "ȓ": "r",
      "Ś": "S",
      "ś": "s",
      "Ŝ": "S",
      "ŝ": "s",
      "Ş": "S",
      "Ș": "S",
      "ș": "s",
      "ş": "s",
      "Š": "S",
      "š": "s",
      "Ţ": "T",
      "ţ": "t",
      "ț": "t",
      "Ț": "T",
      "Ť": "T",
      "ť": "t",
      "Ŧ": "T",
      "ŧ": "t",
      "T̆": "T",
      "t̆": "t",
      "Ũ": "U",
      "ũ": "u",
      "Ū": "U",
      "ū": "u",
      "Ŭ": "U",
      "ŭ": "u",
      "Ů": "U",
      "ů": "u",
      "Ű": "U",
      "ű": "u",
      "Ų": "U",
      "ų": "u",
      "Ȗ": "U",
      "ȗ": "u",
      "V̆": "V",
      "v̆": "v",
      "Ŵ": "W",
      "ŵ": "w",
      "Ẃ": "W",
      "ẃ": "w",
      "X̆": "X",
      "x̆": "x",
      "Ŷ": "Y",
      "ŷ": "y",
      "Ÿ": "Y",
      "Y̆": "Y",
      "y̆": "y",
      "Ź": "Z",
      "ź": "z",
      "Ż": "Z",
      "ż": "z",
      "Ž": "Z",
      "ž": "z",
      "ſ": "s",
      "ƒ": "f",
      "Ơ": "O",
      "ơ": "o",
      "Ư": "U",
      "ư": "u",
      "Ǎ": "A",
      "ǎ": "a",
      "Ǐ": "I",
      "ǐ": "i",
      "Ǒ": "O",
      "ǒ": "o",
      "Ǔ": "U",
      "ǔ": "u",
      "Ǖ": "U",
      "ǖ": "u",
      "Ǘ": "U",
      "ǘ": "u",
      "Ǚ": "U",
      "ǚ": "u",
      "Ǜ": "U",
      "ǜ": "u",
      "Ứ": "U",
      "ứ": "u",
      "Ṹ": "U",
      "ṹ": "u",
      "Ǻ": "A",
      "ǻ": "a",
      "Ǽ": "AE",
      "ǽ": "ae",
      "Ǿ": "O",
      "ǿ": "o",
      "Þ": "TH",
      "þ": "th",
      "Ṕ": "P",
      "ṕ": "p",
      "Ṥ": "S",
      "ṥ": "s",
      "X́": "X",
      "x́": "x",
      "Ѓ": "Г",
      "ѓ": "г",
      "Ќ": "К",
      "ќ": "к",
      "A̋": "A",
      "a̋": "a",
      "E̋": "E",
      "e̋": "e",
      "I̋": "I",
      "i̋": "i",
      "Ǹ": "N",
      "ǹ": "n",
      "Ồ": "O",
      "ồ": "o",
      "Ṑ": "O",
      "ṑ": "o",
      "Ừ": "U",
      "ừ": "u",
      "Ẁ": "W",
      "ẁ": "w",
      "Ỳ": "Y",
      "ỳ": "y",
      "Ȁ": "A",
      "ȁ": "a",
      "Ȅ": "E",
      "ȅ": "e",
      "Ȉ": "I",
      "ȉ": "i",
      "Ȍ": "O",
      "ȍ": "o",
      "Ȑ": "R",
      "ȑ": "r",
      "Ȕ": "U",
      "ȕ": "u",
      "B̌": "B",
      "b̌": "b",
      "Č̣": "C",
      "č̣": "c",
      "Ê̌": "E",
      "ê̌": "e",
      "F̌": "F",
      "f̌": "f",
      "Ǧ": "G",
      "ǧ": "g",
      "Ȟ": "H",
      "ȟ": "h",
      "J̌": "J",
      "ǰ": "j",
      "Ǩ": "K",
      "ǩ": "k",
      "M̌": "M",
      "m̌": "m",
      "P̌": "P",
      "p̌": "p",
      "Q̌": "Q",
      "q̌": "q",
      "Ř̩": "R",
      "ř̩": "r",
      "Ṧ": "S",
      "ṧ": "s",
      "V̌": "V",
      "v̌": "v",
      "W̌": "W",
      "w̌": "w",
      "X̌": "X",
      "x̌": "x",
      "Y̌": "Y",
      "y̌": "y",
      "A̧": "A",
      "a̧": "a",
      "B̧": "B",
      "b̧": "b",
      "Ḑ": "D",
      "ḑ": "d",
      "Ȩ": "E",
      "ȩ": "e",
      "Ɛ̧": "E",
      "ɛ̧": "e",
      "Ḩ": "H",
      "ḩ": "h",
      "I̧": "I",
      "i̧": "i",
      "Ɨ̧": "I",
      "ɨ̧": "i",
      "M̧": "M",
      "m̧": "m",
      "O̧": "O",
      "o̧": "o",
      "Q̧": "Q",
      "q̧": "q",
      "U̧": "U",
      "u̧": "u",
      "X̧": "X",
      "x̧": "x",
      "Z̧": "Z",
      "z̧": "z",
      "й": "и",
      "Й": "И",
      "ё": "е",
      "Ё": "Е"
    };
    var chars = Object.keys(characterMap).join("|");
    var allAccents = new RegExp(chars, "g");
    var firstAccent = new RegExp(chars, "");
    function matcher(match) {
      return characterMap[match];
    }
    var removeAccents = function(string) {
      return string.replace(allAccents, matcher);
    };
    var hasAccents = function(string) {
      return !!string.match(firstAccent);
    };
    module.exports = removeAccents;
    module.exports.has = hasAccents;
    module.exports.remove = removeAccents;
  }
});

// ../../node_modules/fast-deep-equal/es6/index.js
var require_es6 = __commonJS({
  "../../node_modules/fast-deep-equal/es6/index.js"(exports, module) {
    "use strict";
    module.exports = function equal(a2, b2) {
      if (a2 === b2) return true;
      if (a2 && b2 && typeof a2 == "object" && typeof b2 == "object") {
        if (a2.constructor !== b2.constructor) return false;
        var length, i2, keys;
        if (Array.isArray(a2)) {
          length = a2.length;
          if (length != b2.length) return false;
          for (i2 = length; i2-- !== 0; )
            if (!equal(a2[i2], b2[i2])) return false;
          return true;
        }
        if (a2 instanceof Map && b2 instanceof Map) {
          if (a2.size !== b2.size) return false;
          for (i2 of a2.entries())
            if (!b2.has(i2[0])) return false;
          for (i2 of a2.entries())
            if (!equal(i2[1], b2.get(i2[0]))) return false;
          return true;
        }
        if (a2 instanceof Set && b2 instanceof Set) {
          if (a2.size !== b2.size) return false;
          for (i2 of a2.entries())
            if (!b2.has(i2[0])) return false;
          return true;
        }
        if (ArrayBuffer.isView(a2) && ArrayBuffer.isView(b2)) {
          length = a2.length;
          if (length != b2.length) return false;
          for (i2 = length; i2-- !== 0; )
            if (a2[i2] !== b2[i2]) return false;
          return true;
        }
        if (a2.constructor === RegExp) return a2.source === b2.source && a2.flags === b2.flags;
        if (a2.valueOf !== Object.prototype.valueOf) return a2.valueOf() === b2.valueOf();
        if (a2.toString !== Object.prototype.toString) return a2.toString() === b2.toString();
        keys = Object.keys(a2);
        length = keys.length;
        if (length !== Object.keys(b2).length) return false;
        for (i2 = length; i2-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b2, keys[i2])) return false;
        for (i2 = length; i2-- !== 0; ) {
          var key = keys[i2];
          if (!equal(a2[key], b2[key])) return false;
        }
        return true;
      }
      return a2 !== a2 && b2 !== b2;
    };
  }
});

// ../../node_modules/sprintf-js/src/sprintf.js
var require_sprintf = __commonJS({
  "../../node_modules/sprintf-js/src/sprintf.js"(exports) {
    !function() {
      "use strict";
      var re = {
        not_string: /[^s]/,
        not_bool: /[^t]/,
        not_type: /[^T]/,
        not_primitive: /[^v]/,
        number: /[diefg]/,
        numeric_arg: /[bcdiefguxX]/,
        json: /[j]/,
        not_json: /[^j]/,
        text: /^[^\x25]+/,
        modulo: /^\x25{2}/,
        placeholder: /^\x25(?:([1-9]\d*)\$|\(([^)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,
        key: /^([a-z_][a-z_\d]*)/i,
        key_access: /^\.([a-z_][a-z_\d]*)/i,
        index_access: /^\[(\d+)\]/,
        sign: /^[+-]/
      };
      function sprintf2(key) {
        return sprintf_format(sprintf_parse(key), arguments);
      }
      function vsprintf(fmt, argv) {
        return sprintf2.apply(null, [fmt].concat(argv || []));
      }
      function sprintf_format(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, arg, output = "", i2, k2, ph, pad, pad_character, pad_length, is_positive, sign;
        for (i2 = 0; i2 < tree_length; i2++) {
          if (typeof parse_tree[i2] === "string") {
            output += parse_tree[i2];
          } else if (typeof parse_tree[i2] === "object") {
            ph = parse_tree[i2];
            if (ph.keys) {
              arg = argv[cursor];
              for (k2 = 0; k2 < ph.keys.length; k2++) {
                if (arg == void 0) {
                  throw new Error(sprintf2('[sprintf] Cannot access property "%s" of undefined value "%s"', ph.keys[k2], ph.keys[k2 - 1]));
                }
                arg = arg[ph.keys[k2]];
              }
            } else if (ph.param_no) {
              arg = argv[ph.param_no];
            } else {
              arg = argv[cursor++];
            }
            if (re.not_type.test(ph.type) && re.not_primitive.test(ph.type) && arg instanceof Function) {
              arg = arg();
            }
            if (re.numeric_arg.test(ph.type) && (typeof arg !== "number" && isNaN(arg))) {
              throw new TypeError(sprintf2("[sprintf] expecting number but found %T", arg));
            }
            if (re.number.test(ph.type)) {
              is_positive = arg >= 0;
            }
            switch (ph.type) {
              case "b":
                arg = parseInt(arg, 10).toString(2);
                break;
              case "c":
                arg = String.fromCharCode(parseInt(arg, 10));
                break;
              case "d":
              case "i":
                arg = parseInt(arg, 10);
                break;
              case "j":
                arg = JSON.stringify(arg, null, ph.width ? parseInt(ph.width) : 0);
                break;
              case "e":
                arg = ph.precision ? parseFloat(arg).toExponential(ph.precision) : parseFloat(arg).toExponential();
                break;
              case "f":
                arg = ph.precision ? parseFloat(arg).toFixed(ph.precision) : parseFloat(arg);
                break;
              case "g":
                arg = ph.precision ? String(Number(arg.toPrecision(ph.precision))) : parseFloat(arg);
                break;
              case "o":
                arg = (parseInt(arg, 10) >>> 0).toString(8);
                break;
              case "s":
                arg = String(arg);
                arg = ph.precision ? arg.substring(0, ph.precision) : arg;
                break;
              case "t":
                arg = String(!!arg);
                arg = ph.precision ? arg.substring(0, ph.precision) : arg;
                break;
              case "T":
                arg = Object.prototype.toString.call(arg).slice(8, -1).toLowerCase();
                arg = ph.precision ? arg.substring(0, ph.precision) : arg;
                break;
              case "u":
                arg = parseInt(arg, 10) >>> 0;
                break;
              case "v":
                arg = arg.valueOf();
                arg = ph.precision ? arg.substring(0, ph.precision) : arg;
                break;
              case "x":
                arg = (parseInt(arg, 10) >>> 0).toString(16);
                break;
              case "X":
                arg = (parseInt(arg, 10) >>> 0).toString(16).toUpperCase();
                break;
            }
            if (re.json.test(ph.type)) {
              output += arg;
            } else {
              if (re.number.test(ph.type) && (!is_positive || ph.sign)) {
                sign = is_positive ? "+" : "-";
                arg = arg.toString().replace(re.sign, "");
              } else {
                sign = "";
              }
              pad_character = ph.pad_char ? ph.pad_char === "0" ? "0" : ph.pad_char.charAt(1) : " ";
              pad_length = ph.width - (sign + arg).length;
              pad = ph.width ? pad_length > 0 ? pad_character.repeat(pad_length) : "" : "";
              output += ph.align ? sign + arg + pad : pad_character === "0" ? sign + pad + arg : pad + sign + arg;
            }
          }
        }
        return output;
      }
      var sprintf_cache = /* @__PURE__ */ Object.create(null);
      function sprintf_parse(fmt) {
        if (sprintf_cache[fmt]) {
          return sprintf_cache[fmt];
        }
        var _fmt = fmt, match, parse_tree = [], arg_names = 0;
        while (_fmt) {
          if ((match = re.text.exec(_fmt)) !== null) {
            parse_tree.push(match[0]);
          } else if ((match = re.modulo.exec(_fmt)) !== null) {
            parse_tree.push("%");
          } else if ((match = re.placeholder.exec(_fmt)) !== null) {
            if (match[2]) {
              arg_names |= 1;
              var field_list = [], replacement_field = match[2], field_match = [];
              if ((field_match = re.key.exec(replacement_field)) !== null) {
                field_list.push(field_match[1]);
                while ((replacement_field = replacement_field.substring(field_match[0].length)) !== "") {
                  if ((field_match = re.key_access.exec(replacement_field)) !== null) {
                    field_list.push(field_match[1]);
                  } else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
                    field_list.push(field_match[1]);
                  } else {
                    throw new SyntaxError("[sprintf] failed to parse named argument key");
                  }
                }
              } else {
                throw new SyntaxError("[sprintf] failed to parse named argument key");
              }
              match[2] = field_list;
            } else {
              arg_names |= 2;
            }
            if (arg_names === 3) {
              throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported");
            }
            parse_tree.push(
              {
                placeholder: match[0],
                param_no: match[1],
                keys: match[2],
                sign: match[3],
                pad_char: match[4],
                align: match[5],
                width: match[6],
                precision: match[7],
                type: match[8]
              }
            );
          } else {
            throw new SyntaxError("[sprintf] unexpected placeholder");
          }
          _fmt = _fmt.substring(match[0].length);
        }
        return sprintf_cache[fmt] = parse_tree;
      }
      if (typeof exports !== "undefined") {
        exports["sprintf"] = sprintf2;
        exports["vsprintf"] = vsprintf;
      }
      if (typeof window !== "undefined") {
        window["sprintf"] = sprintf2;
        window["vsprintf"] = vsprintf;
        if (typeof define === "function" && define["amd"]) {
          define(function() {
            return {
              "sprintf": sprintf2,
              "vsprintf": vsprintf
            };
          });
        }
      }
    }();
  }
});

// ../../node_modules/memize/dist/index.js
function memize(fn, options) {
  var size = 0;
  var head;
  var tail;
  options = options || {};
  function memoized() {
    var node = head, len = arguments.length, args, i2;
    searchCache: while (node) {
      if (node.args.length !== arguments.length) {
        node = node.next;
        continue;
      }
      for (i2 = 0; i2 < len; i2++) {
        if (node.args[i2] !== arguments[i2]) {
          node = node.next;
          continue searchCache;
        }
      }
      if (node !== head) {
        if (node === tail) {
          tail = node.prev;
        }
        node.prev.next = node.next;
        if (node.next) {
          node.next.prev = node.prev;
        }
        node.next = head;
        node.prev = null;
        head.prev = node;
        head = node;
      }
      return node.val;
    }
    args = new Array(len);
    for (i2 = 0; i2 < len; i2++) {
      args[i2] = arguments[i2];
    }
    node = {
      args,
      // Generate the result from original function
      val: fn.apply(null, args)
    };
    if (head) {
      head.prev = node;
      node.next = head;
    } else {
      tail = node;
    }
    if (size === /** @type {MemizeOptions} */
    options.maxSize) {
      tail = /** @type {MemizeCacheNode} */
      tail.prev;
      tail.next = null;
    } else {
      size++;
    }
    head = node;
    return node.val;
  }
  memoized.clear = function() {
    head = null;
    tail = null;
    size = 0;
  };
  return memoized;
}

// ../../node_modules/colord/index.mjs
var r = { grad: 0.9, turn: 360, rad: 360 / (2 * Math.PI) };
var t = function(r2) {
  return "string" == typeof r2 ? r2.length > 0 : "number" == typeof r2;
};
var n = function(r2, t3, n2) {
  return void 0 === t3 && (t3 = 0), void 0 === n2 && (n2 = Math.pow(10, t3)), Math.round(n2 * r2) / n2 + 0;
};
var e = function(r2, t3, n2) {
  return void 0 === t3 && (t3 = 0), void 0 === n2 && (n2 = 1), r2 > n2 ? n2 : r2 > t3 ? r2 : t3;
};
var u = function(r2) {
  return (r2 = isFinite(r2) ? r2 % 360 : 0) > 0 ? r2 : r2 + 360;
};
var a = function(r2) {
  return { r: e(r2.r, 0, 255), g: e(r2.g, 0, 255), b: e(r2.b, 0, 255), a: e(r2.a) };
};
var o = function(r2) {
  return { r: n(r2.r), g: n(r2.g), b: n(r2.b), a: n(r2.a, 3) };
};
var i = /^#([0-9a-f]{3,8})$/i;
var s = function(r2) {
  var t3 = r2.toString(16);
  return t3.length < 2 ? "0" + t3 : t3;
};
var h = function(r2) {
  var t3 = r2.r, n2 = r2.g, e2 = r2.b, u2 = r2.a, a2 = Math.max(t3, n2, e2), o3 = a2 - Math.min(t3, n2, e2), i2 = o3 ? a2 === t3 ? (n2 - e2) / o3 : a2 === n2 ? 2 + (e2 - t3) / o3 : 4 + (t3 - n2) / o3 : 0;
  return { h: 60 * (i2 < 0 ? i2 + 6 : i2), s: a2 ? o3 / a2 * 100 : 0, v: a2 / 255 * 100, a: u2 };
};
var b = function(r2) {
  var t3 = r2.h, n2 = r2.s, e2 = r2.v, u2 = r2.a;
  t3 = t3 / 360 * 6, n2 /= 100, e2 /= 100;
  var a2 = Math.floor(t3), o3 = e2 * (1 - n2), i2 = e2 * (1 - (t3 - a2) * n2), s2 = e2 * (1 - (1 - t3 + a2) * n2), h2 = a2 % 6;
  return { r: 255 * [e2, i2, o3, o3, s2, e2][h2], g: 255 * [s2, e2, e2, i2, o3, o3][h2], b: 255 * [o3, o3, s2, e2, e2, i2][h2], a: u2 };
};
var g = function(r2) {
  return { h: u(r2.h), s: e(r2.s, 0, 100), l: e(r2.l, 0, 100), a: e(r2.a) };
};
var d = function(r2) {
  return { h: n(r2.h), s: n(r2.s), l: n(r2.l), a: n(r2.a, 3) };
};
var f = function(r2) {
  return b((n2 = (t3 = r2).s, { h: t3.h, s: (n2 *= ((e2 = t3.l) < 50 ? e2 : 100 - e2) / 100) > 0 ? 2 * n2 / (e2 + n2) * 100 : 0, v: e2 + n2, a: t3.a }));
  var t3, n2, e2;
};
var c = function(r2) {
  return { h: (t3 = h(r2)).h, s: (u2 = (200 - (n2 = t3.s)) * (e2 = t3.v) / 100) > 0 && u2 < 200 ? n2 * e2 / 100 / (u2 <= 100 ? u2 : 200 - u2) * 100 : 0, l: u2 / 2, a: t3.a };
  var t3, n2, e2, u2;
};
var l = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var p = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var v = /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var m = /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var y = { string: [[function(r2) {
  var t3 = i.exec(r2);
  return t3 ? (r2 = t3[1]).length <= 4 ? { r: parseInt(r2[0] + r2[0], 16), g: parseInt(r2[1] + r2[1], 16), b: parseInt(r2[2] + r2[2], 16), a: 4 === r2.length ? n(parseInt(r2[3] + r2[3], 16) / 255, 2) : 1 } : 6 === r2.length || 8 === r2.length ? { r: parseInt(r2.substr(0, 2), 16), g: parseInt(r2.substr(2, 2), 16), b: parseInt(r2.substr(4, 2), 16), a: 8 === r2.length ? n(parseInt(r2.substr(6, 2), 16) / 255, 2) : 1 } : null : null;
}, "hex"], [function(r2) {
  var t3 = v.exec(r2) || m.exec(r2);
  return t3 ? t3[2] !== t3[4] || t3[4] !== t3[6] ? null : a({ r: Number(t3[1]) / (t3[2] ? 100 / 255 : 1), g: Number(t3[3]) / (t3[4] ? 100 / 255 : 1), b: Number(t3[5]) / (t3[6] ? 100 / 255 : 1), a: void 0 === t3[7] ? 1 : Number(t3[7]) / (t3[8] ? 100 : 1) }) : null;
}, "rgb"], [function(t3) {
  var n2 = l.exec(t3) || p.exec(t3);
  if (!n2) return null;
  var e2, u2, a2 = g({ h: (e2 = n2[1], u2 = n2[2], void 0 === u2 && (u2 = "deg"), Number(e2) * (r[u2] || 1)), s: Number(n2[3]), l: Number(n2[4]), a: void 0 === n2[5] ? 1 : Number(n2[5]) / (n2[6] ? 100 : 1) });
  return f(a2);
}, "hsl"]], object: [[function(r2) {
  var n2 = r2.r, e2 = r2.g, u2 = r2.b, o3 = r2.a, i2 = void 0 === o3 ? 1 : o3;
  return t(n2) && t(e2) && t(u2) ? a({ r: Number(n2), g: Number(e2), b: Number(u2), a: Number(i2) }) : null;
}, "rgb"], [function(r2) {
  var n2 = r2.h, e2 = r2.s, u2 = r2.l, a2 = r2.a, o3 = void 0 === a2 ? 1 : a2;
  if (!t(n2) || !t(e2) || !t(u2)) return null;
  var i2 = g({ h: Number(n2), s: Number(e2), l: Number(u2), a: Number(o3) });
  return f(i2);
}, "hsl"], [function(r2) {
  var n2 = r2.h, a2 = r2.s, o3 = r2.v, i2 = r2.a, s2 = void 0 === i2 ? 1 : i2;
  if (!t(n2) || !t(a2) || !t(o3)) return null;
  var h2 = function(r3) {
    return { h: u(r3.h), s: e(r3.s, 0, 100), v: e(r3.v, 0, 100), a: e(r3.a) };
  }({ h: Number(n2), s: Number(a2), v: Number(o3), a: Number(s2) });
  return b(h2);
}, "hsv"]] };
var N = function(r2, t3) {
  for (var n2 = 0; n2 < t3.length; n2++) {
    var e2 = t3[n2][0](r2);
    if (e2) return [e2, t3[n2][1]];
  }
  return [null, void 0];
};
var x = function(r2) {
  return "string" == typeof r2 ? N(r2.trim(), y.string) : "object" == typeof r2 && null !== r2 ? N(r2, y.object) : [null, void 0];
};
var M = function(r2, t3) {
  var n2 = c(r2);
  return { h: n2.h, s: e(n2.s + 100 * t3, 0, 100), l: n2.l, a: n2.a };
};
var H = function(r2) {
  return (299 * r2.r + 587 * r2.g + 114 * r2.b) / 1e3 / 255;
};
var $ = function(r2, t3) {
  var n2 = c(r2);
  return { h: n2.h, s: n2.s, l: e(n2.l + 100 * t3, 0, 100), a: n2.a };
};
var j = function() {
  function r2(r3) {
    this.parsed = x(r3)[0], this.rgba = this.parsed || { r: 0, g: 0, b: 0, a: 1 };
  }
  return r2.prototype.isValid = function() {
    return null !== this.parsed;
  }, r2.prototype.brightness = function() {
    return n(H(this.rgba), 2);
  }, r2.prototype.isDark = function() {
    return H(this.rgba) < 0.5;
  }, r2.prototype.isLight = function() {
    return H(this.rgba) >= 0.5;
  }, r2.prototype.toHex = function() {
    return r3 = o(this.rgba), t3 = r3.r, e2 = r3.g, u2 = r3.b, i2 = (a2 = r3.a) < 1 ? s(n(255 * a2)) : "", "#" + s(t3) + s(e2) + s(u2) + i2;
    var r3, t3, e2, u2, a2, i2;
  }, r2.prototype.toRgb = function() {
    return o(this.rgba);
  }, r2.prototype.toRgbString = function() {
    return r3 = o(this.rgba), t3 = r3.r, n2 = r3.g, e2 = r3.b, (u2 = r3.a) < 1 ? "rgba(" + t3 + ", " + n2 + ", " + e2 + ", " + u2 + ")" : "rgb(" + t3 + ", " + n2 + ", " + e2 + ")";
    var r3, t3, n2, e2, u2;
  }, r2.prototype.toHsl = function() {
    return d(c(this.rgba));
  }, r2.prototype.toHslString = function() {
    return r3 = d(c(this.rgba)), t3 = r3.h, n2 = r3.s, e2 = r3.l, (u2 = r3.a) < 1 ? "hsla(" + t3 + ", " + n2 + "%, " + e2 + "%, " + u2 + ")" : "hsl(" + t3 + ", " + n2 + "%, " + e2 + "%)";
    var r3, t3, n2, e2, u2;
  }, r2.prototype.toHsv = function() {
    return r3 = h(this.rgba), { h: n(r3.h), s: n(r3.s), v: n(r3.v), a: n(r3.a, 3) };
    var r3;
  }, r2.prototype.invert = function() {
    return w({ r: 255 - (r3 = this.rgba).r, g: 255 - r3.g, b: 255 - r3.b, a: r3.a });
    var r3;
  }, r2.prototype.saturate = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w(M(this.rgba, r3));
  }, r2.prototype.desaturate = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w(M(this.rgba, -r3));
  }, r2.prototype.grayscale = function() {
    return w(M(this.rgba, -1));
  }, r2.prototype.lighten = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w($(this.rgba, r3));
  }, r2.prototype.darken = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w($(this.rgba, -r3));
  }, r2.prototype.rotate = function(r3) {
    return void 0 === r3 && (r3 = 15), this.hue(this.hue() + r3);
  }, r2.prototype.alpha = function(r3) {
    return "number" == typeof r3 ? w({ r: (t3 = this.rgba).r, g: t3.g, b: t3.b, a: r3 }) : n(this.rgba.a, 3);
    var t3;
  }, r2.prototype.hue = function(r3) {
    var t3 = c(this.rgba);
    return "number" == typeof r3 ? w({ h: r3, s: t3.s, l: t3.l, a: t3.a }) : n(t3.h);
  }, r2.prototype.isEqual = function(r3) {
    return this.toHex() === w(r3).toHex();
  }, r2;
}();
var w = function(r2) {
  return r2 instanceof j ? r2 : new j(r2);
};
var S = [];
var k = function(r2) {
  r2.forEach(function(r3) {
    S.indexOf(r3) < 0 && (r3(j, y), S.push(r3));
  });
};

// ../../node_modules/colord/plugins/names.mjs
function names_default(e2, f2) {
  var a2 = { white: "#ffffff", bisque: "#ffe4c4", blue: "#0000ff", cadetblue: "#5f9ea0", chartreuse: "#7fff00", chocolate: "#d2691e", coral: "#ff7f50", antiquewhite: "#faebd7", aqua: "#00ffff", azure: "#f0ffff", whitesmoke: "#f5f5f5", papayawhip: "#ffefd5", plum: "#dda0dd", blanchedalmond: "#ffebcd", black: "#000000", gold: "#ffd700", goldenrod: "#daa520", gainsboro: "#dcdcdc", cornsilk: "#fff8dc", cornflowerblue: "#6495ed", burlywood: "#deb887", aquamarine: "#7fffd4", beige: "#f5f5dc", crimson: "#dc143c", cyan: "#00ffff", darkblue: "#00008b", darkcyan: "#008b8b", darkgoldenrod: "#b8860b", darkkhaki: "#bdb76b", darkgray: "#a9a9a9", darkgreen: "#006400", darkgrey: "#a9a9a9", peachpuff: "#ffdab9", darkmagenta: "#8b008b", darkred: "#8b0000", darkorchid: "#9932cc", darkorange: "#ff8c00", darkslateblue: "#483d8b", gray: "#808080", darkslategray: "#2f4f4f", darkslategrey: "#2f4f4f", deeppink: "#ff1493", deepskyblue: "#00bfff", wheat: "#f5deb3", firebrick: "#b22222", floralwhite: "#fffaf0", ghostwhite: "#f8f8ff", darkviolet: "#9400d3", magenta: "#ff00ff", green: "#008000", dodgerblue: "#1e90ff", grey: "#808080", honeydew: "#f0fff0", hotpink: "#ff69b4", blueviolet: "#8a2be2", forestgreen: "#228b22", lawngreen: "#7cfc00", indianred: "#cd5c5c", indigo: "#4b0082", fuchsia: "#ff00ff", brown: "#a52a2a", maroon: "#800000", mediumblue: "#0000cd", lightcoral: "#f08080", darkturquoise: "#00ced1", lightcyan: "#e0ffff", ivory: "#fffff0", lightyellow: "#ffffe0", lightsalmon: "#ffa07a", lightseagreen: "#20b2aa", linen: "#faf0e6", mediumaquamarine: "#66cdaa", lemonchiffon: "#fffacd", lime: "#00ff00", khaki: "#f0e68c", mediumseagreen: "#3cb371", limegreen: "#32cd32", mediumspringgreen: "#00fa9a", lightskyblue: "#87cefa", lightblue: "#add8e6", midnightblue: "#191970", lightpink: "#ffb6c1", mistyrose: "#ffe4e1", moccasin: "#ffe4b5", mintcream: "#f5fffa", lightslategray: "#778899", lightslategrey: "#778899", navajowhite: "#ffdead", navy: "#000080", mediumvioletred: "#c71585", powderblue: "#b0e0e6", palegoldenrod: "#eee8aa", oldlace: "#fdf5e6", paleturquoise: "#afeeee", mediumturquoise: "#48d1cc", mediumorchid: "#ba55d3", rebeccapurple: "#663399", lightsteelblue: "#b0c4de", mediumslateblue: "#7b68ee", thistle: "#d8bfd8", tan: "#d2b48c", orchid: "#da70d6", mediumpurple: "#9370db", purple: "#800080", pink: "#ffc0cb", skyblue: "#87ceeb", springgreen: "#00ff7f", palegreen: "#98fb98", red: "#ff0000", yellow: "#ffff00", slateblue: "#6a5acd", lavenderblush: "#fff0f5", peru: "#cd853f", palevioletred: "#db7093", violet: "#ee82ee", teal: "#008080", slategray: "#708090", slategrey: "#708090", aliceblue: "#f0f8ff", darkseagreen: "#8fbc8f", darkolivegreen: "#556b2f", greenyellow: "#adff2f", seagreen: "#2e8b57", seashell: "#fff5ee", tomato: "#ff6347", silver: "#c0c0c0", sienna: "#a0522d", lavender: "#e6e6fa", lightgreen: "#90ee90", orange: "#ffa500", orangered: "#ff4500", steelblue: "#4682b4", royalblue: "#4169e1", turquoise: "#40e0d0", yellowgreen: "#9acd32", salmon: "#fa8072", saddlebrown: "#8b4513", sandybrown: "#f4a460", rosybrown: "#bc8f8f", darksalmon: "#e9967a", lightgoldenrodyellow: "#fafad2", snow: "#fffafa", lightgrey: "#d3d3d3", lightgray: "#d3d3d3", dimgray: "#696969", dimgrey: "#696969", olivedrab: "#6b8e23", olive: "#808000" }, r2 = {};
  for (var d2 in a2) r2[a2[d2]] = d2;
  var l2 = {};
  e2.prototype.toName = function(f3) {
    if (!(this.rgba.a || this.rgba.r || this.rgba.g || this.rgba.b)) return "transparent";
    var d3, i2, n2 = r2[this.toHex()];
    if (n2) return n2;
    if (null == f3 ? void 0 : f3.closest) {
      var o3 = this.toRgb(), t3 = 1 / 0, b2 = "black";
      if (!l2.length) for (var c2 in a2) l2[c2] = new e2(a2[c2]).toRgb();
      for (var g2 in a2) {
        var u2 = (d3 = o3, i2 = l2[g2], Math.pow(d3.r - i2.r, 2) + Math.pow(d3.g - i2.g, 2) + Math.pow(d3.b - i2.b, 2));
        u2 < t3 && (t3 = u2, b2 = g2);
      }
      return b2;
    }
  };
  f2.string.push([function(f3) {
    var r3 = f3.toLowerCase(), d3 = "transparent" === r3 ? "#0000" : a2[r3];
    return d3 ? new e2(d3).toRgb() : null;
  }, "name"]);
}

// ../../node_modules/colord/plugins/a11y.mjs
var o2 = function(o3) {
  var t3 = o3 / 255;
  return t3 < 0.04045 ? t3 / 12.92 : Math.pow((t3 + 0.055) / 1.055, 2.4);
};
var t2 = function(t3) {
  return 0.2126 * o2(t3.r) + 0.7152 * o2(t3.g) + 0.0722 * o2(t3.b);
};
function a11y_default(o3) {
  o3.prototype.luminance = function() {
    return o4 = t2(this.rgba), void 0 === (r2 = 2) && (r2 = 0), void 0 === n2 && (n2 = Math.pow(10, r2)), Math.round(n2 * o4) / n2 + 0;
    var o4, r2, n2;
  }, o3.prototype.contrast = function(r2) {
    void 0 === r2 && (r2 = "#FFF");
    var n2, a2, i2, e2, v2, u2, d2, c2 = r2 instanceof o3 ? r2 : new o3(r2);
    return e2 = this.rgba, v2 = c2.toRgb(), u2 = t2(e2), d2 = t2(v2), n2 = u2 > d2 ? (u2 + 0.05) / (d2 + 0.05) : (d2 + 0.05) / (u2 + 0.05), void 0 === (a2 = 2) && (a2 = 0), void 0 === i2 && (i2 = Math.pow(10, a2)), Math.floor(i2 * n2) / i2 + 0;
  }, o3.prototype.isReadable = function(o4, t3) {
    return void 0 === o4 && (o4 = "#FFF"), void 0 === t3 && (t3 = {}), this.contrast(o4) >= (e2 = void 0 === (i2 = (r2 = t3).size) ? "normal" : i2, "AAA" === (a2 = void 0 === (n2 = r2.level) ? "AA" : n2) && "normal" === e2 ? 7 : "AA" === a2 && "large" === e2 ? 3 : 4.5);
    var r2, n2, a2, i2, e2;
  };
}

// ../../node_modules/@wordpress/rich-text/build-module/special-characters.js
var OBJECT_REPLACEMENT_CHARACTER = "￼";
var ZWNBSP = "\uFEFF";

// ../../node_modules/@wordpress/rich-text/build-module/get-text-content.js
function getTextContent({
  text
}) {
  return text.replace(OBJECT_REPLACEMENT_CHARACTER, "");
}

// ../../node_modules/@wordpress/rich-text/build-module/store/reducer.js
function formatTypes(state = {}, action) {
  switch (action.type) {
    case "ADD_FORMAT_TYPES":
      return {
        ...state,
        // Key format types by their name.
        ...action.formatTypes.reduce((newFormatTypes, type) => ({
          ...newFormatTypes,
          [type.name]: type
        }), {})
      };
    case "REMOVE_FORMAT_TYPES":
      return Object.fromEntries(Object.entries(state).filter(([key]) => !action.names.includes(key)));
  }
  return state;
}
var reducer_default = combineReducers({
  formatTypes
});

// ../../node_modules/@wordpress/rich-text/build-module/store/selectors.js
var selectors_exports = {};
__export(selectors_exports, {
  getFormatType: () => getFormatType,
  getFormatTypeForBareElement: () => getFormatTypeForBareElement,
  getFormatTypeForClassName: () => getFormatTypeForClassName,
  getFormatTypes: () => getFormatTypes
});
var getFormatTypes = rememo_default((state) => Object.values(state.formatTypes), (state) => [state.formatTypes]);
function getFormatType(state, name) {
  return state.formatTypes[name];
}
function getFormatTypeForBareElement(state, bareElementTagName) {
  const formatTypes2 = getFormatTypes(state);
  return formatTypes2.find(({
    className,
    tagName
  }) => {
    return className === null && bareElementTagName === tagName;
  }) || formatTypes2.find(({
    className,
    tagName
  }) => {
    return className === null && "*" === tagName;
  });
}
function getFormatTypeForClassName(state, elementClassName) {
  return getFormatTypes(state).find(({
    className
  }) => {
    if (className === null) {
      return false;
    }
    return ` ${elementClassName} `.indexOf(` ${className} `) >= 0;
  });
}

// ../../node_modules/@wordpress/rich-text/build-module/store/actions.js
var actions_exports = {};
__export(actions_exports, {
  addFormatTypes: () => addFormatTypes,
  removeFormatTypes: () => removeFormatTypes
});
function addFormatTypes(formatTypes2) {
  return {
    type: "ADD_FORMAT_TYPES",
    formatTypes: Array.isArray(formatTypes2) ? formatTypes2 : [formatTypes2]
  };
}
function removeFormatTypes(names) {
  return {
    type: "REMOVE_FORMAT_TYPES",
    names: Array.isArray(names) ? names : [names]
  };
}

// ../../node_modules/@wordpress/rich-text/build-module/store/index.js
var STORE_NAME = "core/rich-text";
var store = createReduxStore(STORE_NAME, {
  reducer: reducer_default,
  selectors: selectors_exports,
  actions: actions_exports
});
register(store);

// ../../node_modules/@wordpress/rich-text/build-module/create-element.js
function createElement({
  implementation
}, html) {
  if (!createElement.body) {
    createElement.body = implementation.createHTMLDocument("").body;
  }
  createElement.body.innerHTML = html;
  return createElement.body;
}

// ../../node_modules/@wordpress/rich-text/build-module/is-format-equal.js
function isFormatEqual(format1, format2) {
  if (format1 === format2) {
    return true;
  }
  if (!format1 || !format2) {
    return false;
  }
  if (format1.type !== format2.type) {
    return false;
  }
  const attributes1 = format1.attributes;
  const attributes2 = format2.attributes;
  if (attributes1 === attributes2) {
    return true;
  }
  if (!attributes1 || !attributes2) {
    return false;
  }
  const keys1 = Object.keys(attributes1);
  const keys2 = Object.keys(attributes2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  const length = keys1.length;
  for (let i2 = 0; i2 < length; i2++) {
    const name = keys1[i2];
    if (attributes1[name] !== attributes2[name]) {
      return false;
    }
  }
  return true;
}

// ../../node_modules/@wordpress/rich-text/build-module/normalise-formats.js
function normaliseFormats(value) {
  const newFormats = value.formats.slice();
  newFormats.forEach((formatsAtIndex, index) => {
    const formatsAtPreviousIndex = newFormats[index - 1];
    if (formatsAtPreviousIndex) {
      const newFormatsAtIndex = formatsAtIndex.slice();
      newFormatsAtIndex.forEach((format, formatIndex) => {
        const previousFormat = formatsAtPreviousIndex[formatIndex];
        if (isFormatEqual(format, previousFormat)) {
          newFormatsAtIndex[formatIndex] = previousFormat;
        }
      });
      newFormats[index] = newFormatsAtIndex;
    }
  });
  return {
    ...value,
    formats: newFormats
  };
}

// ../../node_modules/@wordpress/rich-text/build-module/concat.js
function mergePair(a2, b2) {
  a2.formats = a2.formats.concat(b2.formats);
  a2.replacements = a2.replacements.concat(b2.replacements);
  a2.text += b2.text;
  return a2;
}

// ../../node_modules/@wordpress/rich-text/build-module/get-active-formats.js
function getActiveFormats(value, EMPTY_ACTIVE_FORMATS3 = []) {
  const {
    formats,
    start,
    end,
    activeFormats
  } = value;
  if (start === void 0) {
    return EMPTY_ACTIVE_FORMATS3;
  }
  if (start === end) {
    if (activeFormats) {
      return activeFormats;
    }
    const formatsBefore = formats[start - 1] || EMPTY_ACTIVE_FORMATS3;
    const formatsAfter = formats[start] || EMPTY_ACTIVE_FORMATS3;
    if (formatsBefore.length < formatsAfter.length) {
      return formatsBefore;
    }
    return formatsAfter;
  }
  if (!formats[start]) {
    return EMPTY_ACTIVE_FORMATS3;
  }
  const selectedFormats = formats.slice(start, end);
  const _activeFormats = [...selectedFormats[0]];
  let i2 = selectedFormats.length;
  while (i2--) {
    const formatsAtIndex = selectedFormats[i2];
    if (!formatsAtIndex) {
      return EMPTY_ACTIVE_FORMATS3;
    }
    let ii = _activeFormats.length;
    while (ii--) {
      const format = _activeFormats[ii];
      if (!formatsAtIndex.find((_format) => isFormatEqual(format, _format))) {
        _activeFormats.splice(ii, 1);
      }
    }
    if (_activeFormats.length === 0) {
      return EMPTY_ACTIVE_FORMATS3;
    }
  }
  return _activeFormats || EMPTY_ACTIVE_FORMATS3;
}

// ../../node_modules/@wordpress/rich-text/build-module/get-format-type.js
function getFormatType2(name) {
  return select(store).getFormatType(name);
}

// ../../node_modules/@wordpress/rich-text/build-module/to-tree.js
function restoreOnAttributes(attributes, isEditableTree) {
  if (isEditableTree) {
    return attributes;
  }
  const newAttributes = {};
  for (const key in attributes) {
    let newKey = key;
    if (key.startsWith("data-disable-rich-text-")) {
      newKey = key.slice("data-disable-rich-text-".length);
    }
    newAttributes[newKey] = attributes[key];
  }
  return newAttributes;
}
function fromFormat({
  type,
  tagName,
  attributes,
  unregisteredAttributes,
  object,
  boundaryClass,
  isEditableTree
}) {
  const formatType = getFormatType2(type);
  let elementAttributes = {};
  if (boundaryClass && isEditableTree) {
    elementAttributes["data-rich-text-format-boundary"] = "true";
  }
  if (!formatType) {
    if (attributes) {
      elementAttributes = {
        ...attributes,
        ...elementAttributes
      };
    }
    return {
      type,
      attributes: restoreOnAttributes(elementAttributes, isEditableTree),
      object
    };
  }
  elementAttributes = {
    ...unregisteredAttributes,
    ...elementAttributes
  };
  for (const name in attributes) {
    const key = formatType.attributes ? formatType.attributes[name] : false;
    if (key) {
      elementAttributes[key] = attributes[name];
    } else {
      elementAttributes[name] = attributes[name];
    }
  }
  if (formatType.className) {
    if (elementAttributes.class) {
      elementAttributes.class = `${formatType.className} ${elementAttributes.class}`;
    } else {
      elementAttributes.class = formatType.className;
    }
  }
  if (isEditableTree && formatType.contentEditable === false) {
    elementAttributes.contenteditable = "false";
  }
  return {
    type: tagName || formatType.tagName,
    object: formatType.object,
    attributes: restoreOnAttributes(elementAttributes, isEditableTree)
  };
}
function isEqualUntil(a2, b2, index) {
  do {
    if (a2[index] !== b2[index]) {
      return false;
    }
  } while (index--);
  return true;
}
function toTree({
  value,
  preserveWhiteSpace,
  createEmpty: createEmpty2,
  append: append3,
  getLastChild: getLastChild3,
  getParent: getParent3,
  isText: isText3,
  getText: getText3,
  remove: remove4,
  appendText: appendText3,
  onStartIndex,
  onEndIndex,
  isEditableTree,
  placeholder
}) {
  const {
    formats,
    replacements,
    text,
    start,
    end
  } = value;
  const formatsLength = formats.length + 1;
  const tree = createEmpty2();
  const activeFormats = getActiveFormats(value);
  const deepestActiveFormat = activeFormats[activeFormats.length - 1];
  let lastCharacterFormats;
  let lastCharacter;
  append3(tree, "");
  for (let i2 = 0; i2 < formatsLength; i2++) {
    const character = text.charAt(i2);
    const shouldInsertPadding = isEditableTree && // Pad the line if the line is empty.
    (!lastCharacter || // Pad the line if the previous character is a line break, otherwise
    // the line break won't be visible.
    lastCharacter === "\n");
    const characterFormats = formats[i2];
    let pointer = getLastChild3(tree);
    if (characterFormats) {
      characterFormats.forEach((format, formatIndex) => {
        if (pointer && lastCharacterFormats && // Reuse the last element if all formats remain the same.
        isEqualUntil(characterFormats, lastCharacterFormats, formatIndex)) {
          pointer = getLastChild3(pointer);
          return;
        }
        const {
          type,
          tagName,
          attributes,
          unregisteredAttributes
        } = format;
        const boundaryClass = isEditableTree && format === deepestActiveFormat;
        const parent = getParent3(pointer);
        const newNode = append3(parent, fromFormat({
          type,
          tagName,
          attributes,
          unregisteredAttributes,
          boundaryClass,
          isEditableTree
        }));
        if (isText3(pointer) && getText3(pointer).length === 0) {
          remove4(pointer);
        }
        pointer = append3(newNode, "");
      });
    }
    if (i2 === 0) {
      if (onStartIndex && start === 0) {
        onStartIndex(tree, pointer);
      }
      if (onEndIndex && end === 0) {
        onEndIndex(tree, pointer);
      }
    }
    if (character === OBJECT_REPLACEMENT_CHARACTER) {
      const replacement = replacements[i2];
      if (!replacement) {
        continue;
      }
      const {
        type,
        attributes,
        innerHTML
      } = replacement;
      const formatType = getFormatType2(type);
      if (isEditableTree && type === "#comment") {
        pointer = append3(getParent3(pointer), {
          type: "span",
          attributes: {
            contenteditable: "false",
            "data-rich-text-comment": attributes["data-rich-text-comment"]
          }
        });
        append3(append3(pointer, {
          type: "span"
        }), attributes["data-rich-text-comment"].trim());
      } else if (!isEditableTree && type === "script") {
        pointer = append3(getParent3(pointer), fromFormat({
          type: "script",
          isEditableTree
        }));
        append3(pointer, {
          html: decodeURIComponent(attributes["data-rich-text-script"])
        });
      } else if ((formatType == null ? void 0 : formatType.contentEditable) === false) {
        pointer = append3(getParent3(pointer), fromFormat({
          ...replacement,
          isEditableTree,
          boundaryClass: start === i2 && end === i2 + 1
        }));
        if (innerHTML) {
          append3(pointer, {
            html: innerHTML
          });
        }
      } else {
        pointer = append3(getParent3(pointer), fromFormat({
          ...replacement,
          object: true,
          isEditableTree
        }));
      }
      pointer = append3(getParent3(pointer), "");
    } else if (!preserveWhiteSpace && character === "\n") {
      pointer = append3(getParent3(pointer), {
        type: "br",
        attributes: isEditableTree ? {
          "data-rich-text-line-break": "true"
        } : void 0,
        object: true
      });
      pointer = append3(getParent3(pointer), "");
    } else if (!isText3(pointer)) {
      pointer = append3(getParent3(pointer), character);
    } else {
      appendText3(pointer, character);
    }
    if (onStartIndex && start === i2 + 1) {
      onStartIndex(tree, pointer);
    }
    if (onEndIndex && end === i2 + 1) {
      onEndIndex(tree, pointer);
    }
    if (shouldInsertPadding && i2 === text.length) {
      append3(getParent3(pointer), ZWNBSP);
      if (placeholder && text.length === 0) {
        append3(getParent3(pointer), {
          type: "span",
          attributes: {
            "data-rich-text-placeholder": placeholder,
            // Necessary to prevent the placeholder from catching
            // selection and being editable.
            style: "pointer-events:none;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;"
          }
        });
      }
    }
    lastCharacterFormats = characterFormats;
    lastCharacter = character;
  }
  return tree;
}

// ../../node_modules/@wordpress/rich-text/build-module/to-html-string.js
function toHTMLString({
  value,
  preserveWhiteSpace
}) {
  const tree = toTree({
    value,
    preserveWhiteSpace,
    createEmpty,
    append,
    getLastChild,
    getParent,
    isText,
    getText,
    remove,
    appendText
  });
  return createChildrenHTML(tree.children);
}
function createEmpty() {
  return {};
}
function getLastChild({
  children
}) {
  return children && children[children.length - 1];
}
function append(parent, object) {
  if (typeof object === "string") {
    object = {
      text: object
    };
  }
  object.parent = parent;
  parent.children = parent.children || [];
  parent.children.push(object);
  return object;
}
function appendText(object, text) {
  object.text += text;
}
function getParent({
  parent
}) {
  return parent;
}
function isText({
  text
}) {
  return typeof text === "string";
}
function getText({
  text
}) {
  return text;
}
function remove(object) {
  const index = object.parent.children.indexOf(object);
  if (index !== -1) {
    object.parent.children.splice(index, 1);
  }
  return object;
}
function createElementHTML({
  type,
  attributes,
  object,
  children
}) {
  if (type === "#comment") {
    return `<!--${attributes["data-rich-text-comment"]}-->`;
  }
  let attributeString = "";
  for (const key in attributes) {
    if (!isValidAttributeName(key)) {
      continue;
    }
    attributeString += ` ${key}="${escapeAttribute(attributes[key])}"`;
  }
  if (object) {
    return `<${type}${attributeString}>`;
  }
  return `<${type}${attributeString}>${createChildrenHTML(children)}</${type}>`;
}
function createChildrenHTML(children = []) {
  return children.map((child) => {
    if (child.html !== void 0) {
      return child.html;
    }
    return child.text === void 0 ? createElementHTML(child) : escapeEditableHTML(child.text);
  }).join("");
}

// ../../node_modules/@wordpress/rich-text/build-module/create.js
function createEmptyValue() {
  return {
    formats: [],
    replacements: [],
    text: ""
  };
}
function toFormat({
  tagName,
  attributes
}) {
  let formatType;
  if (attributes && attributes.class) {
    formatType = select(store).getFormatTypeForClassName(attributes.class);
    if (formatType) {
      attributes.class = ` ${attributes.class} `.replace(` ${formatType.className} `, " ").trim();
      if (!attributes.class) {
        delete attributes.class;
      }
    }
  }
  if (!formatType) {
    formatType = select(store).getFormatTypeForBareElement(tagName);
  }
  if (!formatType) {
    return attributes ? {
      type: tagName,
      attributes
    } : {
      type: tagName
    };
  }
  if (formatType.__experimentalCreatePrepareEditableTree && !formatType.__experimentalCreateOnChangeEditableValue) {
    return null;
  }
  if (!attributes) {
    return {
      formatType,
      type: formatType.name,
      tagName
    };
  }
  const registeredAttributes = {};
  const unregisteredAttributes = {};
  const _attributes = {
    ...attributes
  };
  for (const key in formatType.attributes) {
    const name = formatType.attributes[key];
    registeredAttributes[key] = _attributes[name];
    delete _attributes[name];
    if (typeof registeredAttributes[key] === "undefined") {
      delete registeredAttributes[key];
    }
  }
  for (const name in _attributes) {
    unregisteredAttributes[name] = attributes[name];
  }
  if (formatType.contentEditable === false) {
    delete unregisteredAttributes.contenteditable;
  }
  return {
    formatType,
    type: formatType.name,
    tagName,
    attributes: registeredAttributes,
    unregisteredAttributes
  };
}
var _value;
var _RichTextData = class _RichTextData {
  constructor(init = createEmptyValue()) {
    __privateAdd(this, _value);
    __privateSet(this, _value, init);
  }
  static empty() {
    return new _RichTextData();
  }
  static fromPlainText(text) {
    return new _RichTextData(create({
      text
    }));
  }
  static fromHTMLString(html) {
    return new _RichTextData(create({
      html
    }));
  }
  /**
   * Create a RichTextData instance from an HTML element.
   *
   * @param {HTMLElement}                    htmlElement The HTML element to create the instance from.
   * @param {{preserveWhiteSpace?: boolean}} options     Options.
   * @return {RichTextData} The RichTextData instance.
   */
  static fromHTMLElement(htmlElement, options = {}) {
    const {
      preserveWhiteSpace = false
    } = options;
    const element = preserveWhiteSpace ? htmlElement : collapseWhiteSpace(htmlElement);
    const richTextData = new _RichTextData(create({
      element
    }));
    Object.defineProperty(richTextData, "originalHTML", {
      value: htmlElement.innerHTML
    });
    return richTextData;
  }
  toPlainText() {
    return getTextContent(__privateGet(this, _value));
  }
  // We could expose `toHTMLElement` at some point as well, but we'd only use
  // it internally.
  /**
   * Convert the rich text value to an HTML string.
   *
   * @param {{preserveWhiteSpace?: boolean}} options Options.
   * @return {string} The HTML string.
   */
  toHTMLString({
    preserveWhiteSpace
  } = {}) {
    return this.originalHTML || toHTMLString({
      value: __privateGet(this, _value),
      preserveWhiteSpace
    });
  }
  valueOf() {
    return this.toHTMLString();
  }
  toString() {
    return this.toHTMLString();
  }
  toJSON() {
    return this.toHTMLString();
  }
  get length() {
    return this.text.length;
  }
  get formats() {
    return __privateGet(this, _value).formats;
  }
  get replacements() {
    return __privateGet(this, _value).replacements;
  }
  get text() {
    return __privateGet(this, _value).text;
  }
};
_value = new WeakMap();
var RichTextData = _RichTextData;
for (const name of Object.getOwnPropertyNames(String.prototype)) {
  if (RichTextData.prototype.hasOwnProperty(name)) {
    continue;
  }
  Object.defineProperty(RichTextData.prototype, name, {
    value(...args) {
      return this.toHTMLString()[name](...args);
    }
  });
}
function create({
  element,
  text,
  html,
  range,
  __unstableIsEditableTree: isEditableTree
} = {}) {
  if (html instanceof RichTextData) {
    return {
      text: html.text,
      formats: html.formats,
      replacements: html.replacements
    };
  }
  if (typeof text === "string" && text.length > 0) {
    return {
      formats: Array(text.length),
      replacements: Array(text.length),
      text
    };
  }
  if (typeof html === "string" && html.length > 0) {
    element = createElement(document, html);
  }
  if (typeof element !== "object") {
    return createEmptyValue();
  }
  return createFromElement({
    element,
    range,
    isEditableTree
  });
}
function accumulateSelection(accumulator, node, range, value) {
  if (!range) {
    return;
  }
  const {
    parentNode
  } = node;
  const {
    startContainer,
    startOffset,
    endContainer,
    endOffset
  } = range;
  const currentLength = accumulator.text.length;
  if (value.start !== void 0) {
    accumulator.start = currentLength + value.start;
  } else if (node === startContainer && node.nodeType === node.TEXT_NODE) {
    accumulator.start = currentLength + startOffset;
  } else if (parentNode === startContainer && node === startContainer.childNodes[startOffset]) {
    accumulator.start = currentLength;
  } else if (parentNode === startContainer && node === startContainer.childNodes[startOffset - 1]) {
    accumulator.start = currentLength + value.text.length;
  } else if (node === startContainer) {
    accumulator.start = currentLength;
  }
  if (value.end !== void 0) {
    accumulator.end = currentLength + value.end;
  } else if (node === endContainer && node.nodeType === node.TEXT_NODE) {
    accumulator.end = currentLength + endOffset;
  } else if (parentNode === endContainer && node === endContainer.childNodes[endOffset - 1]) {
    accumulator.end = currentLength + value.text.length;
  } else if (parentNode === endContainer && node === endContainer.childNodes[endOffset]) {
    accumulator.end = currentLength;
  } else if (node === endContainer) {
    accumulator.end = currentLength + endOffset;
  }
}
function filterRange(node, range, filter) {
  if (!range) {
    return;
  }
  const {
    startContainer,
    endContainer
  } = range;
  let {
    startOffset,
    endOffset
  } = range;
  if (node === startContainer) {
    startOffset = filter(node.nodeValue.slice(0, startOffset)).length;
  }
  if (node === endContainer) {
    endOffset = filter(node.nodeValue.slice(0, endOffset)).length;
  }
  return {
    startContainer,
    startOffset,
    endContainer,
    endOffset
  };
}
function collapseWhiteSpace(element, isRoot = true) {
  const clone = element.cloneNode(true);
  clone.normalize();
  Array.from(clone.childNodes).forEach((node, i2, nodes) => {
    if (node.nodeType === node.TEXT_NODE) {
      let newNodeValue = node.nodeValue;
      if (/[\n\t\r\f]/.test(newNodeValue)) {
        newNodeValue = newNodeValue.replace(/[\n\t\r\f]+/g, " ");
      }
      if (newNodeValue.indexOf("  ") !== -1) {
        newNodeValue = newNodeValue.replace(/ {2,}/g, " ");
      }
      if (i2 === 0 && newNodeValue.startsWith(" ")) {
        newNodeValue = newNodeValue.slice(1);
      } else if (isRoot && i2 === nodes.length - 1 && newNodeValue.endsWith(" ")) {
        newNodeValue = newNodeValue.slice(0, -1);
      }
      node.nodeValue = newNodeValue;
    } else if (node.nodeType === node.ELEMENT_NODE) {
      collapseWhiteSpace(node, false);
    }
  });
  return clone;
}
var CARRIAGE_RETURN = "\r";
function removeReservedCharacters(string) {
  return string.replace(new RegExp(`[${ZWNBSP}${OBJECT_REPLACEMENT_CHARACTER}${CARRIAGE_RETURN}]`, "gu"), "");
}
function createFromElement({
  element,
  range,
  isEditableTree
}) {
  var _a;
  const accumulator = createEmptyValue();
  if (!element) {
    return accumulator;
  }
  if (!element.hasChildNodes()) {
    accumulateSelection(accumulator, element, range, createEmptyValue());
    return accumulator;
  }
  const length = element.childNodes.length;
  for (let index = 0; index < length; index++) {
    const node = element.childNodes[index];
    const tagName = node.nodeName.toLowerCase();
    if (node.nodeType === node.TEXT_NODE) {
      const text = removeReservedCharacters(node.nodeValue);
      range = filterRange(node, range, removeReservedCharacters);
      accumulateSelection(accumulator, node, range, {
        text
      });
      accumulator.formats.length += text.length;
      accumulator.replacements.length += text.length;
      accumulator.text += text;
      continue;
    }
    if (node.nodeType === node.COMMENT_NODE || node.nodeType === node.ELEMENT_NODE && node.tagName === "SPAN" && node.hasAttribute("data-rich-text-comment")) {
      const value2 = {
        formats: [,],
        replacements: [{
          type: "#comment",
          attributes: {
            "data-rich-text-comment": node.nodeType === node.COMMENT_NODE ? node.nodeValue : node.getAttribute("data-rich-text-comment")
          }
        }],
        text: OBJECT_REPLACEMENT_CHARACTER
      };
      accumulateSelection(accumulator, node, range, value2);
      mergePair(accumulator, value2);
      continue;
    }
    if (node.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    if (isEditableTree && // Ignore any line breaks that are not inserted by us.
    tagName === "br" && !node.getAttribute("data-rich-text-line-break")) {
      accumulateSelection(accumulator, node, range, createEmptyValue());
      continue;
    }
    if (tagName === "script") {
      const value2 = {
        formats: [,],
        replacements: [{
          type: tagName,
          attributes: {
            "data-rich-text-script": node.getAttribute("data-rich-text-script") || encodeURIComponent(node.innerHTML)
          }
        }],
        text: OBJECT_REPLACEMENT_CHARACTER
      };
      accumulateSelection(accumulator, node, range, value2);
      mergePair(accumulator, value2);
      continue;
    }
    if (tagName === "br") {
      accumulateSelection(accumulator, node, range, createEmptyValue());
      mergePair(accumulator, create({
        text: "\n"
      }));
      continue;
    }
    const format = toFormat({
      tagName,
      attributes: getAttributes({
        element: node
      })
    });
    if (((_a = format == null ? void 0 : format.formatType) == null ? void 0 : _a.contentEditable) === false) {
      delete format.formatType;
      accumulateSelection(accumulator, node, range, createEmptyValue());
      mergePair(accumulator, {
        formats: [,],
        replacements: [{
          ...format,
          innerHTML: node.innerHTML
        }],
        text: OBJECT_REPLACEMENT_CHARACTER
      });
      continue;
    }
    if (format) {
      delete format.formatType;
    }
    const value = createFromElement({
      element: node,
      range,
      isEditableTree
    });
    accumulateSelection(accumulator, node, range, value);
    if (!format || node.getAttribute("data-rich-text-placeholder")) {
      mergePair(accumulator, value);
    } else if (value.text.length === 0) {
      if (format.attributes) {
        mergePair(accumulator, {
          formats: [,],
          replacements: [format],
          text: OBJECT_REPLACEMENT_CHARACTER
        });
      }
    } else {
      let mergeFormats = function(formats) {
        if (mergeFormats.formats === formats) {
          return mergeFormats.newFormats;
        }
        const newFormats = formats ? [format, ...formats] : [format];
        mergeFormats.formats = formats;
        mergeFormats.newFormats = newFormats;
        return newFormats;
      };
      mergeFormats.newFormats = [format];
      mergePair(accumulator, {
        ...value,
        formats: Array.from(value.formats, mergeFormats)
      });
    }
  }
  return accumulator;
}
function getAttributes({
  element
}) {
  if (!element.hasAttributes()) {
    return;
  }
  const length = element.attributes.length;
  let accumulator;
  for (let i2 = 0; i2 < length; i2++) {
    const {
      name,
      value
    } = element.attributes[i2];
    if (name.indexOf("data-rich-text-") === 0) {
      continue;
    }
    const safeName = /^on/i.test(name) ? "data-disable-rich-text-" + name : name;
    accumulator = accumulator || {};
    accumulator[safeName] = value;
  }
  return accumulator;
}

// ../../node_modules/@wordpress/rich-text/build-module/is-collapsed.js
function isCollapsed({
  start,
  end
}) {
  if (start === void 0 || end === void 0) {
    return;
  }
  return start === end;
}

// ../../node_modules/@wordpress/rich-text/build-module/remove-format.js
function removeFormat(value, formatType, startIndex = value.start, endIndex = value.end) {
  var _a, _b, _c;
  const {
    formats,
    activeFormats
  } = value;
  const newFormats = formats.slice();
  if (startIndex === endIndex) {
    const format = (_a = newFormats[startIndex]) == null ? void 0 : _a.find(({
      type
    }) => type === formatType);
    if (format) {
      while ((_b = newFormats[startIndex]) == null ? void 0 : _b.find((newFormat) => newFormat === format)) {
        filterFormats(newFormats, startIndex, formatType);
        startIndex--;
      }
      endIndex++;
      while ((_c = newFormats[endIndex]) == null ? void 0 : _c.find((newFormat) => newFormat === format)) {
        filterFormats(newFormats, endIndex, formatType);
        endIndex++;
      }
    }
  } else {
    for (let i2 = startIndex; i2 < endIndex; i2++) {
      if (newFormats[i2]) {
        filterFormats(newFormats, i2, formatType);
      }
    }
  }
  return normaliseFormats({
    ...value,
    formats: newFormats,
    activeFormats: (activeFormats == null ? void 0 : activeFormats.filter(({
      type
    }) => type !== formatType)) || []
  });
}
function filterFormats(formats, index, formatType) {
  const newFormats = formats[index].filter(({
    type
  }) => type !== formatType);
  if (newFormats.length) {
    formats[index] = newFormats;
  } else {
    delete formats[index];
  }
}

// ../../node_modules/@wordpress/rich-text/build-module/insert.js
function insert(value, valueToInsert, startIndex = value.start, endIndex = value.end) {
  const {
    formats,
    replacements,
    text
  } = value;
  if (typeof valueToInsert === "string") {
    valueToInsert = create({
      text: valueToInsert
    });
  }
  const index = startIndex + valueToInsert.text.length;
  return normaliseFormats({
    formats: formats.slice(0, startIndex).concat(valueToInsert.formats, formats.slice(endIndex)),
    replacements: replacements.slice(0, startIndex).concat(valueToInsert.replacements, replacements.slice(endIndex)),
    text: text.slice(0, startIndex) + valueToInsert.text + text.slice(endIndex),
    start: index,
    end: index
  });
}

// ../../node_modules/@wordpress/rich-text/build-module/slice.js
function slice(value, startIndex = value.start, endIndex = value.end) {
  const {
    formats,
    replacements,
    text
  } = value;
  if (startIndex === void 0 || endIndex === void 0) {
    return {
      ...value
    };
  }
  return {
    formats: formats.slice(startIndex, endIndex),
    replacements: replacements.slice(startIndex, endIndex),
    text: text.slice(startIndex, endIndex)
  };
}

// ../../node_modules/@wordpress/a11y/build-module/shared/clear.js
function clear() {
  const regions = document.getElementsByClassName("a11y-speak-region");
  const introText = document.getElementById("a11y-speak-intro-text");
  for (let i2 = 0; i2 < regions.length; i2++) {
    regions[i2].textContent = "";
  }
  if (introText) {
    introText.setAttribute("hidden", "hidden");
  }
}

// ../../node_modules/@wordpress/a11y/build-module/shared/filter-message.js
var previousMessage = "";
function filterMessage(message) {
  message = message.replace(/<[^<>]+>/g, " ");
  if (previousMessage === message) {
    message += " ";
  }
  previousMessage = message;
  return message;
}

// ../../node_modules/@wordpress/a11y/build-module/shared/index.js
function speak(message, ariaLive) {
  clear();
  message = filterMessage(message);
  const introText = document.getElementById("a11y-speak-intro-text");
  const containerAssertive = document.getElementById("a11y-speak-assertive");
  const containerPolite = document.getElementById("a11y-speak-polite");
  if (containerAssertive && ariaLive === "assertive") {
    containerAssertive.textContent = message;
  } else if (containerPolite) {
    containerPolite.textContent = message;
  }
  if (introText) {
    introText.removeAttribute("hidden");
  }
}

// ../../node_modules/@wordpress/dom-ready/build-module/index.js
function domReady(callback) {
  if (typeof document === "undefined") {
    return;
  }
  if (document.readyState === "complete" || // DOMContentLoaded + Images/Styles/etc loaded, so we call directly.
  document.readyState === "interactive") {
    return void callback();
  }
  document.addEventListener("DOMContentLoaded", callback);
}

// ../../node_modules/@wordpress/a11y/build-module/script/add-container.js
function addContainer(ariaLive = "polite") {
  const container = document.createElement("div");
  container.id = `a11y-speak-${ariaLive}`;
  container.className = "a11y-speak-region";
  container.setAttribute("style", "position:absolute;margin:-1px;padding:0;height:1px;width:1px;overflow:hidden;clip-path:inset(50%);border:0;word-wrap:normal !important;");
  container.setAttribute("aria-live", ariaLive);
  container.setAttribute("aria-relevant", "additions text");
  container.setAttribute("aria-atomic", "true");
  const {
    body
  } = document;
  if (body) {
    body.appendChild(container);
  }
  return container;
}

// ../../node_modules/@wordpress/a11y/build-module/script/add-intro-text.js
function addIntroText() {
  const introText = document.createElement("p");
  introText.id = "a11y-speak-intro-text";
  introText.className = "a11y-speak-intro-text";
  introText.textContent = __("Notifications");
  introText.setAttribute("style", "position:absolute;margin:-1px;padding:0;height:1px;width:1px;overflow:hidden;clip-path:inset(50%);border:0;word-wrap:normal !important;");
  introText.setAttribute("hidden", "");
  const {
    body
  } = document;
  if (body) {
    body.appendChild(introText);
  }
  return introText;
}

// ../../node_modules/@wordpress/a11y/build-module/index.js
function setup() {
  const introText = document.getElementById("a11y-speak-intro-text");
  const containerAssertive = document.getElementById("a11y-speak-assertive");
  const containerPolite = document.getElementById("a11y-speak-polite");
  if (introText === null) {
    addIntroText();
  }
  if (containerAssertive === null) {
    addContainer("assertive");
  }
  if (containerPolite === null) {
    addContainer("polite");
  }
}
domReady(setup);

// ../../node_modules/@wordpress/rich-text/build-module/is-range-equal.js
function isRangeEqual(a2, b2) {
  return a2 === b2 || a2 && b2 && a2.startContainer === b2.startContainer && a2.startOffset === b2.startOffset && a2.endContainer === b2.endContainer && a2.endOffset === b2.endOffset;
}

// ../../node_modules/@wordpress/rich-text/build-module/to-dom.js
function createPathToNode(node, rootNode, path) {
  const parentNode = node.parentNode;
  let i2 = 0;
  while (node = node.previousSibling) {
    i2++;
  }
  path = [i2, ...path];
  if (parentNode !== rootNode) {
    path = createPathToNode(parentNode, rootNode, path);
  }
  return path;
}
function getNodeByPath(node, path) {
  path = [...path];
  while (node && path.length > 1) {
    node = node.childNodes[path.shift()];
  }
  return {
    node,
    offset: path[0]
  };
}
function append2(element, child) {
  if (child.html !== void 0) {
    return element.innerHTML += child.html;
  }
  if (typeof child === "string") {
    child = element.ownerDocument.createTextNode(child);
  }
  const {
    type,
    attributes
  } = child;
  if (type) {
    if (type === "#comment") {
      child = element.ownerDocument.createComment(attributes["data-rich-text-comment"]);
    } else {
      child = element.ownerDocument.createElement(type);
      for (const key in attributes) {
        child.setAttribute(key, attributes[key]);
      }
    }
  }
  return element.appendChild(child);
}
function appendText2(node, text) {
  node.appendData(text);
}
function getLastChild2({
  lastChild
}) {
  return lastChild;
}
function getParent2({
  parentNode
}) {
  return parentNode;
}
function isText2(node) {
  return node.nodeType === node.TEXT_NODE;
}
function getText2({
  nodeValue
}) {
  return nodeValue;
}
function remove2(node) {
  return node.parentNode.removeChild(node);
}
function toDom({
  value,
  prepareEditableTree,
  isEditableTree = true,
  placeholder,
  doc = document
}) {
  let startPath = [];
  let endPath = [];
  if (prepareEditableTree) {
    value = {
      ...value,
      formats: prepareEditableTree(value)
    };
  }
  const createEmpty2 = () => createElement(doc, "");
  const tree = toTree({
    value,
    createEmpty: createEmpty2,
    append: append2,
    getLastChild: getLastChild2,
    getParent: getParent2,
    isText: isText2,
    getText: getText2,
    remove: remove2,
    appendText: appendText2,
    onStartIndex(body, pointer) {
      startPath = createPathToNode(pointer, body, [pointer.nodeValue.length]);
    },
    onEndIndex(body, pointer) {
      endPath = createPathToNode(pointer, body, [pointer.nodeValue.length]);
    },
    isEditableTree,
    placeholder
  });
  return {
    body: tree,
    selection: {
      startPath,
      endPath
    }
  };
}
function apply({
  value,
  current,
  prepareEditableTree,
  __unstableDomOnly,
  placeholder
}) {
  const {
    body,
    selection
  } = toDom({
    value,
    prepareEditableTree,
    placeholder,
    doc: current.ownerDocument
  });
  applyValue(body, current);
  if (value.start !== void 0 && !__unstableDomOnly) {
    applySelection(selection, current);
  }
}
function applyValue(future, current) {
  let i2 = 0;
  let futureChild;
  while (futureChild = future.firstChild) {
    const currentChild = current.childNodes[i2];
    if (!currentChild) {
      current.appendChild(futureChild);
    } else if (!currentChild.isEqualNode(futureChild)) {
      if (currentChild.nodeName !== futureChild.nodeName || currentChild.nodeType === currentChild.TEXT_NODE && currentChild.data !== futureChild.data) {
        current.replaceChild(futureChild, currentChild);
      } else {
        const currentAttributes = currentChild.attributes;
        const futureAttributes = futureChild.attributes;
        if (currentAttributes) {
          let ii = currentAttributes.length;
          while (ii--) {
            const {
              name
            } = currentAttributes[ii];
            if (!futureChild.getAttribute(name)) {
              currentChild.removeAttribute(name);
            }
          }
        }
        if (futureAttributes) {
          for (let ii = 0; ii < futureAttributes.length; ii++) {
            const {
              name,
              value
            } = futureAttributes[ii];
            if (currentChild.getAttribute(name) !== value) {
              currentChild.setAttribute(name, value);
            }
          }
        }
        applyValue(futureChild, currentChild);
        future.removeChild(futureChild);
      }
    } else {
      future.removeChild(futureChild);
    }
    i2++;
  }
  while (current.childNodes[i2]) {
    current.removeChild(current.childNodes[i2]);
  }
}
function applySelection({
  startPath,
  endPath
}, current) {
  const {
    node: startContainer,
    offset: startOffset
  } = getNodeByPath(current, startPath);
  const {
    node: endContainer,
    offset: endOffset
  } = getNodeByPath(current, endPath);
  const {
    ownerDocument
  } = current;
  const {
    defaultView
  } = ownerDocument;
  const selection = defaultView.getSelection();
  const range = ownerDocument.createRange();
  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);
  const {
    activeElement
  } = ownerDocument;
  if (selection.rangeCount > 0) {
    if (isRangeEqual(range, selection.getRangeAt(0))) {
      return;
    }
    selection.removeAllRanges();
  }
  selection.addRange(range);
  if (activeElement !== ownerDocument.activeElement) {
    if (activeElement instanceof defaultView.HTMLElement) {
      activeElement.focus();
    }
  }
}

// ../../node_modules/@wordpress/rich-text/build-module/component/use-default-style.js
var whiteSpace = "pre-wrap";
var minWidth = "1px";
function useDefaultStyle() {
  return (0, import_react.useCallback)((element) => {
    if (!element) {
      return;
    }
    element.style.whiteSpace = whiteSpace;
    element.style.minWidth = minWidth;
  }, []);
}

// ../../node_modules/@wordpress/rich-text/build-module/component/use-boundary-style.js
function useBoundaryStyle({
  record
}) {
  const ref = (0, import_react.useRef)();
  const {
    activeFormats = [],
    replacements,
    start
  } = record.current;
  const activeReplacement = replacements[start];
  (0, import_react.useEffect)(() => {
    if ((!activeFormats || !activeFormats.length) && !activeReplacement) {
      return;
    }
    const boundarySelector = "*[data-rich-text-format-boundary]";
    const element = ref.current.querySelector(boundarySelector);
    if (!element) {
      return;
    }
    const {
      ownerDocument
    } = element;
    const {
      defaultView
    } = ownerDocument;
    const computedStyle = defaultView.getComputedStyle(element);
    const newColor = w(computedStyle.color).alpha(0.2).toRgbString();
    const selector = `.rich-text:focus ${boundarySelector}`;
    const rule = `background-color: ${newColor}`;
    const style = `${selector} {${rule}}`;
    const globalStyleId = "rich-text-boundary-style";
    let globalStyle = ownerDocument.getElementById(globalStyleId);
    if (!globalStyle) {
      globalStyle = ownerDocument.createElement("style");
      globalStyle.id = globalStyleId;
      ownerDocument.head.appendChild(globalStyle);
    }
    if (globalStyle.innerHTML !== style) {
      globalStyle.innerHTML = style;
    }
  }, [activeFormats, activeReplacement]);
  return ref;
}

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/copy-handler.js
var copy_handler_default = (props) => (element) => {
  function onCopy(event) {
    const {
      record
    } = props.current;
    const {
      ownerDocument
    } = element;
    if (isCollapsed(record.current) || !element.contains(ownerDocument.activeElement)) {
      return;
    }
    const selectedRecord = slice(record.current);
    const plainText = getTextContent(selectedRecord);
    const html = toHTMLString({
      value: selectedRecord
    });
    event.clipboardData.setData("text/plain", plainText);
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("rich-text", "true");
    event.preventDefault();
    if (event.type === "cut") {
      ownerDocument.execCommand("delete");
    }
  }
  const {
    defaultView
  } = element.ownerDocument;
  defaultView.addEventListener("copy", onCopy);
  defaultView.addEventListener("cut", onCopy);
  return () => {
    defaultView.removeEventListener("copy", onCopy);
    defaultView.removeEventListener("cut", onCopy);
  };
};

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/select-object.js
var select_object_default = () => (element) => {
  function onClick(event) {
    const {
      target
    } = event;
    if (target === element || target.textContent && target.isContentEditable) {
      return;
    }
    const {
      ownerDocument
    } = target;
    const {
      defaultView
    } = ownerDocument;
    const selection = defaultView.getSelection();
    if (selection.containsNode(target)) {
      return;
    }
    const range = ownerDocument.createRange();
    const nodeToSelect = target.isContentEditable ? target : target.closest("[contenteditable]");
    range.selectNode(nodeToSelect);
    selection.removeAllRanges();
    selection.addRange(range);
    event.preventDefault();
  }
  function onFocusIn(event) {
    if (event.relatedTarget && !element.contains(event.relatedTarget) && event.relatedTarget.tagName === "A") {
      onClick(event);
    }
  }
  element.addEventListener("click", onClick);
  element.addEventListener("focusin", onFocusIn);
  return () => {
    element.removeEventListener("click", onClick);
    element.removeEventListener("focusin", onFocusIn);
  };
};

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/format-boundaries.js
var EMPTY_ACTIVE_FORMATS = [];
var format_boundaries_default = (props) => (element) => {
  function onKeyDown(event) {
    const {
      keyCode,
      shiftKey,
      altKey,
      metaKey,
      ctrlKey
    } = event;
    if (
      // Only override left and right keys without modifiers pressed.
      shiftKey || altKey || metaKey || ctrlKey || keyCode !== LEFT && keyCode !== RIGHT
    ) {
      return;
    }
    const {
      record,
      applyRecord,
      forceRender
    } = props.current;
    const {
      text,
      formats,
      start,
      end,
      activeFormats: currentActiveFormats = []
    } = record.current;
    const collapsed = isCollapsed(record.current);
    const {
      ownerDocument
    } = element;
    const {
      defaultView
    } = ownerDocument;
    const {
      direction
    } = defaultView.getComputedStyle(element);
    const reverseKey = direction === "rtl" ? RIGHT : LEFT;
    const isReverse = event.keyCode === reverseKey;
    if (collapsed && currentActiveFormats.length === 0) {
      if (start === 0 && isReverse) {
        return;
      }
      if (end === text.length && !isReverse) {
        return;
      }
    }
    if (!collapsed) {
      return;
    }
    const formatsBefore = formats[start - 1] || EMPTY_ACTIVE_FORMATS;
    const formatsAfter = formats[start] || EMPTY_ACTIVE_FORMATS;
    const destination = isReverse ? formatsBefore : formatsAfter;
    const isIncreasing = currentActiveFormats.every((format, index) => format === destination[index]);
    let newActiveFormatsLength = currentActiveFormats.length;
    if (!isIncreasing) {
      newActiveFormatsLength--;
    } else if (newActiveFormatsLength < destination.length) {
      newActiveFormatsLength++;
    }
    if (newActiveFormatsLength === currentActiveFormats.length) {
      record.current._newActiveFormats = destination;
      return;
    }
    event.preventDefault();
    const origin = isReverse ? formatsAfter : formatsBefore;
    const source = isIncreasing ? destination : origin;
    const newActiveFormats = source.slice(0, newActiveFormatsLength);
    const newValue = {
      ...record.current,
      activeFormats: newActiveFormats
    };
    record.current = newValue;
    applyRecord(newValue);
    forceRender();
  }
  element.addEventListener("keydown", onKeyDown);
  return () => {
    element.removeEventListener("keydown", onKeyDown);
  };
};

// ../../node_modules/@wordpress/rich-text/build-module/remove.js
function remove3(value, startIndex, endIndex) {
  return insert(value, create(), startIndex, endIndex);
}

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/delete.js
var delete_default = (props) => (element) => {
  function onKeyDown(event) {
    const {
      keyCode
    } = event;
    const {
      createRecord,
      handleChange
    } = props.current;
    if (event.defaultPrevented) {
      return;
    }
    if (keyCode !== DELETE && keyCode !== BACKSPACE) {
      return;
    }
    const currentValue = createRecord();
    const {
      start,
      end,
      text
    } = currentValue;
    if (start === 0 && end !== 0 && end === text.length) {
      handleChange(remove3(currentValue));
      event.preventDefault();
    }
  }
  element.addEventListener("keydown", onKeyDown);
  return () => {
    element.removeEventListener("keydown", onKeyDown);
  };
};

// ../../node_modules/@wordpress/rich-text/build-module/update-formats.js
function updateFormats({
  value,
  start,
  end,
  formats
}) {
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const formatsBefore = value.formats[min - 1] || [];
  const formatsAfter = value.formats[max] || [];
  value.activeFormats = formats.map((format, index) => {
    if (formatsBefore[index]) {
      if (isFormatEqual(format, formatsBefore[index])) {
        return formatsBefore[index];
      }
    } else if (formatsAfter[index]) {
      if (isFormatEqual(format, formatsAfter[index])) {
        return formatsAfter[index];
      }
    }
    return format;
  });
  while (--end >= start) {
    if (value.activeFormats.length > 0) {
      value.formats[end] = value.activeFormats;
    } else {
      delete value.formats[end];
    }
  }
  return value;
}

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/input-and-selection.js
var INSERTION_INPUT_TYPES_TO_IGNORE = /* @__PURE__ */ new Set(["insertParagraph", "insertOrderedList", "insertUnorderedList", "insertHorizontalRule", "insertLink"]);
var EMPTY_ACTIVE_FORMATS2 = [];
var PLACEHOLDER_ATTR_NAME = "data-rich-text-placeholder";
function fixPlaceholderSelection(defaultView) {
  const selection = defaultView.getSelection();
  const {
    anchorNode,
    anchorOffset
  } = selection;
  if (anchorNode.nodeType !== anchorNode.ELEMENT_NODE) {
    return;
  }
  const targetNode = anchorNode.childNodes[anchorOffset];
  if (!targetNode || targetNode.nodeType !== targetNode.ELEMENT_NODE || !targetNode.hasAttribute(PLACEHOLDER_ATTR_NAME)) {
    return;
  }
  selection.collapseToStart();
}
var input_and_selection_default = (props) => (element) => {
  const {
    ownerDocument
  } = element;
  const {
    defaultView
  } = ownerDocument;
  let isComposing = false;
  function onInput(event) {
    if (isComposing) {
      return;
    }
    let inputType;
    if (event) {
      inputType = event.inputType;
    }
    const {
      record,
      applyRecord,
      createRecord,
      handleChange
    } = props.current;
    if (inputType && (inputType.indexOf("format") === 0 || INSERTION_INPUT_TYPES_TO_IGNORE.has(inputType))) {
      applyRecord(record.current);
      return;
    }
    const currentValue = createRecord();
    const {
      start,
      activeFormats: oldActiveFormats = []
    } = record.current;
    const change = updateFormats({
      value: currentValue,
      start,
      end: currentValue.start,
      formats: oldActiveFormats
    });
    handleChange(change);
  }
  function handleSelectionChange() {
    const {
      record,
      applyRecord,
      createRecord,
      onSelectionChange
    } = props.current;
    if (element.contentEditable !== "true") {
      return;
    }
    if (ownerDocument.activeElement !== element) {
      ownerDocument.removeEventListener("selectionchange", handleSelectionChange);
      return;
    }
    if (isComposing) {
      return;
    }
    const {
      start,
      end,
      text
    } = createRecord();
    const oldRecord = record.current;
    if (text !== oldRecord.text) {
      onInput();
      return;
    }
    if (start === oldRecord.start && end === oldRecord.end) {
      if (oldRecord.text.length === 0 && start === 0) {
        fixPlaceholderSelection(defaultView);
      }
      return;
    }
    const newValue = {
      ...oldRecord,
      start,
      end,
      // _newActiveFormats may be set on arrow key navigation to control
      // the right boundary position. If undefined, getActiveFormats will
      // give the active formats according to the browser.
      activeFormats: oldRecord._newActiveFormats,
      _newActiveFormats: void 0
    };
    const newActiveFormats = getActiveFormats(newValue, EMPTY_ACTIVE_FORMATS2);
    newValue.activeFormats = newActiveFormats;
    record.current = newValue;
    applyRecord(newValue, {
      domOnly: true
    });
    onSelectionChange(start, end);
  }
  function onCompositionStart() {
    var _a;
    isComposing = true;
    ownerDocument.removeEventListener("selectionchange", handleSelectionChange);
    (_a = element.querySelector(`[${PLACEHOLDER_ATTR_NAME}]`)) == null ? void 0 : _a.remove();
  }
  function onCompositionEnd() {
    isComposing = false;
    onInput({
      inputType: "insertText"
    });
    ownerDocument.addEventListener("selectionchange", handleSelectionChange);
  }
  function onFocus() {
    const {
      record,
      isSelected,
      onSelectionChange,
      applyRecord
    } = props.current;
    if (element.parentElement.closest('[contenteditable="true"]')) {
      return;
    }
    if (!isSelected) {
      const index = void 0;
      record.current = {
        ...record.current,
        start: index,
        end: index,
        activeFormats: EMPTY_ACTIVE_FORMATS2
      };
    } else {
      applyRecord(record.current, {
        domOnly: true
      });
    }
    onSelectionChange(record.current.start, record.current.end);
    window.queueMicrotask(handleSelectionChange);
    ownerDocument.addEventListener("selectionchange", handleSelectionChange);
  }
  element.addEventListener("input", onInput);
  element.addEventListener("compositionstart", onCompositionStart);
  element.addEventListener("compositionend", onCompositionEnd);
  element.addEventListener("focus", onFocus);
  return () => {
    element.removeEventListener("input", onInput);
    element.removeEventListener("compositionstart", onCompositionStart);
    element.removeEventListener("compositionend", onCompositionEnd);
    element.removeEventListener("focus", onFocus);
  };
};

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/selection-change-compat.js
var selection_change_compat_default = () => (element) => {
  const {
    ownerDocument
  } = element;
  const {
    defaultView
  } = ownerDocument;
  const selection = defaultView == null ? void 0 : defaultView.getSelection();
  let range;
  function getRange() {
    return selection.rangeCount ? selection.getRangeAt(0) : null;
  }
  function onDown(event) {
    const type = event.type === "keydown" ? "keyup" : "pointerup";
    function onCancel() {
      ownerDocument.removeEventListener(type, onUp);
      ownerDocument.removeEventListener("selectionchange", onCancel);
      ownerDocument.removeEventListener("input", onCancel);
    }
    function onUp() {
      onCancel();
      if (isRangeEqual(range, getRange())) {
        return;
      }
      ownerDocument.dispatchEvent(new Event("selectionchange"));
    }
    ownerDocument.addEventListener(type, onUp);
    ownerDocument.addEventListener("selectionchange", onCancel);
    ownerDocument.addEventListener("input", onCancel);
    range = getRange();
  }
  element.addEventListener("pointerdown", onDown);
  element.addEventListener("keydown", onDown);
  return () => {
    element.removeEventListener("pointerdown", onDown);
    element.removeEventListener("keydown", onDown);
  };
};

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/prevent-focus-capture.js
function preventFocusCapture() {
  return (element) => {
    const {
      ownerDocument
    } = element;
    const {
      defaultView
    } = ownerDocument;
    let value = null;
    function onPointerDown(event) {
      if (event.defaultPrevented) {
        return;
      }
      if (event.target === element) {
        return;
      }
      if (!event.target.contains(element)) {
        return;
      }
      value = element.getAttribute("contenteditable");
      element.setAttribute("contenteditable", "false");
      defaultView.getSelection().removeAllRanges();
    }
    function onPointerUp() {
      if (value !== null) {
        element.setAttribute("contenteditable", value);
        value = null;
      }
    }
    defaultView.addEventListener("pointerdown", onPointerDown);
    defaultView.addEventListener("pointerup", onPointerUp);
    return () => {
      defaultView.removeEventListener("pointerdown", onPointerDown);
      defaultView.removeEventListener("pointerup", onPointerUp);
    };
  };
}

// ../../node_modules/@wordpress/rich-text/build-module/component/event-listeners/index.js
var allEventListeners = [copy_handler_default, select_object_default, format_boundaries_default, delete_default, input_and_selection_default, selection_change_compat_default, preventFocusCapture];
function useEventListeners(props) {
  const propsRef = (0, import_react.useRef)(props);
  (0, import_react.useInsertionEffect)(() => {
    propsRef.current = props;
  });
  const refEffects = (0, import_react.useMemo)(() => allEventListeners.map((refEffect) => refEffect(propsRef)), [propsRef]);
  return useRefEffect((element) => {
    const cleanups = refEffects.map((effect) => effect(element));
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [refEffects]);
}

// ../../node_modules/@wordpress/rich-text/build-module/component/index.js
function useRichText({
  value = "",
  selectionStart,
  selectionEnd,
  placeholder,
  onSelectionChange,
  preserveWhiteSpace,
  onChange,
  __unstableDisableFormats: disableFormats,
  __unstableIsSelected: isSelected,
  __unstableDependencies = [],
  __unstableAfterParse,
  __unstableBeforeSerialize,
  __unstableAddInvisibleFormats
}) {
  const registry = useRegistry();
  const [, forceRender] = (0, import_react.useReducer)(() => ({}));
  const ref = (0, import_react.useRef)();
  function createRecord() {
    const {
      ownerDocument: {
        defaultView
      }
    } = ref.current;
    const selection = defaultView.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    return create({
      element: ref.current,
      range,
      __unstableIsEditableTree: true
    });
  }
  function applyRecord(newRecord, {
    domOnly
  } = {}) {
    apply({
      value: newRecord,
      current: ref.current,
      prepareEditableTree: __unstableAddInvisibleFormats,
      __unstableDomOnly: domOnly,
      placeholder
    });
  }
  const _valueRef = (0, import_react.useRef)(value);
  const recordRef = (0, import_react.useRef)();
  function setRecordFromProps() {
    _valueRef.current = value;
    recordRef.current = value;
    if (!(value instanceof RichTextData)) {
      recordRef.current = value ? RichTextData.fromHTMLString(value, {
        preserveWhiteSpace
      }) : RichTextData.empty();
    }
    recordRef.current = {
      text: recordRef.current.text,
      formats: recordRef.current.formats,
      replacements: recordRef.current.replacements
    };
    if (disableFormats) {
      recordRef.current.formats = Array(value.length);
      recordRef.current.replacements = Array(value.length);
    }
    if (__unstableAfterParse) {
      recordRef.current.formats = __unstableAfterParse(recordRef.current);
    }
    recordRef.current.start = selectionStart;
    recordRef.current.end = selectionEnd;
  }
  const hadSelectionUpdateRef = (0, import_react.useRef)(false);
  if (!recordRef.current) {
    hadSelectionUpdateRef.current = isSelected;
    setRecordFromProps();
  } else if (selectionStart !== recordRef.current.start || selectionEnd !== recordRef.current.end) {
    hadSelectionUpdateRef.current = isSelected;
    recordRef.current = {
      ...recordRef.current,
      start: selectionStart,
      end: selectionEnd,
      activeFormats: void 0
    };
  }
  function handleChange(newRecord) {
    recordRef.current = newRecord;
    applyRecord(newRecord);
    if (disableFormats) {
      _valueRef.current = newRecord.text;
    } else {
      const newFormats = __unstableBeforeSerialize ? __unstableBeforeSerialize(newRecord) : newRecord.formats;
      newRecord = {
        ...newRecord,
        formats: newFormats
      };
      if (typeof value === "string") {
        _valueRef.current = toHTMLString({
          value: newRecord,
          preserveWhiteSpace
        });
      } else {
        _valueRef.current = new RichTextData(newRecord);
      }
    }
    const {
      start,
      end,
      formats,
      text
    } = recordRef.current;
    registry.batch(() => {
      onSelectionChange(start, end);
      onChange(_valueRef.current, {
        __unstableFormats: formats,
        __unstableText: text
      });
    });
    forceRender();
  }
  function applyFromProps() {
    setRecordFromProps();
    applyRecord(recordRef.current);
  }
  const didMountRef = (0, import_react.useRef)(false);
  (0, import_react.useLayoutEffect)(() => {
    if (didMountRef.current && value !== _valueRef.current) {
      applyFromProps();
      forceRender();
    }
  }, [value]);
  (0, import_react.useLayoutEffect)(() => {
    if (!hadSelectionUpdateRef.current) {
      return;
    }
    if (ref.current.ownerDocument.activeElement !== ref.current) {
      ref.current.focus();
    }
    applyRecord(recordRef.current);
    hadSelectionUpdateRef.current = false;
  }, [hadSelectionUpdateRef.current]);
  const mergedRefs = useMergeRefs([ref, useDefaultStyle(), useBoundaryStyle({
    record: recordRef
  }), useEventListeners({
    record: recordRef,
    handleChange,
    applyRecord,
    createRecord,
    isSelected,
    onSelectionChange,
    forceRender
  }), useRefEffect(() => {
    applyFromProps();
    didMountRef.current = true;
  }, [placeholder, ...__unstableDependencies])]);
  return {
    value: recordRef.current,
    // A function to get the most recent value so event handlers in
    // useRichText implementations have access to it. For example when
    // listening to input events, we internally update the state, but this
    // state is not yet available to the input event handler because React
    // may re-render asynchronously.
    getValue: () => recordRef.current,
    onChange: handleChange,
    ref: mergedRefs
  };
}

// ../../node_modules/@wordpress/rich-text/build-module/get-active-format.js
function getActiveFormat(value, formatType) {
  return getActiveFormats(value).find(({
    type
  }) => type === formatType);
}

// ../../node_modules/@wordpress/rich-text/build-module/get-active-object.js
function getActiveObject({
  start,
  end,
  replacements,
  text
}) {
  if (start + 1 !== end || text[start] !== OBJECT_REPLACEMENT_CHARACTER) {
    return;
  }
  return replacements[start];
}

// ../../node_modules/@wordpress/rich-text/build-module/is-empty.js
function isEmpty({
  text
}) {
  return text.length === 0;
}

// ../../node_modules/@wordpress/rich-text/build-module/split.js
function split({
  formats,
  replacements,
  text,
  start,
  end
}, string) {
  if (typeof string !== "string") {
    return splitAtSelection(...arguments);
  }
  let nextStart = 0;
  return text.split(string).map((substring) => {
    const startIndex = nextStart;
    const value = {
      formats: formats.slice(startIndex, startIndex + substring.length),
      replacements: replacements.slice(startIndex, startIndex + substring.length),
      text: substring
    };
    nextStart += string.length + substring.length;
    if (start !== void 0 && end !== void 0) {
      if (start >= startIndex && start < nextStart) {
        value.start = start - startIndex;
      } else if (start < startIndex && end > startIndex) {
        value.start = 0;
      }
      if (end >= startIndex && end < nextStart) {
        value.end = end - startIndex;
      } else if (start < nextStart && end > nextStart) {
        value.end = substring.length;
      }
    }
    return value;
  });
}
function splitAtSelection({
  formats,
  replacements,
  text,
  start,
  end
}, startIndex = start, endIndex = end) {
  if (start === void 0 || end === void 0) {
    return;
  }
  const before = {
    formats: formats.slice(0, startIndex),
    replacements: replacements.slice(0, startIndex),
    text: text.slice(0, startIndex)
  };
  const after = {
    formats: formats.slice(endIndex),
    replacements: replacements.slice(endIndex),
    text: text.slice(endIndex),
    start: 0,
    end: 0
  };
  return [before, after];
}

// ../../node_modules/@wordpress/rich-text/build-module/component/use-anchor.js
function getFormatElement(range, editableContentElement, tagName, className) {
  let element = range.startContainer;
  if (element.nodeType === element.TEXT_NODE && range.startOffset === element.length && element.nextSibling) {
    element = element.nextSibling;
    while (element.firstChild) {
      element = element.firstChild;
    }
  }
  if (element.nodeType !== element.ELEMENT_NODE) {
    element = element.parentElement;
  }
  if (!element) {
    return;
  }
  if (element === editableContentElement) {
    return;
  }
  if (!editableContentElement.contains(element)) {
    return;
  }
  const selector = tagName + (className ? "." + className : "");
  while (element !== editableContentElement) {
    if (element.matches(selector)) {
      return element;
    }
    element = element.parentElement;
  }
}
function createVirtualAnchorElement(range, editableContentElement) {
  return {
    contextElement: editableContentElement,
    getBoundingClientRect() {
      return editableContentElement.contains(range.startContainer) ? range.getBoundingClientRect() : editableContentElement.getBoundingClientRect();
    }
  };
}
function getAnchor(editableContentElement, tagName, className) {
  if (!editableContentElement) {
    return;
  }
  const {
    ownerDocument
  } = editableContentElement;
  const {
    defaultView
  } = ownerDocument;
  const selection = defaultView.getSelection();
  if (!selection) {
    return;
  }
  if (!selection.rangeCount) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (!range || !range.startContainer) {
    return;
  }
  const formatElement = getFormatElement(range, editableContentElement, tagName, className);
  if (formatElement) {
    return formatElement;
  }
  return createVirtualAnchorElement(range, editableContentElement);
}
function useAnchor({
  editableContentElement,
  settings = {}
}) {
  const {
    tagName,
    className,
    isActive
  } = settings;
  const [anchor, setAnchor] = (0, import_react.useState)(() => getAnchor(editableContentElement, tagName, className));
  const wasActive = usePrevious(isActive);
  (0, import_react.useLayoutEffect)(() => {
    if (!editableContentElement) {
      return;
    }
    function callback() {
      setAnchor(getAnchor(editableContentElement, tagName, className));
    }
    function attach() {
      ownerDocument.addEventListener("selectionchange", callback);
    }
    function detach() {
      ownerDocument.removeEventListener("selectionchange", callback);
    }
    const {
      ownerDocument
    } = editableContentElement;
    if (editableContentElement === ownerDocument.activeElement || // When a link is created, we need to attach the popover to the newly created anchor.
    !wasActive && isActive || // Sometimes we're _removing_ an active anchor, such as the inline color popover.
    // When we add the color, it switches from a virtual anchor to a `<mark>` element.
    // When we _remove_ the color, it switches from a `<mark>` element to a virtual anchor.
    wasActive && !isActive) {
      setAnchor(getAnchor(editableContentElement, tagName, className));
      attach();
    }
    editableContentElement.addEventListener("focusin", attach);
    editableContentElement.addEventListener("focusout", detach);
    return () => {
      detach();
      editableContentElement.removeEventListener("focusin", attach);
      editableContentElement.removeEventListener("focusout", detach);
    };
  }, [editableContentElement, tagName, className, isActive, wasActive]);
  return anchor;
}

// ../../node_modules/@wordpress/warning/build-module/utils.js
var logged = /* @__PURE__ */ new Set();

// ../../node_modules/@wordpress/warning/build-module/index.js
function isDev() {
  return globalThis.SCRIPT_DEBUG === true;
}
function warning(message) {
  if (!isDev()) {
    return;
  }
  if (logged.has(message)) {
    return;
  }
  console.warn(message);
  try {
    throw Error(message);
  } catch (x2) {
  }
  logged.add(message);
}

// ../../node_modules/@wordpress/html-entities/build-module/index.js
var _decodeTextArea;
function decodeEntities(html) {
  var _decodeTextArea$textC;
  if ("string" !== typeof html || -1 === html.indexOf("&")) {
    return html;
  }
  if (void 0 === _decodeTextArea) {
    if (document.implementation && document.implementation.createHTMLDocument) {
      _decodeTextArea = document.implementation.createHTMLDocument("").createElement("textarea");
    } else {
      _decodeTextArea = document.createElement("textarea");
    }
  }
  _decodeTextArea.innerHTML = html;
  const decoded = (_decodeTextArea$textC = _decodeTextArea.textContent) !== null && _decodeTextArea$textC !== void 0 ? _decodeTextArea$textC : "";
  _decodeTextArea.innerHTML = "";
  return decoded;
}

export {
  memize,
  require_sprintf,
  w,
  k,
  names_default,
  a11y_default,
  store,
  createElement,
  toHTMLString,
  getTextContent,
  RichTextData,
  create,
  getActiveFormat,
  getActiveObject,
  isCollapsed,
  isEmpty,
  removeFormat,
  insert,
  remove3 as remove,
  slice,
  split,
  speak,
  useAnchor,
  useRichText,
  warning,
  require_remove_accents,
  require_es6,
  decodeEntities
};
//# sourceMappingURL=chunk-XKH3TMBG.js.map
