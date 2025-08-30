import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddZoneBasedStructure1745000000000 implements MigrationInterface {
    name = 'AddZoneBasedStructure1745000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add zones column to posts table
        await queryRunner.addColumn('posts', new TableColumn({
            name: 'zones',
            type: 'json',
            isNullable: true,
            comment: 'Zone-based content structure'
        }))

        // Add theme_customizations column
        await queryRunner.addColumn('posts', new TableColumn({
            name: 'theme_customizations',
            type: 'json',
            isNullable: true,
            comment: 'User-specific theme customizations'
        }))

        // Add layout_type column
        await queryRunner.addColumn('posts', new TableColumn({
            name: 'layout_type',
            type: 'varchar',
            length: '50',
            default: "'single-column'",
            comment: 'Layout type: single-column, two-column, three-column, custom'
        }))

        // Add use_zones flag
        await queryRunner.addColumn('posts', new TableColumn({
            name: 'use_zones',
            type: 'boolean',
            default: false,
            comment: 'Flag to enable zone-based editing'
        }))

        // Migrate existing content to zone structure
        await queryRunner.query(`
            UPDATE posts 
            SET zones = jsonb_build_object(
                'main', jsonb_build_object(
                    'id', 'main',
                    'type', 'main',
                    'blocks', COALESCE(content->'blocks', '[]'::jsonb),
                    'settings', jsonb_build_object(
                        'width', '100%',
                        'maxWidth', '840px',
                        'padding', '2rem'
                    )
                ),
                'header', jsonb_build_object(
                    'id', 'header',
                    'type', 'header',
                    'blocks', '[]'::jsonb,
                    'settings', jsonb_build_object(
                        'sticky', false,
                        'height', 'auto'
                    )
                ),
                'footer', jsonb_build_object(
                    'id', 'footer',
                    'type', 'footer',
                    'blocks', '[]'::jsonb,
                    'settings', jsonb_build_object(
                        'backgroundColor', '#f5f5f5'
                    )
                )
            ),
            layout_type = 'single-column'
            WHERE content IS NOT NULL AND zones IS NULL
        `)

        // Create theme_customizations table for site-wide settings
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS theme_customizations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                theme_id VARCHAR(100) NOT NULL,
                customization JSON NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, theme_id, is_active)
            )
        `)

        // Create page_zones table for zone-specific overrides
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS page_zones (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                page_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                zone_id VARCHAR(50) NOT NULL,
                blocks JSON NOT NULL,
                settings JSON,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(page_id, zone_id)
            )
        `)

        // Create zone_templates table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS zone_templates (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                zone_id VARCHAR(50) NOT NULL,
                template_data JSON NOT NULL,
                category VARCHAR(100),
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)

        // Add indexes for better performance
        await queryRunner.query(`
            CREATE INDEX idx_posts_use_zones ON posts(use_zones);
            CREATE INDEX idx_posts_layout_type ON posts(layout_type);
            CREATE INDEX idx_theme_customizations_user ON theme_customizations(user_id);
            CREATE INDEX idx_theme_customizations_active ON theme_customizations(is_active);
            CREATE INDEX idx_page_zones_page ON page_zones(page_id);
            CREATE INDEX idx_zone_templates_category ON zone_templates(category);
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_posts_use_zones;
            DROP INDEX IF EXISTS idx_posts_layout_type;
            DROP INDEX IF EXISTS idx_theme_customizations_user;
            DROP INDEX IF EXISTS idx_theme_customizations_active;
            DROP INDEX IF EXISTS idx_page_zones_page;
            DROP INDEX IF EXISTS idx_zone_templates_category;
        `)

        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS zone_templates`)
        await queryRunner.query(`DROP TABLE IF EXISTS page_zones`)
        await queryRunner.query(`DROP TABLE IF EXISTS theme_customizations`)

        // Remove columns from posts table
        await queryRunner.dropColumn('posts', 'use_zones')
        await queryRunner.dropColumn('posts', 'layout_type')
        await queryRunner.dropColumn('posts', 'theme_customizations')
        await queryRunner.dropColumn('posts', 'zones')
    }
}