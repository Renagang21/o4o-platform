"use strict";
/**
 * CPT (Custom Post Types) Configuration Constants
 * Centralized configuration for custom post types and posts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CPTS = exports.CPT_QUERY_DEFAULTS = exports.CPT_PAGINATION = void 0;
// Pagination defaults for CPT posts
exports.CPT_PAGINATION = {
    DEFAULT_PAGE: parseInt(process.env.CPT_DEFAULT_PAGE || '1', 10),
    DEFAULT_LIMIT: parseInt(process.env.CPT_DEFAULT_LIMIT || '10', 10)
};
// Query defaults for CPT posts
exports.CPT_QUERY_DEFAULTS = {
    ORDER_BY: process.env.CPT_DEFAULT_ORDER_BY || 'createdAt',
    ORDER: (process.env.CPT_DEFAULT_ORDER || 'DESC')
};
// Default CPTs that are initialized on first run
exports.DEFAULT_CPTS = [
    {
        slug: process.env.CPT_DEFAULT_1_SLUG || 'products',
        name: process.env.CPT_DEFAULT_1_NAME || 'Products',
        description: process.env.CPT_DEFAULT_1_DESC || 'Product catalog',
        icon: process.env.CPT_DEFAULT_1_ICON || 'package',
        active: true
    },
    {
        slug: process.env.CPT_DEFAULT_2_SLUG || 'portfolio',
        name: process.env.CPT_DEFAULT_2_NAME || 'Portfolio',
        description: process.env.CPT_DEFAULT_2_DESC || 'Portfolio items',
        icon: process.env.CPT_DEFAULT_2_ICON || 'briefcase',
        active: true
    },
    {
        slug: process.env.CPT_DEFAULT_3_SLUG || 'testimonials',
        name: process.env.CPT_DEFAULT_3_NAME || 'Testimonials',
        description: process.env.CPT_DEFAULT_3_DESC || 'Customer testimonials',
        icon: process.env.CPT_DEFAULT_3_ICON || 'message-circle',
        active: true
    },
    {
        slug: process.env.CPT_DEFAULT_4_SLUG || 'team',
        name: process.env.CPT_DEFAULT_4_NAME || 'Team',
        description: process.env.CPT_DEFAULT_4_DESC || 'Team members',
        icon: process.env.CPT_DEFAULT_4_ICON || 'users',
        active: true
    }
];
//# sourceMappingURL=cpt.constants.js.map