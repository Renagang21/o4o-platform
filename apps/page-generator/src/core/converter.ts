/**
 * Main Converter
 * High-level API for JSX → O4O Block conversion
 */

import { parseJSXCode } from './jsx-parser';
import { convertReactToBlocks } from './block-mapper';
import { extractPlaceholders } from './placeholder';
import type { Block, PageData } from './types';
import { generateSlug } from '../utils/slug';

export interface ConversionResult {
  blocks: Block[];
  placeholders: Array<{
    componentName: string;
    count: number;
  }>;
  stats: {
    totalBlocks: number;
    placeholderCount: number;
    successfulConversions: number;
  };
}

/**
 * Convert JSX code to O4O blocks
 * Main entry point for conversion
 */
export function convertJSXToBlocks(jsxCode: string): ConversionResult {
  // Step 1: Parse JSX to ReactElement tree
  const reactElements = parseJSXCode(jsxCode);

  // Step 2: Convert ReactElements to O4O Blocks
  const blocks = convertReactToBlocks(reactElements);

  // Step 3: Extract placeholder summary
  const placeholders = extractPlaceholders(blocks);

  // Step 4: Calculate stats
  const placeholderCount = placeholders.reduce((sum, p) => sum + p.count, 0);
  const totalBlocks = countBlocks(blocks);
  const successfulConversions = totalBlocks - placeholderCount;

  return {
    blocks,
    placeholders,
    stats: {
      totalBlocks,
      placeholderCount,
      successfulConversions,
    },
  };
}

/**
 * Convert JSX code to complete PageData
 * Ready for API submission
 */
export function convertJSXToPage(
  jsxCode: string,
  title: string,
  options?: {
    slug?: string;
    excerpt?: string;
    status?: 'draft' | 'publish';
    type?: 'page' | 'post';
    showInMenu?: boolean;
  }
): { pageData: PageData; conversionResult: ConversionResult } {
  const conversionResult = convertJSXToBlocks(jsxCode);

  const pageData: PageData = {
    title,
    slug: options?.slug || generateSlug(title),
    content: conversionResult.blocks,
    excerpt: options?.excerpt,
    status: options?.status || 'draft',
    type: options?.type || 'page',
    showInMenu: options?.showInMenu,
  };

  return {
    pageData,
    conversionResult,
  };
}

/**
 * Count total blocks recursively
 */
function countBlocks(blocks: Block[]): number {
  let count = blocks.length;

  for (const block of blocks) {
    if (block.innerBlocks) {
      count += countBlocks(block.innerBlocks);
    }
  }

  return count;
}

/**
 * Validate JSX code before conversion
 */
export function validateJSX(jsxCode: string): {
  valid: boolean;
  error?: string;
} {
  if (!jsxCode || jsxCode.trim().length === 0) {
    return {
      valid: false,
      error: 'JSX code is empty',
    };
  }

  try {
    parseJSXCode(jsxCode);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}
