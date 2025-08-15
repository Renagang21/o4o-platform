"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAccountLinkingTables1738000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateAccountLinkingTables1738000000000 {
    constructor() {
        this.name = 'CreateAccountLinkingTables1738000000000';
    }
    async up(queryRunner) {
        // Create linked_accounts table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'linked_accounts',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'provider',
                    type: 'enum',
                    enum: ['email', 'google', 'kakao', 'naver'],
                    isNullable: false,
                },
                {
                    name: 'providerId',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'email',
                    type: 'varchar',
                    length: '255',
                    isNullable: false,
                },
                {
                    name: 'displayName',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'profileImage',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                },
                {
                    name: 'isVerified',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'isPrimary',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'providerData',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'lastUsedAt',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'linkedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Create indexes for linked_accounts
        await queryRunner.query(`CREATE INDEX "IDX_linked_accounts_userId" ON "linked_accounts" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_linked_accounts_provider_providerId" ON "linked_accounts" ("provider", "providerId")`);
        await queryRunner.query(`CREATE INDEX "IDX_linked_accounts_email" ON "linked_accounts" ("email")`);
        // Create unique constraint
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_linked_accounts_userId_provider_providerId" ON "linked_accounts" ("userId", "provider", "providerId")`);
        // Create foreign key to users table
        await queryRunner.query(`ALTER TABLE "linked_accounts" ADD CONSTRAINT "FK_linked_accounts_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
        // Create linking_sessions table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'linking_sessions',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'provider',
                    type: 'enum',
                    enum: ['email', 'google', 'kakao', 'naver'],
                    isNullable: false,
                },
                {
                    name: 'status',
                    type: 'enum',
                    enum: ['pending', 'verified', 'expired', 'failed'],
                    default: "'pending'",
                },
                {
                    name: 'verificationToken',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'expiresAt',
                    type: 'timestamp',
                    isNullable: false,
                },
                {
                    name: 'metadata',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Create indexes for linking_sessions
        await queryRunner.query(`CREATE INDEX "IDX_linking_sessions_userId_status" ON "linking_sessions" ("userId", "status")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_linking_sessions_verificationToken" ON "linking_sessions" ("verificationToken")`);
        // Create foreign key to users table
        await queryRunner.query(`ALTER TABLE "linking_sessions" ADD CONSTRAINT "FK_linking_sessions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
        // Create account_activities table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'account_activities',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'action',
                    type: 'enum',
                    enum: ['linked', 'unlinked', 'merged', 'login', 'failed_link'],
                    isNullable: false,
                },
                {
                    name: 'provider',
                    type: 'enum',
                    enum: ['email', 'google', 'kakao', 'naver'],
                    isNullable: false,
                },
                {
                    name: 'ipAddress',
                    type: 'varchar',
                    length: '45',
                    isNullable: false,
                },
                {
                    name: 'userAgent',
                    type: 'varchar',
                    length: '500',
                    isNullable: false,
                },
                {
                    name: 'metadata',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Create indexes for account_activities
        await queryRunner.query(`CREATE INDEX "IDX_account_activities_userId_createdAt" ON "account_activities" ("userId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_account_activities_action_provider" ON "account_activities" ("action", "provider")`);
        // Create foreign key to users table
        await queryRunner.query(`ALTER TABLE "account_activities" ADD CONSTRAINT "FK_account_activities_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    }
    async down(queryRunner) {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "account_activities" DROP CONSTRAINT "FK_account_activities_userId"`);
        await queryRunner.query(`ALTER TABLE "linking_sessions" DROP CONSTRAINT "FK_linking_sessions_userId"`);
        await queryRunner.query(`ALTER TABLE "linked_accounts" DROP CONSTRAINT "FK_linked_accounts_userId"`);
        // Drop tables
        await queryRunner.dropTable('account_activities');
        await queryRunner.dropTable('linking_sessions');
        await queryRunner.dropTable('linked_accounts');
    }
}
exports.CreateAccountLinkingTables1738000000000 = CreateAccountLinkingTables1738000000000;
//# sourceMappingURL=1738000000000-CreateAccountLinkingTables.js.map