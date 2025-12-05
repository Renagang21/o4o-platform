/**
 * TeamMember Block Schema
 */

import { ComponentDefinition } from '../../types/designer.types';

export const TeamMemberSchema: ComponentDefinition = {
  type: 'TeamMember',
  label: 'Team Member',
  category: 'marketing',
  icon: '👤',
  description: 'Team member profile card',
  allowsChildren: false,
  defaultProps: {
    name: 'John Doe',
    role: 'CEO & Founder',
    bio: 'Passionate about building great products and leading amazing teams.',
    photo: 'https://via.placeholder.com/300x300',
    linkedin: '',
    twitter: '',
    email: '',
    layout: 'card',
  },
  inspectorConfig: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
    {
      name: 'role',
      label: 'Role',
      type: 'text',
      required: true,
      placeholder: 'CEO & Founder',
    },
    {
      name: 'bio',
      label: 'Bio',
      type: 'textarea',
      placeholder: 'Short bio about the team member',
      rows: 3,
    },
    {
      name: 'photo',
      label: 'Photo URL',
      type: 'text',
      placeholder: 'https://...',
    },
    {
      name: 'linkedin',
      label: 'LinkedIn URL',
      type: 'text',
      placeholder: 'https://linkedin.com/in/...',
    },
    {
      name: 'twitter',
      label: 'Twitter URL',
      type: 'text',
      placeholder: 'https://twitter.com/...',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      placeholder: 'john@example.com',
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'card', label: 'Card' },
        { value: 'minimal', label: 'Minimal' },
      ],
      defaultValue: 'card',
    },
  ],
};
