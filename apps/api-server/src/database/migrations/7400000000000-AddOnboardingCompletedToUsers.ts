import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Phase 3-2: Add onboarding_completed flag to users table
 *
 * Tracks whether Seller/Supplier users have completed the initial onboarding guide.
 * This flag is used to show/hide the onboarding modal on dashboard first visit.
 */
export class AddOnboardingCompletedToUsers7400000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add onboarding_completed column to users table
        await queryRunner.addColumn('users', new TableColumn({
            name: 'onboarding_completed',
            type: 'boolean',
            default: false,
            comment: 'Whether the user has completed the onboarding guide (Phase 3-2)'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove onboarding_completed column
        await queryRunner.dropColumn('users', 'onboarding_completed');
    }
}
