import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAffiliatePhase3Tables1735630000000 implements MigrationInterface {
  name = 'CreateAffiliatePhase3Tables1735630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create affiliate_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'sessionId',
            type: 'uuid',
            isUnique: true
          },
          {
            name: 'affiliateUserId',
            type: 'uuid'
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '50'
          },
          {
            name: 'landingPage',
            type: 'text'
          },
          {
            name: 'source',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'medium',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'campaign',
            type: 'varchar',
            length: '200',
            isNullable: true
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '45',
            isNullable: true
          },
          {
            name: 'country',
            type: 'varchar',
            length: '2',
            isNullable: true
          },
          {
            name: 'device',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'browser',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'startTime',
            type: 'timestamp'
          },
          {
            name: 'endTime',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastActivity',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
            default: 0
          },
          {
            name: 'pageViews',
            type: 'int',
            default: 1
          },
          {
            name: 'events',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'bounced',
            type: 'boolean',
            default: false
          },
          {
            name: 'converted',
            type: 'boolean',
            default: false
          },
          {
            name: 'conversionId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['affiliateUserId'],
            referencedTableName: 'affiliate_users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes for affiliate_sessions
    await queryRunner.createIndex('affiliate_sessions', new TableIndex({
      name: 'IDX_affiliate_sessions_affiliate_start',
      columnNames: ['affiliateUserId', 'startTime']
    }));

    await queryRunner.createIndex('affiliate_sessions', new TableIndex({
      name: 'IDX_affiliate_sessions_referral',
      columnNames: ['referralCode']
    }));

    await queryRunner.createIndex('affiliate_sessions', new TableIndex({
      name: 'IDX_affiliate_sessions_start',
      columnNames: ['startTime']
    }));

    await queryRunner.createIndex('affiliate_sessions', new TableIndex({
      name: 'IDX_affiliate_sessions_end',
      columnNames: ['endTime']
    }));

    // Create affiliate_notifications table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'affiliateUserId',
            type: 'uuid'
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'click',
              'conversion',
              'commission_approved',
              'commission_rejected',
              'payout_processed',
              'payout_failed',
              'milestone',
              'alert',
              'info'
            ]
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200'
          },
          {
            name: 'message',
            type: 'text'
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'low'"
          },
          {
            name: 'read',
            type: 'boolean',
            default: false
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'actionUrl',
            type: 'text',
            isNullable: true
          },
          {
            name: 'actionText',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['affiliateUserId'],
            referencedTableName: 'affiliate_users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes for affiliate_notifications
    await queryRunner.createIndex('affiliate_notifications', new TableIndex({
      name: 'IDX_affiliate_notifications_user_read',
      columnNames: ['affiliateUserId', 'read']
    }));

    await queryRunner.createIndex('affiliate_notifications', new TableIndex({
      name: 'IDX_affiliate_notifications_created',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('affiliate_notifications', new TableIndex({
      name: 'IDX_affiliate_notifications_type',
      columnNames: ['type']
    }));

    // Create affiliate_analytics_cache table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_analytics_cache',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isUnique: true
          },
          {
            name: 'data',
            type: 'jsonb'
          },
          {
            name: 'expiresAt',
            type: 'timestamp'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create index for analytics cache
    await queryRunner.createIndex('affiliate_analytics_cache', new TableIndex({
      name: 'IDX_affiliate_analytics_cache_expires',
      columnNames: ['expiresAt']
    }));

    // Add new columns to affiliate_clicks for enhanced tracking
    await queryRunner.query(`
      ALTER TABLE affiliate_clicks 
      ADD COLUMN IF NOT EXISTS sessionId uuid,
      ADD COLUMN IF NOT EXISTS source varchar(100),
      ADD COLUMN IF NOT EXISTS medium varchar(100),
      ADD COLUMN IF NOT EXISTS campaign varchar(200),
      ADD COLUMN IF NOT EXISTS browser varchar(50),
      ADD COLUMN IF NOT EXISTS os varchar(50),
      ADD COLUMN IF NOT EXISTS screenResolution varchar(20),
      ADD COLUMN IF NOT EXISTS language varchar(10),
      ADD COLUMN IF NOT EXISTS timeOnPage int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS exitPage text,
      ADD COLUMN IF NOT EXISTS fraud_score decimal(5,2) DEFAULT 0
    `);

    // Add fraud detection columns to affiliate_conversions
    await queryRunner.query(`
      ALTER TABLE affiliate_conversions 
      ADD COLUMN IF NOT EXISTS sessionId uuid,
      ADD COLUMN IF NOT EXISTS fraud_score decimal(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fraud_reasons jsonb,
      ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_method varchar(50),
      ADD COLUMN IF NOT EXISTS customer_lifetime_value decimal(10,2),
      ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS attribution_model varchar(50) DEFAULT 'last_click'
    `);

    // Add performance and tracking columns to affiliate_users
    await queryRunner.query(`
      ALTER TABLE affiliate_users 
      ADD COLUMN IF NOT EXISTS lifetime_value decimal(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_conversion_value decimal(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS best_performing_source varchar(100),
      ADD COLUMN IF NOT EXISTS best_performing_campaign varchar(200),
      ADD COLUMN IF NOT EXISTS fraud_warnings int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS blocked boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS blocked_reason text,
      ADD COLUMN IF NOT EXISTS blocked_at timestamp,
      ADD COLUMN IF NOT EXISTS tier varchar(20) DEFAULT 'bronze',
      ADD COLUMN IF NOT EXISTS custom_commission_rate decimal(5,2),
      ADD COLUMN IF NOT EXISTS payment_threshold decimal(10,2) DEFAULT 100,
      ADD COLUMN IF NOT EXISTS auto_approve_commissions boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS notification_preferences jsonb,
      ADD COLUMN IF NOT EXISTS api_key varchar(255),
      ADD COLUMN IF NOT EXISTS api_secret varchar(255),
      ADD COLUMN IF NOT EXISTS webhook_url text,
      ADD COLUMN IF NOT EXISTS metadata jsonb
    `);

    // Create indexes for new columns
    await queryRunner.createIndex('affiliate_clicks', new TableIndex({
      name: 'IDX_affiliate_clicks_session',
      columnNames: ['sessionId']
    }));

    await queryRunner.createIndex('affiliate_clicks', new TableIndex({
      name: 'IDX_affiliate_clicks_source_medium',
      columnNames: ['source', 'medium']
    }));

    await queryRunner.createIndex('affiliate_conversions', new TableIndex({
      name: 'IDX_affiliate_conversions_session',
      columnNames: ['sessionId']
    }));

    await queryRunner.createIndex('affiliate_conversions', new TableIndex({
      name: 'IDX_affiliate_conversions_fraud_score',
      columnNames: ['fraud_score']
    }));

    await queryRunner.createIndex('affiliate_users', new TableIndex({
      name: 'IDX_affiliate_users_tier',
      columnNames: ['tier']
    }));

    await queryRunner.createIndex('affiliate_users', new TableIndex({
      name: 'IDX_affiliate_users_blocked',
      columnNames: ['blocked']
    }));

    await queryRunner.createIndex('affiliate_users', new TableIndex({
      name: 'IDX_affiliate_users_api_key',
      columnNames: ['api_key']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('affiliate_users', 'IDX_affiliate_users_api_key');
    await queryRunner.dropIndex('affiliate_users', 'IDX_affiliate_users_blocked');
    await queryRunner.dropIndex('affiliate_users', 'IDX_affiliate_users_tier');
    await queryRunner.dropIndex('affiliate_conversions', 'IDX_affiliate_conversions_fraud_score');
    await queryRunner.dropIndex('affiliate_conversions', 'IDX_affiliate_conversions_session');
    await queryRunner.dropIndex('affiliate_clicks', 'IDX_affiliate_clicks_source_medium');
    await queryRunner.dropIndex('affiliate_clicks', 'IDX_affiliate_clicks_session');

    // Drop columns from existing tables
    await queryRunner.query(`
      ALTER TABLE affiliate_users 
      DROP COLUMN IF EXISTS lifetime_value,
      DROP COLUMN IF EXISTS avg_conversion_value,
      DROP COLUMN IF EXISTS best_performing_source,
      DROP COLUMN IF EXISTS best_performing_campaign,
      DROP COLUMN IF EXISTS fraud_warnings,
      DROP COLUMN IF EXISTS blocked,
      DROP COLUMN IF EXISTS blocked_reason,
      DROP COLUMN IF EXISTS blocked_at,
      DROP COLUMN IF EXISTS tier,
      DROP COLUMN IF EXISTS custom_commission_rate,
      DROP COLUMN IF EXISTS payment_threshold,
      DROP COLUMN IF EXISTS auto_approve_commissions,
      DROP COLUMN IF EXISTS notification_preferences,
      DROP COLUMN IF EXISTS api_key,
      DROP COLUMN IF EXISTS api_secret,
      DROP COLUMN IF EXISTS webhook_url,
      DROP COLUMN IF EXISTS metadata
    `);

    await queryRunner.query(`
      ALTER TABLE affiliate_conversions 
      DROP COLUMN IF EXISTS sessionId,
      DROP COLUMN IF EXISTS fraud_score,
      DROP COLUMN IF EXISTS fraud_reasons,
      DROP COLUMN IF EXISTS verified,
      DROP COLUMN IF EXISTS verification_method,
      DROP COLUMN IF EXISTS customer_lifetime_value,
      DROP COLUMN IF EXISTS is_recurring,
      DROP COLUMN IF EXISTS attribution_model
    `);

    await queryRunner.query(`
      ALTER TABLE affiliate_clicks 
      DROP COLUMN IF EXISTS sessionId,
      DROP COLUMN IF EXISTS source,
      DROP COLUMN IF EXISTS medium,
      DROP COLUMN IF EXISTS campaign,
      DROP COLUMN IF EXISTS browser,
      DROP COLUMN IF EXISTS os,
      DROP COLUMN IF EXISTS screenResolution,
      DROP COLUMN IF EXISTS language,
      DROP COLUMN IF EXISTS timeOnPage,
      DROP COLUMN IF EXISTS exitPage,
      DROP COLUMN IF EXISTS fraud_score
    `);

    // Drop tables
    await queryRunner.dropTable('affiliate_analytics_cache');
    await queryRunner.dropTable('affiliate_notifications');
    await queryRunner.dropTable('affiliate_sessions');
  }
}