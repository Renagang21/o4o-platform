/**
 * ImageCaption Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const ImageCaptionSchema: ComponentDefinition = {
  type: 'ImageCaption',
  label: 'Image + Caption',
  category: 'marketing',
  icon: '🖼️',
  description: 'Image with caption text',
  allowsChildren: false,
  defaultProps: {
    src: 'https://via.placeholder.com/800x600',
    alt: 'Image',
    caption: 'Image caption goes here',
    captionAlign: 'center',
    width: 'full',
    rounded: false,
  },
  inspectorConfig: [
    {
      name: 'src',
      label: 'Image URL',
      type: 'text',
      required: true,
      placeholder: 'https://...',
    },
    {
      name: 'alt',
      label: 'Alt Text',
      type: 'text',
      required: true,
      placeholder: 'Describe the image',
    },
    {
      name: 'caption',
      label: 'Caption',
      type: 'textarea',
      placeholder: 'Image caption',
      rows: 2,
    },
    {
      name: 'captionAlign',
      label: 'Caption Alignment',
      type: 'select',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
      defaultValue: 'center',
    },
    {
      name: 'width',
      label: 'Width',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto' },
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
        { value: 'full', label: 'Full Width' },
      ],
      defaultValue: 'full',
    },
    {
      name: 'rounded',
      label: 'Rounded Corners',
      type: 'boolean',
      defaultValue: false,
    },
  ],
};
