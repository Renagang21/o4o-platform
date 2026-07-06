/**
 * ProductDbMaintenancePage — 데이터 정비 (준비중)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * V1 준비중 화면. write/apply/승격 기능은 후속 WO 에서 제공.
 */

import { Settings } from 'lucide-react';

export default function ProductDbMaintenancePage() {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg py-16 flex flex-col items-center text-center">
      <Settings className="w-10 h-10 text-gray-300 mb-4" />
      <h2 className="text-lg font-semibold text-gray-700 mb-2">데이터 정비 (준비중)</h2>
      <p className="text-sm text-gray-500 max-w-lg">
        데이터 정비 기능은 전체 주요 데이터 등록이 완료된 뒤 별도 WO에서 진행합니다.
        현재는 상품 관리 콘솔 기반을 완성하는 단계이며, 승격/삭제/병합/bulk 작업은 제공하지 않습니다.
      </p>
      <ul className="mt-4 text-xs text-gray-400 space-y-1">
        <li>WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-MAINTENANCE-ACTIONS-V1</li>
        <li>WO-O4O-ADMIN-PRODUCT-DESCRIPTION-AUTHORING-WORKSPACE-V1</li>
      </ul>
    </div>
  );
}
