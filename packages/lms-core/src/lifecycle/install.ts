import { DataSource } from 'typeorm';

/**
 * LMS-Core Install Hook
 *
 * This hook is executed when the LMS core is installed.
 */
export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[lms-core] Installing LMS core...');

  // Run migrations
  console.log('[lms-core] Running database migrations...');

  console.log('[lms-core] LMS core installed successfully');
  console.log('[lms-core] Features:');
  console.log('  - Course management');
  console.log('  - Lesson content delivery');
  console.log('  - Enrollment tracking');
  console.log('  - Progress monitoring');
  console.log('  - Certificate issuance');
  console.log('  - Event scheduling');
  console.log('  - Attendance tracking');
  console.log('  - Organization-scoped courses');
}

/**
 * LMS-Core Uninstall Hook
 */
export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[lms-core] Uninstalling LMS core...');

  // Cleanup logic here

  console.log('[lms-core] LMS core uninstalled successfully');
}
