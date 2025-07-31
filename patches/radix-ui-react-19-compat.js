// React 19 compatibility patch for @radix-ui
// This file fixes useLayoutEffect import issues

import { useLayoutEffect } from 'react';

// Export useLayoutEffect directly from React
export { useLayoutEffect };
export default useLayoutEffect;