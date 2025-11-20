/**
 * RoleCard Block Definition
 */

import React from 'react';
import { User } from 'lucide-react';
import { BlockDefinition, BlockComponent } from '../registry/types';
import RoleCardBlock from '@/components/editor/blocks/RoleCardBlock';

export const roleCardBlockDefinition: BlockDefinition = {
  name: 'o4o/role-card',
  title: 'Role Card',
  category: 'widgets',
  icon: <User className="w-5 h-5" />,
  description: '팀원, 역할, 담당자 소개 카드',
  keywords: ['role', 'card', 'team', 'member', 'profile', 'person', '팀원', '역할', '담당자', '프로필'],
  component: RoleCardBlock as unknown as BlockComponent,
  attributes: {
    imageUrl: {
      type: 'string',
      default: '',
    },
    name: {
      type: 'string',
      default: '이름',
    },
    role: {
      type: 'string',
      default: '직책',
    },
    description: {
      type: 'string',
      default: '담당 업무 또는 소개를 입력하세요',
    },
    email: {
      type: 'string',
      default: '',
    },
    linkedin: {
      type: 'string',
      default: '',
    },
    twitter: {
      type: 'string',
      default: '',
    },
    backgroundColor: {
      type: 'string',
      default: '#ffffff',
    },
    borderColor: {
      type: 'string',
      default: '#e5e7eb',
    },
    textColor: {
      type: 'string',
      default: '#111827',
    },
    roleColor: {
      type: 'string',
      default: '#6b7280',
    },
  },
  supports: {
    html: false,
    reusable: true,
  },
};

export default roleCardBlockDefinition;
