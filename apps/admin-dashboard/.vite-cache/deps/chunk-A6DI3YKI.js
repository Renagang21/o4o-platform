import {
  require_remove_accents
} from "./chunk-5NAH7P3D.js";
import {
  defaultHooks
} from "./chunk-ATYMGCLF.js";
import {
  Tannin
} from "./chunk-VCN4ELHL.js";
import {
  __toESM
} from "./chunk-OL46QLBJ.js";

// ../../node_modules/@wordpress/api-fetch/node_modules/@wordpress/i18n/build-module/create-i18n.js
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
  const isRTL2 = () => {
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
    isRTL: isRTL2,
    hasTranslation: hasTranslation2
  };
};

// ../../node_modules/@wordpress/api-fetch/node_modules/@wordpress/i18n/build-module/default-i18n.js
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

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/nonce.js
function createNonceMiddleware(nonce) {
  const middleware = (options, next) => {
    const {
      headers = {}
    } = options;
    for (const headerName in headers) {
      if (headerName.toLowerCase() === "x-wp-nonce" && headers[headerName] === middleware.nonce) {
        return next(options);
      }
    }
    return next({
      ...options,
      headers: {
        ...headers,
        "X-WP-Nonce": middleware.nonce
      }
    });
  };
  middleware.nonce = nonce;
  return middleware;
}
var nonce_default = createNonceMiddleware;

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/namespace-endpoint.js
var namespaceAndEndpointMiddleware = (options, next) => {
  let path = options.path;
  let namespaceTrimmed, endpointTrimmed;
  if (typeof options.namespace === "string" && typeof options.endpoint === "string") {
    namespaceTrimmed = options.namespace.replace(/^\/|\/$/g, "");
    endpointTrimmed = options.endpoint.replace(/^\//, "");
    if (endpointTrimmed) {
      path = namespaceTrimmed + "/" + endpointTrimmed;
    } else {
      path = namespaceTrimmed;
    }
  }
  delete options.namespace;
  delete options.endpoint;
  return next({
    ...options,
    path
  });
};
var namespace_endpoint_default = namespaceAndEndpointMiddleware;

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/root-url.js
var createRootURLMiddleware = (rootURL) => (options, next) => {
  return namespace_endpoint_default(options, (optionsWithPath) => {
    let url = optionsWithPath.url;
    let path = optionsWithPath.path;
    let apiRoot;
    if (typeof path === "string") {
      apiRoot = rootURL;
      if (-1 !== rootURL.indexOf("?")) {
        path = path.replace("?", "&");
      }
      path = path.replace(/^\//, "");
      if ("string" === typeof apiRoot && -1 !== apiRoot.indexOf("?")) {
        path = path.replace("?", "&");
      }
      url = apiRoot + path;
    }
    return next({
      ...optionsWithPath,
      url
    });
  });
};
var root_url_default = createRootURLMiddleware;

// ../../node_modules/@wordpress/url/build-module/is-url.js
function isURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ../../node_modules/@wordpress/url/build-module/is-email.js
var EMAIL_REGEXP = /^(mailto:)?[a-z0-9._%+-]+@[a-z0-9][a-z0-9.-]*\.[a-z]{2,63}$/i;
function isEmail(email) {
  return EMAIL_REGEXP.test(email);
}

// ../../node_modules/@wordpress/url/build-module/get-protocol.js
function getProtocol(url) {
  const matches = /^([^\s:]+:)/.exec(url);
  if (matches) {
    return matches[1];
  }
}

// ../../node_modules/@wordpress/url/build-module/is-valid-protocol.js
function isValidProtocol(protocol) {
  if (!protocol) {
    return false;
  }
  return /^[a-z\-.\+]+[0-9]*:$/i.test(protocol);
}

// ../../node_modules/@wordpress/url/build-module/get-path.js
function getPath(url) {
  const matches = /^[^\/\s:]+:(?:\/\/)?[^\/\s#?]+[\/]([^\s#?]+)[#?]{0,1}\S*$/.exec(url);
  if (matches) {
    return matches[1];
  }
}

// ../../node_modules/@wordpress/url/build-module/get-query-string.js
function getQueryString(url) {
  let query;
  try {
    query = new URL(url, "http://example.com").search.substring(1);
  } catch (error) {
  }
  if (query) {
    return query;
  }
}

// ../../node_modules/@wordpress/url/build-module/build-query-string.js
function buildQueryString(data) {
  let string = "";
  const stack = Object.entries(data);
  let pair;
  while (pair = stack.shift()) {
    let [key, value] = pair;
    const hasNestedData = Array.isArray(value) || value && value.constructor === Object;
    if (hasNestedData) {
      const valuePairs = Object.entries(value).reverse();
      for (const [member, memberValue] of valuePairs) {
        stack.unshift([`${key}[${member}]`, memberValue]);
      }
    } else if (value !== void 0) {
      if (value === null) {
        value = "";
      }
      string += "&" + [key, String(value)].map(encodeURIComponent).join("=");
    }
  }
  return string.substr(1);
}

// ../../node_modules/@wordpress/url/build-module/get-fragment.js
function getFragment(url) {
  const matches = /^\S+?(#[^\s\?]*)/.exec(url);
  if (matches) {
    return matches[1];
  }
}

// ../../node_modules/@wordpress/url/build-module/is-valid-fragment.js
function isValidFragment(fragment) {
  if (!fragment) {
    return false;
  }
  return /^#[^\s#?\/]*$/.test(fragment);
}

// ../../node_modules/@wordpress/url/build-module/safe-decode-uri-component.js
function safeDecodeURIComponent(uriComponent) {
  try {
    return decodeURIComponent(uriComponent);
  } catch (uriComponentError) {
    return uriComponent;
  }
}

// ../../node_modules/@wordpress/url/build-module/get-query-args.js
function setPath(object, path, value) {
  const length = path.length;
  const lastIndex = length - 1;
  for (let i = 0; i < length; i++) {
    let key = path[i];
    if (!key && Array.isArray(object)) {
      key = object.length.toString();
    }
    key = ["__proto__", "constructor", "prototype"].includes(key) ? key.toUpperCase() : key;
    const isNextKeyArrayIndex = !isNaN(Number(path[i + 1]));
    object[key] = i === lastIndex ? (
      // If at end of path, assign the intended value.
      value
    ) : (
      // Otherwise, advance to the next object in the path, creating
      // it if it does not yet exist.
      object[key] || (isNextKeyArrayIndex ? [] : {})
    );
    if (Array.isArray(object[key]) && !isNextKeyArrayIndex) {
      object[key] = {
        ...object[key]
      };
    }
    object = object[key];
  }
}
function getQueryArgs(url) {
  return (getQueryString(url) || "").replace(/\+/g, "%20").split("&").reduce((accumulator, keyValue) => {
    const [key, value = ""] = keyValue.split("=").filter(Boolean).map(safeDecodeURIComponent);
    if (key) {
      const segments = key.replace(/\]/g, "").split("[");
      setPath(accumulator, segments, value);
    }
    return accumulator;
  }, /* @__PURE__ */ Object.create(null));
}

// ../../node_modules/@wordpress/url/build-module/add-query-args.js
function addQueryArgs(url = "", args) {
  if (!args || !Object.keys(args).length) {
    return url;
  }
  const fragment = getFragment(url) || "";
  let baseUrl = url.replace(fragment, "");
  const queryStringIndex = url.indexOf("?");
  if (queryStringIndex !== -1) {
    args = Object.assign(getQueryArgs(url), args);
    baseUrl = baseUrl.substr(0, queryStringIndex);
  }
  return baseUrl + "?" + buildQueryString(args) + fragment;
}

// ../../node_modules/@wordpress/url/build-module/get-query-arg.js
function getQueryArg(url, arg) {
  return getQueryArgs(url)[arg];
}

// ../../node_modules/@wordpress/url/build-module/has-query-arg.js
function hasQueryArg(url, arg) {
  return getQueryArg(url, arg) !== void 0;
}

// ../../node_modules/@wordpress/url/build-module/remove-query-args.js
function removeQueryArgs(url, ...args) {
  const fragment = url.replace(/^[^#]*/, "");
  url = url.replace(/#.*/, "");
  const queryStringIndex = url.indexOf("?");
  if (queryStringIndex === -1) {
    return url + fragment;
  }
  const query = getQueryArgs(url);
  const baseURL = url.substr(0, queryStringIndex);
  args.forEach((arg) => delete query[arg]);
  const queryString = buildQueryString(query);
  const updatedUrl = queryString ? baseURL + "?" + queryString : baseURL;
  return updatedUrl + fragment;
}

// ../../node_modules/@wordpress/url/build-module/prepend-http.js
var USABLE_HREF_REGEXP = /^(?:[a-z]+:|#|\?|\.|\/)/i;
function prependHTTP(url) {
  if (!url) {
    return url;
  }
  url = url.trim();
  if (!USABLE_HREF_REGEXP.test(url) && !isEmail(url)) {
    return "http://" + url;
  }
  return url;
}

// ../../node_modules/@wordpress/url/build-module/safe-decode-uri.js
function safeDecodeURI(uri) {
  try {
    return decodeURI(uri);
  } catch (uriError) {
    return uri;
  }
}

// ../../node_modules/@wordpress/url/build-module/filter-url-for-display.js
function filterURLForDisplay(url, maxLength = null) {
  if (!url) {
    return "";
  }
  let filteredURL = url.replace(/^[a-z\-.\+]+[0-9]*:(\/\/)?/i, "").replace(/^www\./i, "");
  if (filteredURL.match(/^[^\/]+\/$/)) {
    filteredURL = filteredURL.replace("/", "");
  }
  const fileRegexp = /\/([^\/?]+)\.(?:[\w]+)(?=\?|$)/;
  if (!maxLength || filteredURL.length <= maxLength || !filteredURL.match(fileRegexp)) {
    return filteredURL;
  }
  filteredURL = filteredURL.split("?")[0];
  const urlPieces = filteredURL.split("/");
  const file = urlPieces[urlPieces.length - 1];
  if (file.length <= maxLength) {
    return "…" + filteredURL.slice(-maxLength);
  }
  const index = file.lastIndexOf(".");
  const [fileName, extension] = [file.slice(0, index), file.slice(index + 1)];
  const truncatedFile = fileName.slice(-3) + "." + extension;
  return file.slice(0, maxLength - truncatedFile.length - 1) + "…" + truncatedFile;
}

// ../../node_modules/@wordpress/url/build-module/clean-for-slug.js
var import_remove_accents = __toESM(require_remove_accents());

// ../../node_modules/@wordpress/url/build-module/get-filename.js
function getFilename(url) {
  let filename;
  if (!url) {
    return;
  }
  try {
    filename = new URL(url, "http://example.com").pathname.split("/").pop();
  } catch (error) {
  }
  if (filename) {
    return filename;
  }
}

// ../../node_modules/@wordpress/url/build-module/normalize-path.js
function normalizePath(path) {
  const split = path.split("?");
  const query = split[1];
  const base = split[0];
  if (!query) {
    return base;
  }
  return base + "?" + query.split("&").map((entry) => entry.split("=")).map((pair) => pair.map(decodeURIComponent)).sort((a, b) => a[0].localeCompare(b[0])).map((pair) => pair.map(encodeURIComponent)).map((pair) => pair.join("=")).join("&");
}

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/preloading.js
function createPreloadingMiddleware(preloadedData) {
  const cache = Object.fromEntries(Object.entries(preloadedData).map(([path, data]) => [normalizePath(path), data]));
  return (options, next) => {
    const {
      parse = true
    } = options;
    let rawPath = options.path;
    if (!rawPath && options.url) {
      const {
        rest_route: pathFromQuery,
        ...queryArgs
      } = getQueryArgs(options.url);
      if (typeof pathFromQuery === "string") {
        rawPath = addQueryArgs(pathFromQuery, queryArgs);
      }
    }
    if (typeof rawPath !== "string") {
      return next(options);
    }
    const method = options.method || "GET";
    const path = normalizePath(rawPath);
    if ("GET" === method && cache[path]) {
      const cacheData = cache[path];
      delete cache[path];
      return prepareResponse(cacheData, !!parse);
    } else if ("OPTIONS" === method && cache[method] && cache[method][path]) {
      const cacheData = cache[method][path];
      delete cache[method][path];
      return prepareResponse(cacheData, !!parse);
    }
    return next(options);
  };
}
function prepareResponse(responseData, parse) {
  if (parse) {
    return Promise.resolve(responseData.body);
  }
  try {
    return Promise.resolve(new window.Response(JSON.stringify(responseData.body), {
      status: 200,
      statusText: "OK",
      headers: responseData.headers
    }));
  } catch {
    Object.entries(responseData.headers).forEach(([key, value]) => {
      if (key.toLowerCase() === "link") {
        responseData.headers[key] = value.replace(/<([^>]+)>/, (_, url) => `<${encodeURI(url)}>`);
      }
    });
    return Promise.resolve(parse ? responseData.body : new window.Response(JSON.stringify(responseData.body), {
      status: 200,
      statusText: "OK",
      headers: responseData.headers
    }));
  }
}
var preloading_default = createPreloadingMiddleware;

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/fetch-all-middleware.js
var modifyQuery = ({
  path,
  url,
  ...options
}, queryArgs) => ({
  ...options,
  url: url && addQueryArgs(url, queryArgs),
  path: path && addQueryArgs(path, queryArgs)
});
var parseResponse = (response) => response.json ? response.json() : Promise.reject(response);
var parseLinkHeader = (linkHeader) => {
  if (!linkHeader) {
    return {};
  }
  const match = linkHeader.match(/<([^>]+)>; rel="next"/);
  return match ? {
    next: match[1]
  } : {};
};
var getNextPageUrl = (response) => {
  const {
    next
  } = parseLinkHeader(response.headers.get("link"));
  return next;
};
var requestContainsUnboundedQuery = (options) => {
  const pathIsUnbounded = !!options.path && options.path.indexOf("per_page=-1") !== -1;
  const urlIsUnbounded = !!options.url && options.url.indexOf("per_page=-1") !== -1;
  return pathIsUnbounded || urlIsUnbounded;
};
var fetchAllMiddleware = async (options, next) => {
  if (options.parse === false) {
    return next(options);
  }
  if (!requestContainsUnboundedQuery(options)) {
    return next(options);
  }
  const response = await build_module_default({
    ...modifyQuery(options, {
      per_page: 100
    }),
    // Ensure headers are returned for page 1.
    parse: false
  });
  const results = await parseResponse(response);
  if (!Array.isArray(results)) {
    return results;
  }
  let nextPage = getNextPageUrl(response);
  if (!nextPage) {
    return results;
  }
  let mergedResults = (
    /** @type {any[]} */
    [].concat(results)
  );
  while (nextPage) {
    const nextResponse = await build_module_default({
      ...options,
      // Ensure the URL for the next page is used instead of any provided path.
      path: void 0,
      url: nextPage,
      // Ensure we still get headers so we can identify the next page.
      parse: false
    });
    const nextResults = await parseResponse(nextResponse);
    mergedResults = mergedResults.concat(nextResults);
    nextPage = getNextPageUrl(nextResponse);
  }
  return mergedResults;
};
var fetch_all_middleware_default = fetchAllMiddleware;

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/http-v1.js
var OVERRIDE_METHODS = /* @__PURE__ */ new Set(["PATCH", "PUT", "DELETE"]);
var DEFAULT_METHOD = "GET";
var httpV1Middleware = (options, next) => {
  const {
    method = DEFAULT_METHOD
  } = options;
  if (OVERRIDE_METHODS.has(method.toUpperCase())) {
    options = {
      ...options,
      headers: {
        ...options.headers,
        "X-HTTP-Method-Override": method,
        "Content-Type": "application/json"
      },
      method: "POST"
    };
  }
  return next(options);
};
var http_v1_default = httpV1Middleware;

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/user-locale.js
var userLocaleMiddleware = (options, next) => {
  if (typeof options.url === "string" && !hasQueryArg(options.url, "_locale")) {
    options.url = addQueryArgs(options.url, {
      _locale: "user"
    });
  }
  if (typeof options.path === "string" && !hasQueryArg(options.path, "_locale")) {
    options.path = addQueryArgs(options.path, {
      _locale: "user"
    });
  }
  return next(options);
};
var user_locale_default = userLocaleMiddleware;

// ../../node_modules/@wordpress/api-fetch/build-module/utils/response.js
var parseResponse2 = (response, shouldParseResponse = true) => {
  if (shouldParseResponse) {
    if (response.status === 204) {
      return null;
    }
    return response.json ? response.json() : Promise.reject(response);
  }
  return response;
};
var parseJsonAndNormalizeError = (response) => {
  const invalidJsonError = {
    code: "invalid_json",
    message: __("The response is not a valid JSON response.")
  };
  if (!response || !response.json) {
    throw invalidJsonError;
  }
  return response.json().catch(() => {
    throw invalidJsonError;
  });
};
var parseResponseAndNormalizeError = (response, shouldParseResponse = true) => {
  return Promise.resolve(parseResponse2(response, shouldParseResponse)).catch((res) => parseAndThrowError(res, shouldParseResponse));
};
function parseAndThrowError(response, shouldParseResponse = true) {
  if (!shouldParseResponse) {
    throw response;
  }
  return parseJsonAndNormalizeError(response).then((error) => {
    const unknownError = {
      code: "unknown_error",
      message: __("An unknown error occurred.")
    };
    throw error || unknownError;
  });
}

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/media-upload.js
function isMediaUploadRequest(options) {
  const isCreateMethod = !!options.method && options.method === "POST";
  const isMediaEndpoint = !!options.path && options.path.indexOf("/wp/v2/media") !== -1 || !!options.url && options.url.indexOf("/wp/v2/media") !== -1;
  return isMediaEndpoint && isCreateMethod;
}
var mediaUploadMiddleware = (options, next) => {
  if (!isMediaUploadRequest(options)) {
    return next(options);
  }
  let retries = 0;
  const maxRetries = 5;
  const postProcess = (attachmentId) => {
    retries++;
    return next({
      path: `/wp/v2/media/${attachmentId}/post-process`,
      method: "POST",
      data: {
        action: "create-image-subsizes"
      },
      parse: false
    }).catch(() => {
      if (retries < maxRetries) {
        return postProcess(attachmentId);
      }
      next({
        path: `/wp/v2/media/${attachmentId}?force=true`,
        method: "DELETE"
      });
      return Promise.reject();
    });
  };
  return next({
    ...options,
    parse: false
  }).catch((response) => {
    if (!response.headers) {
      return Promise.reject(response);
    }
    const attachmentId = response.headers.get("x-wp-upload-attachment-id");
    if (response.status >= 500 && response.status < 600 && attachmentId) {
      return postProcess(attachmentId).catch(() => {
        if (options.parse !== false) {
          return Promise.reject({
            code: "post_process",
            message: __("Media upload failed. If this is a photo or a large image, please scale it down and try again.")
          });
        }
        return Promise.reject(response);
      });
    }
    return parseAndThrowError(response, options.parse);
  }).then((response) => parseResponseAndNormalizeError(response, options.parse));
};
var media_upload_default = mediaUploadMiddleware;

// ../../node_modules/@wordpress/api-fetch/build-module/middlewares/theme-preview.js
var createThemePreviewMiddleware = (themePath) => (options, next) => {
  if (typeof options.url === "string") {
    const wpThemePreview = getQueryArg(options.url, "wp_theme_preview");
    if (wpThemePreview === void 0) {
      options.url = addQueryArgs(options.url, {
        wp_theme_preview: themePath
      });
    } else if (wpThemePreview === "") {
      options.url = removeQueryArgs(options.url, "wp_theme_preview");
    }
  }
  if (typeof options.path === "string") {
    const wpThemePreview = getQueryArg(options.path, "wp_theme_preview");
    if (wpThemePreview === void 0) {
      options.path = addQueryArgs(options.path, {
        wp_theme_preview: themePath
      });
    } else if (wpThemePreview === "") {
      options.path = removeQueryArgs(options.path, "wp_theme_preview");
    }
  }
  return next(options);
};
var theme_preview_default = createThemePreviewMiddleware;

// ../../node_modules/@wordpress/api-fetch/build-module/index.js
var DEFAULT_HEADERS = {
  // The backend uses the Accept header as a condition for considering an
  // incoming request as a REST request.
  //
  // See: https://core.trac.wordpress.org/ticket/44534
  Accept: "application/json, */*;q=0.1"
};
var DEFAULT_OPTIONS = {
  credentials: "include"
};
var middlewares = [user_locale_default, namespace_endpoint_default, http_v1_default, fetch_all_middleware_default];
function registerMiddleware(middleware) {
  middlewares.unshift(middleware);
}
var checkStatus = (response) => {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  throw response;
};
var defaultFetchHandler = (nextOptions) => {
  const {
    url,
    path,
    data,
    parse = true,
    ...remainingOptions
  } = nextOptions;
  let {
    body,
    headers
  } = nextOptions;
  headers = {
    ...DEFAULT_HEADERS,
    ...headers
  };
  if (data) {
    body = JSON.stringify(data);
    headers["Content-Type"] = "application/json";
  }
  const responsePromise = window.fetch(
    // Fall back to explicitly passing `window.location` which is the behavior if `undefined` is passed.
    url || path || window.location.href,
    {
      ...DEFAULT_OPTIONS,
      ...remainingOptions,
      body,
      headers
    }
  );
  return responsePromise.then((value) => Promise.resolve(value).then(checkStatus).catch((response) => parseAndThrowError(response, parse)).then((response) => parseResponseAndNormalizeError(response, parse)), (err) => {
    if (err && err.name === "AbortError") {
      throw err;
    }
    throw {
      code: "fetch_error",
      message: __("You are probably offline.")
    };
  });
};
var fetchHandler = defaultFetchHandler;
function setFetchHandler(newFetchHandler) {
  fetchHandler = newFetchHandler;
}
function apiFetch(options) {
  const enhancedHandler = middlewares.reduceRight((next, middleware) => {
    return (workingOptions) => middleware(workingOptions, next);
  }, fetchHandler);
  return enhancedHandler(options).catch((error) => {
    if (error.code !== "rest_cookie_invalid_nonce") {
      return Promise.reject(error);
    }
    return window.fetch(apiFetch.nonceEndpoint).then(checkStatus).then((data) => data.text()).then((text) => {
      apiFetch.nonceMiddleware.nonce = text;
      return apiFetch(options);
    });
  });
}
apiFetch.use = registerMiddleware;
apiFetch.setFetchHandler = setFetchHandler;
apiFetch.createNonceMiddleware = nonce_default;
apiFetch.createPreloadingMiddleware = preloading_default;
apiFetch.createRootURLMiddleware = root_url_default;
apiFetch.fetchAllMiddleware = fetch_all_middleware_default;
apiFetch.mediaUploadMiddleware = media_upload_default;
apiFetch.createThemePreviewMiddleware = theme_preview_default;
var build_module_default = apiFetch;

export {
  isURL,
  getProtocol,
  isValidProtocol,
  getPath,
  isValidFragment,
  addQueryArgs,
  prependHTTP,
  safeDecodeURI,
  filterURLForDisplay,
  getFilename,
  build_module_default
};
//# sourceMappingURL=chunk-A6DI3YKI.js.map
