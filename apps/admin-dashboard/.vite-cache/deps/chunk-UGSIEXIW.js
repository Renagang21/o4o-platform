import {
  compose_default,
  createHigherOrderComponent,
  createQueue,
  deprecated,
  useMergeRefs,
  usePrevious,
  useRefEffect
} from "./chunk-CJZLLV6N.js";
import {
  isPromise,
  rememo_default,
  require_cjs,
  require_dist,
  require_equivalent_key_map
} from "./chunk-LLCGJ2GL.js";
import {
  defaultHooks
} from "./chunk-ATYMGCLF.js";
import {
  Tannin
} from "./chunk-VCN4ELHL.js";
import {
  escapeAttribute,
  escapeEditableHTML,
  isValidAttributeName
} from "./chunk-CODSEQ4B.js";
import {
  isPlainObject
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
  __commonJS,
  __export,
  __privateAdd,
  __privateGet,
  __privateSet,
  __toESM
} from "./chunk-OL46QLBJ.js";

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

// ../../node_modules/@wordpress/rich-text/node_modules/redux/dist/redux.mjs
var $$observable = (() => typeof Symbol === "function" && Symbol.observable || "@@observable")();
var symbol_observable_default = $$observable;
var randomString = () => Math.random().toString(36).substring(7).split("").join(".");
var ActionTypes = {
  INIT: `@@redux/INIT${randomString()}`,
  REPLACE: `@@redux/REPLACE${randomString()}`,
  PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}`
};
var actionTypes_default = ActionTypes;
function isPlainObject2(obj) {
  if (typeof obj !== "object" || obj === null)
    return false;
  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(obj) === proto || Object.getPrototypeOf(obj) === null;
}
function miniKindOf(val) {
  if (val === void 0)
    return "undefined";
  if (val === null)
    return "null";
  const type = typeof val;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "symbol":
    case "function": {
      return type;
    }
  }
  if (Array.isArray(val))
    return "array";
  if (isDate(val))
    return "date";
  if (isError(val))
    return "error";
  const constructorName = ctorName(val);
  switch (constructorName) {
    case "Symbol":
    case "Promise":
    case "WeakMap":
    case "WeakSet":
    case "Map":
    case "Set":
      return constructorName;
  }
  return Object.prototype.toString.call(val).slice(8, -1).toLowerCase().replace(/\s/g, "");
}
function ctorName(val) {
  return typeof val.constructor === "function" ? val.constructor.name : null;
}
function isError(val) {
  return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
}
function isDate(val) {
  if (val instanceof Date)
    return true;
  return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
}
function kindOf(val) {
  let typeOfVal = typeof val;
  if (true) {
    typeOfVal = miniKindOf(val);
  }
  return typeOfVal;
}
function createStore(reducer, preloadedState, enhancer) {
  if (typeof reducer !== "function") {
    throw new Error(false ? formatProdErrorMessage(2) : `Expected the root reducer to be a function. Instead, received: '${kindOf(reducer)}'`);
  }
  if (typeof preloadedState === "function" && typeof enhancer === "function" || typeof enhancer === "function" && typeof arguments[3] === "function") {
    throw new Error(false ? formatProdErrorMessage(0) : "It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function. See https://redux.js.org/tutorials/fundamentals/part-4-store#creating-a-store-with-enhancers for an example.");
  }
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState;
    preloadedState = void 0;
  }
  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      throw new Error(false ? formatProdErrorMessage(1) : `Expected the enhancer to be a function. Instead, received: '${kindOf(enhancer)}'`);
    }
    return enhancer(createStore)(reducer, preloadedState);
  }
  let currentReducer = reducer;
  let currentState = preloadedState;
  let currentListeners = /* @__PURE__ */ new Map();
  let nextListeners = currentListeners;
  let listenerIdCounter = 0;
  let isDispatching = false;
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = /* @__PURE__ */ new Map();
      currentListeners.forEach((listener, key) => {
        nextListeners.set(key, listener);
      });
    }
  }
  function getState() {
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(3) : "You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.");
    }
    return currentState;
  }
  function subscribe4(listener) {
    if (typeof listener !== "function") {
      throw new Error(false ? formatProdErrorMessage(4) : `Expected the listener to be a function. Instead, received: '${kindOf(listener)}'`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(5) : "You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details.");
    }
    let isSubscribed = true;
    ensureCanMutateNextListeners();
    const listenerId = listenerIdCounter++;
    nextListeners.set(listenerId, listener);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      if (isDispatching) {
        throw new Error(false ? formatProdErrorMessage(6) : "You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details.");
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      nextListeners.delete(listenerId);
      currentListeners = null;
    };
  }
  function dispatch2(action) {
    if (!isPlainObject2(action)) {
      throw new Error(false ? formatProdErrorMessage(7) : `Actions must be plain objects. Instead, the actual type was: '${kindOf(action)}'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.`);
    }
    if (typeof action.type === "undefined") {
      throw new Error(false ? formatProdErrorMessage(8) : 'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
    }
    if (typeof action.type !== "string") {
      throw new Error(false ? formatProdErrorMessage(17) : `Action "type" property must be a string. Instead, the actual type was: '${kindOf(action.type)}'. Value was: '${action.type}' (stringified)`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(9) : "Reducers may not dispatch actions.");
    }
    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }
    const listeners = currentListeners = nextListeners;
    listeners.forEach((listener) => {
      listener();
    });
    return action;
  }
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== "function") {
      throw new Error(false ? formatProdErrorMessage(10) : `Expected the nextReducer to be a function. Instead, received: '${kindOf(nextReducer)}`);
    }
    currentReducer = nextReducer;
    dispatch2({
      type: actionTypes_default.REPLACE
    });
  }
  function observable() {
    const outerSubscribe = subscribe4;
    return {
      /**
       * The minimal observable subscription method.
       * @param observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== "object" || observer === null) {
          throw new Error(false ? formatProdErrorMessage(11) : `Expected the observer to be an object. Instead, received: '${kindOf(observer)}'`);
        }
        function observeState() {
          const observerAsObserver = observer;
          if (observerAsObserver.next) {
            observerAsObserver.next(getState());
          }
        }
        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe
        };
      },
      [symbol_observable_default]() {
        return this;
      }
    };
  }
  dispatch2({
    type: actionTypes_default.INIT
  });
  const store2 = {
    dispatch: dispatch2,
    subscribe: subscribe4,
    getState,
    replaceReducer,
    [symbol_observable_default]: observable
  };
  return store2;
}
function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce((a2, b2) => (...args) => a2(b2(...args)));
}
function applyMiddleware(...middlewares) {
  return (createStore2) => (reducer, preloadedState) => {
    const store2 = createStore2(reducer, preloadedState);
    let dispatch2 = () => {
      throw new Error(false ? formatProdErrorMessage(15) : "Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.");
    };
    const middlewareAPI = {
      getState: store2.getState,
      dispatch: (action, ...args) => dispatch2(action, ...args)
    };
    const chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch2 = compose(...chain)(store2.dispatch);
    return {
      ...store2,
      dispatch: dispatch2
    };
  };
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/index.js
var import_equivalent_key_map2 = __toESM(require_equivalent_key_map());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/redux-routine/build-module/is-generator.js
function isGenerator(object) {
  return !!object && typeof object[Symbol.iterator] === "function" && typeof object.next === "function";
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/redux-routine/build-module/runtime.js
var import_rungen = __toESM(require_dist());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/redux-routine/build-module/is-action.js
function isAction(object) {
  return isPlainObject(object) && typeof object.type === "string";
}
function isActionOfType(object, expectedType) {
  return isAction(object) && object.type === expectedType;
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/redux-routine/build-module/runtime.js
function createRuntime(controls2 = {}, dispatch2) {
  const rungenControls = Object.entries(controls2).map(([actionType, control]) => (value, next, iterate, yieldNext, yieldError) => {
    if (!isActionOfType(value, actionType)) {
      return false;
    }
    const routine = control(value);
    if (isPromise(routine)) {
      routine.then(yieldNext, yieldError);
    } else {
      yieldNext(routine);
    }
    return true;
  });
  const unhandledActionControl = (value, next) => {
    if (!isAction(value)) {
      return false;
    }
    dispatch2(value);
    next();
    return true;
  };
  rungenControls.push(unhandledActionControl);
  const rungenRuntime = (0, import_rungen.create)(rungenControls);
  return (action) => new Promise((resolve, reject) => rungenRuntime(action, (result) => {
    if (isAction(result)) {
      dispatch2(result);
    }
    resolve(result);
  }, reject));
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/redux-routine/build-module/index.js
function createMiddleware(controls2 = {}) {
  return (store2) => {
    const runtime = createRuntime(controls2, store2.dispatch);
    return (next) => (action) => {
      if (!isGenerator(action)) {
        return next(action);
      }
      return runtime(action);
    };
  };
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/combine-reducers.js
function combineReducers(reducers) {
  const keys = Object.keys(reducers);
  return function combinedReducer(state = {}, action) {
    const nextState = {};
    let hasChanged = false;
    for (const key of keys) {
      const reducer = reducers[key];
      const prevStateForKey = state[key];
      const nextStateForKey = reducer(prevStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== prevStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/factory.js
function createRegistryControl(registryControl) {
  registryControl.isRegistryControl = true;
  return registryControl;
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/controls.js
var SELECT = "@@data/SELECT";
var RESOLVE_SELECT = "@@data/RESOLVE_SELECT";
var DISPATCH = "@@data/DISPATCH";
var builtinControls = {
  [SELECT]: createRegistryControl((registry) => ({
    storeKey,
    selectorName,
    args
  }) => registry.select(storeKey)[selectorName](...args)),
  [RESOLVE_SELECT]: createRegistryControl((registry) => ({
    storeKey,
    selectorName,
    args
  }) => {
    const method = registry.select(storeKey)[selectorName].hasResolver ? "resolveSelect" : "select";
    return registry[method](storeKey)[selectorName](...args);
  }),
  [DISPATCH]: createRegistryControl((registry) => ({
    storeKey,
    actionName,
    args
  }) => registry.dispatch(storeKey)[actionName](...args))
};

// ../../node_modules/@wordpress/private-apis/build-module/implementation.js
var CORE_MODULES_USING_PRIVATE_APIS = ["@wordpress/block-directory", "@wordpress/block-editor", "@wordpress/block-library", "@wordpress/blocks", "@wordpress/commands", "@wordpress/components", "@wordpress/core-commands", "@wordpress/core-data", "@wordpress/customize-widgets", "@wordpress/data", "@wordpress/edit-post", "@wordpress/edit-site", "@wordpress/edit-widgets", "@wordpress/editor", "@wordpress/format-library", "@wordpress/patterns", "@wordpress/preferences", "@wordpress/reusable-blocks", "@wordpress/router", "@wordpress/dataviews", "@wordpress/fields", "@wordpress/media-utils", "@wordpress/upload-media"];
var registeredPrivateApis = [];
var requiredConsent = "I acknowledge private features are not for use in themes or plugins and doing so will break in the next version of WordPress.";
var allowReRegistration = globalThis.IS_WORDPRESS_CORE ? false : true;
var __dangerousOptInToUnstableAPIsOnlyForCoreModules = (consent, moduleName) => {
  if (!CORE_MODULES_USING_PRIVATE_APIS.includes(moduleName)) {
    throw new Error(`You tried to opt-in to unstable APIs as module "${moduleName}". This feature is only for JavaScript modules shipped with WordPress core. Please do not use it in plugins and themes as the unstable APIs will be removed without a warning. If you ignore this error and depend on unstable features, your product will inevitably break on one of the next WordPress releases.`);
  }
  if (!allowReRegistration && registeredPrivateApis.includes(moduleName)) {
    throw new Error(`You tried to opt-in to unstable APIs as module "${moduleName}" which is already registered. This feature is only for JavaScript modules shipped with WordPress core. Please do not use it in plugins and themes as the unstable APIs will be removed without a warning. If you ignore this error and depend on unstable features, your product will inevitably break on one of the next WordPress releases.`);
  }
  if (consent !== requiredConsent) {
    throw new Error(`You tried to opt-in to unstable APIs without confirming you know the consequences. This feature is only for JavaScript modules shipped with WordPress core. Please do not use it in plugins and themes as the unstable APIs will removed without a warning. If you ignore this error and depend on unstable features, your product will inevitably break on the next WordPress release.`);
  }
  registeredPrivateApis.push(moduleName);
  return {
    lock,
    unlock
  };
};
function lock(object, privateData) {
  if (!object) {
    throw new Error("Cannot lock an undefined object.");
  }
  const _object = object;
  if (!(__private in _object)) {
    _object[__private] = {};
  }
  lockedData.set(_object[__private], privateData);
}
function unlock(object) {
  if (!object) {
    throw new Error("Cannot unlock an undefined object.");
  }
  const _object = object;
  if (!(__private in _object)) {
    throw new Error("Cannot unlock an object that was not locked before. ");
  }
  return lockedData.get(_object[__private]);
}
var lockedData = /* @__PURE__ */ new WeakMap();
var __private = Symbol("Private API ID");

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/lock-unlock.js
var {
  lock: lock2,
  unlock: unlock2
} = __dangerousOptInToUnstableAPIsOnlyForCoreModules("I acknowledge private features are not for use in themes or plugins and doing so will break in the next version of WordPress.", "@wordpress/data");

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/promise-middleware.js
var promiseMiddleware = () => (next) => (action) => {
  if (isPromise(action)) {
    return action.then((resolvedAction) => {
      if (resolvedAction) {
        return next(resolvedAction);
      }
    });
  }
  return next(action);
};
var promise_middleware_default = promiseMiddleware;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/resolvers-cache-middleware.js
var createResolversCacheMiddleware = (registry, storeName) => () => (next) => (action) => {
  const resolvers = registry.select(storeName).getCachedResolvers();
  const resolverEntries = Object.entries(resolvers);
  resolverEntries.forEach(([selectorName, resolversByArgs]) => {
    var _a, _b;
    const resolver = (_b = (_a = registry.stores[storeName]) == null ? void 0 : _a.resolvers) == null ? void 0 : _b[selectorName];
    if (!resolver || !resolver.shouldInvalidate) {
      return;
    }
    resolversByArgs.forEach((value, args) => {
      if (value === void 0) {
        return;
      }
      if (value.status !== "finished" && value.status !== "error") {
        return;
      }
      if (!resolver.shouldInvalidate(action, ...args)) {
        return;
      }
      registry.dispatch(storeName).invalidateResolution(selectorName, args);
    });
  });
  return next(action);
};
var resolvers_cache_middleware_default = createResolversCacheMiddleware;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/thunk-middleware.js
function createThunkMiddleware(args) {
  return () => (next) => (action) => {
    if (typeof action === "function") {
      return action(args);
    }
    return next(action);
  };
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/metadata/reducer.js
var import_equivalent_key_map = __toESM(require_equivalent_key_map());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/metadata/utils.js
var onSubKey = (actionProperty) => (reducer) => (state = {}, action) => {
  const key = action[actionProperty];
  if (key === void 0) {
    return state;
  }
  const nextKeyState = reducer(state[key], action);
  if (nextKeyState === state[key]) {
    return state;
  }
  return {
    ...state,
    [key]: nextKeyState
  };
};
function selectorArgsToStateKey(args) {
  if (args === void 0 || args === null) {
    return [];
  }
  const len = args.length;
  let idx = len;
  while (idx > 0 && args[idx - 1] === void 0) {
    idx--;
  }
  return idx === len ? args : args.slice(0, idx);
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/metadata/reducer.js
var subKeysIsResolved = onSubKey("selectorName")((state = new import_equivalent_key_map.default(), action) => {
  switch (action.type) {
    case "START_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.set(selectorArgsToStateKey(action.args), {
        status: "resolving"
      });
      return nextState;
    }
    case "FINISH_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.set(selectorArgsToStateKey(action.args), {
        status: "finished"
      });
      return nextState;
    }
    case "FAIL_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.set(selectorArgsToStateKey(action.args), {
        status: "error",
        error: action.error
      });
      return nextState;
    }
    case "START_RESOLUTIONS": {
      const nextState = new import_equivalent_key_map.default(state);
      for (const resolutionArgs of action.args) {
        nextState.set(selectorArgsToStateKey(resolutionArgs), {
          status: "resolving"
        });
      }
      return nextState;
    }
    case "FINISH_RESOLUTIONS": {
      const nextState = new import_equivalent_key_map.default(state);
      for (const resolutionArgs of action.args) {
        nextState.set(selectorArgsToStateKey(resolutionArgs), {
          status: "finished"
        });
      }
      return nextState;
    }
    case "FAIL_RESOLUTIONS": {
      const nextState = new import_equivalent_key_map.default(state);
      action.args.forEach((resolutionArgs, idx) => {
        const resolutionState = {
          status: "error",
          error: void 0
        };
        const error = action.errors[idx];
        if (error) {
          resolutionState.error = error;
        }
        nextState.set(selectorArgsToStateKey(resolutionArgs), resolutionState);
      });
      return nextState;
    }
    case "INVALIDATE_RESOLUTION": {
      const nextState = new import_equivalent_key_map.default(state);
      nextState.delete(selectorArgsToStateKey(action.args));
      return nextState;
    }
  }
  return state;
});
var isResolved = (state = {}, action) => {
  switch (action.type) {
    case "INVALIDATE_RESOLUTION_FOR_STORE":
      return {};
    case "INVALIDATE_RESOLUTION_FOR_STORE_SELECTOR": {
      if (action.selectorName in state) {
        const {
          [action.selectorName]: removedSelector,
          ...restState
        } = state;
        return restState;
      }
      return state;
    }
    case "START_RESOLUTION":
    case "FINISH_RESOLUTION":
    case "FAIL_RESOLUTION":
    case "START_RESOLUTIONS":
    case "FINISH_RESOLUTIONS":
    case "FAIL_RESOLUTIONS":
    case "INVALIDATE_RESOLUTION":
      return subKeysIsResolved(state, action);
  }
  return state;
};
var reducer_default = isResolved;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/metadata/selectors.js
var selectors_exports = {};
__export(selectors_exports, {
  countSelectorsByStatus: () => countSelectorsByStatus,
  getCachedResolvers: () => getCachedResolvers,
  getIsResolving: () => getIsResolving,
  getResolutionError: () => getResolutionError,
  getResolutionState: () => getResolutionState,
  hasFinishedResolution: () => hasFinishedResolution,
  hasResolutionFailed: () => hasResolutionFailed,
  hasResolvingSelectors: () => hasResolvingSelectors,
  hasStartedResolution: () => hasStartedResolution,
  isResolving: () => isResolving
});
function getResolutionState(state, selectorName, args) {
  const map = state[selectorName];
  if (!map) {
    return;
  }
  return map.get(selectorArgsToStateKey(args));
}
function getIsResolving(state, selectorName, args) {
  deprecated("wp.data.select( store ).getIsResolving", {
    since: "6.6",
    version: "6.8",
    alternative: "wp.data.select( store ).getResolutionState"
  });
  const resolutionState = getResolutionState(state, selectorName, args);
  return resolutionState && resolutionState.status === "resolving";
}
function hasStartedResolution(state, selectorName, args) {
  return getResolutionState(state, selectorName, args) !== void 0;
}
function hasFinishedResolution(state, selectorName, args) {
  var _a;
  const status = (_a = getResolutionState(state, selectorName, args)) == null ? void 0 : _a.status;
  return status === "finished" || status === "error";
}
function hasResolutionFailed(state, selectorName, args) {
  var _a;
  return ((_a = getResolutionState(state, selectorName, args)) == null ? void 0 : _a.status) === "error";
}
function getResolutionError(state, selectorName, args) {
  const resolutionState = getResolutionState(state, selectorName, args);
  return (resolutionState == null ? void 0 : resolutionState.status) === "error" ? resolutionState.error : null;
}
function isResolving(state, selectorName, args) {
  var _a;
  return ((_a = getResolutionState(state, selectorName, args)) == null ? void 0 : _a.status) === "resolving";
}
function getCachedResolvers(state) {
  return state;
}
function hasResolvingSelectors(state) {
  return Object.values(state).some((selectorState) => (
    /**
     * This uses the internal `_map` property of `EquivalentKeyMap` for
     * optimization purposes, since the `EquivalentKeyMap` implementation
     * does not support a `.values()` implementation.
     *
     * @see https://github.com/aduth/equivalent-key-map
     */
    Array.from(selectorState._map.values()).some((resolution) => {
      var _a;
      return ((_a = resolution[1]) == null ? void 0 : _a.status) === "resolving";
    })
  ));
}
var countSelectorsByStatus = rememo_default((state) => {
  const selectorsByStatus = {};
  Object.values(state).forEach((selectorState) => (
    /**
     * This uses the internal `_map` property of `EquivalentKeyMap` for
     * optimization purposes, since the `EquivalentKeyMap` implementation
     * does not support a `.values()` implementation.
     *
     * @see https://github.com/aduth/equivalent-key-map
     */
    Array.from(selectorState._map.values()).forEach((resolution) => {
      var _a;
      var _resolution$1$status;
      const currentStatus = (_resolution$1$status = (_a = resolution[1]) == null ? void 0 : _a.status) !== null && _resolution$1$status !== void 0 ? _resolution$1$status : "error";
      if (!selectorsByStatus[currentStatus]) {
        selectorsByStatus[currentStatus] = 0;
      }
      selectorsByStatus[currentStatus]++;
    })
  ));
  return selectorsByStatus;
}, (state) => [state]);

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/metadata/actions.js
var actions_exports = {};
__export(actions_exports, {
  failResolution: () => failResolution,
  failResolutions: () => failResolutions,
  finishResolution: () => finishResolution,
  finishResolutions: () => finishResolutions,
  invalidateResolution: () => invalidateResolution,
  invalidateResolutionForStore: () => invalidateResolutionForStore,
  invalidateResolutionForStoreSelector: () => invalidateResolutionForStoreSelector,
  startResolution: () => startResolution,
  startResolutions: () => startResolutions
});
function startResolution(selectorName, args) {
  return {
    type: "START_RESOLUTION",
    selectorName,
    args
  };
}
function finishResolution(selectorName, args) {
  return {
    type: "FINISH_RESOLUTION",
    selectorName,
    args
  };
}
function failResolution(selectorName, args, error) {
  return {
    type: "FAIL_RESOLUTION",
    selectorName,
    args,
    error
  };
}
function startResolutions(selectorName, args) {
  return {
    type: "START_RESOLUTIONS",
    selectorName,
    args
  };
}
function finishResolutions(selectorName, args) {
  return {
    type: "FINISH_RESOLUTIONS",
    selectorName,
    args
  };
}
function failResolutions(selectorName, args, errors) {
  return {
    type: "FAIL_RESOLUTIONS",
    selectorName,
    args,
    errors
  };
}
function invalidateResolution(selectorName, args) {
  return {
    type: "INVALIDATE_RESOLUTION",
    selectorName,
    args
  };
}
function invalidateResolutionForStore() {
  return {
    type: "INVALIDATE_RESOLUTION_FOR_STORE"
  };
}
function invalidateResolutionForStoreSelector(selectorName) {
  return {
    type: "INVALIDATE_RESOLUTION_FOR_STORE_SELECTOR",
    selectorName
  };
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/redux-store/index.js
var trimUndefinedValues = (array) => {
  const result = [...array];
  for (let i2 = result.length - 1; i2 >= 0; i2--) {
    if (result[i2] === void 0) {
      result.splice(i2, 1);
    }
  }
  return result;
};
var mapValues = (obj, callback) => Object.fromEntries(Object.entries(obj !== null && obj !== void 0 ? obj : {}).map(([key, value]) => [key, callback(value, key)]));
var devToolsReplacer = (key, state) => {
  if (state instanceof Map) {
    return Object.fromEntries(state);
  }
  if (state instanceof window.HTMLElement) {
    return null;
  }
  return state;
};
function createResolversCache() {
  const cache = {};
  return {
    isRunning(selectorName, args) {
      return cache[selectorName] && cache[selectorName].get(trimUndefinedValues(args));
    },
    clear(selectorName, args) {
      if (cache[selectorName]) {
        cache[selectorName].delete(trimUndefinedValues(args));
      }
    },
    markAsRunning(selectorName, args) {
      if (!cache[selectorName]) {
        cache[selectorName] = new import_equivalent_key_map2.default();
      }
      cache[selectorName].set(trimUndefinedValues(args), true);
    }
  };
}
function createBindingCache(getItem, bindItem) {
  const cache = /* @__PURE__ */ new WeakMap();
  return {
    get(itemName) {
      const item = getItem(itemName);
      if (!item) {
        return null;
      }
      let boundItem = cache.get(item);
      if (!boundItem) {
        boundItem = bindItem(item, itemName);
        cache.set(item, boundItem);
      }
      return boundItem;
    }
  };
}
function createPrivateProxy(publicItems, privateItems) {
  return new Proxy(publicItems, {
    get: (target, itemName) => privateItems.get(itemName) || Reflect.get(target, itemName)
  });
}
function createReduxStore(key, options) {
  const privateActions = {};
  const privateSelectors = {};
  const privateRegistrationFunctions = {
    privateActions,
    registerPrivateActions: (actions) => {
      Object.assign(privateActions, actions);
    },
    privateSelectors,
    registerPrivateSelectors: (selectors) => {
      Object.assign(privateSelectors, selectors);
    }
  };
  const storeDescriptor = {
    name: key,
    instantiate: (registry) => {
      const listeners = /* @__PURE__ */ new Set();
      const reducer = options.reducer;
      const thunkArgs = {
        registry,
        get dispatch() {
          return thunkDispatch;
        },
        get select() {
          return thunkSelect;
        },
        get resolveSelect() {
          return resolveSelectors;
        }
      };
      const store2 = instantiateReduxStore(key, options, registry, thunkArgs);
      lock2(store2, privateRegistrationFunctions);
      const resolversCache = createResolversCache();
      function bindAction(action) {
        return (...args) => Promise.resolve(store2.dispatch(action(...args)));
      }
      const actions = {
        ...mapValues(actions_exports, bindAction),
        ...mapValues(options.actions, bindAction)
      };
      const allActions = createPrivateProxy(actions, createBindingCache((name) => privateActions[name], bindAction));
      const thunkDispatch = new Proxy((action) => store2.dispatch(action), {
        get: (target, name) => allActions[name]
      });
      lock2(actions, allActions);
      const resolvers = options.resolvers ? mapValues(options.resolvers, mapResolver) : {};
      function bindSelector(selector, selectorName) {
        if (selector.isRegistrySelector) {
          selector.registry = registry;
        }
        const boundSelector = (...args) => {
          args = normalize(selector, args);
          const state = store2.__unstableOriginalGetState();
          if (selector.isRegistrySelector) {
            selector.registry = registry;
          }
          return selector(state.root, ...args);
        };
        boundSelector.__unstableNormalizeArgs = selector.__unstableNormalizeArgs;
        const resolver = resolvers[selectorName];
        if (!resolver) {
          boundSelector.hasResolver = false;
          return boundSelector;
        }
        return mapSelectorWithResolver(boundSelector, selectorName, resolver, store2, resolversCache, boundMetadataSelectors);
      }
      function bindMetadataSelector(metaDataSelector) {
        const boundSelector = (selectorName, selectorArgs, ...args) => {
          var _a;
          if (selectorName) {
            const targetSelector = (_a = options.selectors) == null ? void 0 : _a[selectorName];
            if (targetSelector) {
              selectorArgs = normalize(targetSelector, selectorArgs);
            }
          }
          const state = store2.__unstableOriginalGetState();
          return metaDataSelector(state.metadata, selectorName, selectorArgs, ...args);
        };
        boundSelector.hasResolver = false;
        return boundSelector;
      }
      const boundMetadataSelectors = mapValues(selectors_exports, bindMetadataSelector);
      const boundSelectors = mapValues(options.selectors, bindSelector);
      const selectors = {
        ...boundMetadataSelectors,
        ...boundSelectors
      };
      const boundPrivateSelectors = createBindingCache((name) => privateSelectors[name], bindSelector);
      const allSelectors = createPrivateProxy(selectors, boundPrivateSelectors);
      for (const selectorName of Object.keys(privateSelectors)) {
        boundPrivateSelectors.get(selectorName);
      }
      const thunkSelect = new Proxy((selector) => selector(store2.__unstableOriginalGetState()), {
        get: (target, name) => allSelectors[name]
      });
      lock2(selectors, allSelectors);
      const bindResolveSelector = mapResolveSelector(store2, boundMetadataSelectors);
      const resolveSelectors = mapValues(boundSelectors, bindResolveSelector);
      const allResolveSelectors = createPrivateProxy(resolveSelectors, createBindingCache((name) => boundPrivateSelectors.get(name), bindResolveSelector));
      lock2(resolveSelectors, allResolveSelectors);
      const bindSuspendSelector = mapSuspendSelector(store2, boundMetadataSelectors);
      const suspendSelectors = {
        ...boundMetadataSelectors,
        // no special suspense behavior
        ...mapValues(boundSelectors, bindSuspendSelector)
      };
      const allSuspendSelectors = createPrivateProxy(suspendSelectors, createBindingCache((name) => boundPrivateSelectors.get(name), bindSuspendSelector));
      lock2(suspendSelectors, allSuspendSelectors);
      const getSelectors = () => selectors;
      const getActions = () => actions;
      const getResolveSelectors = () => resolveSelectors;
      const getSuspendSelectors = () => suspendSelectors;
      store2.__unstableOriginalGetState = store2.getState;
      store2.getState = () => store2.__unstableOriginalGetState().root;
      const subscribe4 = store2 && ((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      });
      let lastState = store2.__unstableOriginalGetState();
      store2.subscribe(() => {
        const state = store2.__unstableOriginalGetState();
        const hasChanged = state !== lastState;
        lastState = state;
        if (hasChanged) {
          for (const listener of listeners) {
            listener();
          }
        }
      });
      return {
        reducer,
        store: store2,
        actions,
        selectors,
        resolvers,
        getSelectors,
        getResolveSelectors,
        getSuspendSelectors,
        getActions,
        subscribe: subscribe4
      };
    }
  };
  lock2(storeDescriptor, privateRegistrationFunctions);
  return storeDescriptor;
}
function instantiateReduxStore(key, options, registry, thunkArgs) {
  const controls2 = {
    ...options.controls,
    ...builtinControls
  };
  const normalizedControls = mapValues(controls2, (control) => control.isRegistryControl ? control(registry) : control);
  const middlewares = [resolvers_cache_middleware_default(registry, key), promise_middleware_default, createMiddleware(normalizedControls), createThunkMiddleware(thunkArgs)];
  const enhancers = [applyMiddleware(...middlewares)];
  if (typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__) {
    enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__({
      name: key,
      instanceId: key,
      serialize: {
        replacer: devToolsReplacer
      }
    }));
  }
  const {
    reducer,
    initialState
  } = options;
  const enhancedReducer = combineReducers({
    metadata: reducer_default,
    root: reducer
  });
  return createStore(enhancedReducer, {
    root: initialState
  }, compose_default(enhancers));
}
function mapResolveSelector(store2, boundMetadataSelectors) {
  return (selector, selectorName) => {
    if (!selector.hasResolver) {
      return async (...args) => selector.apply(null, args);
    }
    return (...args) => new Promise((resolve, reject) => {
      const hasFinished = () => {
        return boundMetadataSelectors.hasFinishedResolution(selectorName, args);
      };
      const finalize = (result2) => {
        const hasFailed = boundMetadataSelectors.hasResolutionFailed(selectorName, args);
        if (hasFailed) {
          const error = boundMetadataSelectors.getResolutionError(selectorName, args);
          reject(error);
        } else {
          resolve(result2);
        }
      };
      const getResult = () => selector.apply(null, args);
      const result = getResult();
      if (hasFinished()) {
        return finalize(result);
      }
      const unsubscribe = store2.subscribe(() => {
        if (hasFinished()) {
          unsubscribe();
          finalize(getResult());
        }
      });
    });
  };
}
function mapSuspendSelector(store2, boundMetadataSelectors) {
  return (selector, selectorName) => {
    if (!selector.hasResolver) {
      return selector;
    }
    return (...args) => {
      const result = selector.apply(null, args);
      if (boundMetadataSelectors.hasFinishedResolution(selectorName, args)) {
        if (boundMetadataSelectors.hasResolutionFailed(selectorName, args)) {
          throw boundMetadataSelectors.getResolutionError(selectorName, args);
        }
        return result;
      }
      throw new Promise((resolve) => {
        const unsubscribe = store2.subscribe(() => {
          if (boundMetadataSelectors.hasFinishedResolution(selectorName, args)) {
            resolve();
            unsubscribe();
          }
        });
      });
    };
  };
}
function mapResolver(resolver) {
  if (resolver.fulfill) {
    return resolver;
  }
  return {
    ...resolver,
    // Copy the enumerable properties of the resolver function.
    fulfill: resolver
    // Add the fulfill method.
  };
}
function mapSelectorWithResolver(selector, selectorName, resolver, store2, resolversCache, boundMetadataSelectors) {
  function fulfillSelector(args) {
    const state = store2.getState();
    if (resolversCache.isRunning(selectorName, args) || typeof resolver.isFulfilled === "function" && resolver.isFulfilled(state, ...args)) {
      return;
    }
    if (boundMetadataSelectors.hasStartedResolution(selectorName, args)) {
      return;
    }
    resolversCache.markAsRunning(selectorName, args);
    setTimeout(async () => {
      resolversCache.clear(selectorName, args);
      store2.dispatch(startResolution(selectorName, args));
      try {
        const action = resolver.fulfill(...args);
        if (action) {
          await store2.dispatch(action);
        }
        store2.dispatch(finishResolution(selectorName, args));
      } catch (error) {
        store2.dispatch(failResolution(selectorName, args, error));
      }
    }, 0);
  }
  const selectorResolver = (...args) => {
    args = normalize(selector, args);
    fulfillSelector(args);
    return selector(...args);
  };
  selectorResolver.hasResolver = true;
  return selectorResolver;
}
function normalize(selector, args) {
  if (selector.__unstableNormalizeArgs && typeof selector.__unstableNormalizeArgs === "function" && (args == null ? void 0 : args.length)) {
    return selector.__unstableNormalizeArgs(args);
  }
  return args;
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/store/index.js
var coreDataStore = {
  name: "core/data",
  instantiate(registry) {
    const getCoreDataSelector = (selectorName) => (key, ...args) => {
      return registry.select(key)[selectorName](...args);
    };
    const getCoreDataAction = (actionName) => (key, ...args) => {
      return registry.dispatch(key)[actionName](...args);
    };
    return {
      getSelectors() {
        return Object.fromEntries(["getIsResolving", "hasStartedResolution", "hasFinishedResolution", "isResolving", "getCachedResolvers"].map((selectorName) => [selectorName, getCoreDataSelector(selectorName)]));
      },
      getActions() {
        return Object.fromEntries(["startResolution", "finishResolution", "invalidateResolution", "invalidateResolutionForStore", "invalidateResolutionForStoreSelector"].map((actionName) => [actionName, getCoreDataAction(actionName)]));
      },
      subscribe() {
        return () => () => {
        };
      }
    };
  }
};
var store_default = coreDataStore;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/utils/emitter.js
function createEmitter() {
  let isPaused = false;
  let isPending = false;
  const listeners = /* @__PURE__ */ new Set();
  const notifyListeners = () => (
    // We use Array.from to clone the listeners Set
    // This ensures that we don't run a listener
    // that was added as a response to another listener.
    Array.from(listeners).forEach((listener) => listener())
  );
  return {
    get isPaused() {
      return isPaused;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    pause() {
      isPaused = true;
    },
    resume() {
      isPaused = false;
      if (isPending) {
        isPending = false;
        notifyListeners();
      }
    },
    emit() {
      if (isPaused) {
        isPending = true;
        return;
      }
      notifyListeners();
    }
  };
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/registry.js
function getStoreName(storeNameOrDescriptor) {
  return typeof storeNameOrDescriptor === "string" ? storeNameOrDescriptor : storeNameOrDescriptor.name;
}
function createRegistry(storeConfigs = {}, parent = null) {
  const stores = {};
  const emitter = createEmitter();
  let listeningStores = null;
  function globalListener() {
    emitter.emit();
  }
  const subscribe4 = (listener, storeNameOrDescriptor) => {
    if (!storeNameOrDescriptor) {
      return emitter.subscribe(listener);
    }
    const storeName = getStoreName(storeNameOrDescriptor);
    const store2 = stores[storeName];
    if (store2) {
      return store2.subscribe(listener);
    }
    if (!parent) {
      return emitter.subscribe(listener);
    }
    return parent.subscribe(listener, storeNameOrDescriptor);
  };
  function select2(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    listeningStores == null ? void 0 : listeningStores.add(storeName);
    const store2 = stores[storeName];
    if (store2) {
      return store2.getSelectors();
    }
    return parent == null ? void 0 : parent.select(storeName);
  }
  function __unstableMarkListeningStores(callback, ref) {
    listeningStores = /* @__PURE__ */ new Set();
    try {
      return callback.call(this);
    } finally {
      ref.current = Array.from(listeningStores);
      listeningStores = null;
    }
  }
  function resolveSelect2(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    listeningStores == null ? void 0 : listeningStores.add(storeName);
    const store2 = stores[storeName];
    if (store2) {
      return store2.getResolveSelectors();
    }
    return parent && parent.resolveSelect(storeName);
  }
  function suspendSelect2(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    listeningStores == null ? void 0 : listeningStores.add(storeName);
    const store2 = stores[storeName];
    if (store2) {
      return store2.getSuspendSelectors();
    }
    return parent && parent.suspendSelect(storeName);
  }
  function dispatch2(storeNameOrDescriptor) {
    const storeName = getStoreName(storeNameOrDescriptor);
    const store2 = stores[storeName];
    if (store2) {
      return store2.getActions();
    }
    return parent && parent.dispatch(storeName);
  }
  function withPlugins(attributes) {
    return Object.fromEntries(Object.entries(attributes).map(([key, attribute]) => {
      if (typeof attribute !== "function") {
        return [key, attribute];
      }
      return [key, function() {
        return registry[key].apply(null, arguments);
      }];
    }));
  }
  function registerStoreInstance(name, createStore2) {
    if (stores[name]) {
      console.error('Store "' + name + '" is already registered.');
      return stores[name];
    }
    const store2 = createStore2();
    if (typeof store2.getSelectors !== "function") {
      throw new TypeError("store.getSelectors must be a function");
    }
    if (typeof store2.getActions !== "function") {
      throw new TypeError("store.getActions must be a function");
    }
    if (typeof store2.subscribe !== "function") {
      throw new TypeError("store.subscribe must be a function");
    }
    store2.emitter = createEmitter();
    const currentSubscribe = store2.subscribe;
    store2.subscribe = (listener) => {
      const unsubscribeFromEmitter = store2.emitter.subscribe(listener);
      const unsubscribeFromStore = currentSubscribe(() => {
        if (store2.emitter.isPaused) {
          store2.emitter.emit();
          return;
        }
        listener();
      });
      return () => {
        unsubscribeFromStore == null ? void 0 : unsubscribeFromStore();
        unsubscribeFromEmitter == null ? void 0 : unsubscribeFromEmitter();
      };
    };
    stores[name] = store2;
    store2.subscribe(globalListener);
    if (parent) {
      try {
        unlock2(store2.store).registerPrivateActions(unlock2(parent).privateActionsOf(name));
        unlock2(store2.store).registerPrivateSelectors(unlock2(parent).privateSelectorsOf(name));
      } catch (e2) {
      }
    }
    return store2;
  }
  function register2(store2) {
    registerStoreInstance(store2.name, () => store2.instantiate(registry));
  }
  function registerGenericStore2(name, store2) {
    deprecated("wp.data.registerGenericStore", {
      since: "5.9",
      alternative: "wp.data.register( storeDescriptor )"
    });
    registerStoreInstance(name, () => store2);
  }
  function registerStore2(storeName, options) {
    if (!options.reducer) {
      throw new TypeError("Must specify store reducer");
    }
    const store2 = registerStoreInstance(storeName, () => createReduxStore(storeName, options).instantiate(registry));
    return store2.store;
  }
  function batch(callback) {
    if (emitter.isPaused) {
      callback();
      return;
    }
    emitter.pause();
    Object.values(stores).forEach((store2) => store2.emitter.pause());
    try {
      callback();
    } finally {
      emitter.resume();
      Object.values(stores).forEach((store2) => store2.emitter.resume());
    }
  }
  let registry = {
    batch,
    stores,
    namespaces: stores,
    // TODO: Deprecate/remove this.
    subscribe: subscribe4,
    select: select2,
    resolveSelect: resolveSelect2,
    suspendSelect: suspendSelect2,
    dispatch: dispatch2,
    use: use2,
    register: register2,
    registerGenericStore: registerGenericStore2,
    registerStore: registerStore2,
    __unstableMarkListeningStores
  };
  function use2(plugin, options) {
    if (!plugin) {
      return;
    }
    registry = {
      ...registry,
      ...plugin(registry, options)
    };
    return registry;
  }
  registry.register(store_default);
  for (const [name, config] of Object.entries(storeConfigs)) {
    registry.register(createReduxStore(name, config));
  }
  if (parent) {
    parent.subscribe(globalListener);
  }
  const registryWithPlugins = withPlugins(registry);
  lock2(registryWithPlugins, {
    privateActionsOf: (name) => {
      try {
        return unlock2(stores[name].store).privateActions;
      } catch (e2) {
        return {};
      }
    },
    privateSelectorsOf: (name) => {
      try {
        return unlock2(stores[name].store).privateSelectors;
      } catch (e2) {
        return {};
      }
    }
  });
  return registryWithPlugins;
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/default-registry.js
var default_registry_default = createRegistry();

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/plugins/persistence/index.js
var import_deepmerge = __toESM(require_cjs());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/plugins/persistence/storage/object.js
var objectStorage;
var storage = {
  getItem(key) {
    if (!objectStorage || !objectStorage[key]) {
      return null;
    }
    return objectStorage[key];
  },
  setItem(key, value) {
    if (!objectStorage) {
      storage.clear();
    }
    objectStorage[key] = String(value);
  },
  clear() {
    objectStorage = /* @__PURE__ */ Object.create(null);
  }
};
var object_default = storage;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/plugins/persistence/storage/default.js
var storage2;
try {
  storage2 = window.localStorage;
  storage2.setItem("__wpDataTestLocalStorage", "");
  storage2.removeItem("__wpDataTestLocalStorage");
} catch (error) {
  storage2 = object_default;
}
var default_default = storage2;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/plugins/persistence/index.js
var DEFAULT_STORAGE = default_default;
var DEFAULT_STORAGE_KEY = "WP_DATA";
var withLazySameState = (reducer) => (state, action) => {
  if (action.nextState === state) {
    return state;
  }
  return reducer(state, action);
};
function createPersistenceInterface(options) {
  const {
    storage: storage3 = DEFAULT_STORAGE,
    storageKey = DEFAULT_STORAGE_KEY
  } = options;
  let data;
  function getData() {
    if (data === void 0) {
      const persisted = storage3.getItem(storageKey);
      if (persisted === null) {
        data = {};
      } else {
        try {
          data = JSON.parse(persisted);
        } catch (error) {
          data = {};
        }
      }
    }
    return data;
  }
  function setData(key, value) {
    data = {
      ...data,
      [key]: value
    };
    storage3.setItem(storageKey, JSON.stringify(data));
  }
  return {
    get: getData,
    set: setData
  };
}
function persistencePlugin(registry, pluginOptions) {
  const persistence = createPersistenceInterface(pluginOptions);
  function createPersistOnChange(getState, storeName, keys) {
    let getPersistedState;
    if (Array.isArray(keys)) {
      const reducers = keys.reduce((accumulator, key) => Object.assign(accumulator, {
        [key]: (state, action) => action.nextState[key]
      }), {});
      getPersistedState = withLazySameState(combineReducers2(reducers));
    } else {
      getPersistedState = (state, action) => action.nextState;
    }
    let lastState = getPersistedState(void 0, {
      nextState: getState()
    });
    return () => {
      const state = getPersistedState(lastState, {
        nextState: getState()
      });
      if (state !== lastState) {
        persistence.set(storeName, state);
        lastState = state;
      }
    };
  }
  return {
    registerStore(storeName, options) {
      if (!options.persist) {
        return registry.registerStore(storeName, options);
      }
      const persistedState = persistence.get()[storeName];
      if (persistedState !== void 0) {
        let initialState = options.reducer(options.initialState, {
          type: "@@WP/PERSISTENCE_RESTORE"
        });
        if (isPlainObject(initialState) && isPlainObject(persistedState)) {
          initialState = (0, import_deepmerge.default)(initialState, persistedState, {
            isMergeableObject: isPlainObject
          });
        } else {
          initialState = persistedState;
        }
        options = {
          ...options,
          initialState
        };
      }
      const store2 = registry.registerStore(storeName, options);
      store2.subscribe(createPersistOnChange(store2.getState, storeName, options.persist));
      return store2;
    }
  };
}
persistencePlugin.__unstableMigrate = () => {
};

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/element/build-module/react.js
var import_react = __toESM(require_react());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/element/build-module/react-platform.js
var import_react_dom = __toESM(require_react_dom());
var import_client = __toESM(require_client());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/element/build-module/serialize.js
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

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/components/registry-provider/context.js
var Context = (0, import_react.createContext)(default_registry_default);
var {
  Consumer: Consumer2,
  Provider: Provider2
} = Context;
var RegistryConsumer = Consumer2;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/components/registry-provider/use-registry.js
function useRegistry() {
  return (0, import_react.useContext)(Context);
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/components/async-mode-provider/context.js
var Context2 = (0, import_react.createContext)(false);
var {
  Consumer: Consumer3,
  Provider: Provider3
} = Context2;

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/components/use-select/index.js
var renderQueue = createQueue();

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/components/with-select/index.js
var import_jsx_runtime = __toESM(require_jsx_runtime());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/components/with-dispatch/index.js
var import_jsx_runtime2 = __toESM(require_jsx_runtime());

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/components/with-registry/index.js
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var withRegistry = createHigherOrderComponent((OriginalComponent) => (props) => (0, import_jsx_runtime3.jsx)(RegistryConsumer, {
  children: (registry) => (0, import_jsx_runtime3.jsx)(OriginalComponent, {
    ...props,
    registry
  })
}), "withRegistry");

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/select.js
function select(storeNameOrDescriptor) {
  return default_registry_default.select(storeNameOrDescriptor);
}

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/data/build-module/index.js
var combineReducers2 = combineReducers;
var resolveSelect = default_registry_default.resolveSelect;
var suspendSelect = default_registry_default.suspendSelect;
var subscribe = default_registry_default.subscribe;
var registerGenericStore = default_registry_default.registerGenericStore;
var registerStore = default_registry_default.registerStore;
var use = default_registry_default.use;
var register = default_registry_default.register;

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
var reducer_default2 = combineReducers2({
  formatTypes
});

// ../../node_modules/@wordpress/rich-text/build-module/store/selectors.js
var selectors_exports2 = {};
__export(selectors_exports2, {
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
var actions_exports2 = {};
__export(actions_exports2, {
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
  reducer: reducer_default2,
  selectors: selectors_exports2,
  actions: actions_exports2
});
register(store);

// ../../node_modules/@wordpress/rich-text/build-module/create-element.js
function createElement2({
  implementation
}, html) {
  if (!createElement2.body) {
    createElement2.body = implementation.createHTMLDocument("").body;
  }
  createElement2.body.innerHTML = html;
  return createElement2.body;
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
    return new _RichTextData(create2({
      text
    }));
  }
  static fromHTMLString(html) {
    return new _RichTextData(create2({
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
    const richTextData = new _RichTextData(create2({
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
function create2({
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
    element = createElement2(document, html);
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
      mergePair(accumulator, create2({
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
    valueToInsert = create2({
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
  container.setAttribute("style", "position: absolute;margin: -1px;padding: 0;height: 1px;width: 1px;overflow: hidden;clip: rect(1px, 1px, 1px, 1px);-webkit-clip-path: inset(50%);clip-path: inset(50%);border: 0;word-wrap: normal !important;");
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

// ../../node_modules/@wordpress/a11y/node_modules/@wordpress/i18n/build-module/create-i18n.js
var DEFAULT_LOCALE_DATA = {
  "": {
    plural_forms(n2) {
      return n2 === 1 ? 0 : 1;
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
  const subscribe4 = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  };
  const getLocaleData3 = (domain = "default") => tannin.data[domain];
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
  const setLocaleData3 = (data, domain) => {
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
  const resetLocaleData3 = (data, domain) => {
    tannin.data = {};
    tannin.pluralForms = {};
    setLocaleData3(data, domain);
  };
  const dcnpgettext = (domain = "default", context, single, plural, number) => {
    if (!tannin.data[domain]) {
      doSetLocaleData(void 0, domain);
    }
    return tannin.dcnpgettext(domain, context, single, plural, number);
  };
  const getFilterDomain = (domain) => domain || "default";
  const __3 = (text, domain) => {
    let translation = dcnpgettext(domain, void 0, text);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.gettext", translation, text, domain);
    return hooks.applyFilters("i18n.gettext_" + getFilterDomain(domain), translation, text, domain);
  };
  const _x3 = (text, context, domain) => {
    let translation = dcnpgettext(domain, context, text);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.gettext_with_context", translation, text, context, domain);
    return hooks.applyFilters("i18n.gettext_with_context_" + getFilterDomain(domain), translation, text, context, domain);
  };
  const _n3 = (single, plural, number, domain) => {
    let translation = dcnpgettext(domain, void 0, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.ngettext", translation, single, plural, number, domain);
    return hooks.applyFilters("i18n.ngettext_" + getFilterDomain(domain), translation, single, plural, number, domain);
  };
  const _nx3 = (single, plural, number, context, domain) => {
    let translation = dcnpgettext(domain, context, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.ngettext_with_context", translation, single, plural, number, context, domain);
    return hooks.applyFilters("i18n.ngettext_with_context_" + getFilterDomain(domain), translation, single, plural, number, context, domain);
  };
  const isRTL3 = () => {
    return "rtl" === _x3("ltr", "text direction");
  };
  const hasTranslation3 = (single, context, domain) => {
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
    setLocaleData3(initialData, initialDomain);
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
    getLocaleData: getLocaleData3,
    setLocaleData: setLocaleData3,
    addLocaleData,
    resetLocaleData: resetLocaleData3,
    subscribe: subscribe4,
    __: __3,
    _x: _x3,
    _n: _n3,
    _nx: _nx3,
    isRTL: isRTL3,
    hasTranslation: hasTranslation3
  };
};

// ../../node_modules/@wordpress/a11y/node_modules/@wordpress/i18n/build-module/default-i18n.js
var i18n = createI18n(void 0, void 0, defaultHooks);
var getLocaleData = i18n.getLocaleData.bind(i18n);
var setLocaleData = i18n.setLocaleData.bind(i18n);
var resetLocaleData = i18n.resetLocaleData.bind(i18n);
var subscribe2 = i18n.subscribe.bind(i18n);
var __ = i18n.__.bind(i18n);
var _x = i18n._x.bind(i18n);
var _n = i18n._n.bind(i18n);
var _nx = i18n._nx.bind(i18n);
var isRTL = i18n.isRTL.bind(i18n);
var hasTranslation = i18n.hasTranslation.bind(i18n);

// ../../node_modules/@wordpress/a11y/build-module/script/add-intro-text.js
function addIntroText() {
  const introText = document.createElement("p");
  introText.id = "a11y-speak-intro-text";
  introText.className = "a11y-speak-intro-text";
  introText.textContent = __("Notifications");
  introText.setAttribute("style", "position: absolute;margin: -1px;padding: 0;height: 1px;width: 1px;overflow: hidden;clip: rect(1px, 1px, 1px, 1px);-webkit-clip-path: inset(50%);clip-path: inset(50%);border: 0;word-wrap: normal !important;");
  introText.setAttribute("hidden", "hidden");
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
  const createEmpty2 = () => createElement2(doc, "");
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

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/i18n/build-module/create-i18n.js
var DEFAULT_LOCALE_DATA2 = {
  "": {
    plural_forms(n2) {
      return n2 === 1 ? 0 : 1;
    }
  }
};
var I18N_HOOK_REGEXP2 = /^i18n\.(n?gettext|has_translation)(_|$)/;
var createI18n2 = (initialData, initialDomain, hooks) => {
  const tannin = new Tannin({});
  const listeners = /* @__PURE__ */ new Set();
  const notifyListeners = () => {
    listeners.forEach((listener) => listener());
  };
  const subscribe4 = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  };
  const getLocaleData3 = (domain = "default") => tannin.data[domain];
  const doSetLocaleData = (data, domain = "default") => {
    var _a;
    tannin.data[domain] = {
      ...tannin.data[domain],
      ...data
    };
    tannin.data[domain][""] = {
      ...DEFAULT_LOCALE_DATA2[""],
      ...(_a = tannin.data[domain]) == null ? void 0 : _a[""]
    };
    delete tannin.pluralForms[domain];
  };
  const setLocaleData3 = (data, domain) => {
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
        ...DEFAULT_LOCALE_DATA2[""],
        ...(_a = tannin.data[domain]) == null ? void 0 : _a[""],
        ...data == null ? void 0 : data[""]
      }
    };
    delete tannin.pluralForms[domain];
    notifyListeners();
  };
  const resetLocaleData3 = (data, domain) => {
    tannin.data = {};
    tannin.pluralForms = {};
    setLocaleData3(data, domain);
  };
  const dcnpgettext = (domain = "default", context, single, plural, number) => {
    if (!tannin.data[domain]) {
      doSetLocaleData(void 0, domain);
    }
    return tannin.dcnpgettext(domain, context, single, plural, number);
  };
  const getFilterDomain = (domain) => domain || "default";
  const __3 = (text, domain) => {
    let translation = dcnpgettext(domain, void 0, text);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.gettext", translation, text, domain);
    return hooks.applyFilters("i18n.gettext_" + getFilterDomain(domain), translation, text, domain);
  };
  const _x3 = (text, context, domain) => {
    let translation = dcnpgettext(domain, context, text);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.gettext_with_context", translation, text, context, domain);
    return hooks.applyFilters("i18n.gettext_with_context_" + getFilterDomain(domain), translation, text, context, domain);
  };
  const _n3 = (single, plural, number, domain) => {
    let translation = dcnpgettext(domain, void 0, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.ngettext", translation, single, plural, number, domain);
    return hooks.applyFilters("i18n.ngettext_" + getFilterDomain(domain), translation, single, plural, number, domain);
  };
  const _nx3 = (single, plural, number, context, domain) => {
    let translation = dcnpgettext(domain, context, single, plural, number);
    if (!hooks) {
      return translation;
    }
    translation = hooks.applyFilters("i18n.ngettext_with_context", translation, single, plural, number, context, domain);
    return hooks.applyFilters("i18n.ngettext_with_context_" + getFilterDomain(domain), translation, single, plural, number, context, domain);
  };
  const isRTL3 = () => {
    return "rtl" === _x3("ltr", "text direction");
  };
  const hasTranslation3 = (single, context, domain) => {
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
    setLocaleData3(initialData, initialDomain);
  }
  if (hooks) {
    const onHookAddedOrRemoved = (hookName) => {
      if (I18N_HOOK_REGEXP2.test(hookName)) {
        notifyListeners();
      }
    };
    hooks.addAction("hookAdded", "core/i18n", onHookAddedOrRemoved);
    hooks.addAction("hookRemoved", "core/i18n", onHookAddedOrRemoved);
  }
  return {
    getLocaleData: getLocaleData3,
    setLocaleData: setLocaleData3,
    addLocaleData,
    resetLocaleData: resetLocaleData3,
    subscribe: subscribe4,
    __: __3,
    _x: _x3,
    _n: _n3,
    _nx: _nx3,
    isRTL: isRTL3,
    hasTranslation: hasTranslation3
  };
};

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/i18n/build-module/default-i18n.js
var i18n2 = createI18n2(void 0, void 0, defaultHooks);
var getLocaleData2 = i18n2.getLocaleData.bind(i18n2);
var setLocaleData2 = i18n2.setLocaleData.bind(i18n2);
var resetLocaleData2 = i18n2.resetLocaleData.bind(i18n2);
var subscribe3 = i18n2.subscribe.bind(i18n2);
var __2 = i18n2.__.bind(i18n2);
var _x2 = i18n2._x.bind(i18n2);
var _n2 = i18n2._n.bind(i18n2);
var _nx2 = i18n2._nx.bind(i18n2);
var isRTL2 = i18n2.isRTL.bind(i18n2);
var hasTranslation2 = i18n2.hasTranslation.bind(i18n2);

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/keycodes/build-module/platform.js
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

// ../../node_modules/@wordpress/rich-text/node_modules/@wordpress/keycodes/build-module/index.js
var BACKSPACE = 8;
var LEFT = 37;
var RIGHT = 39;
var DELETE = 46;
var ALT = "alt";
var CTRL = "ctrl";
var COMMAND = "meta";
var SHIFT = "shift";
function capitaliseFirstCharacter(string) {
  return string.length < 2 ? string.toUpperCase() : string.charAt(0).toUpperCase() + string.slice(1);
}
function mapValues2(object, mapFn) {
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
var rawShortcut = mapValues2(modifiers, (modifier) => {
  return (character, _isApple = isAppleOS) => {
    return [...modifier(_isApple), character.toLowerCase()].join("+");
  };
});
var displayShortcutList = mapValues2(modifiers, (modifier) => {
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
var displayShortcut = mapValues2(displayShortcutList, (shortcutList) => {
  return (character, _isApple = isAppleOS) => shortcutList(character, _isApple).join("");
});
var shortcutAriaLabel = mapValues2(modifiers, (modifier) => {
  return (character, _isApple = isAppleOS) => {
    const isApple = _isApple();
    const replacementKeyMap = {
      [SHIFT]: "Shift",
      [COMMAND]: isApple ? "Command" : "Control",
      [CTRL]: "Control",
      [ALT]: isApple ? "Option" : "Alt",
      /* translators: comma as in the character ',' */
      ",": __2("Comma"),
      /* translators: period as in the character '.' */
      ".": __2("Period"),
      /* translators: backtick as in the character '`' */
      "`": __2("Backtick"),
      /* translators: tilde as in the character '~' */
      "~": __2("Tilde")
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
var isKeyboardEvent = mapValues2(modifiers, (getModifiers) => {
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
  return insert(value, create2(), startIndex, endIndex);
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
    return create2({
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
  __dangerousOptInToUnstableAPIsOnlyForCoreModules,
  w,
  k,
  names_default,
  a11y_default,
  store,
  createElement2 as createElement,
  toHTMLString,
  getTextContent,
  RichTextData,
  create2 as create,
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
  require_es6,
  decodeEntities
};
//# sourceMappingURL=chunk-UGSIEXIW.js.map
