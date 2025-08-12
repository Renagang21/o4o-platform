/**
 * React 19 Compatibility Shim
 * 
 * Some libraries (like Radix UI and WordPress packages) expect React to be 
 * available as a namespace object with properties like React.Children.
 * React 19 changes how these are exported, causing compatibility issues.
 * 
 * This shim ensures backward compatibility.
 */

import React from 'react';
import * as ReactExports from 'react';
import * as ReactDOMExports from 'react-dom';

// Create a proper React namespace object with all exports
const ReactNamespace = { ...ReactExports } as any;

// Ensure default export is included if it exists
if (React && typeof React === 'object') {
  Object.assign(ReactNamespace, React);
}

// Ensure all named exports are available
Object.keys(ReactExports).forEach(key => {
  if (!(key in ReactNamespace)) {
    ReactNamespace[key] = (ReactExports as any)[key];
  }
});

// Make React available globally for libraries that expect it
if (typeof window !== 'undefined') {
  (window as any).React = ReactNamespace;
  (window as any).ReactDOM = ReactDOMExports;
  
  // Also set on globalThis for better compatibility
  (globalThis as any).React = ReactNamespace;
  (globalThis as any).ReactDOM = ReactDOMExports;
}

// Export for use in the app
export { ReactNamespace as React, ReactDOMExports as ReactDOM };

// Log for debugging
// if (typeof window !== 'undefined' && import.meta.env.DEV) {
//   console.log('React shim loaded:', {
//     hasChildren: 'Children' in ReactNamespace,
//     hasCreateElement: 'createElement' in ReactNamespace,
//     hasFragment: 'Fragment' in ReactNamespace,
//     hasStrictMode: 'StrictMode' in ReactNamespace,
//     totalKeys: Object.keys(ReactNamespace).length,
//   });
// }