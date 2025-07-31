// @radix-ui/react-use-layout-effect fix for React 19
import * as React from 'react';

// Ensure React is properly available
const ReactNamespace = React.default || React;

// Use useLayoutEffect from React with proper fallback
export const useLayoutEffect = typeof window !== 'undefined' 
  ? ReactNamespace.useLayoutEffect 
  : ReactNamespace.useEffect;

// Export everything React exports for compatibility
export * from 'react';

// Default export for CommonJS compatibility
export default { useLayoutEffect };