"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WP_HOOKS = exports.hooks = exports.HookSystem = void 0;
exports.add_action = add_action;
exports.add_filter = add_filter;
exports.do_action = do_action;
exports.apply_filters = apply_filters;
exports.remove_action = remove_action;
exports.remove_filter = remove_filter;
exports.has_action = has_action;
exports.has_filter = has_filter;
const events_1 = require("events");
/**
 * WordPress-style Hook System for O4O Platform
 * Implements actions and filters similar to WordPress
 */
class HookSystem extends events_1.EventEmitter {
    constructor() {
        super();
        this.hooks = new Map();
        this.filters = new Map();
        this.executionHistory = new Map();
        this.setMaxListeners(0); // Unlimited listeners
    }
    static getInstance() {
        if (!HookSystem.instance) {
            HookSystem.instance = new HookSystem();
        }
        return HookSystem.instance;
    }
    /**
     * Add an action hook
     */
    addAction(hookName, callback, priority = 10, namespace) {
        const hook = { callback, priority, namespace };
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        const hooks = this.hooks.get(hookName);
        hooks.push(hook);
        hooks.sort((a, b) => a.priority - b.priority);
        this.emit('hook:added', { type: 'action', hookName, namespace });
    }
    /**
     * Add a filter hook
     */
    addFilter(filterName, callback, priority = 10, namespace) {
        const filter = { callback, priority, namespace };
        if (!this.filters.has(filterName)) {
            this.filters.set(filterName, []);
        }
        const filters = this.filters.get(filterName);
        filters.push(filter);
        filters.sort((a, b) => a.priority - b.priority);
        this.emit('hook:added', { type: 'filter', filterName, namespace });
    }
    /**
     * Execute an action hook
     */
    async doAction(hookName, ...args) {
        const hooks = this.hooks.get(hookName) || [];
        // Track execution
        this.executionHistory.set(hookName, (this.executionHistory.get(hookName) || 0) + 1);
        for (const hook of hooks) {
            try {
                await hook.callback(...args);
            }
            catch (error) {
                console.error(`Error in action hook ${hookName}:`, error);
                this.emit('hook:error', { type: 'action', hookName, error });
            }
        }
        this.emit('hook:executed', { type: 'action', hookName, count: hooks.length });
    }
    /**
     * Apply filters to a value
     */
    async applyFilters(filterName, value, ...args) {
        const filters = this.filters.get(filterName) || [];
        // Track execution
        this.executionHistory.set(filterName, (this.executionHistory.get(filterName) || 0) + 1);
        let filtered = value;
        for (const filter of filters) {
            try {
                filtered = await filter.callback(filtered, ...args);
            }
            catch (error) {
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
    removeAction(hookName, callback, namespace) {
        if (!this.hooks.has(hookName)) {
            return false;
        }
        if (!callback && !namespace) {
            this.hooks.delete(hookName);
            return true;
        }
        const hooks = this.hooks.get(hookName);
        const originalLength = hooks.length;
        const filtered = hooks.filter(hook => {
            if (namespace && hook.namespace !== namespace)
                return true;
            if (callback && hook.callback !== callback)
                return true;
            return false;
        });
        this.hooks.set(hookName, filtered);
        return filtered.length < originalLength;
    }
    /**
     * Remove a filter hook
     */
    removeFilter(filterName, callback, namespace) {
        if (!this.filters.has(filterName)) {
            return false;
        }
        if (!callback && !namespace) {
            this.filters.delete(filterName);
            return true;
        }
        const filters = this.filters.get(filterName);
        const originalLength = filters.length;
        const filtered = filters.filter(filter => {
            if (namespace && filter.namespace !== namespace)
                return true;
            if (callback && filter.callback !== callback)
                return true;
            return false;
        });
        this.filters.set(filterName, filtered);
        return filtered.length < originalLength;
    }
    /**
     * Check if action hook exists
     */
    hasAction(hookName) {
        return this.hooks.has(hookName) && this.hooks.get(hookName).length > 0;
    }
    /**
     * Check if filter hook exists
     */
    hasFilter(filterName) {
        return this.filters.has(filterName) && this.filters.get(filterName).length > 0;
    }
    /**
     * Get all registered hooks
     */
    getAllHooks() {
        return {
            actions: Array.from(this.hooks.keys()),
            filters: Array.from(this.filters.keys())
        };
    }
    /**
     * Get hook execution count
     */
    getExecutionCount(hookName) {
        return this.executionHistory.get(hookName) || 0;
    }
    /**
     * Clear all hooks (useful for testing)
     */
    clearAll() {
        this.hooks.clear();
        this.filters.clear();
        this.executionHistory.clear();
        this.removeAllListeners();
    }
    /**
     * Get hooks by namespace
     */
    getHooksByNamespace(namespace) {
        const actions = [];
        const filters = [];
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
exports.HookSystem = HookSystem;
// Export singleton instance
exports.hooks = HookSystem.getInstance();
// Common WordPress-compatible hook names
exports.WP_HOOKS = {
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
function add_action(tag, callback, priority = 10) {
    exports.hooks.addAction(tag, callback, priority);
}
function add_filter(tag, callback, priority = 10) {
    exports.hooks.addFilter(tag, callback, priority);
}
function do_action(tag, ...args) {
    return exports.hooks.doAction(tag, ...args);
}
function apply_filters(tag, value, ...args) {
    return exports.hooks.applyFilters(tag, value, ...args);
}
function remove_action(tag, callback) {
    return exports.hooks.removeAction(tag, callback);
}
function remove_filter(tag, callback) {
    return exports.hooks.removeFilter(tag, callback);
}
function has_action(tag) {
    return exports.hooks.hasAction(tag);
}
function has_filter(tag) {
    return exports.hooks.hasFilter(tag);
}
//# sourceMappingURL=HookSystem.js.map