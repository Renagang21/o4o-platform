/**
 * P4: Role Applications Admin Shortcode
 *
 * Displays pending role applications for admin review.
 * Shows quick approve/reject actions inline.
 *
 * Usage: [role_applications_admin]
 *
 * Note: This shortcode should only be used on admin pages.
 * It will show an error if the current user is not an administrator.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cookieAuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Eye, User } from 'lucide-react';

interface Application {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  businessName?: string;
  businessNumber?: string;
  note?: string;
  appliedAt: string;
}

const roleNames: Record<string, string> = {
  supplier: 'Supplier',
  seller: 'Seller',
  partner: 'Partner',
};

const roleBadgeColors: Record<string, string> = {
  supplier: 'bg-blue-100 text-blue-800 border-blue-200',
  seller: 'bg-green-100 text-green-800 border-green-200',
  partner: 'bg-purple-100 text-purple-800 border-purple-200',
};

export const RoleApplicationsAdmin: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (hasRole('admin') || hasRole('administrator')) {
      loadApplications();
    } else {
      setLoading(false);
      setError('Access denied: Administrator role required');
    }
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cookieAuthClient.api.get('/api/v2/admin/roles/applications', {
        params: { status: 'pending' }
      });
      setApplications(response.data.applications || []);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      setError(err.response?.data?.message || 'Failed to load pending applications');
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, userName: string, role: string) => {
    if (!confirm(`Approve ${userName}'s ${roleNames[role] || role} application?`)) {
      return;
    }

    try {
      setProcessingId(id);
      await cookieAuthClient.api.post(`/api/v2/admin/roles/applications/${id}/approve`);
      toast.success(`${userName}'s application approved successfully!`);
      await loadApplications();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to approve application';
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, userName: string, role: string) => {
    const reason = prompt(`Rejection reason for ${userName}'s ${roleNames[role] || role} application (optional):`);
    if (reason === null) {
      return; // User cancelled
    }

    try {
      setProcessingId(id);
      await cookieAuthClient.api.post(`/api/v2/admin/roles/applications/${id}/reject`, {
        reason: reason || undefined
      });
      toast.success(`${userName}'s application rejected`);
      await loadApplications();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reject application';
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  // Access denied
  if (!hasRole('admin') && !hasRole('administrator')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 mb-1">Access Denied</h3>
            <p className="text-red-700 text-sm">
              Administrator role is required to view this content.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading pending applications...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Applications</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600 mb-4">
            There are no pending role applications to review.
          </p>
          <Link
            to="/dashboard/admin/role-applications"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            View All Applications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pending Role Applications</h2>
            <p className="text-gray-600 text-sm mt-1">
              {applications.length} application{applications.length !== 1 ? 's' : ''} waiting for review
            </p>
          </div>
          <Link
            to="/dashboard/admin/role-applications"
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            View All
          </Link>
        </div>
      </div>

      {/* Applications List */}
      <div className="divide-y divide-gray-200">
        {applications.map((app) => {
          const isProcessing = processingId === app.id;

          return (
            <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-6">
                {/* Left: Application details */}
                <div className="flex-1 min-w-0">
                  {/* User info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {app.user.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadgeColors[app.role] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          {roleNames[app.role] || app.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{app.user.email}</p>
                    </div>
                  </div>

                  {/* Business info */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 block mb-0.5">Business Name</span>
                        <span className="font-medium text-gray-900">{app.businessName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Registration Number</span>
                        <span className="font-medium text-gray-900">{app.businessNumber || 'N/A'}</span>
                      </div>
                    </div>
                    {app.note && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-500 text-xs block mb-1">Additional Note</span>
                        <p className="text-sm text-gray-700">{app.note}</p>
                      </div>
                    )}
                  </div>

                  {/* Applied date */}
                  <p className="text-xs text-gray-500">
                    Applied: {new Date(app.appliedAt).toLocaleDateString()} at {new Date(app.appliedAt).toLocaleTimeString()}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(app.id, app.user.name, app.role)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(app.id, app.user.name, app.role)}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    <XCircle className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
        <Link
          to="/dashboard/admin/role-applications"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          View all applications (approved & rejected) →
        </Link>
      </div>
    </div>
  );
};

export default RoleApplicationsAdmin;
