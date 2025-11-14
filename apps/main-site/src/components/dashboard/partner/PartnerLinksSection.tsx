/**
 * Partner Links Section
 * Can be used in dashboard (summary) or full-page mode
 */

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link2, Plus } from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';
import type { SectionMode } from '../supplier/SupplierProductsSection';

export interface PartnerLinksSectionProps {
  mode?: SectionMode;
}

export const PartnerLinksSection: React.FC<PartnerLinksSectionProps> = ({
  mode = 'dashboard'
}) => {
  // TODO: Fetch actual links data in Phase 3
  const links: any[] = [];

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">링크 관리</h2>
          <RouterLink
            to="/dashboard/partner/links"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </RouterLink>
        </div>

        {links.length === 0 ? (
          <EmptyState
            icon={<Link2 className="w-12 h-12 text-gray-400" />}
            title="생성된 링크가 없습니다"
            description="추천 링크를 생성하여 수익을 창출하세요."
          />
        ) : (
          <div className="space-y-3">
            {/* TODO: Links list preview (recent 5) */}
            <p className="text-sm text-gray-500">링크 목록 요약 (Phase 3에서 구현)</p>
          </div>
        )}
      </div>
    );
  }

  // Full-page mode
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">추천 링크 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            제품별 추천 링크를 생성하고 성과를 추적합니다.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          링크 생성
        </button>
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="w-16 h-16 text-gray-400" />}
          title="생성된 링크가 없습니다"
          description="제품을 선택하고 추천 링크를 생성하여 커미션을 받으세요."
          action={
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              첫 링크 생성하기
            </button>
          }
        />
      ) : (
        <div>
          {/* TODO: Full links list with performance tracking, UTM parameters */}
          <p className="text-gray-500">링크 목록 및 성과 추적 (Phase 3에서 구현)</p>
        </div>
      )}
    </div>
  );
};

export default PartnerLinksSection;
