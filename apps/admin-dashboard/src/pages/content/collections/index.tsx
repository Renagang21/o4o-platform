/**
 * Content Collections - Placeholder
 *
 * WO-O4O-CONTENT-COLLECTIONS-READONLY-LIST-V1
 * WO-O4O-FINAL-MOCK-REMOVAL-DB-CONNECTION-V1
 *
 * ⚠️ 기능 미구현 상태
 * - Collection 기능은 아직 DB에 구현되지 않았습니다
 * - 빈 상태(Empty State) 표시
 * - Mock 데이터 없음
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import { Layers, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  ContentStatus,
  ContentOwnerType,
} from '@o4o-apps/content-core';

export default function ContentCollectionsPage() {
  return (
    <div className="p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/content"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Content
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-8 h-8 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Content / Collections</h1>
        </div>
        <p className="text-gray-500">
          콘텐츠 컬렉션 및 그룹 관리 (Asset 묶음)
        </p>
      </div>

      {/* Feature Not Implemented Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium">기능 미구현</p>
            <p className="text-amber-700 text-sm mt-1">
              Collection 기능은 아직 데이터베이스에 구현되지 않았습니다.
              이 기능은 추후 개발 예정입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-gray-600">컬렉션이 없습니다</p>
          <p className="text-sm mt-2">
            Collection 기능이 구현되면 여기에 컬렉션 목록이 표시됩니다.
          </p>
        </div>
      </div>

      {/* Collection 개념 설명 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Collection 개념</h4>
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <span className="font-medium">Collection</span>은 여러 Asset(동영상, 이미지, 문서, 블록)을
            논리적으로 묶어 관리하는 단위입니다.
          </p>
          <p>
            예: "약국 기본 안내 세트"는 안내 영상, 배너 이미지, 설명 문서 등을 하나의 묶음으로 관리합니다.
          </p>
        </div>
      </div>

      {/* Content Core Info */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Content Core 타입 (예정)</h4>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">ContentStatus:</span>
            <span className="ml-1">{Object.values(ContentStatus).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentOwnerType:</span>
            <span className="ml-1">{Object.values(ContentOwnerType).join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Reference */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Work Order: WO-O4O-CONTENT-COLLECTIONS-READONLY-LIST-V1, WO-O4O-FINAL-MOCK-REMOVAL-DB-CONNECTION-V1 |
          참조: docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
        </p>
      </div>
    </div>
  );
}
