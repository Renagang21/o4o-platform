/**
 * WordPress Hooks Shim
 * 
 * This file ensures that WordPress hooks are available globally
 * before any WordPress packages try to use them.
 * This prevents circular dependency issues.
 */

// Type declaration is now in wordpress-runtime-setup.ts

// Create a simple hooks implementation to avoid circular dependencies
const createHooks = () => {
  const filters: Record<string, any[]> = {};
  const actions: Record<string, any[]> = {};
  
  return {
    addFilter: (hookName: string, namespace: string, callback: Function, priority = 10) => {
        filters[hookName] = filters[hookName] || [];
        filters[hookName].push({ callback, priority, namespace });
        filters[hookName].sort((a, b) => a.priority - b.priority);
        return hookName;
      },
      
      applyFilters: (hookName: string, value: any, ...args: any[]) => {
        const callbacks = filters[hookName] || [];
        return callbacks.reduce((val, hook) => {
          return hook.callback(val, ...args);
        }, value);
      },
      
      addAction: (hookName: string, namespace: string, callback: Function, priority = 10) => {
        actions[hookName] = actions[hookName] || [];
        actions[hookName].push({ callback, priority, namespace });
        actions[hookName].sort((a, b) => a.priority - b.priority);
        return hookName;
      },
      
      doAction: (hookName: string, ...args: any[]) => {
        const callbacks = actions[hookName] || [];
        callbacks.forEach(hook => {
          hook.callback(...args);
        });
      },
      
      removeFilter: (hookName: string, namespace: string) => {
        if (filters[hookName]) {
          filters[hookName] = filters[hookName].filter(h => h.namespace !== namespace);
        }
        return 0;
      },
      
      removeAction: (hookName: string, namespace: string) => {
        if (actions[hookName]) {
          actions[hookName] = actions[hookName].filter(h => h.namespace !== namespace);
        }
        return 0;
      },
      
      hasFilter: (hookName: string, namespace?: string) => {
        if (!filters[hookName]) return false;
        if (!namespace) return filters[hookName].length > 0;
        return filters[hookName].some(h => h.namespace === namespace);
      },
      
      hasAction: (hookName: string, namespace?: string) => {
        if (!actions[hookName]) return false;
        if (!namespace) return actions[hookName].length > 0;
        return actions[hookName].some(h => h.namespace === namespace);
      },
      
      removeAllFilters: (hookName: string) => {
        if (filters[hookName]) {
          const count = filters[hookName].length;
          filters[hookName] = [];
          return count;
        }
        return 0;
      },
      
      removeAllActions: (hookName: string) => {
        if (actions[hookName]) {
          const count = actions[hookName].length;
          actions[hookName] = [];
          return count;
        }
        return 0;
      },
      
      currentFilter: () => null,
      currentAction: () => null,
      doingFilter: () => false,
      doingAction: () => false,
      didFilter: (hookName: string) => filters[hookName]?.length || 0,
      didAction: (hookName: string) => actions[hookName]?.length || 0,
  };
};

// Initialize hooks immediately
if (typeof window !== 'undefined') {
  window.wp = window.wp || {};
  
  // Always create fresh hooks to avoid conflicts with WordPress packages
  if (!window.wp.hooks) {
    window.wp.hooks = createHooks();
  }
  
  // Also ensure i18n is available with hooks support
  if (!window.wp.i18n) {
    window.wp.i18n = {
      __: (text: string) => text,
      _x: (text: string, _context: string) => text,
      _n: (single: string, plural: string, number: number) => number === 1 ? single : plural,
      _nx: (single: string, plural: string, number: number, _context: string) => number === 1 ? single : plural,
      sprintf: (format: string, ...args: any[]) => {
        let i = 0;
        return format.replace(/%[sdjf]/g, () => String(args[i++]));
      },
      isRTL: () => false,
      setLocaleData: () => {},
      getLocaleData: () => ({}),
      hasTranslation: () => false,
      subscribe: () => () => {},
    };
  }
}

// Export the hooks for use in modules
export default window.wp?.hooks || {};