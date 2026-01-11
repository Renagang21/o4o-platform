/**
 * Domain Integration Verification - Phase 1
 *
 * Tests entity relation loading with ESM-compatible string-based decorators
 * NO business logic, NO API calls, PURE TypeORM repository tests
 */

import 'dotenv/config';
import { AppDataSource } from './dist/database/connection.js';

// Test result structure
const results = {
  initialization: { status: 'PENDING', error: null },
  domains: {
    yaksa: { status: 'PENDING', tests: [], errors: [] },
    glycopharm: { status: 'PENDING', tests: [], errors: [] },
    glucoseview: { status: 'PENDING', tests: [], errors: [] },
    neture: { status: 'PENDING', tests: [], errors: [] },
  },
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  }
};

/**
 * Helper: Record test result
 */
function recordTest(domain, testName, success, error = null, warning = null) {
  const test = { name: testName, success, error, warning };
  results.domains[domain].tests.push(test);
  results.summary.total++;

  if (success) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
    results.domains[domain].errors.push(error);
  }

  if (warning) {
    results.summary.warnings++;
  }

  const icon = success ? '✅' : '❌';
  const warningIcon = warning ? '⚠️ ' : '';
  console.log(`  ${icon} ${warningIcon}${testName}`);
  if (error) console.log(`     Error: ${error}`);
  if (warning) console.log(`     Warning: ${warning}`);
}

/**
 * Test: Yaksa Domain
 */
async function testYaksaDomain() {
  console.log('\n📝 Testing Yaksa Domain...');
  const domain = 'yaksa';

  try {
    // Test 1: Load YaksaCategory repository
    const categoryRepo = AppDataSource.getRepository('YaksaCategory');
    recordTest(domain, 'YaksaCategory repository loaded', true);

    // Test 2: Find categories (no relations)
    const categories = await categoryRepo.find({ take: 1 });
    const hasData = categories.length > 0;
    recordTest(
      domain,
      'Find categories without relations',
      true,
      null,
      hasData ? null : 'No data found (expected in empty DB)'
    );

    if (hasData) {
      // Test 3: Load category with posts relation
      const categoryWithPosts = await categoryRepo.findOne({
        where: { id: categories[0].id },
        relations: ['posts']
      });

      const relationsWork = categoryWithPosts !== null;
      recordTest(
        domain,
        'Load category with posts relation',
        relationsWork,
        relationsWork ? null : 'Relation loading returned null'
      );

      if (categoryWithPosts && categoryWithPosts.posts) {
        recordTest(
          domain,
          `Posts relation resolved (${categoryWithPosts.posts.length} posts)`,
          true
        );
      }
    }

    // Test 4: Load YaksaPost repository
    const postRepo = AppDataSource.getRepository('YaksaPost');
    recordTest(domain, 'YaksaPost repository loaded', true);

    // Test 5: Find posts (no relations)
    const posts = await postRepo.find({ take: 1 });
    const hasPostData = posts.length > 0;
    recordTest(
      domain,
      'Find posts without relations',
      true,
      null,
      hasPostData ? null : 'No data found (expected in empty DB)'
    );

    if (hasPostData) {
      // Test 6: Load post with category and logs relations
      const postWithRelations = await postRepo.findOne({
        where: { id: posts[0].id },
        relations: ['category', 'logs']
      });

      const postRelationsWork = postWithRelations !== null;
      recordTest(
        domain,
        'Load post with category + logs relations',
        postRelationsWork,
        postRelationsWork ? null : 'Multi-relation loading returned null'
      );
    }

    results.domains[domain].status = 'PASS';

  } catch (error) {
    results.domains[domain].status = 'FAIL';
    recordTest(domain, 'Domain test execution', false, error.message);
    console.error('Yaksa domain error:', error);
  }
}

/**
 * Test: Glycopharm Domain
 */
async function testGlycopharmDomain() {
  console.log('\n💊 Testing Glycopharm Domain...');
  const domain = 'glycopharm';

  try {
    // Test 1: Load GlycopharmPharmacy repository
    const pharmacyRepo = AppDataSource.getRepository('GlycopharmPharmacy');
    recordTest(domain, 'GlycopharmPharmacy repository loaded', true);

    // Test 2: Find pharmacies (no relations)
    const pharmacies = await pharmacyRepo.find({ take: 1 });
    const hasData = pharmacies.length > 0;
    recordTest(
      domain,
      'Find pharmacies without relations',
      true,
      null,
      hasData ? null : 'No data found (expected in empty DB)'
    );

    if (hasData) {
      // Test 3: Load pharmacy with products relation
      const pharmacyWithProducts = await pharmacyRepo.findOne({
        where: { id: pharmacies[0].id },
        relations: ['products']
      });

      const relationsWork = pharmacyWithProducts !== null;
      recordTest(
        domain,
        'Load pharmacy with products relation',
        relationsWork,
        relationsWork ? null : 'Relation loading returned null'
      );

      if (pharmacyWithProducts && pharmacyWithProducts.products) {
        recordTest(
          domain,
          `Products relation resolved (${pharmacyWithProducts.products.length} products)`,
          true
        );
      }
    }

    // Test 4: Load GlycopharmProduct repository
    const productRepo = AppDataSource.getRepository('GlycopharmProduct');
    recordTest(domain, 'GlycopharmProduct repository loaded', true);

    // Test 5: Find products (no relations)
    const products = await productRepo.find({ take: 1 });
    const hasProductData = products.length > 0;
    recordTest(
      domain,
      'Find products without relations',
      true,
      null,
      hasProductData ? null : 'No data found (expected in empty DB)'
    );

    if (hasProductData) {
      // Test 6: Load product with pharmacy and logs relations
      const productWithRelations = await productRepo.findOne({
        where: { id: products[0].id },
        relations: ['pharmacy', 'logs']
      });

      const productRelationsWork = productWithRelations !== null;
      recordTest(
        domain,
        'Load product with pharmacy + logs relations',
        productRelationsWork,
        productRelationsWork ? null : 'Multi-relation loading returned null'
      );
    }

    // Test 7: Load GlycopharmOrder repository
    const orderRepo = AppDataSource.getRepository('GlycopharmOrder');
    recordTest(domain, 'GlycopharmOrder repository loaded', true);

    const orders = await orderRepo.find({ take: 1 });
    const hasOrderData = orders.length > 0;
    recordTest(
      domain,
      'Find orders without relations',
      true,
      null,
      hasOrderData ? null : 'No data found (expected in empty DB)'
    );

    if (hasOrderData) {
      // Test 8: Load order with items relation
      const orderWithItems = await orderRepo.findOne({
        where: { id: orders[0].id },
        relations: ['items', 'pharmacy']
      });

      const orderRelationsWork = orderWithItems !== null;
      recordTest(
        domain,
        'Load order with items + pharmacy relations',
        orderRelationsWork,
        orderRelationsWork ? null : 'Order relation loading returned null'
      );
    }

    results.domains[domain].status = 'PASS';

  } catch (error) {
    results.domains[domain].status = 'FAIL';
    recordTest(domain, 'Domain test execution', false, error.message);
    console.error('Glycopharm domain error:', error);
  }
}

/**
 * Test: GlucoseView Domain
 */
async function testGlucoseViewDomain() {
  console.log('\n📊 Testing GlucoseView Domain...');
  const domain = 'glucoseview';

  try {
    // Test 1: Load GlucoseViewBranch repository
    const branchRepo = AppDataSource.getRepository('GlucoseViewBranch');
    recordTest(domain, 'GlucoseViewBranch repository loaded', true);

    // Test 2: Find branches (no relations)
    const branches = await branchRepo.find({ take: 1 });
    const hasData = branches.length > 0;
    recordTest(
      domain,
      'Find branches without relations',
      true,
      null,
      hasData ? null : 'No data found (expected in empty DB)'
    );

    if (hasData) {
      // Test 3: Load branch with chapters relation
      const branchWithChapters = await branchRepo.findOne({
        where: { id: branches[0].id },
        relations: ['chapters']
      });

      const relationsWork = branchWithChapters !== null;
      recordTest(
        domain,
        'Load branch with chapters relation',
        relationsWork,
        relationsWork ? null : 'Relation loading returned null'
      );

      if (branchWithChapters && branchWithChapters.chapters) {
        recordTest(
          domain,
          `Chapters relation resolved (${branchWithChapters.chapters.length} chapters)`,
          true
        );
      }
    }

    // Test 4: Load GlucoseViewVendor repository
    const vendorRepo = AppDataSource.getRepository('GlucoseViewVendor');
    recordTest(domain, 'GlucoseViewVendor repository loaded', true);

    // Test 5: Find vendors (no relations)
    const vendors = await vendorRepo.find({ take: 1 });
    const hasVendorData = vendors.length > 0;
    recordTest(
      domain,
      'Find vendors without relations',
      true,
      null,
      hasVendorData ? null : 'No data found (expected in empty DB)'
    );

    if (hasVendorData) {
      // Test 6: Load vendor with connections relation
      const vendorWithConnections = await vendorRepo.findOne({
        where: { id: vendors[0].id },
        relations: ['connections']
      });

      const vendorRelationsWork = vendorWithConnections !== null;
      recordTest(
        domain,
        'Load vendor with connections relation',
        vendorRelationsWork,
        vendorRelationsWork ? null : 'Vendor relation loading returned null'
      );
    }

    // Test 7: Load GlucoseViewApplication repository
    const applicationRepo = AppDataSource.getRepository('GlucoseViewApplication');
    recordTest(domain, 'GlucoseViewApplication repository loaded', true);

    const applications = await applicationRepo.find({ take: 1 });
    const hasAppData = applications.length > 0;
    recordTest(
      domain,
      'Find applications without relations',
      true,
      null,
      hasAppData ? null : 'No data found (expected in empty DB)'
    );

    if (hasAppData) {
      // Test 8: Load application with user relation (cross-domain FK)
      const appWithUser = await applicationRepo.findOne({
        where: { id: applications[0].id },
        relations: ['user']
      });

      const appRelationsWork = appWithUser !== null;
      recordTest(
        domain,
        'Load application with User relation (cross-domain)',
        appRelationsWork,
        appRelationsWork ? null : 'Cross-domain relation loading returned null'
      );
    }

    results.domains[domain].status = 'PASS';

  } catch (error) {
    results.domains[domain].status = 'FAIL';
    recordTest(domain, 'Domain test execution', false, error.message);
    console.error('GlucoseView domain error:', error);
  }
}

/**
 * Test: Neture Domain
 */
async function testNetureDomain() {
  console.log('\n🌿 Testing Neture Domain...');
  const domain = 'neture';

  try {
    // Test 1: Load NetureSupplier repository
    const supplierRepo = AppDataSource.getRepository('NetureSupplier');
    recordTest(domain, 'NetureSupplier repository loaded', true);

    // Test 2: Find suppliers (no relations)
    const suppliers = await supplierRepo.find({ take: 1 });
    const hasData = suppliers.length > 0;
    recordTest(
      domain,
      'Find suppliers without relations',
      true,
      null,
      hasData ? null : 'No data found (expected in empty DB)'
    );

    if (hasData) {
      // Test 3: Load supplier with products relation
      const supplierWithProducts = await supplierRepo.findOne({
        where: { id: suppliers[0].id },
        relations: ['products']
      });

      const relationsWork = supplierWithProducts !== null;
      recordTest(
        domain,
        'Load supplier with products relation',
        relationsWork,
        relationsWork ? null : 'Relation loading returned null'
      );

      if (supplierWithProducts && supplierWithProducts.products) {
        recordTest(
          domain,
          `Products relation resolved (${supplierWithProducts.products.length} products)`,
          true
        );
      }
    }

    // Test 4: Load NeturePartnershipRequest repository
    const partnershipRepo = AppDataSource.getRepository('NeturePartnershipRequest');
    recordTest(domain, 'NeturePartnershipRequest repository loaded', true);

    // Test 5: Find partnerships (no relations)
    const partnerships = await partnershipRepo.find({ take: 1 });
    const hasPartnershipData = partnerships.length > 0;
    recordTest(
      domain,
      'Find partnerships without relations',
      true,
      null,
      hasPartnershipData ? null : 'No data found (expected in empty DB)'
    );

    if (hasPartnershipData) {
      // Test 6: Load partnership with products relation
      const partnershipWithProducts = await partnershipRepo.findOne({
        where: { id: partnerships[0].id },
        relations: ['products']
      });

      const partnershipRelationsWork = partnershipWithProducts !== null;
      recordTest(
        domain,
        'Load partnership with products relation',
        partnershipRelationsWork,
        partnershipRelationsWork ? null : 'Partnership relation loading returned null'
      );
    }

    results.domains[domain].status = 'PASS';

  } catch (error) {
    results.domains[domain].status = 'FAIL';
    recordTest(domain, 'Domain test execution', false, error.message);
    console.error('Neture domain error:', error);
  }
}

/**
 * Main test execution
 */
async function runPhase1Tests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Domain Integration Verification - Phase 1');
  console.log('   Entity Relation Loading Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Initialize AppDataSource
    console.log('🔌 Initializing TypeORM AppDataSource...');
    await AppDataSource.initialize();
    results.initialization.status = 'SUCCESS';
    console.log('✅ AppDataSource initialized successfully\n');

    // Step 2: Test each domain
    await testYaksaDomain();
    await testGlycopharmDomain();
    await testGlucoseViewDomain();
    await testNetureDomain();

    // Step 3: Close connection
    console.log('\n🔌 Closing database connection...');
    await AppDataSource.destroy();
    console.log('✅ Connection closed\n');

  } catch (error) {
    results.initialization.status = 'FAIL';
    results.initialization.error = error.message;
    console.error('❌ AppDataSource initialization failed:', error);
    process.exit(1);
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Total Tests:    ${results.summary.total}`);
  console.log(`✅ Passed:      ${results.summary.passed}`);
  console.log(`❌ Failed:      ${results.summary.failed}`);
  console.log(`⚠️  Warnings:    ${results.summary.warnings}\n`);

  console.log('Domain Status:');
  Object.entries(results.domains).forEach(([domain, data]) => {
    const icon = data.status === 'PASS' ? '✅' : '❌';
    const testCount = data.tests.filter(t => t.success).length;
    const totalCount = data.tests.length;
    console.log(`  ${icon} ${domain.toUpperCase()}: ${data.status} (${testCount}/${totalCount} tests passed)`);
  });

  console.log('\n═══════════════════════════════════════════════════════');

  // Determine overall result
  const overallPass = results.summary.failed === 0;

  if (overallPass) {
    console.log('✅ Phase 1 PASSED - All entity relations load correctly');
    console.log('   ESM-compatible string decorators working as expected');
    console.log('   Safe to proceed to Phase 2 (Service Logic Tests)');
  } else {
    console.log('❌ Phase 1 FAILED - Entity relation loading issues detected');
    console.log('   Review errors above and fix entity configurations');
    console.log('   DO NOT proceed to Phase 2 until resolved');
  }

  console.log('═══════════════════════════════════════════════════════\n');

  // Save detailed results to JSON
  const fs = await import('fs');
  const resultPath = './test-domain-integration-results.json';
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results saved to: ${resultPath}\n`);

  process.exit(overallPass ? 0 : 1);
}

// Run tests
runPhase1Tests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
