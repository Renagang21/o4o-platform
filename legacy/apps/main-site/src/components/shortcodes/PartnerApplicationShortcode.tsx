/**
 * Partner Application Shortcode
 *
 * Alias for RoleApplyForm with role="partner" pre-set.
 *
 * Usage: [partner_application]
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import RoleApplyForm from './RoleApplyForm';

interface PartnerApplicationShortcodeProps {
  attributes?: Record<string, any>;
}

export const PartnerApplicationShortcode: React.FC<PartnerApplicationShortcodeProps> = ({
  attributes = {},
}) => {
  return <RoleApplyForm attributes={{ ...attributes, role: 'partner' }} />;
};

/**
 * Partner Application Shortcode Definition
 */
export const partnerApplicationShortcodes: ShortcodeDefinition[] = [
  {
    name: 'partner_application',
    component: PartnerApplicationShortcode,
    description: 'Partner role application form',
    attributes: [],
  },
];

export default PartnerApplicationShortcode;
