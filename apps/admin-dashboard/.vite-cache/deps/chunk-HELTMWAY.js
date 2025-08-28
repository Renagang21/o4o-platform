import {
  __commonJS
} from "./chunk-OL46QLBJ.js";

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
      function sprintf(key) {
        return sprintf_format(sprintf_parse(key), arguments);
      }
      function vsprintf(fmt, argv) {
        return sprintf.apply(null, [fmt].concat(argv || []));
      }
      function sprintf_format(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, arg, output = "", i, k, ph, pad, pad_character, pad_length, is_positive, sign;
        for (i = 0; i < tree_length; i++) {
          if (typeof parse_tree[i] === "string") {
            output += parse_tree[i];
          } else if (typeof parse_tree[i] === "object") {
            ph = parse_tree[i];
            if (ph.keys) {
              arg = argv[cursor];
              for (k = 0; k < ph.keys.length; k++) {
                if (arg == void 0) {
                  throw new Error(sprintf('[sprintf] Cannot access property "%s" of undefined value "%s"', ph.keys[k], ph.keys[k - 1]));
                }
                arg = arg[ph.keys[k]];
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
              throw new TypeError(sprintf("[sprintf] expecting number but found %T", arg));
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
        exports["sprintf"] = sprintf;
        exports["vsprintf"] = vsprintf;
      }
      if (typeof window !== "undefined") {
        window["sprintf"] = sprintf;
        window["vsprintf"] = vsprintf;
        if (typeof define === "function" && define["amd"]) {
          define(function() {
            return {
              "sprintf": sprintf,
              "vsprintf": vsprintf
            };
          });
        }
      }
    }();
  }
});

// ../../node_modules/@tannin/postfix/index.js
var PRECEDENCE;
var OPENERS;
var TERMINATORS;
var PATTERN;
PRECEDENCE = {
  "(": 9,
  "!": 8,
  "*": 7,
  "/": 7,
  "%": 7,
  "+": 6,
  "-": 6,
  "<": 5,
  "<=": 5,
  ">": 5,
  ">=": 5,
  "==": 4,
  "!=": 4,
  "&&": 3,
  "||": 2,
  "?": 1,
  "?:": 1
};
OPENERS = ["(", "?"];
TERMINATORS = {
  ")": ["("],
  ":": ["?", "?:"]
};
PATTERN = /<=|>=|==|!=|&&|\|\||\?:|\(|!|\*|\/|%|\+|-|<|>|\?|\)|:/;
function postfix(expression) {
  var terms = [], stack = [], match, operator, term, element;
  while (match = expression.match(PATTERN)) {
    operator = match[0];
    term = expression.substr(0, match.index).trim();
    if (term) {
      terms.push(term);
    }
    while (element = stack.pop()) {
      if (TERMINATORS[operator]) {
        if (TERMINATORS[operator][0] === element) {
          operator = TERMINATORS[operator][1] || operator;
          break;
        }
      } else if (OPENERS.indexOf(element) >= 0 || PRECEDENCE[element] < PRECEDENCE[operator]) {
        stack.push(element);
        break;
      }
      terms.push(element);
    }
    if (!TERMINATORS[operator]) {
      stack.push(operator);
    }
    expression = expression.substr(match.index + operator.length);
  }
  expression = expression.trim();
  if (expression) {
    terms.push(expression);
  }
  return terms.concat(stack.reverse());
}

// ../../node_modules/@tannin/evaluate/index.js
var OPERATORS = {
  "!": function(a) {
    return !a;
  },
  "*": function(a, b) {
    return a * b;
  },
  "/": function(a, b) {
    return a / b;
  },
  "%": function(a, b) {
    return a % b;
  },
  "+": function(a, b) {
    return a + b;
  },
  "-": function(a, b) {
    return a - b;
  },
  "<": function(a, b) {
    return a < b;
  },
  "<=": function(a, b) {
    return a <= b;
  },
  ">": function(a, b) {
    return a > b;
  },
  ">=": function(a, b) {
    return a >= b;
  },
  "==": function(a, b) {
    return a === b;
  },
  "!=": function(a, b) {
    return a !== b;
  },
  "&&": function(a, b) {
    return a && b;
  },
  "||": function(a, b) {
    return a || b;
  },
  "?:": function(a, b, c) {
    if (a) {
      throw b;
    }
    return c;
  }
};
function evaluate(postfix2, variables) {
  var stack = [], i, j, args, getOperatorResult, term, value;
  for (i = 0; i < postfix2.length; i++) {
    term = postfix2[i];
    getOperatorResult = OPERATORS[term];
    if (getOperatorResult) {
      j = getOperatorResult.length;
      args = Array(j);
      while (j--) {
        args[j] = stack.pop();
      }
      try {
        value = getOperatorResult.apply(null, args);
      } catch (earlyReturn) {
        return earlyReturn;
      }
    } else if (variables.hasOwnProperty(term)) {
      value = variables[term];
    } else {
      value = +term;
    }
    stack.push(value);
  }
  return stack[0];
}

// ../../node_modules/@tannin/compile/index.js
function compile(expression) {
  var terms = postfix(expression);
  return function(variables) {
    return evaluate(terms, variables);
  };
}

// ../../node_modules/@tannin/plural-forms/index.js
function pluralForms(expression) {
  var evaluate2 = compile(expression);
  return function(n) {
    return +evaluate2({ n });
  };
}

// ../../node_modules/tannin/index.js
var DEFAULT_OPTIONS = {
  contextDelimiter: "",
  onMissingKey: null
};
function getPluralExpression(pf) {
  var parts, i, part;
  parts = pf.split(";");
  for (i = 0; i < parts.length; i++) {
    part = parts[i].trim();
    if (part.indexOf("plural=") === 0) {
      return part.substr(7);
    }
  }
}
function Tannin(data, options) {
  var key;
  this.data = data;
  this.pluralForms = {};
  this.options = {};
  for (key in DEFAULT_OPTIONS) {
    this.options[key] = options !== void 0 && key in options ? options[key] : DEFAULT_OPTIONS[key];
  }
}
Tannin.prototype.getPluralForm = function(domain, n) {
  var getPluralForm = this.pluralForms[domain], config, plural, pf;
  if (!getPluralForm) {
    config = this.data[domain][""];
    pf = config["Plural-Forms"] || config["plural-forms"] || // Ignore reason: As known, there's no way to document the empty
    // string property on a key to guarantee this as metadata.
    // @ts-ignore
    config.plural_forms;
    if (typeof pf !== "function") {
      plural = getPluralExpression(
        config["Plural-Forms"] || config["plural-forms"] || // Ignore reason: As known, there's no way to document the empty
        // string property on a key to guarantee this as metadata.
        // @ts-ignore
        config.plural_forms
      );
      pf = pluralForms(plural);
    }
    getPluralForm = this.pluralForms[domain] = pf;
  }
  return getPluralForm(n);
};
Tannin.prototype.dcnpgettext = function(domain, context, singular, plural, n) {
  var index, key, entry;
  if (n === void 0) {
    index = 0;
  } else {
    index = this.getPluralForm(domain, n);
  }
  key = singular;
  if (context) {
    key = context + this.options.contextDelimiter + singular;
  }
  entry = this.data[domain][key];
  if (entry && entry[index]) {
    return entry[index];
  }
  if (this.options.onMissingKey) {
    this.options.onMissingKey(singular, domain);
  }
  return index === 0 ? singular : plural;
};

// ../../node_modules/memize/dist/index.js
function memize(fn, options) {
  var size = 0;
  var head;
  var tail;
  options = options || {};
  function memoized() {
    var node = head, len = arguments.length, args, i;
    searchCache: while (node) {
      if (node.args.length !== arguments.length) {
        node = node.next;
        continue;
      }
      for (i = 0; i < len; i++) {
        if (node.args[i] !== arguments[i]) {
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
    for (i = 0; i < len; i++) {
      args[i] = arguments[i];
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

export {
  Tannin,
  memize,
  require_sprintf
};
//# sourceMappingURL=chunk-HELTMWAY.js.map
