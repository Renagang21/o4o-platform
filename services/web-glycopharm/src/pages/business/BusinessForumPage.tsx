// WO-O4O-GLYCOPHARM-BUSINESS-DISCUSSION-BOARD-SEPARATION-V1
//
// 혈당관리 약국 사업 논의 게시판 (/business/forum) — 일반 포럼에서 분리.
//   문제 정정: 기존엔 "전체 게시판 보기"(→/forum/posts)·"새 의견 작성"(→/forum/write)이 일반 포럼으로 연결되어,
//   사업 논의 글이 일반 포럼에 등록·노출될 수 있었다. 이를 차단한다.
//   - 일반 포럼 진입 버튼 제거. 사업 의견 작성은 전용 경로 /business/forum/write 로만.
//   - 전용 게시판(별도 저장·목록·일반포럼 미노출)은 forum API 가 category/board 지정을 지원하지 않아
//     백엔드 분리가 필요 → 후속 WO. 본 WO 는 구조 오류 차단 + 전용 글쓰기 진입(준비 안내)까지.
import { Link } from 'react-router-dom';
import { MessageSquare, PenLine, ArrowLeft, ArrowRight, Activity, PackageOpen, ClipboardList } from 'lucide-react';

// 사업 추진 스케줄과 정렬된 논의 주제
const TOPICS = [
  '1차 사전 설명 세미나',
  '공급자 · 제품 · 콘텐츠 준비',
  '약국 HUB 등록',
  '초기 약국 테스트',
  '2차 참여자 세미나',
  '전문 매체 홍보',
  '한국당뇨협회와 함께 하는 사업 진행',
  '후속 사업 도입',
  '이벤트 오퍼',
  '유통참여형 펀딩 기반 제품 개발 아이디어',
];

const RELATED = [
  { icon: ArrowLeft, label: '사업 진행 허브', to: '/business' },
  { icon: Activity, label: '혈당관리 약국 사업 추진 현황', to: '/business/bloodcare' },
  { icon: ClipboardList, label: '사전 준비', to: '/business/preparation' },
  { icon: PackageOpen, label: '제품 등록 및 공급자 협의 준비', to: '/business/products' },
];

export default function BusinessForumPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link to="/business" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
            <ArrowLeft className="w-4 h-4" />
            사업 진행 허브
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">혈당관리 약국 사업 논의 게시판</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            GlycoPharm 혈당관리 약국 사업의 준비와 진행 과정에서 필요한 의견을 남기고 확인하는 공간입니다.
            공급업체 · 운영자 · 초기 참여 약국 · 한국당뇨협회 등 사업 참여자가 제품 · 콘텐츠 · 세미나 · 초기 테스트 ·
            홍보 · 외부 협력 관련 의견을 남길 수 있습니다.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed max-w-3xl mt-2">
            일반 커뮤니티 포럼과 분리된 사업 진행 논의 공간이며, 사업 의견은 이곳에서 별도로 남기고 확인합니다.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Link
              to="/business/forum/write"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <PenLine className="w-4 h-4" />
              사업 의견 작성
            </Link>
            <Link
              to="/business"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              사업 허브로 돌아가기
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 이 공간의 역할 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">이 공간의 역할</h2>
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  혈당관리 약국 사업은 공급업체 · 운영자 · 초기 참여 약국 · 한국당뇨협회가 함께 준비하는 사업입니다.
                  모든 내용을 회의로만 정리하기 어렵기 때문에, 진행 중인 안건과 의견을 이 공간에서 별도로 남기고 확인합니다.
                </p>
                <p className="text-sm text-slate-500 leading-relaxed mt-3">
                  사업 논의는 일반 커뮤니티 포럼과 분리되어, 사업 진행 관련 의견만 모입니다. 확정된 내용은 이후 사업 추진 현황,
                  사전 준비, 제품 등록 및 공급자 협의 페이지에 반영할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 논의할 수 있는 주제 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">논의할 수 있는 주제</h2>
          <p className="text-sm text-slate-500 mb-6">사업 추진 단계와 맞춰 다룰 수 있는 주제입니다.</p>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <span key={topic} className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-4">
              유통참여형 펀딩 기반 당뇨 관련 제품 개발은 아이디어 수준으로 논의할 수 있습니다. 실제 유통참여형 펀딩 실행은 Neture가 담당합니다.
            </p>
          </div>
        </section>

        {/* 4. 관련 사업 페이지 연결 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">관련 사업 페이지</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RELATED.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-center justify-between gap-3 rounded-xl p-5 bg-white border border-slate-100 shadow-sm hover:border-primary-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-semibold text-slate-800">{link.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
