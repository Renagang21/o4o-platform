import { AppManifest } from '@o4o/types';

/**
 * Forum App Manifest
 *
 * Defines the forum feature as an installable/activatable app
 */
export const forumManifest: AppManifest = {
  appId: 'forum',
  name: 'Forum',
  version: '1.0.0',
  description: 'Community forum with posts, comments, categories, and tags',

  routes: [
    '/forum',
    '/forum/posts',
    '/forum/posts/:id',
    '/forum/categories',
    '/forum/categories/:id',
    '/admin/forum',
    '/admin/forum/posts',
    '/admin/forum/categories',
    '/admin/forum/comments',
  ],

  permissions: [
    'forum.read',
    'forum.write',
    'forum.moderate',
    'forum.admin',
  ],

  // Future: CPT/ACF definitions, migrations, etc.
};
