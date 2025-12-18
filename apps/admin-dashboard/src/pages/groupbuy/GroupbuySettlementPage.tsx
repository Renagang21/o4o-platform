/**
 * Groupbuy Settlement Page - DISABLED
 * Phase 3: UI Integration
 *
 * Work Order 제약: 금액/수수료/정산 정보 UI 노출 절대 금지
 *
 * 정산 기능은 Work Order 제약에 따라 현재 비활성화 상태입니다.
 * 정산은 dropshipping-core를 통해 별도로 처리됩니다.
 */

import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { PermissionGuard } from '@/components/organization/PermissionGuard';

export const GroupbuySettlementPage: FC = () => {
  return (
    <PermissionGuard required={['organization.read']}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/groupbuy"
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">정산 관리</h1>
              <p className="text-sm text-gray-500 mt-1">공동구매 정산 정보</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              정산 기능 준비 중
            </h2>
            <p className="text-gray-500 mb-6">
              공동구매 정산 기능은 dropshipping-core를 통해 처리됩니다.
              자세한 정산 내역은 관리자에게 문의해 주세요.
            </p>
            <Link
              to="/admin/groupbuy"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              캠페인 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default GroupbuySettlementPage;
