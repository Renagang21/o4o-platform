/**
 * Tabs Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TabsSchema: ComponentDefinition = {
  type: 'Tabs',
  label: 'Tabs',
  category: 'layout',
  icon: '📑',
  description: 'Tabbed content container',
  allowsChildren: true,
  defaultProps: {
    tabs: [
      { label: 'Tab 1', content: 'Content for tab 1' },
      { label: 'Tab 2', content: 'Content for tab 2' },
      { label: 'Tab 3', content: 'Content for tab 3' },
    ],
    activeColor: '#3b82f6',
  },
  inspectorConfig: [
    {
      name: 'activeColor',
      label: 'Active Tab Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
  ],
};
