"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUsersTable1700000000000 = void 0;
class CreateUsersTable1700000000000 {
    constructor() {
        this.name = 'CreateUsersTable1700000000000';
    }
    async up(queryRunner) {
        // Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" varchar(255) NOT NULL,
                "password" varchar(255) NOT NULL,
                "firstName" varchar(100),
                "lastName" varchar(100),
                "name" varchar(200),
                "avatar" varchar(500),
                "status" varchar NOT NULL DEFAULT 'pending',
                "businessInfo" json,
                "role" varchar NOT NULL DEFAULT 'customer',
                "roles" text NOT NULL DEFAULT 'customer',
                "permissions" json NOT NULL DEFAULT '[]',
                "isActive" boolean NOT NULL DEFAULT true,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                "refreshTokenFamily" varchar(255),
                "lastLoginAt" timestamp,
                "lastLoginIp" varchar(50),
                "loginAttempts" integer NOT NULL DEFAULT 0,
                "lockedUntil" timestamp,
                "approvedAt" timestamp,
                "approvedBy" varchar(255),
                "provider" varchar(100),
                "provider_id" varchar(255),
                "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            );
            
            -- Create indexes
            CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email");
            CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role");
            CREATE INDEX "IDX_050be899b13fa215727fa490ea" ON "users" ("isActive");
        `);
    }
    async down(queryRunner) {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_050be899b13fa215727fa490ea"`);
        await queryRunner.query(`DROP INDEX "IDX_ace513fa30d485cfd25c11a9e4"`);
        await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
        // Drop table
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
exports.CreateUsersTable1700000000000 = CreateUsersTable1700000000000;
//# sourceMappingURL=1700000000000-CreateUsersTable.js.map