/**
 * RoleNotAvailablePage - 해당 역할의 대시보드가 이 서비스에 없음을 안내
 * 공급자/파트너는 Neture에서 관리
 */

import { Link } from 'react-router-dom';

interface RoleNotAvailablePageProps {
  role: 'supplier' | 'partner';
}

const ROLE_INFO = {
  supplier: {
    label: '공급자',
    icon: '📦',
    description: '의료기기 및 건강용품 공급 관리',
  },
  partner: {
    label: '파트너',
    icon: '🤝',
    description: '파트너십 및 연계 서비스 관리',
  },
};

export default function RoleNotAvailablePage({ role }: RoleNotAvailablePageProps) {
  const info = ROLE_INFO[role];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-12 max-w-lg w-full text-center">
        <div className="text-6xl mb-4">{info.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{info.label} 대시보드</h1>
        <p className="text-gray-600 mb-8">{info.description}</p>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-gray-800 mb-1">안내</p>
              <p className="text-sm text-gray-600">
                {info.label} 역할의 업무 공간은 <strong>Neture 플랫폼</strong>에서 통합 관리됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <a
            href="https://neture.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block py-3 px-6 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Neture로 이동
          </a>
          <Link
            to="/"
            className="inline-block py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>

        <p className="text-sm text-gray-500">
          문의사항이 있으시면 <Link to="/contact" className="text-emerald-600 hover:underline">고객센터</Link>로 연락해 주세요.
        </p>
      </div>
    </div>
  );
}
