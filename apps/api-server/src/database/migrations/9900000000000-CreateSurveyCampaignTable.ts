import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create LMS Marketing Survey Campaign Table
 *
 * Creates the survey campaign table for marketing surveys.
 *
 * Phase R8: Survey Campaign Module
 * @version 1.0.0
 * @date 2025-12-14
 */
export class CreateSurveyCampaignTable9900000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('lms_marketing_survey_campaigns');
    if (tableExists) {
      console.log('Table lms_marketing_survey_campaigns already exists, skipping...');
      return;
    }

    // Create the lms_marketing_survey_campaigns table
    await queryRunner.createTable(
      new Table({
        name: 'lms_marketing_survey_campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'supplierId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'surveyId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'bundleId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'questions',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'targeting',
            type: 'jsonb',
            default: "'{\"targets\": [\"all\"]}'",
          },
          {
            name: 'reward',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
          },
          {
            name: 'startDate',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isPublished',
            type: 'boolean',
            default: false,
          },
          {
            name: 'allowAnonymous',
            type: 'boolean',
            default: false,
          },
          {
            name: 'maxResponses',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'participationCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'completionCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'publishedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'lms_marketing_survey_campaigns',
      new TableIndex({
        name: 'IDX_lms_marketing_survey_campaigns_supplierId',
        columnNames: ['supplierId'],
      })
    );

    await queryRunner.createIndex(
      'lms_marketing_survey_campaigns',
      new TableIndex({
        name: 'IDX_lms_marketing_survey_campaigns_surveyId',
        columnNames: ['surveyId'],
      })
    );

    await queryRunner.createIndex(
      'lms_marketing_survey_campaigns',
      new TableIndex({
        name: 'IDX_lms_marketing_survey_campaigns_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'lms_marketing_survey_campaigns',
      new TableIndex({
        name: 'IDX_lms_marketing_survey_campaigns_isActive',
        columnNames: ['isActive'],
      })
    );

    await queryRunner.createIndex(
      'lms_marketing_survey_campaigns',
      new TableIndex({
        name: 'IDX_lms_marketing_survey_campaigns_isPublished',
        columnNames: ['isPublished'],
      })
    );

    console.log('Created lms_marketing_survey_campaigns table with indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lms_marketing_survey_campaigns', true);
    console.log('Dropped lms_marketing_survey_campaigns table');
  }
}
