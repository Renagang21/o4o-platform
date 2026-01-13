/**
 * TestGuidePage - GlucoseView 테스트 가이드 메인 페이지
 * WO-TEST-GUIDE-UI-LAYOUT-V1 / WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '../../components/layouts/TestGuideLayout';

// 서비스별 설정
const SERVICE_CONFIG = {
  name: 'GlucoseView',
  testPurpose: '약국에서 환자의 연속혈당측정(CGM) 데이터를 관리하고 상담하는 디지털 헬스케어 서비스입니다. 이번 테스트에서는 환자 목록 조회, 혈당 데이터 확인, 인사이트 분석 흐름을 점검합니다.',
  actions: [
    '로그인 화면에서 약사 계정을 선택하고 로그인하세요',
    '환자 목록에서 샘플 환자를 클릭하여 CGM 데이터를 확인해 보세요',
    '화면 구성이나 데이터 표시에 개선점이 있으면 포럼에 남겨주세요',
  ],
  roles: [
    { key: 'pharmacist', label: '약사', description: 'CGM 데이터 관리 및 환자 상담' },
    { key: 'admin', label: '관리자', description: '플랫폼 전체 관리', internal: true },
  ],
};

export default function TestGuidePage() {
  return (
    <TestGuideLayout subtitle="테스트 데이터는 초기화될 수 있습니다">
      {/* 테스트 목적 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">이번 테스트의 목적</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{SERVICE_CONFIG.testPurpose}</p>
      </section>

      {/* 꼭 해주었으면 하는 행동 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">꼭 해주었으면 하는 행동</h2>
        <ol className="space-y-3">
          {SERVICE_CONFIG.actions.map((action, index) => (
            <li key={index} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </span>
              <span className="text-sm text-slate-700">{action}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 테스트 계정 안내 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">테스트 계정 안내</h2>
        <p className="text-sm text-slate-600 mb-2">
          테스트 계정은 <Link to="/" className="text-blue-600 font-medium">로그인 화면</Link>에서 버튼으로 자동 입력됩니다.
        </p>
        <p className="text-sm text-slate-500">
          모든 테스트 계정의 비밀번호: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-sm">TestPassword</code>
        </p>
      </section>

      {/* 역할별 사용자 매뉴얼 */}
      <section className="bg-white rounded-xl p-6 mb-4 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">역할별 사용자 매뉴얼</h2>
        <div className="grid grid-cols-2 gap-3">
          {SERVICE_CONFIG.roles.map((role) => (
            <Link
              key={role.key}
              to={`/test-guide/manual/${role.key}`}
              className={`relative flex flex-col p-4 rounded-lg border transition-colors ${
                role.internal
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-semibold text-slate-800 mb-1">{role.label}</span>
              <span className="text-xs text-slate-500">{role.description}</span>
              {role.internal && (
                <span className="absolute top-2 right-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold">
                  내부용
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </TestGuideLayout>
  );
}
