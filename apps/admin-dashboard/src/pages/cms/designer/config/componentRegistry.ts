/**
 * Visual View Designer - Component Registry
 *
 * Defines all available components for the designer
 */

import { ComponentDefinition } from '../types/designer.types';

export const COMPONENT_REGISTRY: ComponentDefinition[] = [
  // Layout Components
  {
    type: 'Section',
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

  // Basic Components
  {
    type: 'Text',
    label: 'Text',
    category: 'Basic',
    icon: '📝',
    defaultProps: {
      content: 'Edit this text',
      className: 'text-base',
    },
    propSchema: [
      {
        key: 'content',
        label: 'Content',
        type: 'string',
        defaultValue: 'Edit this text',
      },
      {
        key: 'className',
        label: 'CSS Classes',
        type: 'string',
        defaultValue: 'text-base',
      },
    ],
  },
  {
    type: 'Heading',
    label: 'Heading',
    category: 'Basic',
    icon: '📰',
    defaultProps: {
      level: 2,
      content: 'Heading',
      className: 'text-2xl font-bold',
    },
    propSchema: [
      {
        key: 'content',
        label: 'Content',
        type: 'string',
        defaultValue: 'Heading',
      },
      {
        key: 'level',
        label: 'Level',
        type: 'select',
        options: [
          { value: '1', label: 'H1' },
          { value: '2', label: 'H2' },
          { value: '3', label: 'H3' },
          { value: '4', label: 'H4' },
        ],
        defaultValue: 2,
      },
      {
        key: 'className',
        label: 'CSS Classes',
        type: 'string',
        defaultValue: 'text-2xl font-bold',
      },
    ],
  },
  {
    type: 'Button',
    label: 'Button',
    category: 'Basic',
    icon: '🔘',
    defaultProps: {
      text: 'Click me',
      href: '#',
      variant: 'primary',
      className: 'px-6 py-2 bg-blue-600 text-white rounded',
    },
    propSchema: [
      {
        key: 'text',
        label: 'Button Text',
        type: 'string',
        defaultValue: 'Click me',
      },
      {
        key: 'href',
        label: 'Link URL',
        type: 'string',
        defaultValue: '#',
      },
      {
        key: 'variant',
        label: 'Variant',
        type: 'select',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'outline', label: 'Outline' },
        ],
        defaultValue: 'primary',
      },
    ],
  },
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

  // Media Components
  {
    type: 'Hero',
    label: 'Hero Section',
    category: 'Media',
    icon: '🎯',
    defaultProps: {
      title: 'Welcome to Our Site',
      subtitle: 'Build amazing experiences',
      backgroundImage: '',
      className: 'py-20 text-center',
    },
    propSchema: [
      {
        key: 'title',
        label: 'Title',
        type: 'string',
        defaultValue: 'Welcome to Our Site',
      },
      {
        key: 'subtitle',
        label: 'Subtitle',
        type: 'string',
        defaultValue: 'Build amazing experiences',
      },
      {
        key: 'backgroundImage',
        label: 'Background Image URL',
        type: 'string',
        defaultValue: '',
      },
    ],
  },

  // CMS Components
  {
    type: 'CPTList',
    label: 'CPT List',
    category: 'CMS',
    icon: '📋',
    defaultProps: {
      postType: '',
      limit: 10,
      className: 'grid grid-cols-3 gap-4',
    },
    propSchema: [
      {
        key: 'postType',
        label: 'Post Type Slug',
        type: 'string',
        defaultValue: '',
        placeholder: 'product',
      },
      {
        key: 'limit',
        label: 'Items to Show',
        type: 'number',
        defaultValue: 10,
      },
    ],
  },

  // Marketing Components
  {
    type: 'FeatureGrid',
    label: 'Feature Grid',
    category: 'Marketing',
    icon: '⭐',
    defaultProps: {
      title: 'Our Features',
      features: [],
      columns: 3,
    },
    propSchema: [
      {
        key: 'title',
        label: 'Section Title',
        type: 'string',
        defaultValue: 'Our Features',
      },
      {
        key: 'columns',
        label: 'Columns',
        type: 'select',
        options: [
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ],
        defaultValue: 3,
      },
    ],
  },
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
