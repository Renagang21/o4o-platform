/**
 * AI Generator
 * Main entry point for AI-based view generation
 */

import { generateView } from '../generator/viewGenerator';
import { analyzeIntent } from './intent/analyzeIntent';
import {
  NaturalLanguagePrompt,
  AIGenerationOptions,
  AIGenerationResult,
} from './types';
import { AI_CONFIG } from './config';

/**
 * Generate a view from natural language prompt
 * @param prompt - Natural language description
 * @param options - AI generation options
 * @returns Generation result with view schema and metadata
 */
export async function generateFromPrompt(
  prompt: string | NaturalLanguagePrompt,
  options?: AIGenerationOptions
): Promise<AIGenerationResult> {
  try {
    // Step 1: Analyze intent
    console.log('🤖 Analyzing prompt with AI...');
    const intent = await analyzeIntent(prompt, options);

    console.log('📊 AI Intent Analysis:');
    console.log(`  - View ID: ${intent.viewId}`);
    console.log(`  - Category: ${intent.category}`);
    console.log(`  - Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
    if (intent.reasoning) {
      console.log(`  - Reasoning: ${intent.reasoning}`);
    }
    if (intent.suggestions && intent.suggestions.length > 0) {
      console.log('  - Suggestions:');
      intent.suggestions.forEach((s) => console.log(`    • ${s}`));
    }

    // Step 2: Generate view using ViewGenerator (Step 10)
    console.log('\n🔨 Generating view schema...');
    const filePath = await generateView(intent.viewId);

    // Step 3: Return result
    return {
      success: true,
      intent,
      filePath,
      usedFallback: !options?.provider || options.provider === 'local',
    };
  } catch (error) {
    console.error('❌ AI generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate multiple views from prompts
 * @param prompts - Array of natural language descriptions
 * @param options - AI generation options
 * @returns Array of generation results
 */
export async function generateFromPrompts(
  prompts: Array<string | NaturalLanguagePrompt>,
  options?: AIGenerationOptions
): Promise<AIGenerationResult[]> {
  const results: AIGenerationResult[] = [];

  for (const prompt of prompts) {
    console.log(`\n${'='.repeat(60)}`);
    const text = typeof prompt === 'string' ? prompt : prompt.text;
    console.log(`🚀 Processing: "${text}"`);
    console.log('='.repeat(60));

    const result = await generateFromPrompt(prompt, options);
    results.push(result);

    // Brief pause between generations
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 Generation Summary');
  console.log('='.repeat(60));
  const successful = results.filter((r) => r.success).length;
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successful}/${results.length}`);

  return results;
}

/**
 * Preview a view generation without saving
 * @param prompt - Natural language description
 * @param options - AI generation options
 * @returns Intent and view schema (not saved)
 */
export async function previewGeneration(
  prompt: string | NaturalLanguagePrompt,
  options?: AIGenerationOptions
) {
  const intent = await analyzeIntent(prompt, options);

  return {
    intent,
    preview: {
      viewId: intent.viewId,
      category: intent.category,
      confidence: intent.confidence,
      reasoning: intent.reasoning,
      suggestions: intent.suggestions,
    },
  };
}

/**
 * Get AI generation statistics
 */
export function getAIStats() {
  return {
    provider: AI_CONFIG.defaultProvider,
    configured: AI_CONFIG.providers,
    settings: AI_CONFIG.generation,
  };
}
