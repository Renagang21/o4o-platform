// WO-O4O-GLYCOPHARM-BUSINESS-DISCUSSION-BOARD-SEPARATION-V1
//
// 사업 의견 작성 (/business/forum/write) — 사업 논의 전용 글쓰기 진입.
//   일반 포럼 글쓰기(/forum/write, createForumPost → POST /forum/posts)를 사용하지 않는다.
//   사업 논의 글이 일반 포럼에 등록·노출되면 안 되므로, 일반 포럼 작성 경로와 완전히 분리한다.
//   전용 게시판(별도 저장·목록)은 forum API 가 category/board 지정을 지원하지 않아 백엔드 분리가 필요 →
//   본 화면은 전용 글쓰기 진입점이자 준비 안내. 실제 작성·저장은 후속 백엔드 WO 에서 연결.
import { Link } from 'react-router-dom';
import { ArrowLeft, PenLine } from 'lucide-react';

const FIELDS = [
  { label: '제목', detail: '논의 주제가 드러나는 제목.' },
  { label: '관련 단계 / 주제', detail: '1차 세미나 · 준비 · HUB 등록 · 초기 테스트 · 한국당뇨협회 사업 등.' },
  { label: '내용', detail: '사업 진행 관련 의견 · 안건.' },
];

export default function BusinessForumWritePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link to="/business/forum" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
            <ArrowLeft className="w-4 h-4" />
            사업 논의 게시판
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 leading-tight">사업 의견 작성</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            혈당관리 약국 사업 추진 과정에서 필요한 의견을 남깁니다. 작성한 글은 일반 커뮤니티 포럼이 아니라
            사업 논의 게시판에 표시됩니다.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        {/* 준비 안내 */}
        <div className="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">사업 논의 전용 글쓰기를 준비하고 있습니다</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                사업 의견은 일반 커뮤니티 포럼과 분리된 전용 게시판에 저장되도록 준비 중입니다. 전용 저장 · 목록이 연결되기
                전까지는 회의 또는 운영자 채널로 의견을 전달해 주세요.
              </p>
            </div>
          </div>
        </div>

        {/* 작성 예정 항목 */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-6">
          <p className="font-semibold text-slate-800 mb-3">작성 예정 항목</p>
          <ul className="space-y-2.5">
            {FIELDS.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400" />
                <span>
                  <span className="font-medium text-slate-800">{f.label}</span> — {f.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            작성한 글은 일반 포럼(/forum)에 노출되지 않습니다. 사업 논의 게시판에서만 확인됩니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/business/forum"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            사업 논의 게시판으로
          </Link>
          <Link
            to="/business"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            사업 허브로
          </Link>
        </div>
      </div>
    </div>
  );
}
