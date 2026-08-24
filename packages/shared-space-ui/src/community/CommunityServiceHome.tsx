/**
 * CommunityServiceHome — 커뮤니티 서비스 Home 공통 컨테이너
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §8
 *
 * 배경:
 *   KPA-Society / Pharmacy-Hub 의 커뮤니티 홈은 이미 `StandardHomeTemplate`(레이아웃)을
 *   공유하지만, **조회 상태 기계**(공지 · 최신활동의 loading / loadError / retry / tab)는
 *   각 서비스 화면에 통째로 복제돼 있었다. 그 결과 서비스마다 4상태 계약 준수 수준이
 *   달라졌다(KPA 공지는 실패를 `catch(() => {})` 로 삼켜 "공지 없음"으로 위장했다).
 *
 * 역할 분담 (JSX fork 금지 §8):
 *   - 공통(이 파일) : 조회 상태 기계 + 4상태 계약 + StandardHomeTemplate 조립
 *   - 서비스        : config(문구·카드·CTA·accent) + data adapter(loadNotices / loadLatest)
 *
 * 불변식:
 *   - 이 컨테이너는 API client 를 알지 못한다. 조회는 주입된 adapter 가 수행한다.
 *   - adapter 는 **실패 시 throw** 해야 한다. 빈 배열로 실패를 위장하면 안 된다
 *     (throw → loadError 상태 + [다시 시도], 정상 0건 → empty).
 *   - react-router 를 직접 의존하지 않는다. 이동은 주입된 `navigate` 로 수행한다.
 *   - 서비스 분기(`serviceKey === ...`)를 두지 않는다. 차이는 전부 props 로 표현한다.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StandardHomeTemplate, type StandardHomeTemplateProps } from '../StandardHomeTemplate';
import {
  LatestActivitySection,
  LATEST_ACTIVITY_ACCENTS,
  LATEST_ACTIVITY_SUMMARY_LIMIT,
  buildLatestActivityTabs,
  type LatestActivityAccent,
  type LatestActivityItem,
  type LatestActivityTab,
} from './LatestActivitySection';
import type { NoticeItem } from '../types';

/** 서비스가 주입하는 조회 어댑터. 실패는 반드시 throw 한다. */
export interface CommunityHomeDataAdapters {
  /** 공지 목록. 미주입 시 공지 조회를 수행하지 않고 빈 목록으로 렌더한다. */
  loadNotices?: () => Promise<NoticeItem[]>;
  /** 최신 활동 목록. 미주입 시 최신 활동 섹션을 렌더하지 않는다. */
  loadLatest?: (tab: string, limit: number) => Promise<LatestActivityItem[]>;
}

export interface CommunityServiceHomeProps
  extends Pick<
    StandardHomeTemplateProps,
    | 'heroSlot'
    | 'noticesTitle'
    | 'noticesAccentColor'
    | 'noticesAccentBg'
    | 'noticesViewAllHref'
    | 'noticesRightSlot'
    | 'noticesGap'
    | 'valueGuideSlot'
    | 'valueGuidePlacement'
    | 'appEntryCards'
    | 'appEntryOnCardClick'
    | 'cta'
    | 'help'
  > {
  /** 이동 처리 — 서비스의 `useNavigate()` 를 주입한다. */
  navigate: (path: string) => void;
  data: CommunityHomeDataAdapters;

  /** 최신 활동 탭 구성. 미주입 시 공통 기본 탭(buildLatestActivityTabs()). */
  latestTabs?: LatestActivityTab[];
  latestAccent?: LatestActivityAccent;
  latestLimit?: number;
  /** 최신 활동 섹션 위 보조 슬롯 (예: 서비스 가입 상태 안내) */
  latestHeaderSlot?: ReactNode;
}

export function CommunityServiceHome({
  navigate,
  data,
  latestTabs,
  latestAccent = LATEST_ACTIVITY_ACCENTS.blue,
  latestLimit = LATEST_ACTIVITY_SUMMARY_LIMIT,
  latestHeaderSlot,
  ...template
}: CommunityServiceHomeProps) {
  const { loadNotices, loadLatest } = data;

  // ─── 공지 상태 기계 ────────────────────────────────────────────────
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(!!loadNotices);
  const [noticesError, setNoticesError] = useState(false);
  const [noticesReloadKey, setNoticesReloadKey] = useState(0);

  useEffect(() => {
    if (!loadNotices) { setNotices([]); setNoticesLoading(false); return; }
    let cancelled = false;
    setNoticesLoading(true);
    setNoticesError(false);
    loadNotices()
      .then((items) => {
        if (cancelled) return;
        // 계약 위반(비배열)도 실패로 간주 — 빈 목록으로 위장하지 않는다.
        if (!Array.isArray(items)) { setNotices([]); setNoticesError(true); return; }
        setNotices(items);
      })
      .catch(() => { if (!cancelled) { setNotices([]); setNoticesError(true); } })
      .finally(() => { if (!cancelled) setNoticesLoading(false); });
    return () => { cancelled = true; };
  }, [loadNotices, noticesReloadKey]);

  // ─── 최신 활동 상태 기계 ───────────────────────────────────────────
  const [latestItems, setLatestItems] = useState<LatestActivityItem[]>([]);
  const [latestTab, setLatestTab] = useState('all');
  const [latestLoading, setLatestLoading] = useState(!!loadLatest);
  const [latestError, setLatestError] = useState(false);
  const [latestReloadKey, setLatestReloadKey] = useState(0);

  useEffect(() => {
    if (!loadLatest) return;
    let cancelled = false;
    setLatestLoading(true);
    setLatestError(false);
    loadLatest(latestTab, latestLimit)
      .then((items) => {
        if (cancelled) return;
        if (!Array.isArray(items)) { setLatestItems([]); setLatestError(true); return; }
        setLatestItems(items);
      })
      .catch(() => { if (!cancelled) { setLatestItems([]); setLatestError(true); } })
      .finally(() => { if (!cancelled) setLatestLoading(false); });
    return () => { cancelled = true; };
  }, [loadLatest, latestTab, latestLimit, latestReloadKey]);

  const retryNotices = useCallback(() => setNoticesReloadKey((k) => k + 1), []);
  const retryLatest = useCallback(() => setLatestReloadKey((k) => k + 1), []);

  return (
    <StandardHomeTemplate
      {...template}
      notices={notices}
      noticesLoading={noticesLoading}
      noticesError={noticesError}
      onNoticesRetry={retryNotices}
      latestSlot={
        loadLatest ? (
          <>
            {latestHeaderSlot}
            <LatestActivitySection
              tabs={latestTabs ?? buildLatestActivityTabs()}
              items={latestItems}
              activeTab={latestTab}
              onTabChange={setLatestTab}
              loading={latestLoading}
              loadError={latestError}
              onRetry={retryLatest}
              navigate={navigate}
              accent={latestAccent}
            />
          </>
        ) : undefined
      }
    />
  );
}

export default CommunityServiceHome;
