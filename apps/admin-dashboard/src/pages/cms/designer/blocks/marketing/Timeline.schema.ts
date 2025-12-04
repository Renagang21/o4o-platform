/**
 * Timeline Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TimelineSchema: ComponentDefinition = {
  type: 'Timeline',
  label: 'Timeline Item',
  category: 'marketing',
  icon: '📅',
  description: 'Timeline event with date and description',
  allowsChildren: false,
  defaultProps: {
    date: '2024',
    title: 'Milestone Title',
    description: 'Description of this milestone',
    icon: '🎯',
    accentColor: '#3b82f6',
    side: 'left',
  },
  inspectorConfig: [
    {
      name: 'date',
      label: 'Date',
      type: 'text',
      required: true,
      placeholder: '2024',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Milestone Title',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe this milestone',
      rows: 3,
    },
    {
      name: 'icon',
      label: 'Icon (Emoji)',
      type: 'text',
      placeholder: '🎯',
    },
    {
      name: 'accentColor',
      label: 'Accent Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
    {
      name: 'side',
      label: 'Side',
      type: 'select',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ],
      defaultValue: 'left',
    },
  ],
};
