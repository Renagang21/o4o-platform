/**
 * Phase 3-1: Profile Completeness Widget
 *
 * Displays profile completeness score (0-100%) and missing fields
 * Helps sellers/suppliers complete their profile for better platform experience
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface MissingField {
  field: string;
  label: string;
  weight: number;
  category: string;
}

interface CompletenessData {
  score: number;
  completedFields: Array<{ field: string; label: string; weight: number; category: string }>;
  missingFields: MissingField[];
  timestamp: string;
}

export const ProfileCompletenessWidget: React.FC = () => {
  const [completeness, setCompleteness] = useState<CompletenessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompleteness();
  }, []);

  const loadCompleteness = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get('/api/user/completeness');

      if (response.data?.success && response.data?.data) {
        setCompleteness(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load profile completeness:', err);
      setError('프로필 완성도 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (error || !completeness) {
    return null; // Hide widget on error
  }

  const { score, missingFields } = completeness;

  // Don't show widget if profile is 100% complete
  if (score === 100) {
    return null;
  }

  // Determine status color and icon
  const getStatusConfig = (score: number) => {
    if (score >= 80) {
      return {
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        progressColor: 'bg-blue-500',
        icon: CheckCircle,
        message: '프로필이 거의 완성되었습니다!'
      };
    } else if (score >= 50) {
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        progressColor: 'bg-yellow-500',
        icon: AlertCircle,
        message: '프로필을 조금 더 완성해주세요.'
      };
    } else {
      return {
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        progressColor: 'bg-red-500',
        icon: XCircle,
        message: '프로필 정보가 부족합니다. 완성해주세요!'
      };
    }
  };

  const statusConfig = getStatusConfig(score);
  const StatusIcon = statusConfig.icon;

  // Get top 3 missing fields by weight
  const topMissingFields = missingFields
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return (
    <div className={`${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg p-6 mb-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
          <h3 className={`text-lg font-semibold ${statusConfig.textColor}`}>
            프로필 완성도: {score}%
          </h3>
        </div>
      </div>

      <p className={`text-sm ${statusConfig.textColor} mb-4`}>
        {statusConfig.message}
      </p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`${statusConfig.progressColor} h-3 rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>

      {/* Missing Fields */}
      {topMissingFields.length > 0 && (
        <div className="space-y-2">
          <p className={`text-sm font-medium ${statusConfig.textColor}`}>
            완성이 필요한 항목:
          </p>
          <ul className="space-y-1">
            {topMissingFields.map((field) => (
              <li key={field.field} className="flex items-center gap-2 text-sm">
                <XCircle className={`w-4 h-4 ${statusConfig.textColor}`} />
                <span className={statusConfig.textColor}>
                  {field.label} ({field.weight}%)
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-gray-300">
            <a
              href="/account/profile"
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${score >= 80
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : score >= 50
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
            >
              프로필 완성하기 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCompletenessWidget;
