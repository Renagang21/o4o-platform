/**
 * LMS-Core Uninstall Hook
 *
 * Called when the LMS-Core app is uninstalled
 * WARNING: This will remove all LMS data from the database
 */

import { DataSource } from 'typeorm';

export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[lms-core] Uninstalling LMS Core...');

  // WARNING: This will delete all LMS data
  // Tables to drop: lms_courses, lms_lessons, lms_enrollments, lms_progress,
  // lms_certificates, lms_events, lms_attendance

  try {
    // Drop tables in reverse dependency order
    await dataSource.query('DROP TABLE IF EXISTS lms_attendance CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS lms_events CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS lms_certificates CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS lms_progress CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS lms_enrollments CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS lms_lessons CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS lms_courses CASCADE');

    console.log('[lms-core] LMS Core uninstalled successfully - all data removed');
  } catch (error) {
    console.error('[lms-core] Error during uninstallation:', error);
    throw error;
  }
}
