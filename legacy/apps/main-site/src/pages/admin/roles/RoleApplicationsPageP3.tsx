/**
 * P3: Admin Role Applications Page
 *
 * Admin interface to review and approve/reject role applications
 */

import React, { useState, useEffect } from 'react';
import Layout from '../../../components/layout/Layout';
import { cookieAuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

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
  decidedAt?: string;
  decidedBy?: string;
}

export const RoleApplicationsPageP3: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await cookieAuthClient.api.get('/api/v2/admin/roles/applications', {
        params: { status: statusFilter }
      });
      setApplications(response.data.applications || []);
    } catch (error) {
      toast.error('Failed to load applications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this application?')) return;

    try {
      await cookieAuthClient.api.post(`/api/v2/admin/roles/applications/${id}/approve`);
      toast.success('Application approved');
      loadApplications();
    } catch (error) {
      toast.error('Failed to approve application');
      console.error(error);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;

    try {
      await cookieAuthClient.api.post(`/api/v2/admin/roles/applications/${id}/reject`, {
        reason
      });
      toast.success('Application rejected');
      loadApplications();
    } catch (error) {
      toast.error('Failed to reject application');
      console.error(error);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Role Applications
          </h1>

          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-md font-medium ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No {statusFilter} applications</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Applied
                  </th>
                  {statusFilter === 'pending' && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{app.user.name}</div>
                      <div className="text-sm text-gray-500">{app.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {app.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{app.businessName}</div>
                      <div className="text-sm text-gray-500">{app.businessNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    {statusFilter === 'pending' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleApprove(app.id)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          <CheckCircle className="w-5 h-5 inline" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <XCircle className="w-5 h-5 inline" /> Reject
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RoleApplicationsPageP3;
