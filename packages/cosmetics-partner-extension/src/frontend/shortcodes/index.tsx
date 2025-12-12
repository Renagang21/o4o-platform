/**
 * Cosmetics Partner Extension Shortcodes
 *
 * 파트너 확장 기능 숏코드 정의
 */

import React from 'react';
import type { ShortcodeDefinition, ShortcodeProps } from '@o4o/shortcodes';

import { PartnerDashboard } from '../pages/PartnerDashboard';
import { PartnerLinksPage } from '../pages/PartnerLinksPage';
import { PartnerRoutinesPage } from '../pages/PartnerRoutinesPage';
import { PartnerEarningsPage } from '../pages/PartnerEarningsPage';

export const shortcodes: ShortcodeDefinition[] = [
  {
    name: 'cosmetics-partner-dashboard',
    component: ({ attributes }: ShortcodeProps) => (
      <PartnerDashboard partnerId={attributes.partnerId as string} />
    ),
    description: 'Partner Dashboard - overview of partner performance',
    attributes: {
      partnerId: {
        type: 'string',
        required: false,
      },
    },
  },
  {
    name: 'cosmetics-partner-links',
    component: ({ attributes }: ShortcodeProps) => (
      <PartnerLinksPage partnerId={attributes.partnerId as string} />
    ),
    description: 'Partner Links management page',
    attributes: {
      partnerId: {
        type: 'string',
        required: false,
      },
    },
  },
  {
    name: 'cosmetics-partner-routines',
    component: ({ attributes }: ShortcodeProps) => (
      <PartnerRoutinesPage partnerId={attributes.partnerId as string} />
    ),
    description: 'Partner Routines management page',
    attributes: {
      partnerId: {
        type: 'string',
        required: false,
      },
    },
  },
  {
    name: 'cosmetics-partner-earnings',
    component: ({ attributes }: ShortcodeProps) => (
      <PartnerEarningsPage partnerId={attributes.partnerId as string} />
    ),
    description: 'Partner Earnings dashboard',
    attributes: {
      partnerId: {
        type: 'string',
        required: false,
      },
    },
  },
];

export default shortcodes;
