/**
 * P3: ApplyLandingPage - Role Application Overview
 *
 * Shows available roles and application status for each
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { cookieAuthClient } from '@o4o/auth-client';
import { Building2, Store, Users, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface RoleApplication {
  id: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

const ROLE_CARDS = [
  {
    id: 'supplier',
    name: 'Supplier',
    icon: Building2,
    description: 'Supply products to sellers',
    color: 'blue',
  },
  {
    id: 'seller',
    name: 'Seller',
    icon: Store,
    description: 'Sell products to customers',
    color: 'green',
  },
  {
    id: 'partner',
    name: 'Partner',
    icon: Users,
    description: 'Promote and earn commissions',
    color: 'purple',
  },
];

export const ApplyLandingPageP3: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      // Override baseURL to avoid /api/v1/api/v2 duplication
      const response = await cookieAuthClient.api.get('/api/v2/roles/applications/my', {
        baseURL: 'https://api.neture.co.kr'
      });
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleStatus = (roleId: string) => {
    if (hasRole(roleId)) {
      return { type: 'approved', label: 'Active' };
    }

    const app = applications.find(a => a.role === roleId);
    if (app?.status === 'pending') {
      return { type: 'pending', label: 'Pending Review' };
    }

    return { type: 'none', label: 'Apply Now' };
  };

  const handleRoleClick = (roleId: string) => {
    const status = getRoleStatus(roleId);

    if (status.type === 'approved') {
      navigate(`/workspace/${roleId}`);
    } else {
      navigate(`/apply/${roleId}`);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Business Roles
            </h1>
            <p className="text-lg text-gray-600">
              Apply for business roles to expand your capabilities
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ROLE_CARDS.map((role) => {
                const status = getRoleStatus(role.id);
                const Icon = role.icon;

                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleClick(role.id)}
                    className={`bg-white rounded-lg shadow-md p-8 text-left hover:shadow-lg transition-shadow border-2 ${
                      status.type === 'approved'
                        ? `border-${role.color}-500`
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-${role.color}-100`}>
                        <Icon className={`w-8 h-8 text-${role.color}-600`} />
                      </div>
                      {status.type === 'approved' && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      {status.type === 'pending' && (
                        <Clock className="w-6 h-6 text-yellow-600" />
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {role.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{role.description}</p>

                    <div className={`text-sm font-medium ${
                      status.type === 'approved' ? 'text-green-600' :
                      status.type === 'pending' ? 'text-yellow-600' :
                      `text-${role.color}-600`
                    }`}>
                      {status.label} →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ApplyLandingPageP3;
