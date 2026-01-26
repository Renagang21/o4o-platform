/**
 * TestCenterPage - 서비스 테스트 & 개선 참여 센터
 *
 * Work Order: WO-TEST-CENTER-SEPARATION-V1
 *
 * 기존 HomePage 하단에 있던 테스트 관련 섹션을 별도 페이지로 분리
 * 테스트 중 홈으로 이동하지 않고도 바로 접근 가능
 */

import { NavLink } from 'react-router-dom';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import TestImprovementSection from '@/components/home/TestImprovementSection';

export default function TestCenterPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NavLink
                to="/"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">홈으로</span>
              </NavLink>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">테스트 센터</h1>
                  <p className="text-sm text-slate-500">서비스 테스트 & 개선 참여</p>
                </div>
              </div>
            </div>
            {/* 운영형 알파 배지 */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              <span className="text-xs text-white/90">운영형 알파 · v0.8.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <TestImprovementSection
        config={{
          serviceName: 'GlycoPharm',
          serviceDescription: '혈당관리 전문 B2B 플랫폼',
          primaryColor: '#22c55e',
        }}
      />

      {/* Quick Links Footer */}
      <div className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://neture.co.kr/supplier-ops/forum/test-feedback"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              테스트 포럼 바로가기 →
            </a>
            <span className="hidden sm:inline text-slate-300">|</span>
            <a
              href="https://neture.co.kr/supplier-ops/forum/service-update"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              서비스 업데이트 보기 →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
