import { AppManifest } from '@o4o/types';

/**
 * Digital Signage App Manifest
 *
 * Defines the digital signage feature as an installable/activatable app
 */
export const digitalsignageManifest: AppManifest = {
  appId: 'digitalsignage',
  name: 'Digital Signage',
  version: '1.0.0',
  description: 'Digital signage content management and scheduling system',

  routes: [
    '/signage',
    '/signage/content',
    '/signage/content/:id',
    '/signage/schedules',
    '/signage/displays',
    '/admin/signage',
    '/admin/signage/content',
    '/admin/signage/schedules',
  ],

  permissions: [
    'signage.read',
    'signage.write',
    'signage.schedule',
    'signage.admin',
  ],

  // Future: CPT/ACF definitions, migrations, etc.
};
