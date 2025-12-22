/**
 * Disabled Apps Registry
 *
 * Central registry of disabled apps with their status and reasons.
 * This allows the platform to show meaningful status information in Admin UI
 * instead of silently hiding disabled apps.
 *
 * Status Definitions:
 * - broken: Build/runtime errors prevent the app from working
 * - incomplete: Development not finished, missing required functionality
 * - paused: Intentionally paused, working but not ready for production
 * - deprecated: Scheduled for removal, do not use
 *
 * @see docs/platform/disabled-app-policy.md
 */

import { DisabledAppEntry } from '@o4o/types';

/**
 * Registry of all disabled apps
 *
 * Apps are disabled in app-manifests/index.ts but documented here
 * with full metadata for Admin UI display.
 */
export const disabledAppsRegistry: DisabledAppEntry[] = [
  // === BROKEN: Build/Runtime Errors ===
  // WO-MENU-BROKEN-FIX (2024-12-20): All broken apps have been fixed
  // - yaksa-scheduler: TypeScript errors fixed
  // - cosmetics-partner-extension: ESM imports fixed, design system dependency removed
  // - cosmetics-supplier-extension: ESM imports fixed
  // - cosmetics-sample-display-extension: Dependencies now working
  // - lms-marketing: TypeScript errors fixed
  // - health-extension: Type export errors fixed

  // === INCOMPLETE: Development Not Finished ===
  {
    appId: 'platform-core',
    name: '플랫폼 코어',
    disabled: {
      status: 'incomplete',
      reason: 'api-server dependencies에 미등록',
      nextAction: 'package.json에 의존성 추가 후 import 활성화',
      disabledAt: '2024-12-15',
    },
  },
  {
    appId: 'auth-core',
    name: '인증 코어',
    disabled: {
      status: 'incomplete',
      reason: 'api-server dependencies에 미등록',
      nextAction: 'package.json에 의존성 추가 후 import 활성화',
      disabledAt: '2024-12-15',
    },
  },
];

/**
 * Get disabled app entry by appId
 */
export function getDisabledApp(appId: string): DisabledAppEntry | undefined {
  return disabledAppsRegistry.find((app) => app.appId === appId);
}

/**
 * Check if an app is in the disabled registry
 */
export function isAppDisabled(appId: string): boolean {
  return disabledAppsRegistry.some((app) => app.appId === appId);
}

/**
 * Get all disabled apps by status
 */
export function getDisabledAppsByStatus(
  status: DisabledAppEntry['disabled']['status']
): DisabledAppEntry[] {
  return disabledAppsRegistry.filter((app) => app.disabled.status === status);
}

/**
 * Get summary of disabled apps
 */
export function getDisabledAppsSummary(): {
  total: number;
  broken: number;
  incomplete: number;
  paused: number;
  deprecated: number;
} {
  return {
    total: disabledAppsRegistry.length,
    broken: getDisabledAppsByStatus('broken').length,
    incomplete: getDisabledAppsByStatus('incomplete').length,
    paused: getDisabledAppsByStatus('paused').length,
    deprecated: getDisabledAppsByStatus('deprecated').length,
  };
}
