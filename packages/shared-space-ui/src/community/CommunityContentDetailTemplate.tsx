/**
 * CommunityContentDetailTemplate — 커뮤니티 콘텐츠 상세 공통 컨테이너
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1
 *
 * 표시부는 이미 공통 `CommunityContentDetailView` 로 추출돼 있었으나,
 * 그 앞단(조회 · 조회수 기록 · loading/error/not-found · 목록으로 · 액션바 배치)이
 * K-Cosmetics / GlycoPharm 에서 주석만 다른 채 통째로 중복돼 있었다. 그 층을 공통화한다.
 *
 * 구조: service API adapter(fetchContent) → toDetailData(정규화) → 공통 View
 *
 * 공통 View 순수성: fetch/axios 직접 호출 없음, 서비스별 API import 없음,
 *   `service === '...'` 분기 없음. 링크는 `renderLink` 로 서비스가 주입한다.
 *
 * 정책 불개입: 표시 여부·추천·가져가기 등 정책 판단은 wrapper(그리고 backend)가 한다.
 *   본 Template 은 상태 전이와 배치만 담당한다.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CommunityContentDetailView, type CommunityContentDetailData } from './CommunityContentDetailView';
import { CommunityContentErrorState, CommunityContentLoadingState } from './CommunityContentStates';
import type { CommunityContentRenderLink } from './CommunityContentListView';

export interface CommunityContentDetailConfig<T> {
  /** 실패 시 반드시 throw 한다 — 조용한 not-found 로 바꾸지 않는다. */
  fetchContent: (id: string) => Promise<T | null>;
  /** 서비스 응답 → 공통 표시 모델 */
  toDetailData: (raw: T) => CommunityContentDetailData;
  /** 조회수 기록 등 부수 효과 (실패는 무시) */
  trackView?: (id: string) => void;
  listPath: string;
  listLabel?: string;
  errorMessage?: string;
  notFoundMessage?: string;
}

export interface CommunityContentDetailTemplateProps<T> {
  contentId?: string;
  config: CommunityContentDetailConfig<T>;
  renderLink?: CommunityContentRenderLink;
  /** 링크복사/수정 등 — 조회된 원본을 받아 서비스가 구성 */
  renderActions?: (raw: T) => ReactNode;
  /** AppreciationPanel 등 하단 패널 */
  renderFooter?: (raw: T) => ReactNode;
  emptyBodyText?: string;
}

const defaultRenderLink: CommunityContentRenderLink = (href, children) => (
  <a href={href} style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
    {children}
  </a>
);

export function CommunityContentDetailTemplate<T>({
  contentId,
  config,
  renderLink = defaultRenderLink,
  renderActions,
  renderFooter,
  emptyBodyText,
}: CommunityContentDetailTemplateProps<T>) {
  const { fetchContent, toDetailData, trackView, listPath } = config;
  const listLabel = config.listLabel ?? '목록으로';

  const [raw, setRaw] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    if (!contentId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchContent(contentId)
      .then((res) => { if (!cancelled) setRaw(res ?? null); })
      .catch(() => { if (!cancelled) { setLoadError(true); setRaw(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contentId, fetchContent]);

  useEffect(() => load(), [load, reloadKey]);

  useEffect(() => {
    if (contentId && trackView) trackView(contentId);
  }, [contentId, trackView]);

  const backLink = renderLink(listPath, <>← {listLabel}</>);

  if (loading) return <CommunityContentLoadingState />;

  if (loadError) {
    return (
      <CommunityContentErrorState
        message={config.errorMessage ?? '콘텐츠를 불러오지 못했습니다.'}
        onRetry={() => setReloadKey((k) => k + 1)}
        actionSlot={backLink}
      />
    );
  }

  if (!raw) {
    return (
      <CommunityContentErrorState
        message={config.notFoundMessage ?? '콘텐츠를 찾을 수 없습니다.'}
        actionSlot={backLink}
      />
    );
  }

  return (
    <CommunityContentDetailView
      data={toDetailData(raw)}
      backSlot={backLink}
      actionsSlot={renderActions ? renderActions(raw) : undefined}
      footerSlot={renderFooter ? renderFooter(raw) : undefined}
      emptyBodyText={emptyBodyText}
    />
  );
}
