// WO-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1
//
// /service-guide — KPA Society 서비스 안내 (공개 페이지).
//   상단 메뉴 "서비스 안내" 단일 진입점.
//   KPA Society 정체성 = 약사·약대생 커뮤니티 서비스. 경영지원 기능은 권한 기반 부가 기능이므로
//   공개 안내에서 상세 기능(매장 운영 허브 / 이벤트 오퍼 / POP / QR / 사이니지 등)을 나열하지 않고
//   "경영지원 기능 안내" 1개 카드로만 간단히 언급한다.
//   약사회 지부/분회 운영 서비스처럼 설명하지 않는다.
//   문의 폼 신규 구현은 범위 외 — 기존 /contact 경로 연결. 푸터 정비는 후속 작업으로 분리.
//   (Layout 이 KpaGlobalHeader + Footer 제공 — 본 페이지는 본문 콘텐츠만 렌더)
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Users,
  GraduationCap,
  Store,
  MessagesSquare,
  Share2,
  Megaphone,
  MessageSquare,
} from 'lucide-react';

// ─── 이용 대상 (카드 3개) ───────────────────────────────────────────────────
const AUDIENCES: { icon: typeof Users; title: string; desc: string }[] = [
  {
    icon: Users,
    title: '약사',
    desc: '전문 정보, 서비스 소식, 약국 현장 관련 내용을 확인하고 커뮤니티에서 의견을 나눌 수 있습니다.',
  },
  {
    icon: GraduationCap,
    title: '약대생',
    desc: '약업계 정보와 커뮤니티 소식을 확인하고, 약사 커뮤니티 안에서 다양한 정보를 접할 수 있습니다.',
  },
  {
    icon: Store,
    title: '약국 경영자',
    desc: '권한에 따라 약국 운영에 도움이 되는 일부 경영지원 기능을 이용할 수 있습니다.',
  },
];

// ─── 주요 기능 (카드 4개) ───────────────────────────────────────────────────
// 커뮤니티 중심. 경영지원은 "안내" 1개 카드로만 — 세부 기능 미나열 (WO §4-7, §7).
const FEATURES: { icon: typeof Users; title: string; desc: string }[] = [
  {
    icon: Users,
    title: '약사·약대생 커뮤니티',
    desc: '약사와 약대생이 정보를 확인하고 의견을 나눌 수 있는 커뮤니티 공간을 제공합니다.',
  },
  {
    icon: Share2,
    title: '정보 공유',
    desc: '전문 정보, 서비스 소식, 약국 현장과 관련된 다양한 내용을 확인할 수 있습니다.',
  },
  {
    icon: MessagesSquare,
    title: '참여와 소통',
    desc: '게시글, 댓글, 공지 등을 통해 커뮤니티 구성원 간 소통을 지원합니다.',
  },
  {
    icon: Megaphone,
    title: '경영지원 기능 안내',
    desc: '약국 경영자에게는 권한에 따라 약국 운영에 도움이 되는 일부 기능을 제공합니다.',
  },
];

// ─── 이용 흐름 (Step 5개) ───────────────────────────────────────────────────
const STEPS: { no: string; title: string }[] = [
  { no: '01', title: '회원가입 또는 로그인' },
  { no: '02', title: '서비스 이용 권한 확인' },
  { no: '03', title: '커뮤니티에서 정보와 소식 확인' },
  { no: '04', title: '게시글과 댓글을 통한 참여와 소통' },
  { no: '05', title: '약국 경영자는 권한에 따라 제공되는 경영지원 기능 활용' },
];

export default function ServiceGuidePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-600 text-white text-sm font-medium mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white/90" />
            서비스 안내
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            약사와 약대생을 위한 커뮤니티 서비스 안내
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            KPA Society는 약사와 약대생이 정보를 나누고 소통할 수 있도록 지원하는 커뮤니티 서비스입니다.
            커뮤니티를 중심으로 전문 정보와 약국 현장 소식을 공유하며, 약국 경영자에게는 권한에 따라
            일부 경영지원 기능도 제공합니다.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Users className="w-4 h-4" />
              커뮤니티 보기
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              문의하기
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 서비스 소개 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">서비스 소개</h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 space-y-3">
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              KPA Society는 약사와 약대생이 함께 참여할 수 있는 커뮤니티 기반 서비스입니다.
              서비스 사용자는 커뮤니티를 통해 전문 정보, 서비스 소식, 약국 현장의 다양한 경험을 확인하고
              의견을 나눌 수 있습니다.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              또한 약국 경영자 권한이 있는 사용자에게는 약국 운영에 도움이 되는 일부 경영지원 기능도
              함께 제공됩니다.
            </p>
          </div>
        </section>

        {/* 3. 이용 대상 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">이용 대상</h2>
          <p className="text-sm text-slate-500 mb-6">약사·약대생을 중심으로 약국 경영자까지 함께 이용할 수 있습니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{a.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{a.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. 주요 기능 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">주요 기능</h2>
          <p className="text-sm text-slate-500 mb-6">커뮤니티를 중심으로 정보 공유와 소통을 지원합니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mt-4">
            약국 경영지원 기능은 권한 기반 부가 기능으로, 이 공개 안내에서는 세부 기능을 나열하지 않습니다.
          </p>
        </section>

        {/* 5. 이용 흐름 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">이용 흐름</h2>
          <p className="text-sm text-slate-500 mb-6">회원가입부터 커뮤니티 참여까지의 기본 흐름입니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {STEPS.map((s) => (
              <div key={s.no} className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <span className="text-xs font-bold text-primary-500">STEP {s.no}</span>
                <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{s.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. 문의 안내 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">문의 안내</h2>
          <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  서비스 이용, 가입, 권한, 커뮤니티 이용, 오류 신고와 관련된 문의는 문의하기를 통해 접수할 수 있습니다.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  문의 수신 경로와 푸터 문의 링크는 후속 푸터 / 문의 정비 작업에서 함께 정리합니다.
                </p>
                <div className="mt-5">
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                    문의하기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
