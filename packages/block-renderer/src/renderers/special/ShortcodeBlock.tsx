/**
 * Shortcode Block Renderer
 * Renders WordPress-style shortcodes using @o4o/shortcodes
 */

import React from 'react';
import {
  ShortcodeRenderer,
  ParsedShortcode
} from '@o4o/shortcodes';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';

/**
 * Loading Component
 */
const LoadingComponent: React.FC = () => (
  <div className="flex items-center gap-2 p-4 text-gray-600">
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Loading shortcode...</span>
  </div>
);

/**
 * Error Component
 */
const ErrorComponent: React.FC<{ error: Error }> = ({ error }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
    <div className="flex items-center gap-2 text-red-800">
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span className="font-medium">Shortcode Error</span>
    </div>
    <p className="text-sm text-red-700 mt-1">{error.message}</p>
  </div>
);

/**
 * Unknown Shortcode Component
 */
const UnknownShortcodeComponent: React.FC<{ shortcode: ParsedShortcode }> = ({ shortcode }) => (
  <div className="inline-block px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm text-gray-600 font-mono">
    [{shortcode.name}] not found
  </div>
);

/**
 * ShortcodeBlock Component
 * Renders shortcodes from block data
 */
export const ShortcodeBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Get shortcode content from various possible locations
  const content =
    getBlockData(block, 'shortcode') ||
    getBlockData(block, 'content') ||
    getBlockData(block, 'text') ||
    '';

  if (!content) {
    return null;
  }

  const className = getBlockData(block, 'className', '');
  const postId = getBlockData(block, 'postId');

  return (
    <div className={`block-shortcode ${className}`}>
      <ShortcodeRenderer
        content={content}
        context={{ postId }}
        LoadingComponent={LoadingComponent}
        ErrorComponent={ErrorComponent}
        UnknownShortcodeComponent={UnknownShortcodeComponent}
      />
    </div>
  );
};

export default ShortcodeBlock;
