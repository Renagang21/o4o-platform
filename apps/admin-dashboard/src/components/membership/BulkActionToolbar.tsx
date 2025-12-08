/**
 * Bulk Action Toolbar for Member Management
 *
 * Provides bulk operations for selected members:
 * - Change category
 * - Toggle verification status
 * - Toggle active status
 */

import React, { useState } from 'react';
import { X, Users, CheckCircle, Power } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface MemberCategory {
  id: string;
  name: string;
  description: string | null;
}

interface BulkActionToolbarProps {
  selectedIds: string[];
  categories: MemberCategory[];
  onSuccess: () => void;
  onClearSelection: () => void;
}

const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedIds,
  categories,
  onSuccess,
  onClearSelection,
}) => {
  const [loading, setLoading] = useState(false);

  const handleBulkCategoryChange = async (categoryId: string) => {
    if (!categoryId || categoryId === '') {
      toast.error('분류를 선택하세요.');
      return;
    }

    if (!confirm(`선택된 ${selectedIds.length}명의 회원 분류를 변경하시겠습니까?`)) {
      return;
    }

    try {
      setLoading(true);
      await authClient.api.post('/membership/members/bulk-update', {
        memberIds: selectedIds,
        categoryId,
      });
      toast.success('분류가 변경되었습니다.');
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      console.error('Bulk category change failed:', error);
      toast.error('분류 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkVerify = async () => {
    if (!confirm(`선택된 ${selectedIds.length}명의 회원을 검증 처리하시겠습니까?`)) {
      return;
    }

    try {
      setLoading(true);
      await authClient.api.post('/membership/members/bulk-update', {
        memberIds: selectedIds,
        isVerified: true,
      });
      toast.success('검증 상태가 변경되었습니다.');
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      console.error('Bulk verify failed:', error);
      toast.error('검증 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkToggleActive = async (isActive: boolean) => {
    const action = isActive ? '활성화' : '비활성화';
    if (!confirm(`선택된 ${selectedIds.length}명의 회원을 ${action}하시겠습니까?`)) {
      return;
    }

    try {
      setLoading(true);
      await authClient.api.post('/membership/members/bulk-update', {
        memberIds: selectedIds,
        isActive,
      });
      toast.success(`${action}되었습니다.`);
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      console.error('Bulk active toggle failed:', error);
      toast.error(`${action}에 실패했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Users className="w-5 h-5" />
            <span className="font-medium">{selectedIds.length}명 선택됨</span>
          </div>

          {/* Category Change Dropdown */}
          <select
            onChange={(e) => handleBulkCategoryChange(e.target.value)}
            disabled={loading}
            className="px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            defaultValue=""
          >
            <option value="">분류 변경...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Verify Button */}
          <button
            onClick={handleBulkVerify}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            검증 처리
          </button>

          {/* Active Toggle Buttons */}
          <button
            onClick={() => handleBulkToggleActive(true)}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Power className="w-4 h-4 mr-2" />
            활성화
          </button>

          <button
            onClick={() => handleBulkToggleActive(false)}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Power className="w-4 h-4 mr-2" />
            비활성화
          </button>
        </div>

        {/* Clear Selection Button */}
        <button
          onClick={onClearSelection}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <X className="w-5 h-5 mr-1" />
          선택 해제
        </button>
      </div>
    </div>
  );
};

export default BulkActionToolbar;
