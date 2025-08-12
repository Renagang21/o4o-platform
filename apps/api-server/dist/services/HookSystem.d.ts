import { EventEmitter } from 'events';
export type HookCallback = (...args: any[]) => any | Promise<any>;
export type FilterCallback = (value: any, ...args: any[]) => any | Promise<any>;
/**
 * WordPress-style Hook System for O4O Platform
 * Implements actions and filters similar to WordPress
 */
export declare class HookSystem extends EventEmitter {
    private static instance;
    private hooks;
    private filters;
    private executionHistory;
    private constructor();
    static getInstance(): HookSystem;
    /**
     * Add an action hook
     */
    addAction(hookName: string, callback: HookCallback, priority?: number, namespace?: string): void;
    /**
     * Add a filter hook
     */
    addFilter(filterName: string, callback: FilterCallback, priority?: number, namespace?: string): void;
    /**
     * Execute an action hook
     */
    doAction(hookName: string, ...args: any[]): Promise<void>;
    /**
     * Apply filters to a value
     */
    applyFilters(filterName: string, value: any, ...args: any[]): Promise<any>;
    /**
     * Remove an action hook
     */
    removeAction(hookName: string, callback?: HookCallback, namespace?: string): boolean;
    /**
     * Remove a filter hook
     */
    removeFilter(filterName: string, callback?: FilterCallback, namespace?: string): boolean;
    /**
     * Check if action hook exists
     */
    hasAction(hookName: string): boolean;
    /**
     * Check if filter hook exists
     */
    hasFilter(filterName: string): boolean;
    /**
     * Get all registered hooks
     */
    getAllHooks(): {
        actions: string[];
        filters: string[];
    };
    /**
     * Get hook execution count
     */
    getExecutionCount(hookName: string): number;
    /**
     * Clear all hooks (useful for testing)
     */
    clearAll(): void;
    /**
     * Get hooks by namespace
     */
    getHooksByNamespace(namespace: string): {
        actions: string[];
        filters: string[];
    };
}
export declare const hooks: HookSystem;
export declare const WP_HOOKS: {
    INIT: string;
    ADMIN_INIT: string;
    AFTER_SETUP_THEME: string;
    THE_CONTENT: string;
    THE_TITLE: string;
    THE_EXCERPT: string;
    WP_HEAD: string;
    WP_FOOTER: string;
    ADMIN_HEAD: string;
    ADMIN_FOOTER: string;
    USER_REGISTER: string;
    PROFILE_UPDATE: string;
    WP_LOGIN: string;
    WP_LOGOUT: string;
    SAVE_POST: string;
    DELETE_POST: string;
    PUBLISH_POST: string;
    TRANSITION_POST_STATUS: string;
    COMMENT_POST: string;
    EDIT_COMMENT: string;
    DELETE_COMMENT: string;
    WP_NAV_MENU_ITEMS: string;
    WIDGETS_INIT: string;
    DYNAMIC_SIDEBAR: string;
    SWITCH_THEME: string;
    CUSTOMIZE_SAVE: string;
    WOOCOMMERCE_INIT: string;
    WOOCOMMERCE_ADD_TO_CART: string;
    WOOCOMMERCE_ORDER_STATUS_CHANGED: string;
};
export declare function add_action(tag: string, callback: HookCallback, priority?: number): void;
export declare function add_filter(tag: string, callback: FilterCallback, priority?: number): void;
export declare function do_action(tag: string, ...args: any[]): Promise<void>;
export declare function apply_filters(tag: string, value: any, ...args: any[]): Promise<any>;
export declare function remove_action(tag: string, callback?: HookCallback): boolean;
export declare function remove_filter(tag: string, callback?: FilterCallback): boolean;
export declare function has_action(tag: string): boolean;
export declare function has_filter(tag: string): boolean;
//# sourceMappingURL=HookSystem.d.ts.map