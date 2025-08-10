import { EventEmitter } from 'events';

export type HookCallback = (...args: any[]) => any | Promise<any>;
export type FilterCallback = (value: any, ...args: any[]) => any | Promise<any>;

interface Hook {
  callback: HookCallback | FilterCallback;
  priority: number;
  namespace?: string;
}

/**
 * WordPress-style Hook System for O4O Platform
 * Implements actions and filters similar to WordPress
 */
export class HookSystem extends EventEmitter {
  private static instance: HookSystem;
  private hooks: Map<string, Hook[]> = new Map();
  private filters: Map<string, Hook[]> = new Map();
  private executionHistory: Map<string, number> = new Map();

  private constructor() {
    super();
    this.setMaxListeners(0); // Unlimited listeners
  }

  static getInstance(): HookSystem {
    if (!HookSystem.instance) {
      HookSystem.instance = new HookSystem();
    }
    return HookSystem.instance;
  }

  /**
   * Add an action hook
   */
  addAction(
    hookName: string,
    callback: HookCallback,
    priority: number = 10,
    namespace?: string
  ): void {
    const hook: Hook = { callback, priority, namespace };
    
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    
    const hooks = this.hooks.get(hookName)!;
    hooks.push(hook);
    hooks.sort((a, b) => a.priority - b.priority);
    
    this.emit('hook:added', { type: 'action', hookName, namespace });
  }

  /**
   * Add a filter hook
   */
  addFilter(
    filterName: string,
    callback: FilterCallback,
    priority: number = 10,
    namespace?: string
  ): void {
    const filter: Hook = { callback, priority, namespace };
    
    if (!this.filters.has(filterName)) {
      this.filters.set(filterName, []);
    }
    
    const filters = this.filters.get(filterName)!;
    filters.push(filter);
    filters.sort((a, b) => a.priority - b.priority);
    
    this.emit('hook:added', { type: 'filter', filterName, namespace });
  }

  /**
   * Execute an action hook
   */
  async doAction(hookName: string, ...args: any[]): Promise<void> {
    const hooks = this.hooks.get(hookName) || [];
    
    // Track execution
    this.executionHistory.set(hookName, (this.executionHistory.get(hookName) || 0) + 1);
    
    for (const hook of hooks) {
      try {
        await hook.callback(...args);
      } catch (error) {
        console.error(`Error in action hook ${hookName}:`, error);
        this.emit('hook:error', { type: 'action', hookName, error });
      }
    }
    
    this.emit('hook:executed', { type: 'action', hookName, count: hooks.length });
  }

  /**
   * Apply filters to a value
   */
  async applyFilters(filterName: string, value: any, ...args: any[]): Promise<any> {
    const filters = this.filters.get(filterName) || [];
    
    // Track execution
    this.executionHistory.set(filterName, (this.executionHistory.get(filterName) || 0) + 1);
    
    let filtered = value;
    
    for (const filter of filters) {
      try {
        filtered = await filter.callback(filtered, ...args);
      } catch (error) {
        console.error(`Error in filter hook ${filterName}:`, error);
        this.emit('hook:error', { type: 'filter', filterName, error });
      }
    }
    
    this.emit('hook:executed', { type: 'filter', filterName, count: filters.length });
    
    return filtered;
  }

  /**
   * Remove an action hook
   */
  removeAction(hookName: string, callback?: HookCallback, namespace?: string): boolean {
    if (!this.hooks.has(hookName)) {
      return false;
    }
    
    if (!callback && !namespace) {
      this.hooks.delete(hookName);
      return true;
    }
    
    const hooks = this.hooks.get(hookName)!;
    const originalLength = hooks.length;
    
    const filtered = hooks.filter(hook => {
      if (namespace && hook.namespace !== namespace) return true;
      if (callback && hook.callback !== callback) return true;
      return false;
    });
    
    this.hooks.set(hookName, filtered);
    return filtered.length < originalLength;
  }

  /**
   * Remove a filter hook
   */
  removeFilter(filterName: string, callback?: FilterCallback, namespace?: string): boolean {
    if (!this.filters.has(filterName)) {
      return false;
    }
    
    if (!callback && !namespace) {
      this.filters.delete(filterName);
      return true;
    }
    
    const filters = this.filters.get(filterName)!;
    const originalLength = filters.length;
    
    const filtered = filters.filter(filter => {
      if (namespace && filter.namespace !== namespace) return true;
      if (callback && filter.callback !== callback) return true;
      return false;
    });
    
    this.filters.set(filterName, filtered);
    return filtered.length < originalLength;
  }

  /**
   * Check if action hook exists
   */
  hasAction(hookName: string): boolean {
    return this.hooks.has(hookName) && this.hooks.get(hookName)!.length > 0;
  }

  /**
   * Check if filter hook exists
   */
  hasFilter(filterName: string): boolean {
    return this.filters.has(filterName) && this.filters.get(filterName)!.length > 0;
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): { actions: string[], filters: string[] } {
    return {
      actions: Array.from(this.hooks.keys()),
      filters: Array.from(this.filters.keys())
    };
  }

  /**
   * Get hook execution count
   */
  getExecutionCount(hookName: string): number {
    return this.executionHistory.get(hookName) || 0;
  }

  /**
   * Clear all hooks (useful for testing)
   */
  clearAll(): void {
    this.hooks.clear();
    this.filters.clear();
    this.executionHistory.clear();
    this.removeAllListeners();
  }

  /**
   * Get hooks by namespace
   */
  getHooksByNamespace(namespace: string): { actions: string[], filters: string[] } {
    const actions: string[] = [];
    const filters: string[] = [];
    
    this.hooks.forEach((hookList, hookName) => {
      if (hookList.some(h => h.namespace === namespace)) {
        actions.push(hookName);
      }
    });
    
    this.filters.forEach((filterList, filterName) => {
      if (filterList.some(f => f.namespace === namespace)) {
        filters.push(filterName);
      }
    });
    
    return { actions, filters };
  }
}

// Export singleton instance
export const hooks = HookSystem.getInstance();

// Common WordPress-compatible hook names
export const WP_HOOKS = {
  // Init hooks
  INIT: 'init',
  ADMIN_INIT: 'admin_init',
  AFTER_SETUP_THEME: 'after_setup_theme',
  
  // Content hooks
  THE_CONTENT: 'the_content',
  THE_TITLE: 'the_title',
  THE_EXCERPT: 'the_excerpt',
  
  // Head/Footer hooks
  WP_HEAD: 'wp_head',
  WP_FOOTER: 'wp_footer',
  ADMIN_HEAD: 'admin_head',
  ADMIN_FOOTER: 'admin_footer',
  
  // User hooks
  USER_REGISTER: 'user_register',
  PROFILE_UPDATE: 'profile_update',
  WP_LOGIN: 'wp_login',
  WP_LOGOUT: 'wp_logout',
  
  // Post hooks
  SAVE_POST: 'save_post',
  DELETE_POST: 'delete_post',
  PUBLISH_POST: 'publish_post',
  TRANSITION_POST_STATUS: 'transition_post_status',
  
  // Comment hooks
  COMMENT_POST: 'comment_post',
  EDIT_COMMENT: 'edit_comment',
  DELETE_COMMENT: 'delete_comment',
  
  // Menu hooks
  WP_NAV_MENU_ITEMS: 'wp_nav_menu_items',
  
  // Widget hooks
  WIDGETS_INIT: 'widgets_init',
  DYNAMIC_SIDEBAR: 'dynamic_sidebar',
  
  // Theme hooks
  SWITCH_THEME: 'switch_theme',
  CUSTOMIZE_SAVE: 'customize_save',
  
  // Ecommerce hooks
  WOOCOMMERCE_INIT: 'woocommerce_init',
  WOOCOMMERCE_ADD_TO_CART: 'woocommerce_add_to_cart',
  WOOCOMMERCE_ORDER_STATUS_CHANGED: 'woocommerce_order_status_changed'
};

// Helper functions for WordPress compatibility
export function add_action(tag: string, callback: HookCallback, priority = 10): void {
  hooks.addAction(tag, callback, priority);
}

export function add_filter(tag: string, callback: FilterCallback, priority = 10): void {
  hooks.addFilter(tag, callback, priority);
}

export function do_action(tag: string, ...args: any[]): Promise<void> {
  return hooks.doAction(tag, ...args);
}

export function apply_filters(tag: string, value: any, ...args: any[]): Promise<any> {
  return hooks.applyFilters(tag, value, ...args);
}

export function remove_action(tag: string, callback?: HookCallback): boolean {
  return hooks.removeAction(tag, callback);
}

export function remove_filter(tag: string, callback?: FilterCallback): boolean {
  return hooks.removeFilter(tag, callback);
}

export function has_action(tag: string): boolean {
  return hooks.hasAction(tag);
}

export function has_filter(tag: string): boolean {
  return hooks.hasFilter(tag);
}