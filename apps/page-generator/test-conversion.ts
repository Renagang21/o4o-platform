/**
 * Conversion Test Script
 * Tests JSX → Block conversion with real samples
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { convertJSXToBlocks, validateJSX } from './src/core/converter';

interface TestResult {
  file: string;
  status: 'success' | 'error' | 'validation_error';
  stats?: {
    totalBlocks: number;
    placeholderCount: number;
    successfulConversions: number;
  };
  placeholders?: Array<{
    componentName: string;
    count: number;
  }>;
  error?: string;
  blocks?: any[];
}

async function runConversionTests() {
  console.log('🧪 Page Generator Conversion Test\n');
  console.log('=' .repeat(70));

  const testSamplesDir = './test-samples';
  const outputDir = './test-output';

  // Create output directory
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  const sampleFiles = readdirSync(testSamplesDir)
    .filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'))
    .sort();

  const results: TestResult[] = [];

  for (const file of sampleFiles) {
    console.log(`\n📄 Testing: ${file}`);
    console.log('-'.repeat(70));

    const filePath = join(testSamplesDir, file);
    const jsxCode = readFileSync(filePath, 'utf-8');

    try {
      // Step 1: Validate JSX
      console.log('  Step 1: Validating JSX...');
      const validation = validateJSX(jsxCode);

      if (!validation.valid) {
        console.log(`  ❌ Validation failed: ${validation.error}`);
        results.push({
          file,
          status: 'validation_error',
          error: validation.error,
        });
        continue;
      }
      console.log('  ✅ JSX validation passed');

      // Step 2: Convert to blocks
      console.log('  Step 2: Converting to blocks...');
      const result = convertJSXToBlocks(jsxCode);

      console.log(`  ✅ Conversion successful`);
      console.log(`     Total blocks: ${result.stats.totalBlocks}`);
      console.log(`     Successful conversions: ${result.stats.successfulConversions}`);
      console.log(`     Placeholders: ${result.stats.placeholderCount}`);

      if (result.placeholders.length > 0) {
        console.log(`  ⚠️  Placeholder components:`);
        result.placeholders.forEach(p => {
          console.log(`     - ${p.componentName} (${p.count}x)`);
        });
      }

      // Save output
      const outputFile = join(outputDir, file.replace(/\.tsx?$/, '.json'));
      writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`  💾 Output saved: ${outputFile}`);

      results.push({
        file,
        status: 'success',
        stats: result.stats,
        placeholders: result.placeholders,
        blocks: result.blocks,
      });

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({
        file,
        status: 'error',
        error: error.message,
      });
    }
  }

  // Generate summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Summary');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.status === 'success');
  const errors = results.filter(r => r.status === 'error');
  const validationErrors = results.filter(r => r.status === 'validation_error');

  console.log(`\nTotal samples: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Validation errors: ${validationErrors.length}`);

  if (successful.length > 0) {
    console.log('\n📈 Statistics:');
    const totalBlocks = successful.reduce((sum, r) => sum + (r.stats?.totalBlocks || 0), 0);
    const totalPlaceholders = successful.reduce((sum, r) => sum + (r.stats?.placeholderCount || 0), 0);
    const totalConversions = successful.reduce((sum, r) => sum + (r.stats?.successfulConversions || 0), 0);

    console.log(`   Total blocks created: ${totalBlocks}`);
    console.log(`   Successful conversions: ${totalConversions}`);
    console.log(`   Placeholders: ${totalPlaceholders}`);
    console.log(`   Conversion rate: ${((totalConversions / totalBlocks) * 100).toFixed(1)}%`);
  }

  if (errors.length > 0 || validationErrors.length > 0) {
    console.log('\n❌ Failed Tests:');
    [...errors, ...validationErrors].forEach(r => {
      console.log(`   - ${r.file}: ${r.error}`);
    });
  }

  // Save full results
  const summaryFile = join(outputDir, 'test-summary.json');
  writeFileSync(summaryFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full results saved: ${summaryFile}`);

  console.log('\n✅ Test run completed!');
}

runConversionTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
