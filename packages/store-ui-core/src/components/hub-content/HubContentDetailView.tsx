/**
 * HubContentDetailView — 매장 HUB 콘텐츠 상세 공통 View
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
 *
 * K-Cosmetics `/library/content/:id` (105줄, inline style) 와 GlycoPharm `/hub/content/:id`
 * (101줄, Tailwind) 는 같은 화면이었다 — 목록에서 넘긴 item(location.state) 을 카드로 보여주고
 * 하단에 감사 패널을 붙인다. 그 골격을 여기로 모은다.
 *
 * 서비스 차이는 config + slot 으로만 표현한다 (서비스명 조건문 금지):
 *   - accent            : 링크·외부링크 버튼 색
 *   - showPinnedBadge   : '추천' 배지 (KCos)
 *   - appreciation      : 감사 패널 slot — API·테마·로그인 처리는 서비스가 소유한다.
 *   - onBack / backLabel: 목록 복귀 동작
 *
 * 업무 경계: 이 화면은 **운영자 발행 원본(HUB)** 의 열람 화면이다. 매장 사본(가져오기 결과)은
 * 각 서비스의 매장 화면이 따로 소유하며, 여기서 사본을 만들거나 수정하지 않는다.
 */

import type { ReactNode } from 'react';

export type HubContentDetailAccent = 'pink' | 'primary';

const ACCENT_CLASSES: Record<HubContentDetailAccent, { link: string; solidBtn: string; badge: string }> = {
  pink: {
    link: 'text-pink-600 hover:underline',
    solidBtn: 'bg-pink-600 hover:bg-pink-700 text-white',
    badge: 'bg-pink-50 text-pink-600',
  },
  primary: {
    link: 'text-primary-600 hover:underline',
    solidBtn: 'bg-primary-600 hover:bg-primary-700 text-white',
    badge: 'bg-primary-50 text-primary-600',
  },
};

export interface HubContentDetailItem {
  title: string;
  summary?: string | null;
  thumbnail?: string | null;
  type?: string | null;
  date?: string | null;
  href?: string | null;
  isPinned?: boolean;
}

export interface HubContentDetailViewProps {
  /** 목록에서 전달된 항목. 없으면 notFound 를 표시한다(직접 URL 진입). */
  item: HubContentDetailItem | undefined;
  accent: HubContentDetailAccent;
  onBack: () => void;
  backLabel?: string;
  /** 감사 패널 등 하단 영역 — API·테마·로그인 처리는 서비스가 소유한다. */
  appreciation?: ReactNode;
  showPinnedBadge?: boolean;
}

export function HubContentDetailView({
  item,
  accent,
  onBack,
  backLabel = '← 콘텐츠 목록',
  appreciation,
  showPinnedBadge = false,
}: HubContentDetailViewProps) {
  const ac = ACCENT_CLASSES[accent];

  if (!item) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-slate-400">콘텐츠를 찾을 수 없습니다.</p>
        <button type="button" onClick={onBack} className={`text-sm ${ac.link}`}>
          ← 뒤로
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button type="button" onClick={onBack} className={`block text-sm mb-4 ${ac.link}`}>
        {backLabel}
      </button>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        {item.thumbnail && (
          <div className="aspect-video bg-slate-100 overflow-hidden">
            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5">
          {item.type && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded mb-2 mr-1.5">
              {item.type}
            </span>
          )}
          {showPinnedBadge && item.isPinned && (
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mb-2 ${ac.badge}`}>
              추천
            </span>
          )}
          <h1 className="text-lg font-bold text-slate-800 mb-2 leading-snug">{item.title}</h1>
          {item.summary && (
            <p className="text-sm text-slate-500 mb-3 leading-relaxed">{item.summary}</p>
          )}
          {item.date && <p className="text-xs text-slate-400 mb-4">{item.date}</p>}
          {item.href && (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${ac.solidBtn}`}
            >
              외부 링크 열기 ↗
            </a>
          )}
        </div>
      </div>

      {appreciation}
    </div>
  );
}

export default HubContentDetailView;
