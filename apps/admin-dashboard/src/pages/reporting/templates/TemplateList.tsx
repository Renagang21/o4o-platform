/**
 * Reporting-Yaksa: Template Management Page
 *
 * Manage annual report templates
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ReportFieldTemplate {
  id: string;
  year: number;
  name: string;
  description?: string;
  fields: any[];
  active: boolean;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

const TemplateList = () => {
  const [templates, setTemplates] = useState<ReportFieldTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useKeyboardShortcuts();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/reporting/templates');

      if (response.data.success) {
        setTemplates(response.data.data || []);
      } else {
        toast.error('템플릿 목록을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load templates:', error);
      // API가 연결되지 않은 경우 기본값
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await authClient.api.patch(`/reporting/templates/${id}/active`, {
        active: !active,
      });

      if (response.data.success) {
        toast.success(active ? '템플릿이 비활성화되었습니다.' : '템플릿이 활성화되었습니다.');
        fetchTemplates();
      } else {
        toast.error('상태 변경에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to toggle template:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleDuplicate = async (id: string) => {
    const targetYear = window.prompt('복제할 연도를 입력하세요 (예: 2026):');
    if (!targetYear) return;

    const year = parseInt(targetYear, 10);
    if (isNaN(year) || year < 2020 || year > 2100) {
      toast.error('유효한 연도를 입력하세요.');
      return;
    }

    try {
      const response = await authClient.api.post(`/reporting/templates/${id}/duplicate`, {
        targetYear: year,
      });

      if (response.data.success) {
        toast.success(`${year}년 템플릿이 생성되었습니다.`);
        fetchTemplates();
      } else {
        toast.error(response.data.error || '복제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to duplicate template:', error);
      toast.error(error.response?.data?.error || '복제에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) return;

    try {
      const response = await authClient.api.delete(`/reporting/templates/${id}`);

      if (response.data.success) {
        toast.success('템플릿이 삭제되었습니다.');
        fetchTemplates();
      } else {
        toast.error(response.data.error || '삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      toast.error(error.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '신상신고', href: '/admin/reporting' },
          { label: '템플릿 관리' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">템플릿 관리</h1>
            <p className="mt-1 text-sm text-gray-600">
              연도별 신상신고 양식 템플릿을 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTemplates}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="새로고침"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => toast.error('템플릿 생성은 아직 구현 중입니다.')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 템플릿
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">로딩 중...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">등록된 템플릿이 없습니다.</p>
            <button
              onClick={() => toast.error('템플릿 생성은 아직 구현 중입니다.')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              첫 템플릿 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  template.active ? 'ring-2 ring-green-500' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.year}년
                    </h3>
                    <p className="text-sm text-gray-600">{template.name}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {template.active ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        활성
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        비활성
                      </>
                    )}
                  </span>
                </div>

                {/* Info */}
                {template.description && (
                  <p className="text-sm text-gray-500 mb-4">{template.description}</p>
                )}

                <div className="text-sm text-gray-500 mb-4 space-y-1">
                  <p>필드: {template.fields?.length || 0}개</p>
                  {template.deadline && (
                    <p>마감일: {new Date(template.deadline).toLocaleDateString('ko-KR')}</p>
                  )}
                  <p>
                    수정일:{' '}
                    {new Date(template.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="다음 연도로 복제"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toast.error('템플릿 편집은 아직 구현 중입니다.')}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="편집"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(template.id, template.active)}
                    className={`px-3 py-1 text-sm rounded ${
                      template.active
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {template.active ? '비활성화' : '활성화'}
                  </button>
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateList;
