/**
 * Block Settings Registry
 * Maps block types to their settings panels
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { ParagraphSettings } from './ParagraphSettings';
import { HeadingSettings } from './HeadingSettings';
import { ImageSettings } from './ImageSettings';
import { ButtonSettings } from './ButtonSettings';
import { ListSettings } from './ListSettings';

export interface BlockSettingsProps {
  block: Block;
  onUpdate: (updates: { content?: any; attributes?: any }) => void;
}

export type BlockSettingsComponent = React.FC<BlockSettingsProps>;

/**
 * Registry mapping block types to their settings components
 */
export const blockSettingsRegistry: Record<string, BlockSettingsComponent> = {
  'core/paragraph': ParagraphSettings,
  'core/heading': HeadingSettings,
  'core/image': ImageSettings,
  'core/button': ButtonSettings,
  'core/list': ListSettings,
};

/**
 * Get settings component for a block type
 */
export function getBlockSettings(blockType: string): BlockSettingsComponent | null {
  return blockSettingsRegistry[blockType] || null;
}

// Export individual components
export { ParagraphSettings } from './ParagraphSettings';
export { HeadingSettings } from './HeadingSettings';
export { ImageSettings } from './ImageSettings';
export { ButtonSettings } from './ButtonSettings';
export { ListSettings } from './ListSettings';
