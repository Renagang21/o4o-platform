/**
 * CreateOperatorNotificationSettings
 * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
 *
 * 운영자 알림 이메일 설정 테이블 생성
 */
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOperatorNotificationSettings2026020800003 implements MigrationInterface {
  name = 'CreateOperatorNotificationSettings2026020800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'operator_notification_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'service_code',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'operator_email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'operator_email_secondary',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'notifications',
            type: 'json',
            default: "'{}'",
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_notification_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create unique index on service_code
    await queryRunner.createIndex(
      'operator_notification_settings',
      new TableIndex({
        name: 'IDX_operator_notification_settings_service_code',
        columnNames: ['service_code'],
        isUnique: true,
      })
    );

    console.log('✅ Created operator_notification_settings table');

    // Seed default settings for each service
    const services = [
      { code: 'neture', email: 'operator@neture.co.kr' },
      { code: 'glucoseview', email: 'operator@glucoseview.co.kr' },
      { code: 'glycopharm', email: 'operator@glycopharm.co.kr' },
      { code: 'k-cosmetics', email: 'operator@k-cosmetics.site' },
      { code: 'kpa-society', email: 'operator@kpa-society.co.kr' },
    ];

    const defaultNotifications = JSON.stringify({
      registrationRequest: true,
      partnerApplication: true,
      supplierApplication: true,
      contactInquiry: true,
      systemAlert: true,
      dailyReport: false,
      serviceApplication: true,
    });

    for (const service of services) {
      await queryRunner.query(
        `INSERT INTO operator_notification_settings (service_code, operator_email, notifications, enabled)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (service_code) DO NOTHING`,
        [service.code, service.email, defaultNotifications]
      );
    }

    console.log('✅ Seeded default operator notification settings for 5 services');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'operator_notification_settings',
      'IDX_operator_notification_settings_service_code'
    );
    await queryRunner.dropTable('operator_notification_settings');
    console.log('⬇️ Dropped operator_notification_settings table');
  }
}
