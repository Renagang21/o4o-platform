/**
 * Breadcrumb Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const BreadcrumbSchema: ComponentDefinition = {
  type: 'Breadcrumb',
  label: 'Breadcrumb',
  category: 'cms',
  icon: '🧭',
  description: 'Breadcrumb navigation showing page hierarchy',
  allowsChildren: false,
  defaultProps: {
    separator: '/',
    showHome: true,
    homeLabel: 'Home',
    textColor: '#6b7280',
    linkColor: '#3b82f6',
  },
  inspectorConfig: [
    {
      name: 'separator',
      label: 'Separator',
      type: 'text',
      defaultValue: '/',
      placeholder: '/',
      helpText: 'Character between breadcrumb items',
    },
    {
      name: 'showHome',
      label: 'Show Home Link',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'homeLabel',
      label: 'Home Label',
      type: 'text',
      defaultValue: 'Home',
      placeholder: 'Home',
    },
    {
      name: 'textColor',
      label: 'Text Color',
      type: 'color',
      defaultValue: '#6b7280',
    },
    {
      name: 'linkColor',
      label: 'Link Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
  ],
};
