/**
 * WordPress Hooks Shim
 * Provides a standalone hooks implementation to break circular dependencies
 */

class HooksManager {
  private filters: Record<string, any[]> = {};
  private actions: Record<string, any[]> = {};
  private current = { filters: new Set(), actions: new Set() };

  addFilter(hookName: string, namespace: string, callback: Function, priority = 10) {
    this.filters[hookName] = this.filters[hookName] || [];
    this.filters[hookName].push({ callback, priority, namespace });
    this.filters[hookName].sort((a, b) => a.priority - b.priority);
    return hookName;
  }

  applyFilters(hookName: string, value: any, ...args: any[]) {
    const callbacks = this.filters[hookName] || [];
    return callbacks.reduce((val, hook) => {
      return hook.callback(val, ...args);
    }, value);
  }

  addAction(hookName: string, namespace: string, callback: Function, priority = 10) {
    this.actions[hookName] = this.actions[hookName] || [];
    this.actions[hookName].push({ callback, priority, namespace });
    this.actions[hookName].sort((a, b) => a.priority - b.priority);
    return hookName;
  }

  doAction(hookName: string, ...args: any[]) {
    const callbacks = this.actions[hookName] || [];
    callbacks.forEach(hook => {
      hook.callback(...args);
    });
  }

  removeFilter(hookName: string, namespace: string) {
    if (this.filters[hookName]) {
      this.filters[hookName] = this.filters[hookName].filter(h => h.namespace !== namespace);
    }
    return 0;
  }

  removeAction(hookName: string, namespace: string) {
    if (this.actions[hookName]) {
      this.actions[hookName] = this.actions[hookName].filter(h => h.namespace !== namespace);
    }
    return 0;
  }

  hasFilter(hookName: string, namespace?: string) {
    if (!this.filters[hookName]) return false;
    if (!namespace) return this.filters[hookName].length > 0;
    return this.filters[hookName].some(h => h.namespace === namespace);
  }

  hasAction(hookName: string, namespace?: string) {
    if (!this.actions[hookName]) return false;
    if (!namespace) return this.actions[hookName].length > 0;
    return this.actions[hookName].some(h => h.namespace === namespace);
  }

  removeAllFilters(hookName: string) {
    if (this.filters[hookName]) {
      const count = this.filters[hookName].length;
      this.filters[hookName] = [];
      return count;
    }
    return 0;
  }

  removeAllActions(hookName: string) {
    if (this.actions[hookName]) {
      const count = this.actions[hookName].length;
      this.actions[hookName] = [];
      return count;
    }
    return 0;
  }

  currentFilter() { return null; }
  currentAction() { return null; }
  doingFilter() { return false; }
  doingAction() { return false; }
  didFilter(hookName: string) { return this.filters[hookName]?.length || 0; }
  didAction(hookName: string) { return this.actions[hookName]?.length || 0; }
}

// Create hooks function for WordPress compatibility
export function createHooks() {
  const manager = new HooksManager();
  return {
    addFilter: manager.addFilter.bind(manager),
    applyFilters: manager.applyFilters.bind(manager),
    addAction: manager.addAction.bind(manager),
    doAction: manager.doAction.bind(manager),
    removeFilter: manager.removeFilter.bind(manager),
    removeAction: manager.removeAction.bind(manager),
    hasFilter: manager.hasFilter.bind(manager),
    hasAction: manager.hasAction.bind(manager),
    removeAllFilters: manager.removeAllFilters.bind(manager),
    removeAllActions: manager.removeAllActions.bind(manager),
    currentFilter: manager.currentFilter.bind(manager),
    currentAction: manager.currentAction.bind(manager),
    doingFilter: manager.doingFilter.bind(manager),
    doingAction: manager.doingAction.bind(manager),
    didFilter: manager.didFilter.bind(manager),
    didAction: manager.didAction.bind(manager)
  };
}

// Create singleton instance
const hooksManager = new HooksManager();

// Export individual functions
export const addFilter = hooksManager.addFilter.bind(hooksManager);
export const applyFilters = hooksManager.applyFilters.bind(hooksManager);
export const addAction = hooksManager.addAction.bind(hooksManager);
export const doAction = hooksManager.doAction.bind(hooksManager);
export const removeFilter = hooksManager.removeFilter.bind(hooksManager);
export const removeAction = hooksManager.removeAction.bind(hooksManager);
export const hasFilter = hooksManager.hasFilter.bind(hooksManager);
export const hasAction = hooksManager.hasAction.bind(hooksManager);
export const removeAllFilters = hooksManager.removeAllFilters.bind(hooksManager);
export const removeAllActions = hooksManager.removeAllActions.bind(hooksManager);
export const currentFilter = hooksManager.currentFilter.bind(hooksManager);
export const currentAction = hooksManager.currentAction.bind(hooksManager);
export const doingFilter = hooksManager.doingFilter.bind(hooksManager);
export const doingAction = hooksManager.doingAction.bind(hooksManager);
export const didFilter = hooksManager.didFilter.bind(hooksManager);
export const didAction = hooksManager.didAction.bind(hooksManager);

// Default export and defaultHooks export (for WordPress compatibility)
const hooks = {
  addFilter,
  applyFilters,
  addAction,
  doAction,
  removeFilter,
  removeAction,
  hasFilter,
  hasAction,
  removeAllFilters,
  removeAllActions,
  currentFilter,
  currentAction,
  doingFilter,
  doingAction,
  didFilter,
  didAction
};

export default hooks;
export const defaultHooks = hooks;

// Initialize on window object if in browser
if (typeof window !== 'undefined') {
  window.wp = window.wp || {};
  window.wp.hooks = {
    addFilter,
    applyFilters,
    addAction,
    doAction,
    removeFilter,
    removeAction,
    hasFilter,
    hasAction,
    removeAllFilters,
    removeAllActions,
    currentFilter,
    currentAction,
    doingFilter,
    doingAction,
    didFilter,
    didAction
  };
}