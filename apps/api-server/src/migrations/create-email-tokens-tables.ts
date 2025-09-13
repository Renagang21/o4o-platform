import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEmailTokensTables1738004000000 implements MigrationInterface {
  name = 'CreateEmailTokensTables1738004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create password_reset_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'isUsed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create email_verification_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'email_verification_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'isUsed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_PASSWORD_RESET_TOKEN" ON "password_reset_tokens" ("token");
      CREATE INDEX "IDX_PASSWORD_RESET_USER_CREATED" ON "password_reset_tokens" ("userId", "created_at");
      CREATE INDEX "IDX_EMAIL_VERIFICATION_TOKEN" ON "email_verification_tokens" ("token");
      CREATE INDEX "IDX_EMAIL_VERIFICATION_USER_CREATED" ON "email_verification_tokens" ("userId", "created_at");
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens" 
      ADD CONSTRAINT "FK_password_reset_tokens_user" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE;

      ALTER TABLE "email_verification_tokens" 
      ADD CONSTRAINT "FK_email_verification_tokens_user" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_password_reset_tokens_user";
      ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "FK_email_verification_tokens_user";
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_PASSWORD_RESET_TOKEN";
      DROP INDEX "IDX_PASSWORD_RESET_USER_CREATED";
      DROP INDEX "IDX_EMAIL_VERIFICATION_TOKEN";
      DROP INDEX "IDX_EMAIL_VERIFICATION_USER_CREATED";
    `);

    // Drop tables
    await queryRunner.dropTable('password_reset_tokens');
    await queryRunner.dropTable('email_verification_tokens');
  }
}