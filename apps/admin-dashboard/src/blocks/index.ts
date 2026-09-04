/**
 * Custom Blocks Registration
 * Import and register all custom blocks for the WordPress editor
 */

import { blockRegistry } from './registry/BlockRegistry';

// Core text blocks
import paragraphBlockDefinition from './definitions/paragraph';
import headingBlockDefinition from './definitions/heading';
import quoteBlockDefinition from './definitions/quote';
import codeBlockDefinition from './definitions/code';
import markdownBlockDefinition from './definitions/markdown';
import listBlockDefinition from './definitions/list';
import tableBlockDefinition from './definitions/table';

// Media blocks
import imageBlockDefinition from './definitions/image';
import coverBlockDefinition from './definitions/cover';
import galleryBlockDefinition from './definitions/gallery';
import slideBlockDefinition from './definitions/slide';
import videoBlockDefinition from './definitions/video';

// Design blocks
import buttonBlockDefinition from './definitions/button';
import buttonsBlockDefinition from './definitions/buttons';

// Layout blocks
import columnsBlockDefinition from './definitions/columns';
import columnBlockDefinition from './definitions/column';
import groupBlockDefinition from './definitions/group';
import conditionalBlockDefinition from './definitions/conditional';
import spacerBlockDefinition from './definitions/spacer';
import separatorBlockDefinition from './definitions/separator';

// Widget blocks
import socialBlockDefinition from './definitions/social';
import placeholderBlockDefinition from './definitions/placeholder';
import { timelineChartBlockDefinition } from './generated/TimelineChart.definition.tsx';
import accordionItemBlockDefinition from './definitions/accordion-item';
import featureCardBlockDefinition from './definitions/feature-card';
import roleCardBlockDefinition from './definitions/role-card';
import iconFeatureListBlockDefinition from './definitions/icon-feature-list';
import faqAccordionBlockDefinition from './definitions/faq-accordion';

// Embed blocks
import youtubeBlockDefinition from './definitions/youtube';
import fileBlockDefinition from './definitions/file';

// Form blocks
import formFieldBlockDefinition from './definitions/form-field';
import formSubmitBlockDefinition from './definitions/form-submit';

// Type declaration is in wordpress-runtime-setup.ts

// Custom block types are dynamically loaded via lazy.ts to improve performance

/**
 * Register all blocks with the new registry system
 */
export function registerAllBlocks(): void {
  // Register core text blocks
  blockRegistry.register(paragraphBlockDefinition);
  blockRegistry.register(headingBlockDefinition);
  blockRegistry.register(quoteBlockDefinition);
  blockRegistry.register(codeBlockDefinition);
  blockRegistry.register(markdownBlockDefinition);
  blockRegistry.register(listBlockDefinition);
  blockRegistry.register(tableBlockDefinition);

  // Register media blocks
  blockRegistry.register(imageBlockDefinition);
  blockRegistry.register(coverBlockDefinition);
  blockRegistry.register(galleryBlockDefinition);
  blockRegistry.register(slideBlockDefinition);
  blockRegistry.register(videoBlockDefinition);

  // Register design blocks
  blockRegistry.register(buttonBlockDefinition);
  blockRegistry.register(buttonsBlockDefinition);

  // Register layout blocks
  blockRegistry.register(columnsBlockDefinition);
  blockRegistry.register(columnBlockDefinition);
  blockRegistry.register(groupBlockDefinition);
  blockRegistry.register(conditionalBlockDefinition);
  blockRegistry.register(spacerBlockDefinition);
  blockRegistry.register(separatorBlockDefinition);

  // Register widget blocks
  blockRegistry.register(socialBlockDefinition);
  blockRegistry.register(placeholderBlockDefinition); // Phase 1-C: Placeholder for missing components
  blockRegistry.register(timelineChartBlockDefinition);
  blockRegistry.register(accordionItemBlockDefinition);
  blockRegistry.register(featureCardBlockDefinition);
  blockRegistry.register(roleCardBlockDefinition);
  blockRegistry.register(iconFeatureListBlockDefinition);
  blockRegistry.register(faqAccordionBlockDefinition);

  // Register embed blocks
  blockRegistry.register(youtubeBlockDefinition);
  blockRegistry.register(fileBlockDefinition);

  // Register form blocks
  blockRegistry.register(formFieldBlockDefinition);
  blockRegistry.register(formSubmitBlockDefinition);
}

// Export registry for external use
export { blockRegistry } from './registry/BlockRegistry';
export * from './registry/types';
/*
  (제거됨) blockStyles · initializeCustomBlocks()
  WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1

  `initializeCustomBlocks()` 는 legacy WordPress block editor 호환 진입점이었다.
  WordPress 전역 polyfill 의 domReady 를 기다린 뒤 편집기 전용 스타일을 주입하는 것이
  유일한 책임이었고, 살아있는 호출자는 0 이었다(호출자는 archive 사본 2건뿐).
  `blockStyles` 는 이 함수만의 payload 였으므로 함께 제거한다.

  선행 census: docs/checks/WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1-CHECK.md
  보존: registerAllBlocks() · blockRegistry · CUSTOM_BLOCKS
*/

// Export block names for use in allowed blocks lists
export const CUSTOM_BLOCKS = [
  'o4o/group',
  'o4o/columns',
  'o4o/conditional'
];