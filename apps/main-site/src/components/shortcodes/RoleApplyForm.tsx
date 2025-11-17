/**
 * P4: Role Apply Form Shortcode
 *
 * Inline role application form with role-specific customization.
 * Checks if user already has the role or pending application.
 *
 * Usage: [role_apply_form role="supplier"]
 *        [role_apply_form role="seller"]
 *        [role_apply_form role="partner"]
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cookieAuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { CheckCircle, Clock, AlertCircle, Building2 } from 'lucide-react';

interface RoleApplyFormProps {
  attributes?: {
    role?: string;
  };
}

const roleInfo: Record<string, { name: string; description: string; icon: string }> = {
  supplier: {
    name: 'Supplier',
    description: 'Supply products to sellers on our platform',
    icon: '🏭',
  },
  seller: {
    name: 'Seller',
    description: 'Sell products directly to customers',
    icon: '🏪',
  },
  partner: {
    name: 'Partner',
    description: 'Promote products and earn commissions',
    icon: '🤝',
  },
};

export const RoleApplyForm: React.FC<RoleApplyFormProps> = ({ attributes }) => {
  const role = attributes?.role || '';
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [formData, setFormData] = useState({
    businessName: '',
    businessNumber: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [pendingApp, setPendingApp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      checkStatus();
    } else {
      setCheckingStatus(false);
      setError('Role parameter is required');
    }
  }, [role]);

  const checkStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await cookieAuthClient.api.get('/api/v2/roles/applications/my');
      const apps = response.data.applications || [];
      const pending = apps.find((a: any) => a.role === role && a.status === 'pending');
      setPendingApp(pending);
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await cookieAuthClient.api.post('/api/v2/roles/apply', {
        role,
        ...formData,
      });

      toast.success(`${roleInfo[role]?.name || role} application submitted successfully!`);

      // Reset form and refresh status
      setFormData({ businessName: '', businessNumber: '', note: '' });
      await checkStatus();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit application';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Invalid role
  if (!role || !roleInfo[role]) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Invalid Role</h3>
            <p className="text-red-700 text-sm">
              {role ? `Role "${role}" is not valid.` : 'Role parameter is required.'}
              {' '}Valid roles are: supplier, seller, partner.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading status check
  if (checkingStatus) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Checking application status...</span>
        </div>
      </div>
    );
  }

  const info = roleInfo[role];

  // Already has role
  if (hasRole(role)) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-green-900 mb-2">
              You're Already a {info.name}!
            </h3>
            <p className="text-green-700 mb-4">
              Your {info.name} role is active. You can access your workspace now.
            </p>
            <Link
              to={`/workspace/${role}`}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Go to {info.name} Workspace →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pending application
  if (pendingApp) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-yellow-900 mb-2">
              Application Under Review
            </h3>
            <p className="text-yellow-700 mb-3">
              Your {info.name} application is being reviewed by our team.
            </p>
            <div className="text-sm text-yellow-600 space-y-1">
              <p><strong>Business:</strong> {pendingApp.businessName || 'N/A'}</p>
              <p><strong>Applied:</strong> {new Date(pendingApp.appliedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex items-center gap-4 mb-2">
          <div className="text-4xl">{info.icon}</div>
          <div>
            <h2 className="text-2xl font-bold">Apply for {info.name}</h2>
            <p className="text-blue-100 mt-1">{info.description}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your business name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Business Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.businessNumber}
              onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="XXX-XX-XXXXX"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Enter your official business registration number
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Information
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder="Tell us more about your business (optional)"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
          <Link
            to="/apply"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold text-center transition-colors"
          >
            View All Roles
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          By submitting this application, you agree to provide accurate business information.
          Our team will review your application within 1-2 business days.
        </p>
      </form>
    </div>
  );
};

export default RoleApplyForm;
