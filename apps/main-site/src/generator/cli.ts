#!/usr/bin/env node
/**
 * ViewGenerator CLI
 * Command-line interface for generating views
 *
 * Usage:
 *   npx tsx src/generator/cli.ts "product-list"
 *   npx tsx src/generator/cli.ts "seller dashboard"
 *   npx tsx src/generator/cli.ts "상품 목록 페이지 만들어줘"
 */

import { generateView, generateViews, listGeneratedViews, deleteView } from './viewGenerator';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
ViewGenerator CLI - NextGen Frontend

Usage:
  npm run generate:view "product-list"
  npm run generate:view "seller dashboard"
  npm run generate:view "상품 목록 페이지 만들어줘"

Commands:
  generate:view <input>   Generate a single view
  generate:views <input1> <input2> ...   Generate multiple views
  list:views              List all generated views
  delete:view <viewId>    Delete a view

Examples:
  npm run generate:view "/product-list"
  npm run generate:view "seller dashboard"
  npm run generate:views "product-list" "cart" "order-list"
  npm run list:views
  npm run delete:view "product-list"
    `);
    process.exit(0);
  }

  const command = args[0];

  if (command === 'list') {
    const views = listGeneratedViews();
    console.log('\n📋 Generated Views:');
    views.forEach((view) => console.log(`  - ${view}`));
    console.log(`\nTotal: ${views.length} views\n`);
    return;
  }

  if (command === 'delete') {
    const viewId = args[1];
    if (!viewId) {
      console.error('❌ Error: View ID required');
      process.exit(1);
    }
    const deleted = deleteView(viewId);
    if (!deleted) {
      console.error(`❌ Error: View "${viewId}" not found`);
      process.exit(1);
    }
    return;
  }

  // Generate views
  if (args.length === 1) {
    await generateView(args[0]);
  } else {
    await generateViews(args);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
