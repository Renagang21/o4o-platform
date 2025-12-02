/**
 * Seller Application Shortcode
 *
 * Alias for RoleApplyForm with role="seller" pre-set.
 *
 * Usage: [seller_application]
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import RoleApplyForm from './RoleApplyForm';

interface SellerApplicationShortcodeProps {
  attributes?: Record<string, any>;
}

export const SellerApplicationShortcode: React.FC<SellerApplicationShortcodeProps> = ({
  attributes = {},
}) => {
  return <RoleApplyForm attributes={{ ...attributes, role: 'seller' }} />;
};

/**
 * Seller Application Shortcode Definition
 */
export const sellerApplicationShortcodes: ShortcodeDefinition[] = [
  {
    name: 'seller_application',
    component: SellerApplicationShortcode,
    description: 'Seller role application form',
    attributes: [],
  },
];

export default SellerApplicationShortcode;
