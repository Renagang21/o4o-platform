/**
 * CGM GlucoseView - Uninstall Lifecycle
 */

import { QueryRunner } from 'typeorm';

export async function uninstall(
    queryRunner: QueryRunner,
    options?: { purgeData?: boolean }
): Promise<void> {
    console.log('[cgm-glucoseview] Uninstalling...');

    if (options?.purgeData) {
        console.log('[cgm-glucoseview] Purging data...');

        await queryRunner.query('DROP TABLE IF EXISTS cgm_glucose_insights CASCADE');
        await queryRunner.query('DROP TABLE IF NOT EXISTS cgm_patient_summaries CASCADE');
        await queryRunner.query('DROP TABLE IF EXISTS cgm_patients CASCADE');

        console.log('[cgm-glucoseview] Data purged');
    } else {
        console.log('[cgm-glucoseview] Keeping data (default mode)');
    }

    console.log('[cgm-glucoseview] Uninstall complete');
}

export default uninstall;
