/**
 * CatalogImportDashboardPage — 카탈로그 임포트 대시보드
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { useNavigate } from 'react-router-dom';

export default function CatalogImportDashboardPage() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'CSV Import',
      description: '범용 CSV 파일로 상품 일괄 등록',
      path: '/operator/catalog-import/csv',
      icon: '📄',
    },
    {
      title: 'Import History',
      description: '전체 Import 작업 이력 조회',
      path: '/operator/catalog-import/history',
      icon: '📋',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">카탈로그 임포트</h1>
      <p className="text-gray-500 mb-8">
        외부 상품 데이터를 O4O 카탈로그로 가져옵니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="text-left p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="text-3xl mb-3">{card.icon}</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h2>
            <p className="text-sm text-gray-500">{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
