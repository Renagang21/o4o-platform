import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRolesAndApprovalLogs1735000000000 implements MigrationInterface {
    name = 'AddUserRolesAndApprovalLogs1735000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add roles column to users table
        await queryRunner.query(`ALTER TABLE "users" ADD "roles" text NOT NULL DEFAULT 'customer'`);
        
        // Update existing users to have their role in the roles array
        await queryRunner.query(`UPDATE "users" SET "roles" = role`);
        
        // Create approval_logs table
        await queryRunner.query(`
            CREATE TYPE "public"."approval_logs_action_enum" AS ENUM('approved', 'rejected', 'status_changed')
        `);
        
        await queryRunner.query(`
            CREATE TABLE "approval_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "admin_id" uuid NOT NULL,
                "action" "public"."approval_logs_action_enum" NOT NULL,
                "previous_status" character varying(50),
                "new_status" character varying(50) NOT NULL,
                "notes" text,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_approval_logs" PRIMARY KEY ("id")
            )
        `);
        
        // Add indexes
        await queryRunner.query(`CREATE INDEX "IDX_approval_logs_user_created" ON "approval_logs" ("user_id", "created_at") `);
        
        // Add foreign keys
        await queryRunner.query(`
            ALTER TABLE "approval_logs" 
            ADD CONSTRAINT "FK_approval_logs_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        
        await queryRunner.query(`
            ALTER TABLE "approval_logs" 
            ADD CONSTRAINT "FK_approval_logs_admin" 
            FOREIGN KEY ("admin_id") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        
        // Update user role enum to include new roles
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
        await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum" AS ENUM(
                'super_admin', 'admin', 'vendor', 'seller', 'customer', 
                'business', 'moderator', 'partner', 'supplier', 'manager'
            )
        `);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "approval_logs" DROP CONSTRAINT "FK_approval_logs_admin"`);
        await queryRunner.query(`ALTER TABLE "approval_logs" DROP CONSTRAINT "FK_approval_logs_user"`);
        
        // Drop approval_logs table
        await queryRunner.query(`DROP INDEX "public"."IDX_approval_logs_user_created"`);
        await queryRunner.query(`DROP TABLE "approval_logs"`);
        await queryRunner.query(`DROP TYPE "public"."approval_logs_action_enum"`);
        
        // Remove roles column
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
        
        // Revert user role enum
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
        await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum" AS ENUM(
                'customer', 'admin', 'seller', 'supplier', 'manager'
            )
        `);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
    }
}