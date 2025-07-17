import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AddSettingsTable1737106000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "settings",
            columns: [
                {
                    name: "key",
                    type: "varchar",
                    length: "100",
                    isPrimary: true
                },
                {
                    name: "value",
                    type: "jsonb",
                    isNullable: true
                },
                {
                    name: "type",
                    type: "varchar",
                    length: "50"
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Insert default settings
        await queryRunner.query(`
            INSERT INTO settings (key, type, value) VALUES
            ('general', 'general', '{"siteName": "O4O Platform", "siteDescription": "Multi-tenant e-commerce platform", "siteUrl": "", "adminEmail": "", "timezone": "Asia/Seoul", "dateFormat": "YYYY-MM-DD", "timeFormat": "HH:mm", "language": "ko", "maintenanceMode": false, "maintenanceMessage": "", "allowRegistration": true, "defaultUserRole": "customer", "requireEmailVerification": true, "enableApiAccess": false, "apiRateLimit": 100}'),
            ('reading', 'reading', '{"homepageType": "latest_posts", "homepageId": null, "postsPerPage": 10, "showSummary": "excerpt", "excerptLength": 200}'),
            ('theme', 'theme', '{"theme": "default", "primaryColor": "#0066cc", "secondaryColor": "#666666", "fontFamily": "system-ui", "fontSize": "16px", "darkMode": false}'),
            ('email', 'email', '{"smtpHost": "", "smtpPort": 587, "smtpUser": "", "smtpPassword": "", "smtpSecure": false, "fromEmail": "", "fromName": ""}')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("settings");
    }
}