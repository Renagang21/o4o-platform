import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddRefreshTokenAndLoginAttempt1703000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true
          },
          {
            name: 'userId',
            type: 'uuid'
          },
          {
            name: 'expiresAt',
            type: 'timestamp'
          },
          {
            name: 'deviceId',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'revoked',
            type: 'boolean',
            default: false
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'revokedReason',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create login_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'login_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'email',
            type: 'varchar'
          },
          {
            name: 'ipAddress',
            type: 'varchar'
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'successful',
            type: 'boolean',
            default: false
          },
          {
            name: 'failureReason',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'deviceId',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'location',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'attemptedAt',
            type: 'timestamp',
            default: 'now()'
          }
        ]
      }),
      true
    );

    // Create indexes for login_attempts
    await queryRunner.createIndex('login_attempts', new TableIndex({
      name: 'IDX_login_attempts_email_ip',
      columnNames: ['email', 'ipAddress']
    }));

    // Create indexes for refresh_tokens
    await queryRunner.createIndex('refresh_tokens', new TableIndex({
      name: 'IDX_refresh_tokens_userId',
      columnNames: ['userId']
    }));

    await queryRunner.createIndex('refresh_tokens', new TableIndex({
      name: 'IDX_refresh_tokens_userId_deviceId',
      columnNames: ['userId', 'deviceId']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_userId_deviceId');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_userId');
    await queryRunner.dropIndex('login_attempts', 'IDX_login_attempts_email_ip');
    
    // Drop tables
    await queryRunner.dropTable('login_attempts');
    await queryRunner.dropTable('refresh_tokens');
  }
}