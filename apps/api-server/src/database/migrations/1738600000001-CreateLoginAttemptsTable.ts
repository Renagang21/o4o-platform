import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateLoginAttemptsTable1738600000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
            type: 'varchar',
            length: '255'
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45' // Supports IPv6
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'success',
            type: 'boolean',
            default: false
          },
          {
            name: 'failureReason',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes for efficient querying
    await queryRunner.query(`
      CREATE INDEX "IDX_login_attempts_email_ip" 
      ON "login_attempts" ("email", "ipAddress")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_login_attempts_created" 
      ON "login_attempts" ("created_at")
    `);

    // Add lockedUntil column to users table if not exists
    const usersTable = await queryRunner.getTable('users');
    const lockedUntilColumn = usersTable?.findColumnByName('lockedUntil');
    
    if (!lockedUntilColumn) {
      await queryRunner.query(`
        ALTER TABLE users 
        ADD COLUMN "lockedUntil" timestamp NULL
      `);
    }

    // Add loginAttempts column to users table if not exists
    const loginAttemptsColumn = usersTable?.findColumnByName('loginAttempts');
    
    if (!loginAttemptsColumn) {
      await queryRunner.query(`
        ALTER TABLE users 
        ADD COLUMN "loginAttempts" integer DEFAULT 0
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('login_attempts', 'IDX_login_attempts_email_ip');
    await queryRunner.dropIndex('login_attempts', 'IDX_login_attempts_created');
    
    // Drop table
    await queryRunner.dropTable('login_attempts');

    // Remove columns from users table
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS "lockedUntil",
      DROP COLUMN IF EXISTS "loginAttempts"
    `);
  }
}