/**
 * Partner-Core Test Runner
 *
 * CLI에서 실행 가능한 테스트 러너
 *
 * Usage: npx tsx packages/partner-core/src/__tests__/test-runner.ts
 *
 * @package @o4o/partner-core
 */

import { DataSource } from 'typeorm';
import { Partner } from '../entities/Partner.entity.js';
import { PartnerLink } from '../entities/PartnerLink.entity.js';
import { PartnerClick } from '../entities/PartnerClick.entity.js';
import { PartnerConversion } from '../entities/PartnerConversion.entity.js';
import { PartnerCommission } from '../entities/PartnerCommission.entity.js';
import { PartnerSettlementBatch } from '../entities/PartnerSettlementBatch.entity.js';
import runAllTests from './integration.test.js';

async function main() {
  console.log('Initializing test database connection...');

  // Load environment variables
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'o4o_test';

  const dataSource = new DataSource({
    type: 'postgres',
    host: dbHost,
    port: dbPort,
    username: dbUser,
    password: dbPassword,
    database: dbName,
    entities: [
      Partner,
      PartnerLink,
      PartnerClick,
      PartnerConversion,
      PartnerCommission,
      PartnerSettlementBatch,
    ],
    synchronize: true, // 테스트용으로 자동 동기화
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected successfully.\n');

    const { allPassed, results } = await runAllTests(dataSource);

    // Print detailed results
    console.log('\nDetailed Results:');
    console.log('─'.repeat(50));
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}`);
      console.log(`   Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
      console.log(`   Message: ${result.message}`);
      if (result.details) {
        console.log('   Details:', JSON.stringify(result.details, null, 2).split('\n').map(l => '     ' + l).join('\n'));
      }
    });

    await dataSource.destroy();

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

main();
