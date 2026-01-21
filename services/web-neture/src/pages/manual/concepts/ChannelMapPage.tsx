/**
 * ChannelMapPage - o4o 채널 구조 도식
 *
 * Work Order: WO-O4O-PUBLIC-SITE-PHASE1-BUILD-V1
 *
 * 구성:
 * - 상단 한 줄 문구
 * - 중앙 이미지 영역 (placeholder)
 * - 하단 한 줄 문구
 *
 * 원칙:
 * - 설명 텍스트 없음
 * - 도식은 Gemini로 생성 예정
 */

import { Link } from 'react-router-dom';

export default function ChannelMapPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-600">
            사업자가 운영하는 채널
          </p>
        </div>
      </div>

      {/* Diagram Area */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl aspect-[16/9] flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400 text-lg">채널 도식</p>
            <p className="text-slate-300 text-sm mt-2">(이미지 삽입 예정)</p>
          </div>
        </div>
      </div>

      {/* Footer message */}
      <div className="bg-slate-50 border-t border-slate-200 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-600">
            각 채널은 사업자가 직접 운영합니다.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border-t border-slate-200 pt-8">
          <div className="flex justify-between text-sm">
            <Link to="/manual/concepts" className="text-slate-500 hover:text-slate-700">
              개념 문서로
            </Link>
            <Link to="/examples" className="text-primary-600 hover:text-primary-700">
              예제 서비스 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
