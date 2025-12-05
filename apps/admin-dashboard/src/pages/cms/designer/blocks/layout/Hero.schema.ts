/**
 * Hero Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const HeroSchema: ComponentDefinition = {
  type: 'Hero',
  category: 'layout',
  label: 'Hero',
  icon: 'Sparkles',
  description: 'Hero section with title, subtitle, and CTA button',

  defaultProps: {
    title: 'Welcome to Our Site',
    subtitle: 'Discover amazing features and services',
    ctaText: 'Get Started',
    ctaHref: '#',
    bgColor: '#1a202c',
    textColor: '#ffffff',
    align: 'center',
  },

  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'textarea',
    },
    {
      name: 'ctaText',
      label: 'CTA Text',
      type: 'text',
    },
    {
      name: 'ctaHref',
      label: 'CTA Link',
      type: 'text',
    },
    {
      name: 'bgColor',
      label: 'Background Color',
      type: 'color',
    },
    {
      name: 'textColor',
      label: 'Text Color',
      type: 'color',
    },
    {
      name: 'align',
      label: 'Alignment',
      type: 'select',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
    },
  ],

  allowsChildren: false,
  maxChildren: 0,
};
