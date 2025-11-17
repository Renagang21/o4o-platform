/**
 * P2: AccountPage - Customer Workspace
 *
 * Placeholder page for customer (consumer) workspace.
 * This will later be enhanced with shortcode support for:
 * - [account_dashboard] - Account overview
 * - [order_history] - Order history
 * - [profile_settings] - Profile management
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { ShoppingBag, User, Settings, Package } from 'lucide-react';

/**
 * AccountPage Component
 *
 * P2: Customer workspace entry point
 * - Shows account overview and quick links
 * - Will support shortcode-based content customization
 */
export const AccountPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
            <p className="mt-2 text-gray-600">
              Welcome back, {user?.name || 'Customer'}!
            </p>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Orders */}
            <Link
              to="/store/products"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Shop</h3>
                  <p className="text-sm text-gray-600">Browse products</p>
                </div>
              </div>
            </Link>

            {/* Orders */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Orders</h3>
                  <p className="text-sm text-gray-600">View order history</p>
                </div>
              </div>
            </div>

            {/* Profile */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-600">Manage your info</p>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-600">Account preferences</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="text-center py-12 text-gray-500">
                <p>No recent activity</p>
                <p className="text-sm mt-2">
                  Start shopping to see your order history and updates here
                </p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              P2: Account Page (Placeholder)
            </h3>
            <p className="text-blue-700 text-sm">
              This is a placeholder for the customer workspace. In P3, this page will support
              shortcode-based content customization for account overview, order history, and
              profile management.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AccountPage;
