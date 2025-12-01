export const manifest = {
  id: 'organization-forum',
  name: 'Organization-Forum Integration',
  version: '0.1.0',
  type: 'extension',
  description: 'Integrates organization-core with forum-app for organization-scoped forums',

  author: 'O4O Platform',
  license: 'MIT',

  /**
   * Dependencies
   *
   * This extension requires both organization-core and forum-app
   */
  dependencies: {
    core: ['organization-core'],
    apps: ['forum'],
  },

  /**
   * Lifecycle Hooks
   */
  lifecycle: {
    onInstall: './lifecycle/install.js',
  },

  /**
   * Features
   */
  features: [
    'auto-create-forum-categories-on-organization-creation',
    'organization-scoped-forum-permissions',
    'hierarchical-forum-access-control',
  ],

  /**
   * Configuration
   */
  config: {
    autoCreateDefaultCategories: {
      type: 'boolean',
      default: true,
      description: 'Automatically create default forum categories when organization is created',
    },
    defaultCategories: {
      type: 'array',
      default: ['공지사항', '자유게시판', '질문/답변', '자료실'],
      description: 'Default categories to create for new organizations',
    },
  },
};
