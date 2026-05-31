// WO-O4O-GLYCOPHARM-BLOODCARE-BUSINESS-STATUS-PAGE-V1
//
// 혈당관리 약국 사업 추진 현황 — 초기 사업 참여자(운영자/공급자/약국 경영자/협력기관)가
// 사전 준비 → 초기 오픈 → 사업 확장 흐름을 확인하고 사업 논의 게시판으로 진입하는 허브.
//
// 1차 구현 범위: 초기 화면 구성 + 라우팅 + 게시판 진입 영역.
//   - 운영자 편집(CMS화), 실제 사업 전용 게시판/포럼 세부 권한, 세부 페이지 편집은 후속 작업으로 분리.
//   - 게시판 섹션은 기존 GlycoPharm 포럼 경로(/forum, /forum/write)로 연결한다.
import { Link } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  MessageSquare,
  PenLine,
  Rocket,
  TrendingUp,
  Store,
  ShoppingBag,
  FileBarChart,
  Users,
  Truck,
  Building2,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const STAGES = [
  {
    icon: ClipboardList,
    title: '사전 준비',
    desc: '가입자를 받기 전 서비스, 상품, 콘텐츠, 약관, 테스트 환경을 준비하는 단계',
    active: true,
  },
  {
    icon: Rocket,
    title: '초기 오픈',
    desc: '약국 경영자에게 서비스를 알리고 가입과 테스트 참여를 유도하는 단계',
    active: false,
  },
  {
    icon: TrendingUp,
    title: '사업 확장',
    desc: '가입자 기반을 바탕으로 이벤트 오퍼, 무재고 판매, 혈당관리 지원약국 사업으로 확대하는 단계',
    active: false,
  },
];

const BOARD_CATEGORIES = [
  '공지사항',
  '사업 준비',
  '제품·공급자',
  '콘텐츠·홍보',
  '약관·정책',
  '질문·의견',
];

const BUSINESS_ITEMS = [
  { icon: Activity, title: '무료혈당기 사업', desc: '무료혈당기 보급을 통한 약국 기반 혈당관리 서비스 구성' },
  { icon: Store, title: '혈당관리 지원약국', desc: '혈당관리 지원약국 참여 약국 운영 모델' },
  { icon: ShoppingBag, title: 'B2B 제품 및 이벤트 오퍼', desc: 'B2B 전자상거래 제품 등록 및 이벤트 오퍼 제안' },
  { icon: FileBarChart, title: '설문조사 및 초기 참여 사업', desc: '설문조사 기반 초기 참여자 모집 및 의견 수렴' },
];

const PARTICIPANTS = [
  { icon: Users, title: '운영자', desc: '자료 등록·콘텐츠 구성·검수·매장 지원·운영 수익 모델 구축' },
  { icon: Truck, title: '공급자', desc: '제품 공급·B2B 등록·이벤트 오퍼 제안' },
  { icon: Building2, title: '약국 경영자', desc: '서비스 가입·테스트 참여·매장 실행 자산 활용' },
  { icon: HeartHandshake, title: '협력기관·도우미', desc: '사업 준비 지원·초기 홍보·참여자 안내' },
];

const NEXT_CHECKLIST = [
  '무료혈당기 서비스 구성 범위',
  '무료혈당기 CI 및 약국 부착물 제작 범위',
  'B2B 전자상거래 등록 제품',
  '이용약관',
  '개인정보처리방침',
  '무료혈당기 사업 참여 안내',
  '혈당관리 지원약국 참여 약관',
  '테스트 약국 아이디 구성',
  '초기 홍보 및 가입자 모집 방식',
];

export default function BloodCareBusinessStatusPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            현재 단계: 사전 준비
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4">
            혈당관리 약국 사업 추진 현황
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-3xl">
            GlycoPharm 혈당관리 약국 사업의 준비 상황, 오픈 계획, 참여 안내, 논의 내용을 함께 확인하는 공간입니다.
            운영자, 공급자, 약국 경영자, 협력기관, 내부 도우미는 이 페이지에서 현재 사업 단계와 준비 항목을 확인하고
            필요한 의견을 남길 수 있습니다.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <a
              href="#prep-checklist"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              사전 준비 항목 보기
            </a>
            <a
              href="#discussion-board"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              사업 논의 게시판 보기
            </a>
            <Link
              to="/forum/write"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <PenLine className="w-4 h-4" />
              새 의견 작성
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* 2. 사업 진행 단계 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1">사업 진행 단계</h2>
          <p className="text-sm text-slate-500 mb-6">사전 준비 → 초기 오픈 → 사업 확장 순서로 진행됩니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.title}
                  className={`relative rounded-xl p-6 border shadow-sm ${
                    stage.active ? 'bg-white border-primary-200 ring-1 ring-primary-100' : 'bg-white border-slate-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                      stage.active ? 'bg-primary-100' : 'bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${stage.active ? 'text-primary-600' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800">{stage.title}</h3>
                    {stage.active && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                        진행 중
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{stage.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. 사업 논의 게시판 */}
        <section id="discussion-board" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-800 mb-1">사업 논의 게시판</h2>
          <p className="text-sm text-slate-500 mb-6">
            사업 준비와 운영에 관한 의견을 자유롭게 나누는 공간입니다. 아래 버튼으로 전체 게시판을 보거나 새 의견을 남길 수 있습니다.
          </p>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">사업 논의 게시판</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      준비 단계 의견·질문·제안을 함께 정리합니다.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
                  <Link
                    to="/forum/posts"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    전체 게시판 보기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/forum/write"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <PenLine className="w-4 h-4" />
                    새 의견 작성
                  </Link>
                </div>
              </div>
            </div>

            {/* 최근 논의 영역 — 실제 포럼 글 연동은 후속 작업으로 분리. 현재는 안내 placeholder. */}
            <div className="p-6 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-3">최근 논의</p>
              <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-500">
                  아직 표시할 논의가 없습니다. 전체 게시판에서 진행 중인 글을 확인하거나 새 의견을 남겨주세요.
                </p>
              </div>
            </div>

            {/* 카테고리 안내 */}
            <div className="p-6">
              <p className="text-sm font-medium text-slate-700 mb-3">카테고리 안내</p>
              <div className="flex flex-wrap gap-2">
                {BOARD_CATEGORIES.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. 주요 사업 항목 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">주요 사업 항목</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {BUSINESS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-accent-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. 참여자별 확인 사항 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-6">참여자별 확인 사항</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PARTICIPANTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-1">{p.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. 다음 확인 사항 */}
        <section id="prep-checklist" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-800 mb-1">다음 확인 사항</h2>
          <p className="text-sm text-slate-500 mb-6">사전 준비 단계에서 함께 점검할 항목입니다.</p>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
            {NEXT_CHECKLIST.map((item) => (
              <div key={item} className="flex items-center gap-3 px-6 py-4">
                <CheckCircle2 className="w-5 h-5 text-slate-300 flex-shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
