/**
 * AI Page Generator V2 Type Definitions
 * Phase 1-A: Design-First AI Generation Schema
 */

import { Block } from '@/types/post.types';

/**
 * V2 AI Response Structure
 * Supports both simple block generation and complex design-first generation
 */
export interface AIResponseV2 {
  /**
   * Page layout with generated blocks
   */
  layout: {
    blocks: Block[];
  };

  /**
   * New block requests when AI needs components not in registry
   * These will be displayed as placeholders in the editor
   */
  new_blocks_request?: NewBlockRequest[];
}

/**
 * Suggested alternative block when exact match not found
 */
export interface SuggestedBlock {
  /**
   * Block type from registry (e.g., "o4o/list", "o4o/columns")
   */
  blockType: string;

  /**
   * Match score (0-100) indicating how well this block fits the need
   */
  matchScore: number;

  /**
   * Explanation of why this block can be used as alternative
   */
  reason: string;

  /**
   * Pre-configured attributes for this use case
   */
  exampleConfig: Record<string, any>;
}

/**
 * New Block Request Specification
 * Generated when AI identifies need for a component not in block registry
 */
export interface NewBlockRequest {
  /**
   * Unique ID linking this request to placeholder block in layout
   */
  placeholderId: string;

  /**
   * Suggested component name (e.g., "TimelineChart", "PricingTable")
   */
  componentName: string;

  /**
   * Reason why this new block is needed
   */
  reason: string;

  /**
   * User's intent or goal (e.g., "시간 흐름 표시", "가격표 표시")
   */
  userIntent?: string;

  /**
   * Alternative blocks that can be used instead
   * AI should suggest 1-3 alternatives from existing block registry
   */
  suggestedAlternatives?: SuggestedBlock[];

  /**
   * Block specification for future implementation
   */
  spec: BlockSpec;
}

/**
 * Block Specification for New Block Request
 */
export interface BlockSpec {
  /**
   * Required props for this component
   */
  props: string[];

  /**
   * Styling requirements or constraints
   */
  style?: string;

  /**
   * Example usage or data structures
   */
  examples?: any[];

  /**
   * Suggested block category
   */
  category?: 'layout' | 'widgets' | 'design' | 'dynamic' | 'media' | 'text';

  /**
   * Parent blocks (if this block should only be used inside specific parents)
   */
  parent?: string[];
}

/**
 * Shortcode Block Attributes
 */
export interface ShortcodeBlockAttributes {
  /**
   * Shortcode string (e.g., "[seller_dashboard]", "[login_form]")
   */
  code: string;

  /**
   * Optional parameters parsed from shortcode
   */
  params?: Record<string, string>;
}

/**
 * Placeholder Block Attributes
 */
export interface PlaceholderBlockAttributes {
  /**
   * Component name for the missing block
   */
  componentName: string;

  /**
   * Reason why this placeholder was created
   */
  reason: string;

  /**
   * Suggested props
   */
  props?: string[];

  /**
   * Style requirements
   */
  style?: string;

  /**
   * Placeholder ID (links to new_blocks_request)
   */
  placeholderId?: string;
}

/**
 * V1 AI Response (legacy format)
 * Still supported for backward compatibility
 */
export interface AIResponseV1 {
  blocks: Block[];
}

/**
 * Union type for AI responses
 */
export type AIResponse = AIResponseV1 | AIResponseV2;

/**
 * Type guard to check if response is V2
 */
export function isAIResponseV2(response: any): response is AIResponseV2 {
  return response && typeof response === 'object' && 'layout' in response;
}

/**
 * Type guard to check if response is V1
 */
export function isAIResponseV1(response: any): response is AIResponseV1 {
  return response && typeof response === 'object' && 'blocks' in response && !('layout' in response);
}
