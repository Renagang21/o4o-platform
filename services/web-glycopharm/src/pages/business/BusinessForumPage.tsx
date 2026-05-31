// WO-O4O-GLYCOPHARM-BUSINESS-FORUM-LINK-PAGE-V1
//
// 혈당관리 약국 사업 논의 게시판 진입 페이지 (/business/forum) — IR-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-IA-AUDIT-V1 Phase 2.
//   - 전용 게시판/DB/API/카테고리 신설 아님. 기존 GlycoPharm 포럼(/forum/posts, /forum/write) 재사용 안내 페이지.
//   - 사업 논의 목적·주제를 먼저 설명한 뒤 기존 포럼으로 자연스럽게 연결.
//   - Market Trial 은 논의 주제/아이디어 수준만 — 실행은 Neture, GlycoPharm 내부 구현 금지.
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  PenLine,
  ArrowLeft,
  ArrowRight,
  Activity,
  PackageOpen,
  ClipboardList,
} from 'lucide-react';

// 논의할 수 있는 주제 (12)
const TOPICS = [
  '무료혈당기 사업',
  '혈당관리 지원약국',
  '제품 등록 및 공급자 협의',
  '사전 준비',
  '약국 HUB 콘텐츠',
  '콘텐츠·홍보',
  '약관·정책',
  '설문조사 및 초기 참여 사업',
  '이벤트 오퍼',
  'Market Trial 기반 제품 개발 아이디어',
  '약국 모집과 테스트 참여',
  '협력기관 논의',
];

// 제목 prefix 예시
const TITLE_PREFIXES = ['[무료혈당기]', '[제품등록]', '[약관]', '[홍보]', '[Market Trial]'];

// 관련 사업 페이지
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
            GlycoPharm 혈당관리 약국 사업의 준비와 진행 과정에서 필요한 의견을 남기고 확인하는 진입 페이지입니다.
            운영자, 공급자, 약국 경영자, 협력기관, 내부 도우미는 이곳에서 논의 주제를 확인한 뒤 기존 포럼을 통해 의견을 남길 수 있습니다.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Link
              to="/forum/posts"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              전체 게시판 보기
            </Link>
            <Link
              to="/forum/write"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <PenLine className="w-4 h-4" />
              새 의견 작성
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
                  혈당관리 약국 사업은 운영자, 공급자, 약국 경영자, 협력기관, 내부 도우미가 함께 준비해야 하는 사업입니다.
                  모든 내용을 회의로만 정리하기 어렵기 때문에, 진행 중인 안건과 의견을 포럼에 남기고 확인할 수 있는 구조가 필요합니다.
                </p>
                <p className="text-sm text-slate-500 leading-relaxed mt-3">
                  이 페이지는 새로운 게시판을 만드는 것이 아니라, 기존 GlycoPharm 포럼을 사업 논의 공간으로 활용하기 위한 안내 페이지입니다.
                  확정된 내용은 이후 사업 추진 현황, 사전 준비, 제품 등록 및 공급자 협의 페이지에 반영할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 논의할 수 있는 주제 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">논의할 수 있는 주제</h2>
          <p className="text-sm text-slate-500 mb-6">사업 준비·진행 과정에서 다룰 수 있는 주제입니다.</p>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <span key={topic} className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-4">
              Market Trial 기반 당뇨 관련 제품 개발은 아이디어 수준으로 논의할 수 있습니다. 실제 Market Trial 실행은 Neture가 담당합니다.
            </p>
          </div>
        </section>

        {/* 4. 포럼 이용 안내 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">포럼 이용 안내</h2>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <ul className="space-y-2">
              {[
                '사업 논의 글은 기존 GlycoPharm 포럼에 작성합니다.',
                '글 제목에는 논의 주제가 드러나도록 작성하는 것이 좋습니다.',
                '중요 공지나 확정된 내용은 운영자가 사업 페이지에 반영할 수 있습니다.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-2">제목 prefix 예시</p>
              <div className="flex flex-wrap gap-2">
                {TITLE_PREFIXES.map((p) => (
                  <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 text-xs font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5. 주요 이동 버튼 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">바로 가기</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/forum/posts"
              className="group flex items-center justify-between gap-3 rounded-xl p-5 bg-white border border-primary-200 shadow-sm hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-semibold text-slate-800">전체 게시판 보기</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
            </Link>
            <Link
              to="/forum/write"
              className="group flex items-center justify-between gap-3 rounded-xl p-5 bg-white border border-slate-100 shadow-sm hover:border-primary-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <PenLine className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">새 의견 작성</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
            </Link>
          </div>
        </section>

        {/* 6. 관련 사업 페이지 연결 */}
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
