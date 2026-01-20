/**
 * TestCenterPage - 서비스 테스트 & 개선 참여 센터
 *
 * Work Order: WO-TEST-CENTER-SEPARATION-V1
 *
 * 기존 HomePage 하단에 있던 테스트 관련 섹션들을 별도 페이지로 분리
 * 테스트 중 홈으로 이동하지 않고도 바로 접근 가능
 *
 * 구성:
 * 1. 테스트 안내 (HomeTestIntroSection)
 * 2. 테스트 의견 게시판 (HomeTestFeedbackSection)
 * 3. 서비스 업데이트 공지 (HomeServiceUpdateSection)
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { HomeTestIntroSection } from '../components/home/HomeTestIntroSection';
import { HomeTestFeedbackSection } from '../components/home/HomeTestFeedbackSection';
import { HomeServiceUpdateSection } from '../components/home/HomeServiceUpdateSection';

export default function TestCenterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">홈으로</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">테스트 센터</h1>
                  <p className="text-sm text-gray-500">서비스 테스트 & 개선 참여</p>
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
      <HomeTestIntroSection />
      <HomeTestFeedbackSection />
      <HomeServiceUpdateSection />

      {/* Quick Links Footer */}
      <div className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/test-guide"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              테스트 가이드 보기 →
            </Link>
            <span className="hidden sm:inline text-gray-300">|</span>
            <Link
              to="/forum/test-feedback"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              테스트 포럼 바로가기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
