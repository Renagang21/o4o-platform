/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1
 *
 * Route: /community
 * 하드코딩 데이터 기반 1차 화면. API 연동 없음.
 *
 * 섹션 순서:
 *  1. Hero (스폰서 포함)
 *  2. Feed (탭 + 정렬 + 리스트)
 *  3. 광고 섹션 (2개 카드)
 *  4. 콘텐츠 미리보기
 *  5. 디지털 사이니지 미리보기
 *  6. 파트너 로고 슬라이드
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  GraduationCap,
  FileText,
  Eye,
  MessageCircle,
  ChevronRight,
  Play,
  ListMusic,
} from 'lucide-react';

// ─── Hardcoded Data ─────────────────────────────────────────

const sponsorItems = [
  {
    id: '1',
    title: '글라이코팜 파트너십 프로그램',
    description: '약국 운영 최적화를 위한 전문 컨설팅 제공',
    link: '/apply',
  },
  {
    id: '2',
    title: '매장 디스플레이 솔루션',
    description: '디지털 사이니지로 매장 환경을 업그레이드하세요',
    link: '/signage',
  },
  {
    id: '3',
    title: '혈당 관리 교육 과정',
    description: '약사를 위한 혈당 관리 전문 교육 프로그램',
    link: '/education',
  },
];

type FeedType = 'post' | 'lecture' | 'content';
type FeedTab = '전체' | '운영 이야기' | '제품 경험' | '마케팅' | '강좌' | '콘텐츠';

interface FeedItem {
  id: string;
  type: FeedType;
  tab: FeedTab;
  title: string;
  author?: string;
  instructor?: string;
  viewCount?: number;
  commentCount?: number;
  participants?: number;
  date: string;
}

const feedItems: FeedItem[] = [
  { id: '1', type: 'post', tab: '운영 이야기', title: '올해 약국 인테리어 리뉴얼 후기 — 고객 동선 변경 효과', author: '김약사', viewCount: 342, commentCount: 28, date: '2026-03-18' },
  { id: '2', type: 'lecture', tab: '강좌', title: '[실전] 혈당 모니터링 상담 기법 — CGM 데이터 해석', instructor: '박교수', participants: 45, date: '2026-03-20' },
  { id: '3', type: 'post', tab: '제품 경험', title: 'CGM 센서 교체 주기별 정확도 비교 경험 공유', author: '이약사', viewCount: 189, commentCount: 15, date: '2026-03-17' },
  { id: '4', type: 'content', tab: '콘텐츠', title: '당뇨 환자 식단 가이드 — 매장 배포용 리플렛', viewCount: 523, date: '2026-03-16' },
  { id: '5', type: 'post', tab: '마케팅', title: '약국 SNS 마케팅 3개월 실험 결과 — 팔로워 300% 증가', author: '정약사', viewCount: 276, commentCount: 32, date: '2026-03-15' },
  { id: '6', type: 'lecture', tab: '강좌', title: '[입문] 약국 경영 데이터 분석 — 매출 패턴과 재고 최적화', instructor: '최교수', participants: 62, date: '2026-03-22' },
  { id: '7', type: 'post', tab: '운영 이야기', title: '직원 교육 프로그램 운영 경험 — 파트타임 약사 관리', author: '한약사', viewCount: 198, commentCount: 19, date: '2026-03-14' },
  { id: '8', type: 'content', tab: '콘텐츠', title: '혈당 측정기 비교 차트 — 환자 상담 자료', viewCount: 412, date: '2026-03-13' },
  { id: '9', type: 'post', tab: '제품 경험', title: '건강기능식품 진열 변경 후 매출 변화 분석', author: '윤약사', viewCount: 156, commentCount: 11, date: '2026-03-12' },
  { id: '10', type: 'post', tab: '마케팅', title: '시즌별 프로모션 기획 — 봄철 알레르기 시즌 준비', author: '송약사', viewCount: 203, commentCount: 24, date: '2026-03-11' },
];

const adsItems = [
  {
    id: '1',
    title: '약국 운영 효율화 솔루션',
    description: '재고 관리부터 고객 상담까지, 하나의 플랫폼으로 관리하세요.',
    link: '/apply',
  },
  {
    id: '2',
    title: '전문 교육 프로그램 안내',
    description: '약사 전문성 강화를 위한 온·오프라인 교육 과정을 확인하세요.',
    link: '/education',
  },
];

const contentItems = [
  { id: '1', title: '혈당 관리 기본 가이드 — 환자 교육용' },
  { id: '2', title: 'CGM 센서 사용법 안내 리플렛' },
  { id: '3', title: '당뇨 환자 식단 관리 포스터' },
  { id: '4', title: '건강기능식품 복용 안내 카드' },
  { id: '5', title: '약국 위생 관리 체크리스트' },
];

const signageVideos = [
  { id: '1', title: '혈당 관리의 중요성 — 환자 대기실 영상', url: '#' },
  { id: '2', title: '올바른 약 복용법 안내', url: '#' },
];

const signagePlaylists = [
  { id: '1', title: '약국 대기실 기본 플레이리스트 (30분)' },
  { id: '2', title: '건강 정보 시리즈 — 시즌 봄' },
];

const partnerLogos = [
  { id: '1', name: 'Partner A' },
  { id: '2', name: 'Partner B' },
  { id: '3', name: 'Partner C' },
  { id: '4', name: 'Partner D' },
  { id: '5', name: 'Partner E' },
  { id: '6', name: 'Partner F' },
  { id: '7', name: 'Partner G' },
  { id: '8', name: 'Partner H' },
];

// ─── Tabs ───────────────────────────────────────────────────

const FEED_TABS: FeedTab[] = ['전체', '운영 이야기', '제품 경험', '마케팅', '강좌', '콘텐츠'];

// ─── Main Component ─────────────────────────────────────────

export default function CommunityMainPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>('전체');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  const filteredFeed = feedItems
    .filter((item) => activeTab === '전체' || item.tab === activeTab)
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.viewCount || 0) - (a.viewCount || 0);
      return b.date.localeCompare(a.date);
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ─── 1. Hero Section ─── */}
        <section className="mb-10">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Title + CTA */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-3">
                약국 운영 경험을 나누고<br />바로 매장에 적용하세요
              </h1>
              <p className="text-sm text-slate-500 mb-5">
                회원 약사들의 운영 노하우, 제품 경험, 마케팅 전략을 공유하는 공간입니다.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/forum/write"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  글 작성
                </Link>
                <Link
                  to="/education"
                  className="px-5 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  강좌 신청
                </Link>
              </div>
            </div>

            {/* Right: Sponsor Cards */}
            <div className="flex-1 flex flex-col gap-3">
              {sponsorItems.map((s) => (
                <Link
                  key={s.id}
                  to={s.link}
                  className="block p-3.5 bg-white border border-slate-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-5 text-xs text-slate-400">
            오늘 글 23 &nbsp;|&nbsp; 참여자 58 &nbsp;|&nbsp; 인기: 혈당관리
          </div>
        </section>

        {/* ─── 2. Feed Section ─── */}
        <section className="mb-10">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 mb-3 overflow-x-auto">
            {FEED_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSortBy('latest')}
              className={`text-xs px-2.5 py-1 rounded-full ${
                sortBy === 'latest' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              최신
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`text-xs px-2.5 py-1 rounded-full ${
                sortBy === 'popular' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              인기
            </button>
          </div>

          {/* Feed List */}
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {filteredFeed.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
            {filteredFeed.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                해당 탭에 게시물이 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* ─── 3. Ads Section ─── */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {adsItems.map((ad) => (
              <Link
                key={ad.id}
                to={ad.link}
                className="block p-5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-800 mb-1">{ad.title}</p>
                <p className="text-xs text-slate-500">{ad.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── 4. Content Preview ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-800 mb-3">매장에서 바로 쓰는 콘텐츠</h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {contentItems.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{c.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <Link to="/hub/content" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              더보기
            </Link>
          </div>
        </section>

        {/* ─── 5. Digital Signage Preview ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-800 mb-3">디지털 사이니지</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Videos */}
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">영상</p>
              <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                {signageVideos.map((v) => (
                  <a
                    key={v.id}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <Play className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{v.title}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Playlists */}
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">플레이리스트</p>
              <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                {signagePlaylists.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-4 py-3">
                    <ListMusic className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{p.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <Link to="/signage" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              더보기
            </Link>
          </div>
        </section>

        {/* ─── 6. Partner Logo Slide ─── */}
        <section className="mb-6 overflow-hidden">
          <div className="relative group">
            <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
              {[...partnerLogos, ...partnerLogos].map((logo, idx) => (
                <div
                  key={`${logo.id}-${idx}`}
                  className="flex items-center justify-center w-28 h-12 mx-3 bg-white border border-slate-200 rounded-lg shrink-0"
                >
                  <span className="text-xs text-slate-400 font-medium">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Feed Row Component ─────────────────────────────────────

function FeedRow({ item }: { item: FeedItem }) {
  if (item.type === 'lecture') {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 rounded">
            <GraduationCap className="w-3 h-3 mr-0.5" />강좌
          </span>
          <span className="text-sm text-slate-800 truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{item.instructor}</span>
          <span>참여 {item.participants}명</span>
          <span>{item.date}</span>
        </div>
      </div>
    );
  }

  if (item.type === 'content') {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded">
            <FileText className="w-3 h-3 mr-0.5" />콘텐츠
          </span>
          <span className="text-sm text-slate-800 truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.viewCount}</span>
          <span>{item.date}</span>
        </div>
      </div>
    );
  }

  // type === 'post'
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded">
          <MessageSquare className="w-3 h-3 mr-0.5" />글
        </span>
        <span className="text-sm text-slate-800 truncate">{item.title}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>{item.author}</span>
        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.viewCount}</span>
        <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{item.commentCount}</span>
        <span>{item.date}</span>
      </div>
    </div>
  );
}
