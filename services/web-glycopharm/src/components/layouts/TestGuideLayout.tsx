/**
 * TestGuideLayout - 테스트 가이드 공통 레이아웃
 * WO-TEST-GUIDE-UI-LAYOUT-V1 기준
 */

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TestGuideLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

// 테스트 의견 포럼 URL - Neture의 test-feedback 포럼으로 연결 (플랫폼 통합)
const FORUM_URL = 'https://neture.co.kr/forum/test-feedback';

export default function TestGuideLayout({ children, title, subtitle }: TestGuideLayoutProps) {
  const location = useLocation();
  const isManualPage = location.pathname.includes('/manual/');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 테스트 환경 배너 */}
      <div className="bg-amber-100 border-b border-amber-300 py-2 px-4 flex items-center justify-center gap-2">
        <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs font-bold">TEST</span>
        <span className="text-sm text-amber-800">현재 이 서비스는 테스트 환경입니다</span>
      </div>

      {/* 헤더 영역 */}
      <header className="text-center py-8 px-6">
        <h1 className="text-2xl font-bold text-slate-800">{title || '테스트 가이드'}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-2">{subtitle}</p>}
      </header>

      {/* 본문 콘텐츠 */}
      <main className="flex-1 px-6 pb-6 max-w-3xl w-full mx-auto">
        {children}
      </main>

      {/* 하단 고정 영역 */}
      <footer className="py-6 px-6 border-t bg-white flex flex-col items-center gap-3">
        <a
          href={FORUM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
        >
          테스트 의견 남기기
        </a>
        {isManualPage && (
          <Link to="/test-guide" className="text-sm text-slate-500 hover:text-slate-700">
            테스트 가이드로 돌아가기
          </Link>
        )}
      </footer>
    </div>
  );
}
