/**
 * Supplier Application Shortcode
 *
 * Alias for RoleApplyForm with role="supplier" pre-set.
 *
 * Usage: [supplier_application]
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import RoleApplyForm from './RoleApplyForm';

interface SupplierApplicationShortcodeProps {
  attributes?: Record<string, any>;
}

export const SupplierApplicationShortcode: React.FC<SupplierApplicationShortcodeProps> = ({
  attributes = {},
}) => {
  return <RoleApplyForm attributes={{ ...attributes, role: 'supplier' }} />;
};

/**
 * Supplier Application Shortcode Definition
 */
export const supplierApplicationShortcodes: ShortcodeDefinition[] = [
  {
    name: 'supplier_application',
    component: SupplierApplicationShortcode,
    description: 'Supplier role application form',
    attributes: [],
  },
];

export default SupplierApplicationShortcode;
