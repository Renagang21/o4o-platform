/**
 * SearchBar Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const SearchBarSchema: ComponentDefinition = {
  type: 'SearchBar',
  label: 'Search Bar',
  category: 'cms',
  icon: '🔍',
  description: 'Site search input',
  allowsChildren: false,
  defaultProps: {
    placeholder: 'Search...',
    buttonText: 'Search',
    style: 'default',
    showButton: true,
    width: 'auto',
    buttonColor: '#3b82f6',
  },
  inspectorConfig: [
    {
      name: 'placeholder',
      label: 'Placeholder',
      type: 'text',
      defaultValue: 'Search...',
      placeholder: 'Search...',
    },
    {
      name: 'buttonText',
      label: 'Button Text',
      type: 'text',
      defaultValue: 'Search',
      placeholder: 'Search',
    },
    {
      name: 'style',
      label: 'Style',
      type: 'select',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'pill', label: 'Pill (Rounded)' },
        { value: 'minimal', label: 'Minimal (Underline)' },
      ],
      defaultValue: 'default',
    },
    {
      name: 'showButton',
      label: 'Show Button',
      type: 'boolean',
      defaultValue: true,
      helpText: 'Hide button for icon-only search',
    },
    {
      name: 'width',
      label: 'Width',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto (Centered)' },
        { value: 'full', label: 'Full Width' },
      ],
      defaultValue: 'auto',
    },
    {
      name: 'buttonColor',
      label: 'Button Color',
      type: 'color',
      defaultValue: '#3b82f6',
    },
  ],
};
