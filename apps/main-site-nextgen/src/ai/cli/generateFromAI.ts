#!/usr/bin/env node
/**
 * AI Generator CLI
 * Command-line interface for AI-based view generation
 *
 * Usage:
 *   npx tsx src/ai/cli/generateFromAI.ts "판매자 대시보드 만들어줘"
 *   npx tsx src/ai/cli/generateFromAI.ts "product list page with filters"
 *   npx tsx src/ai/cli/generateFromAI.ts --preview "checkout flow"
 */

import {
  generateFromPrompt,
  generateFromPrompts,
  previewGeneration,
  getAIStats,
} from '../aiGenerator';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
AI View Generator - NextGen Frontend

Usage:
  npm run generate:ai <prompt>          Generate view from natural language
  npm run generate:ai --preview <prompt> Preview without saving
  npm run generate:ai --stats           Show AI configuration

Examples:
  npm run generate:ai "판매자 대시보드 페이지 만들어줘"
  npm run generate:ai "product list with filters and sorting"
  npm run generate:ai "checkout flow with payment"
  npm run generate:ai --preview "admin user management"
  npm run generate:ai --stats

Multiple prompts:
  npm run generate:ai "product-list" "cart" "checkout"
    `);
    process.exit(0);
  }

  const command = args[0];

  // Stats command
  if (command === '--stats') {
    const stats = getAIStats();
    console.log('\n📊 AI Generator Statistics:');
    console.log(`\nProvider: ${stats.provider}`);
    console.log('\nSettings:');
    console.log(`  - Temperature: ${stats.settings.temperature}`);
    console.log(`  - Max Tokens: ${stats.settings.maxTokens}`);
    console.log(`  - Max Retries: ${stats.settings.maxRetries}`);
    console.log(`  - Fallback to Rules: ${stats.settings.fallbackToRules}`);
    console.log('');
    return;
  }

  // Preview command
  if (command === '--preview') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      console.error('❌ Error: Prompt required for preview');
      process.exit(1);
    }

    console.log('🔍 Previewing generation...\n');
    const result = await previewGeneration(prompt);

    console.log('Intent Preview:');
    console.log(`  View ID: ${result.intent.viewId}`);
    console.log(`  Category: ${result.intent.category}`);
    console.log(`  Action: ${result.intent.action}`);
    console.log(`  Confidence: ${(result.intent.confidence * 100).toFixed(1)}%`);
    console.log(`\nReasoning:\n  ${result.intent.reasoning}`);

    if (result.intent.suggestions && result.intent.suggestions.length > 0) {
      console.log('\nSuggestions:');
      result.intent.suggestions.forEach((s) => console.log(`  • ${s}`));
    }

    console.log('\n💡 Tip: Remove --preview to actually generate the view');
    return;
  }

  // Generate command (single or multiple prompts)
  const prompts = args;

  if (prompts.length === 1) {
    // Single prompt
    const result = await generateFromPrompt(prompts[0]);

    if (result.success) {
      console.log('\n✅ View generated successfully!');
      console.log(`📁 File: ${result.filePath}`);
      console.log(`🎯 View ID: ${result.intent?.viewId}`);
    } else {
      console.error(`\n❌ Generation failed: ${result.error}`);
      process.exit(1);
    }
  } else {
    // Multiple prompts
    const results = await generateFromPrompts(prompts);

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.error('\n❌ Some generations failed:');
      failed.forEach((r) => console.error(`  - ${r.error}`));
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
