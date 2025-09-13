import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUserManagementTables1748000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_activity_logs table
    await queryRunner.createTable(
      new Table({
        name: 'user_activity_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'activityType',
            type: 'enum',
            enum: [
              'login', 'logout', 'password_change', 'email_change',
              'profile_update', 'avatar_update', 'business_info_update',
              'account_activation', 'account_deactivation', 'account_suspension', 'account_unsuspension', 'email_verification',
              'role_change', 'permission_grant', 'permission_revoke',
              'admin_approval', 'admin_rejection', 'admin_note_add',
              'password_reset_request', 'password_reset_complete', 'two_factor_enable', 'two_factor_disable',
              'api_key_create', 'api_key_delete', 'api_access_denied',
              'data_export', 'data_deletion', 'gdpr_request'
            ],
            isNullable: false
          },
          {
            name: 'activityCategory',
            type: 'enum',
            enum: ['authentication', 'profile', 'security', 'admin', 'system'],
            isNullable: false
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true
          },
          {
            name: 'isSystemGenerated',
            type: 'boolean',
            default: false
          },
          {
            name: 'performedByUserId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          },
          {
            columnNames: ['performedByUserId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          }
        ]
      }),
      true
    );

    // Create indexes for user_activity_logs
    await queryRunner.createIndex('user_activity_logs', new TableIndex({
      name: 'IDX_user_activity_logs_userId_activityType_createdAt',
      columnNames: ['userId', 'activityType', 'created_at']
    }));

    await queryRunner.createIndex('user_activity_logs', new TableIndex({
      name: 'IDX_user_activity_logs_activityCategory_createdAt',
      columnNames: ['activityCategory', 'created_at']
    }));

    await queryRunner.createIndex('user_activity_logs', new TableIndex({
      name: 'IDX_user_activity_logs_createdAt',
      columnNames: ['created_at']
    }));

    // Create business_info table
    await queryRunner.createTable(
      new Table({
        name: 'business_info',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
            isUnique: true
          },
          {
            name: 'businessName',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'tradingName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'businessType',
            type: 'enum',
            enum: ['sole_proprietorship', 'partnership', 'corporation', 'llc', 'non_profit', 'other'],
            isNullable: false
          },
          {
            name: 'industry',
            type: 'enum',
            enum: [
              'technology', 'healthcare', 'finance', 'retail', 'manufacturing',
              'education', 'real_estate', 'hospitality', 'consulting', 'marketing',
              'construction', 'agriculture', 'entertainment', 'transportation',
              'energy', 'telecommunications', 'automotive', 'aerospace',
              'pharmaceutical', 'food_beverage', 'other'
            ],
            isNullable: false
          },
          {
            name: 'businessSize',
            type: 'enum',
            enum: ['micro', 'small', 'medium', 'large', 'enterprise'],
            isNullable: true
          },
          {
            name: 'address',
            type: 'json',
            isNullable: false
          },
          {
            name: 'billingAddress',
            type: 'json',
            isNullable: true
          },
          {
            name: 'contact',
            type: 'json',
            isNullable: true
          },
          {
            name: 'financials',
            type: 'json',
            isNullable: true
          },
          {
            name: 'legal',
            type: 'json',
            isNullable: true
          },
          {
            name: 'services',
            type: 'simple-array',
            isNullable: true
          },
          {
            name: 'markets',
            type: 'simple-array',
            isNullable: true
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '10',
            isNullable: true
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: true
          },
          {
            name: 'language',
            type: 'varchar',
            length: '5',
            isNullable: true
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'verifiedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'verificationNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'socialMedia',
            type: 'json',
            isNullable: true
          },
          {
            name: 'certifications',
            type: 'simple-array',
            isNullable: true
          },
          {
            name: 'licenses',
            type: 'simple-array',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes for business_info
    await queryRunner.createIndex('business_info', new TableIndex({
      name: 'IDX_business_info_userId',
      columnNames: ['userId'],
      isUnique: true
    }));

    await queryRunner.createIndex('business_info', new TableIndex({
      name: 'IDX_business_info_businessType_industry',
      columnNames: ['businessType', 'industry']
    }));

    await queryRunner.createIndex('business_info', new TableIndex({
      name: 'IDX_business_info_businessSize_industry',
      columnNames: ['businessSize', 'industry']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for business_info
    await queryRunner.dropIndex('business_info', 'IDX_business_info_businessSize_industry');
    await queryRunner.dropIndex('business_info', 'IDX_business_info_businessType_industry');
    await queryRunner.dropIndex('business_info', 'IDX_business_info_userId');

    // Drop business_info table
    await queryRunner.dropTable('business_info');

    // Drop indexes for user_activity_logs
    await queryRunner.dropIndex('user_activity_logs', 'IDX_user_activity_logs_createdAt');
    await queryRunner.dropIndex('user_activity_logs', 'IDX_user_activity_logs_activityCategory_createdAt');
    await queryRunner.dropIndex('user_activity_logs', 'IDX_user_activity_logs_userId_activityType_createdAt');

    // Drop user_activity_logs table
    await queryRunner.dropTable('user_activity_logs');
  }
}