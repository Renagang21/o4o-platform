/**
 * Test Runner for Page Generator
 * Runs conversion tests on sample JSX files
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import conversion functions (we'll need to build these first)
// For now, we'll use dynamic import with proper path

async function runTests() {
  console.log('🧪 Page Generator Test Runner\n');
  console.log('=' .repeat(60));

  const testSamplesDir = join(__dirname, 'test-samples');
  const sampleFiles = readdirSync(testSamplesDir)
    .filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'))
    .sort();

  const results = [];

  for (const file of sampleFiles) {
    console.log(`\n📄 Testing: ${file}`);
    console.log('-'.repeat(60));

    const filePath = join(testSamplesDir, file);
    const jsxCode = readFileSync(filePath, 'utf-8');

    try {
      // We need to test the conversion
      // Since we can't import TS files directly, we'll need to build first
      // or use tsx/ts-node

      console.log('✅ File loaded');
      console.log(`   Lines: ${jsxCode.split('\n').length}`);
      console.log(`   Characters: ${jsxCode.length}`);

      // Extract expected results from comments
      const expectMatch = jsxCode.match(/Expected: (.+)/);
      const placeholderMatch = jsxCode.match(/Placeholders: (.+)/);

      if (expectMatch) {
        console.log(`   Expected: ${expectMatch[1]}`);
      }
      if (placeholderMatch) {
        console.log(`   Placeholders: ${placeholderMatch[1]}`);
      }

      results.push({
        file,
        status: 'loaded',
        lines: jsxCode.split('\n').length,
        expected: expectMatch ? expectMatch[1] : 'N/A',
        placeholders: placeholderMatch ? placeholderMatch[1] : 'N/A',
      });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({
        file,
        status: 'error',
        error: error.message,
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total samples: ${results.length}`);
  console.log(`Loaded: ${results.filter(r => r.status === 'loaded').length}`);
  console.log(`Errors: ${results.filter(r => r.status === 'error').length}`);

  console.log('\n💡 Next Steps:');
  console.log('   1. Build the app: cd apps/page-generator && pnpm build');
  console.log('   2. Run dev server: pnpm dev');
  console.log('   3. Test each sample manually in the UI');
  console.log('   4. Or create a proper test suite with tsx/vitest');
}

runTests().catch(console.error);
