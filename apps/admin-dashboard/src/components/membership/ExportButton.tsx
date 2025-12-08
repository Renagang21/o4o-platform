/**
 * Export Button Component for Membership Data
 *
 * Provides Excel export functionality with optional filters
 */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface ExportButtonProps {
  type: 'members' | 'verifications' | 'categories';
  filters?: Record<string, any>;
  label?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  filters = {},
  label,
}) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      // Build query string from filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = `/membership/export/${type}.xlsx${queryString ? `?${queryString}` : ''}`;

      // Fetch Excel file as blob
      const response = await authClient.api.get(url, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      const filename = `${type}_${today}.xlsx`;
      link.setAttribute('download', filename);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Excel 파일이 다운로드되었습니다.');
    } catch (error: any) {
      console.error('Export failed:', error);
      const errorCode = error.response?.data?.code;
      if (errorCode === 'FORBIDDEN') {
        toast.error('권한이 필요합니다.');
      } else {
        toast.error('다운로드에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="w-5 h-5 mr-2" />
      {loading ? '다운로드 중...' : label || 'Excel 다운로드'}
    </button>
  );
};

export default ExportButton;
