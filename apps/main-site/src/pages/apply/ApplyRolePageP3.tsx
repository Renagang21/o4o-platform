/**
 * P3: ApplyRolePage - Individual Role Application Form
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { cookieAuthClient } from '@o4o/auth-client';
import { useToast } from '@/hooks/useToast';

const ROLE_INFO: Record<string, { name: string; description: string }> = {
  supplier: { name: 'Supplier', description: 'Supply products to sellers' },
  seller: { name: 'Seller', description: 'Sell products to customers' },
  partner: { name: 'Partner', description: 'Promote and earn commissions' },
};

export const ApplyRolePageP3: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    businessName: '',
    businessNumber: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [pendingApp, setPendingApp] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, [role]);

  const checkStatus = async () => {
    try {
      // Override baseURL to avoid /api/v1/api/v2 duplication
      const response = await cookieAuthClient.api.get('/api/v2/roles/applications/my', {
        baseURL: 'https://api.neture.co.kr'
      });
      const apps = response.data.applications || [];
      const pending = apps.find((a: any) => a.role === role && a.status === 'pending');
      setPendingApp(pending);
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Override baseURL to avoid /api/v1/api/v2 duplication
      await cookieAuthClient.api.post('/api/v2/roles/apply', {
        role,
        ...formData,
      }, {
        baseURL: 'https://api.neture.co.kr'
      });

      toast.success('Application submitted successfully!');
      navigate('/apply');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit application';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!role || !ROLE_INFO[role]) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4">
          <p className="text-red-600">Invalid role</p>
          <Link to="/apply" className="text-blue-600 hover:underline">
            Back to applications
          </Link>
        </div>
      </Layout>
    );
  }

  if (checkingStatus) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </Layout>
    );
  }

  if (hasRole(role)) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-green-900 mb-2">Already Approved</h2>
            <p className="text-green-700 mb-4">
              You already have the {ROLE_INFO[role].name} role.
            </p>
            <Link
              to={`/workspace/${role}`}
              className="inline-block bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
            >
              Go to {ROLE_INFO[role].name} Workspace
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (pendingApp) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-900 mb-2">Application Pending</h2>
            <p className="text-yellow-700 mb-4">
              Your {ROLE_INFO[role].name} application is under review.
            </p>
            <div className="text-sm text-yellow-600">
              Applied: {new Date(pendingApp.appliedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Apply for {ROLE_INFO[role].name}
        </h1>
        <p className="text-gray-600 mb-8">{ROLE_INFO[role].description}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Number *
            </label>
            <input
              type="text"
              required
              value={formData.businessNumber}
              onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
            <Link
              to="/apply"
              className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ApplyRolePageP3;
