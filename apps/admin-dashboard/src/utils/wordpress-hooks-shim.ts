/**
 * WordPress Hooks Shim
 * 
 * This file ensures that WordPress hooks are available globally
 * before any WordPress packages try to use them.
 * This prevents circular dependency issues.
 */

// Ensure window.wp exists
if (typeof window !== 'undefined') {
  window.wp = window.wp || {};
  
  // If hooks don't exist, create a complete implementation
  if (!window.wp.hooks) {
    const filters: Record<string, any[]> = {};
    const actions: Record<string, any[]> = {};
    
    window.wp.hooks = {
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
  }
}

// Export the hooks for use in modules
export default window.wp?.hooks || {};