/**
 * Visual View Designer - Component Registry
 *
 * Defines all available components for the designer
 */

import { ComponentDefinition } from '../types/designer.types';

// Import new block schemas
import {
  TextSchema,
  HeadingSchema,
  ButtonSchema,
  RichTextSchema,
} from '../blocks/basic';

import {
  SectionSchema,
  ContainerSchema,
  HeroSchema,
} from '../blocks/layout';

import {
  FeatureGridSchema,
  TestimonialSchema,
  TestimonialGridSchema,
  PricingCardSchema,
  PricingGridSchema,
  FAQSchema,
  CTASchema,
  StatsCounterSchema,
  ImageCaptionSchema,
  TeamMemberSchema,
  TimelineSchema,
  StepGuideSchema,
} from '../blocks/marketing';

import {
  CPTListSchema,
  CPTItemSchema,
  CategoryListSchema,
  TagCloudSchema,
  RecentPostsSchema,
  RelatedPostsSchema,
  BreadcrumbSchema,
  PaginationSchema,
  SearchBarSchema,
} from '../blocks/cms';

import {
  DividerSchema,
  SpacerSchema,
  IconTextSchema,
  BadgeSchema,
  QuoteSchema,
  TwoColumnSchema,
  ThreeColumnSchema,
  BulletListSchema,
  CardSchema,
  AccordionSchema,
  TabsSchema,
  ModalSchema,
} from '../blocks/additional';

export const COMPONENT_REGISTRY: ComponentDefinition[] = [
  // New Basic Blocks
  TextSchema,
  HeadingSchema,
  ButtonSchema,
  RichTextSchema,

  // New Layout Blocks
  SectionSchema,
  ContainerSchema,
  HeroSchema,

  // New Marketing Blocks (12 total)
  FeatureGridSchema,
  TestimonialSchema,
  TestimonialGridSchema,
  PricingCardSchema,
  PricingGridSchema,
  FAQSchema,
  CTASchema,
  StatsCounterSchema,
  ImageCaptionSchema,
  TeamMemberSchema,
  TimelineSchema,
  StepGuideSchema,

  // New CMS Blocks (9 total)
  CPTListSchema,
  CPTItemSchema,
  CategoryListSchema,
  TagCloudSchema,
  RecentPostsSchema,
  RelatedPostsSchema,
  BreadcrumbSchema,
  PaginationSchema,
  SearchBarSchema,

  // New Additional Blocks (12 total)
  // Basic/Utility (5)
  DividerSchema,
  SpacerSchema,
  IconTextSchema,
  BadgeSchema,
  QuoteSchema,
  // Layout/Structure (7)
  TwoColumnSchema,
  ThreeColumnSchema,
  BulletListSchema,
  CardSchema,
  AccordionSchema,
  TabsSchema,
  ModalSchema,

  // Legacy Layout Components (keeping for compatibility)
  {
    type: 'Row',
    label: 'Row',
    category: 'Layout',
    icon: '↔️',
    defaultProps: {
      gap: 'gap-4',
      align: 'stretch',
      justify: 'start',
    },
    propSchema: [
      {
        key: 'gap',
        label: 'Gap',
        type: 'select',
        options: [
          { value: 'gap-0', label: 'None' },
          { value: 'gap-2', label: 'Small (0.5rem)' },
          { value: 'gap-4', label: 'Medium (1rem)' },
          { value: 'gap-6', label: 'Large (1.5rem)' },
          { value: 'gap-8', label: 'XL (2rem)' },
        ],
        defaultValue: 'gap-4',
      },
      {
        key: 'align',
        label: 'Align Items',
        type: 'select',
        options: [
          { value: 'start', label: 'Start' },
          { value: 'center', label: 'Center' },
          { value: 'end', label: 'End' },
          { value: 'stretch', label: 'Stretch' },
        ],
        defaultValue: 'stretch',
      },
      {
        key: 'justify',
        label: 'Justify Content',
        type: 'select',
        options: [
          { value: 'start', label: 'Start' },
          { value: 'center', label: 'Center' },
          { value: 'end', label: 'End' },
          { value: 'between', label: 'Space Between' },
          { value: 'around', label: 'Space Around' },
          { value: 'evenly', label: 'Space Evenly' },
        ],
        defaultValue: 'start',
      },
    ],
  },
  {
    type: 'Column',
    label: 'Column',
    category: 'Layout',
    icon: '↕️',
    defaultProps: {
      span: 12,
      spanSm: 12,
      spanMd: 6,
      spanLg: 4,
      offset: 0,
    },
    propSchema: [
      {
        key: 'span',
        label: 'Width (Mobile)',
        type: 'select',
        options: [
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12 (1/4)' },
          { value: '4', label: '4/12 (1/3)' },
          { value: '6', label: '6/12 (1/2)' },
          { value: '8', label: '8/12 (2/3)' },
          { value: '9', label: '9/12 (3/4)' },
          { value: '12', label: '12/12 (Full)' },
        ],
        defaultValue: 12,
        helpText: 'Column width on mobile devices',
      },
      {
        key: 'spanMd',
        label: 'Width (Tablet)',
        type: 'select',
        options: [
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12 (1/4)' },
          { value: '4', label: '4/12 (1/3)' },
          { value: '6', label: '6/12 (1/2)' },
          { value: '8', label: '8/12 (2/3)' },
          { value: '9', label: '9/12 (3/4)' },
          { value: '12', label: '12/12 (Full)' },
        ],
        defaultValue: 6,
        helpText: 'Column width on tablets (768px+)',
      },
      {
        key: 'spanLg',
        label: 'Width (Desktop)',
        type: 'select',
        options: [
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12 (1/4)' },
          { value: '4', label: '4/12 (1/3)' },
          { value: '6', label: '6/12 (1/2)' },
          { value: '8', label: '8/12 (2/3)' },
          { value: '9', label: '9/12 (3/4)' },
          { value: '12', label: '12/12 (Full)' },
        ],
        defaultValue: 4,
        helpText: 'Column width on desktops (1024px+)',
      },
      {
        key: 'offset',
        label: 'Left Offset',
        type: 'select',
        options: [
          { value: '0', label: 'None' },
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12' },
          { value: '4', label: '4/12' },
          { value: '6', label: '6/12' },
        ],
        defaultValue: 0,
        helpText: 'Left margin offset',
      },
    ],
  },

  // Legacy - Remove old Section definition since we have SectionSchema now
  {
    type: 'OldSection',
    label: 'Section',
    category: 'Layout',
    icon: '📦',
    defaultProps: {
      className: 'py-12',
    },
    propSchema: [
      {
        key: 'className',
        label: 'CSS Classes',
        type: 'string',
        defaultValue: 'py-12',
        placeholder: 'py-12 bg-gray-100',
        helpText: 'Tailwind CSS classes',
      },
    ],
  },
  {
    type: 'Row',
    label: 'Row',
    category: 'Layout',
    icon: '↔️',
    defaultProps: {
      gap: 'gap-4',
      align: 'stretch',
      justify: 'start',
    },
    propSchema: [
      {
        key: 'gap',
        label: 'Gap',
        type: 'select',
        options: [
          { value: 'gap-0', label: 'None' },
          { value: 'gap-2', label: 'Small (0.5rem)' },
          { value: 'gap-4', label: 'Medium (1rem)' },
          { value: 'gap-6', label: 'Large (1.5rem)' },
          { value: 'gap-8', label: 'XL (2rem)' },
        ],
        defaultValue: 'gap-4',
      },
      {
        key: 'align',
        label: 'Align Items',
        type: 'select',
        options: [
          { value: 'start', label: 'Start' },
          { value: 'center', label: 'Center' },
          { value: 'end', label: 'End' },
          { value: 'stretch', label: 'Stretch' },
        ],
        defaultValue: 'stretch',
      },
      {
        key: 'justify',
        label: 'Justify Content',
        type: 'select',
        options: [
          { value: 'start', label: 'Start' },
          { value: 'center', label: 'Center' },
          { value: 'end', label: 'End' },
          { value: 'between', label: 'Space Between' },
          { value: 'around', label: 'Space Around' },
          { value: 'evenly', label: 'Space Evenly' },
        ],
        defaultValue: 'start',
      },
    ],
  },
  {
    type: 'Column',
    label: 'Column',
    category: 'Layout',
    icon: '↕️',
    defaultProps: {
      span: 12,
      spanSm: 12,
      spanMd: 6,
      spanLg: 4,
      offset: 0,
    },
    propSchema: [
      {
        key: 'span',
        label: 'Width (Mobile)',
        type: 'select',
        options: [
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12 (1/4)' },
          { value: '4', label: '4/12 (1/3)' },
          { value: '6', label: '6/12 (1/2)' },
          { value: '8', label: '8/12 (2/3)' },
          { value: '9', label: '9/12 (3/4)' },
          { value: '12', label: '12/12 (Full)' },
        ],
        defaultValue: 12,
        helpText: 'Column width on mobile devices',
      },
      {
        key: 'spanMd',
        label: 'Width (Tablet)',
        type: 'select',
        options: [
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12 (1/4)' },
          { value: '4', label: '4/12 (1/3)' },
          { value: '6', label: '6/12 (1/2)' },
          { value: '8', label: '8/12 (2/3)' },
          { value: '9', label: '9/12 (3/4)' },
          { value: '12', label: '12/12 (Full)' },
        ],
        defaultValue: 6,
        helpText: 'Column width on tablets (768px+)',
      },
      {
        key: 'spanLg',
        label: 'Width (Desktop)',
        type: 'select',
        options: [
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12 (1/4)' },
          { value: '4', label: '4/12 (1/3)' },
          { value: '6', label: '6/12 (1/2)' },
          { value: '8', label: '8/12 (2/3)' },
          { value: '9', label: '9/12 (3/4)' },
          { value: '12', label: '12/12 (Full)' },
        ],
        defaultValue: 4,
        helpText: 'Column width on desktops (1024px+)',
      },
      {
        key: 'offset',
        label: 'Left Offset',
        type: 'select',
        options: [
          { value: '0', label: 'None' },
          { value: '1', label: '1/12' },
          { value: '2', label: '2/12' },
          { value: '3', label: '3/12' },
          { value: '4', label: '4/12' },
          { value: '6', label: '6/12' },
        ],
        defaultValue: 0,
        helpText: 'Left margin offset',
      },
    ],
  },

  // Legacy Basic Components (keeping Image for now)
  {
    type: 'Image',
    label: 'Image',
    category: 'Basic',
    icon: '🖼️',
    defaultProps: {
      src: 'https://via.placeholder.com/400x300',
      alt: 'Image',
      className: 'w-full h-auto',
    },
    propSchema: [
      {
        key: 'src',
        label: 'Image URL',
        type: 'string',
        defaultValue: 'https://via.placeholder.com/400x300',
      },
      {
        key: 'alt',
        label: 'Alt Text',
        type: 'string',
        defaultValue: 'Image',
      },
      {
        key: 'className',
        label: 'CSS Classes',
        type: 'string',
        defaultValue: 'w-full h-auto',
      },
    ],
  },

  // Media Components (removed duplicate Hero - using HeroSchema instead)

  // Legacy CMS Components removed - now using new CMS Blocks above
];

/**
 * Get component definition by type
 */
export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return COMPONENT_REGISTRY.find(comp => comp.type === type);
}

/**
 * Get components by category
 */
export function getComponentsByCategory(category: ComponentDefinition['category']): ComponentDefinition[] {
  return COMPONENT_REGISTRY.filter(comp => comp.category === category);
}

// Re-export ComponentDefinition for external use
export type { ComponentDefinition } from '../types/designer.types';
