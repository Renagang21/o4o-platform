/**
 * Content Overview (Shell)
 *
 * WO-O4O-OPERATOR-NAV-CONTENT-SHELL-V1
 *
 * ⚠️ SHELL 상태
 * - 이 페이지는 기능을 제공하지 않습니다
 * - Content Core와 연결되지 않았습니다
 * - UI 기준 고정 목적으로만 존재합니다
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 * @see docs/platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md
 */

import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContentOverviewPage() {
  const subMenus = [
    {
      id: 'assets',
      label: 'Assets',
      description: '콘텐츠 자산 관리 (동영상, 이미지, 문서, 블록)',
      path: '/content/assets',
    },
    {
      id: 'collections',
      label: 'Collections',
      description: '콘텐츠 컬렉션 및 그룹 관리',
      path: '/content/collections',
    },
    {
      id: 'policies',
      label: 'Policies',
      description: '콘텐츠 접근 정책 및 권한 관리',
      path: '/content/policies',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: '콘텐츠 사용 현황 및 분석',
      path: '/content/analytics',
    },
  ];

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Content</h1>
        </div>
        <p className="text-gray-500">
          콘텐츠 단일 진실 원천 (Single Source of Truth)
        </p>
      </div>

      {/* Shell Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-amber-400 rounded-full mt-2" />
          <div>
            <p className="text-amber-800 font-medium">준비 중</p>
            <p className="text-amber-700 text-sm mt-1">
              이 영역은 Content Core 기준에 따라 확장될 예정입니다.
              현재는 네비게이션 구조만 정의된 상태입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Sub Menu Cards */}
      <div className="space-y-3">
        {subMenus.map((menu) => (
          <Link
            key={menu.id}
            to={menu.path}
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{menu.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{menu.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Reference */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          참조: docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
        </p>
      </div>
    </div>
  );
}
