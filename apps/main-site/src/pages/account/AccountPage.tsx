/**
 * P4: AccountPage - Customer Workspace (Shortcode-Based)
 *
 * Uses ShortcodeRenderer to display customizable account dashboard content.
 * Supports:
 * - [customer_dashboard] - Full account overview with stats, orders, and quick actions
 * - [role_applications_list] - User's role application history (P4)
 */

import React from 'react';
import Layout from '../../components/layout/Layout';
import { ShortcodeRenderer } from '@o4o/shortcodes';

/**
 * AccountPage Component
 *
 * P4: Customer workspace using shortcode-based rendering
 * - Renders [customer_dashboard] shortcode for account overview
 * - Easily extensible with additional shortcodes
 */
export const AccountPage: React.FC = () => {
  // P4: Use ShortcodeRenderer to render the customer dashboard
  // This makes the page content fully customizable via shortcodes
  const content = '[customer_dashboard]';

  return (
    <Layout>
      <ShortcodeRenderer content={content} />
    </Layout>
  );
};

export default AccountPage;
