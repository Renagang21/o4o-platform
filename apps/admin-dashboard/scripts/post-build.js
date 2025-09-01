#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '../dist/index.html');

if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');
  
  // WordPress polyfill 스크립트를 body 태그 직후에 추가
  const wpPolyfillScript = `    <script>
      // WordPress polyfill - MUST be initialized before any WordPress modules load
      (function() {
        window.wp = window.wp || {};
        
        // Pre-initialize i18n to prevent circular reference
        window.wp.i18n = window.wp.i18n || {
          __: (text) => text,
          _x: (text) => text,
          _n: (single, plural, number) => number === 1 ? single : plural,
          _nx: (single, plural, number) => number === 1 ? single : plural,
          sprintf: (format, ...args) => {
            let i = 0;
            return format.replace(/%[sdjf]/g, () => String(args[i++]));
          },
          isRTL: () => false,
          setLocaleData: () => {},
          getLocaleData: () => ({}),
          hasTranslation: () => false,
          subscribe: () => () => {}
        };
        
        // Initialize hooks (needed by other WP modules)
        const filters = {};
        const actions = {};
        
        window.wp.hooks = {
          addFilter: (hookName, namespace, callback, priority = 10) => {
            filters[hookName] = filters[hookName] || [];
            filters[hookName].push(callback);
          },
          applyFilters: (hookName, value, ...args) => {
            const callbacks = filters[hookName] || [];
            return callbacks.reduce((val, callback) => callback(val, ...args), value);
          },
          addAction: (hookName, namespace, callback, priority = 10) => {
            actions[hookName] = actions[hookName] || [];
            actions[hookName].push(callback);
          },
          doAction: (hookName, ...args) => {
            const callbacks = actions[hookName] || [];
            callbacks.forEach(callback => callback(...args));
          },
          removeFilter: () => 0,
          removeAction: () => 0,
          hasFilter: () => false,
          hasAction: () => false,
          removeAllFilters: () => 0,
          removeAllActions: () => 0,
          currentFilter: () => null,
          currentAction: () => null,
          doingFilter: () => false,
          doingAction: () => false,
          didFilter: () => 0,
          didAction: () => 0
        };
        
        // Initialize other core WP modules to prevent initialization errors
        window.wp.data = window.wp.data || {
          select: () => ({}),
          dispatch: () => ({}),
          subscribe: () => () => {},
          registerStore: () => {}
        };
        
        window.wp.element = window.wp.element || {
          createElement: () => null,
          render: () => null
        };
        
        window.wp.blocks = window.wp.blocks || {
          registerBlockType: () => {},
          getCategories: () => [],
          setCategories: () => {}
        };
        
        window.wp.domReady = window.wp.domReady || ((callback) => {
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
          } else {
            callback();
          }
        });
        
        // All WordPress polyfills initialized successfully
      })();
    </script>
`;

  // <div id="root"></div> 다음에 스크립트 추가
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n${wpPolyfillScript}`
  );
  
  fs.writeFileSync(indexHtmlPath, html, 'utf-8');
  // Log removed
} else {
  // Error log removed
  process.exit(1);
}