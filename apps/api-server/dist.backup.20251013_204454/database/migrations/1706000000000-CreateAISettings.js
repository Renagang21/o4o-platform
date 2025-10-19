"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAISettings1706000000000 = void 0;
class CreateAISettings1706000000000 {
    constructor() {
        this.name = 'CreateAISettings1706000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`ai_settings\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`provider\` varchar(255) NOT NULL,
                \`apiKey\` text NULL,
                \`defaultModel\` varchar(255) NULL,
                \`settings\` json NULL,
                \`isActive\` tinyint NOT NULL DEFAULT '1',
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_provider\` (\`provider\`),
                INDEX \`IDX_provider\` (\`provider\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`ai_settings\``);
    }
}
exports.CreateAISettings1706000000000 = CreateAISettings1706000000000;
//# sourceMappingURL=1706000000000-CreateAISettings.js.map