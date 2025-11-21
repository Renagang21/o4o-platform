/**
 * P4: Role Applications List Shortcode
 *
 * Displays the current user's role application history.
 * Shows application status, dates, and links to role pages.
 *
 * Usage: [role_applications_list]
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cookieAuthClient } from '@o4o/auth-client';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RoleApplication {
  id: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  businessName?: string;
  businessNumber?: string;
  note?: string;
  appliedAt: string;
  decidedAt?: string;
}

const roleNames: Record<string, string> = {
  supplier: 'Supplier',
  seller: 'Seller',
  partner: 'Partner',
};

const roleDescriptions: Record<string, string> = {
  supplier: 'Supply products to sellers',
  seller: 'Sell products to customers',
  partner: 'Promote and earn commissions',
};

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'yellow',
    label: 'Pending Review',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    textClass: 'text-yellow-800',
    iconClass: 'text-yellow-600',
  },
  approved: {
    icon: CheckCircle,
    color: 'green',
    label: 'Approved',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    textClass: 'text-green-800',
    iconClass: 'text-green-600',
  },
  rejected: {
    icon: XCircle,
    color: 'red',
    label: 'Rejected',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-800',
    iconClass: 'text-red-600',
  },
};

export const RoleApplicationsList: React.FC = () => {
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      // Override baseURL to avoid /api/v1/api/v2 duplication
      const response = await cookieAuthClient.api.get('/api/v2/roles/applications/my', {
        baseURL: 'https://api.neture.co.kr'
      });
      setApplications(response.data.applications || []);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      setError(err.response?.data?.message || 'Failed to load your applications');
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading applications...</span>
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Role Applications
          </h3>
          <p className="text-gray-600 mb-6">
            You haven't applied for any business roles yet.
          </p>
          <Link
            to="/apply"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply for a Role
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Role Applications</h2>
        <p className="text-gray-600 text-sm mt-1">
          Track your business role applications
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {applications.map((app) => {
          const status = statusConfig[app.status];
          const StatusIcon = status.icon;

          return (
            <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                {/* Left: Role info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {roleNames[app.role] || app.role}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bgClass} ${status.textClass} border ${status.borderClass}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">
                    {roleDescriptions[app.role] || ''}
                  </p>

                  {app.businessName && (
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">Business:</span> {app.businessName}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    {app.decidedAt && (
                      <span>Decided: {new Date(app.decidedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col items-end gap-2">
                  {app.status === 'approved' && (
                    <Link
                      to={`/workspace/${app.role}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Go to Workspace →
                    </Link>
                  )}
                  {app.status === 'pending' && (
                    <div className="text-xs text-gray-500 text-right">
                      Your application is being reviewed
                    </div>
                  )}
                  {app.status === 'rejected' && (
                    <Link
                      to={`/apply/${app.role}`}
                      className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Reapply
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply for more roles */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <Link
          to="/apply"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          Apply for another role →
        </Link>
      </div>
    </div>
  );
};

export default RoleApplicationsList;
