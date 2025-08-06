import { MigrationInterface, QueryRunner } from "typeorm"

export class MigratePostsFromPages1738500000002 implements MigrationInterface {
    name = 'MigratePostsFromPages1738500000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // Check if Pages table exists and has post-type records
            const pagesTableExists = await queryRunner.hasTable("pages")
            if (!pagesTableExists) {
                // Pages table does not exist, skipping migration
                return
            }

            // Count existing post-type records in pages table
            const postTypeCount = await queryRunner.query(`
                SELECT COUNT(*) as count FROM "pages" WHERE "type" = 'post'
            `)
            
            const totalPosts = parseInt(postTypeCount[0]?.count || '0')
            // Found post-type records to migrate

            if (totalPosts === 0) {
                // No post-type records found in pages table
                return
            }

            // Migrate post-type records from pages to posts table
            const migrationQuery = `
                INSERT INTO "posts" (
                    "id", "title", "slug", "content", "excerpt", "status", 
                    "format", "template", "seo", "customFields", 
                    "publishedAt", "scheduledAt", "authorId", "lastModifiedBy",
                    "views", "password", "passwordProtected", "allowComments", 
                    "commentStatus", "layoutSettings", "revisions", 
                    "createdAt", "updatedAt"
                )
                SELECT 
                    "id", 
                    "title", 
                    "slug", 
                    "content", 
                    "excerpt", 
                    "status",
                    CASE 
                        WHEN "customFields"->>'format' IS NOT NULL 
                        THEN "customFields"->>'format'
                        ELSE 'standard'
                    END as "format",
                    "template",
                    "seo", 
                    "customFields",
                    "publishedAt", 
                    "scheduledAt", 
                    "authorId", 
                    "lastModifiedBy",
                    "views", 
                    "password", 
                    "passwordProtected", 
                    "allowComments",
                    "commentStatus", 
                    "layoutSettings", 
                    "revisions",
                    "createdAt", 
                    "updatedAt"
                FROM "pages" 
                WHERE "type" = 'post'
                ON CONFLICT ("id") DO NOTHING
            `

            await queryRunner.query(migrationQuery)

            // Verify migration
            const migratedCount = await queryRunner.query(`SELECT COUNT(*) as count FROM "posts"`)
            const actualMigrated = parseInt(migratedCount[0]?.count || '0')
            
            // Successfully migrated posts from pages table

            // Optional: Create a backup log of migrated records
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS "migration_log" (
                    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    "migration_name" varchar(255),
                    "records_migrated" integer,
                    "migration_date" timestamp DEFAULT CURRENT_TIMESTAMP,
                    "details" json
                )
            `)

            await queryRunner.query(`
                INSERT INTO "migration_log" (
                    "migration_name", 
                    "records_migrated", 
                    "details"
                ) VALUES (
                    'MigratePostsFromPages1738500000002',
                    $1,
                    $2
                )
            `, [
                actualMigrated,
                JSON.stringify({
                    source_table: 'pages',
                    target_table: 'posts',
                    filter_condition: "type = 'post'",
                    migration_timestamp: new Date().toISOString()
                })
            ])

            // Migration log created successfully

        } catch (error) {
            console.error('❌ Error during posts migration:', error)
            throw error
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        try {
            // Get migration log for rollback reference
            const logExists = await queryRunner.hasTable("migration_log")
            let migratedCount = 0

            if (logExists) {
                const logRecord = await queryRunner.query(`
                    SELECT "records_migrated" FROM "migration_log" 
                    WHERE "migration_name" = 'MigratePostsFromPages1738500000002'
                    ORDER BY "migration_date" DESC LIMIT 1
                `)
                migratedCount = parseInt(logRecord[0]?.records_migrated || '0')
            }

            // Rolling back migration of posts

            // Note: We don't delete the migrated posts as they might have been modified
            // Instead, we just log the rollback attempt
            if (logExists) {
                await queryRunner.query(`
                    INSERT INTO "migration_log" (
                        "migration_name", 
                        "records_migrated", 
                        "details"
                    ) VALUES (
                        'MigratePostsFromPages1738500000002_ROLLBACK',
                        $1,
                        $2
                    )
                `, [
                    migratedCount,
                    JSON.stringify({
                        action: 'rollback_attempted',
                        note: 'Posts table data preserved for safety',
                        rollback_timestamp: new Date().toISOString()
                    })
                ])
            }

            // Rollback logged. Posts data preserved for safety.
            // If you need to remove migrated posts, do it manually after verification.

        } catch (error) {
            console.error('❌ Error during rollback:', error)
            throw error
        }
    }
}