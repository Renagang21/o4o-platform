/**
 * HomeNewsCard — PharmacyHub 홈 우측 `뉴스` 카드
 *
 * WO-O4O-PHARMACYHUB-HOME-NEWS-AND-USAGE-GUIDE-REALIGNMENT-V1 §3·§6
 *
 * 홈 우측 슬롯(noticesRightSlot)의 canonical 용도로 돌아온다 — 공통
 * StandardHomeTemplate 이 이 슬롯을 "서비스별 뉴스" 로 정의하고 있고,
 * KPA(약사공론) · GlycoPharm(약업신문) · K-Cosmetics(트렌드)도 같은 축을 쓴다.
 * 기존의 `커뮤니티 이용 안내`(사용법)는 홈이 아니라 이용 안내로 옮겼다.
 *
 * 표시부는 좌측 공지와 **같은 공통 컴포넌트** `NewsNoticesSection` 을 쓴다 —
 * 두 카드의 헤더·카드 프레임·최소 높이(200px)·행 높이가 자동으로 정렬된다
 * (PH 전용 카드 스타일을 새로 만들지 않는다).
 *
 * 원장은 공통 cms_contents(type='news') 다 — `lib/api/pharmacyHubNews` 참조.
 * 조회 실패는 공통 LoadError 로 표면화한다. 빈 목록(정상 0건)과 구분한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { NewsNoticesSection, type NoticeItem } from '@o4o/shared-space-ui';
import { LoadError } from '@o4o/ui';
import {
  listPharmacyHubNews,
  pharmacyHubNewsDate,
  type PharmacyHubNewsItem,
} from '../lib/api/pharmacyHubNews';

/** 홈 노출 건수 — 좌측 공지(5건)와 같은 밀도. */
const HOME_NEWS_LIMIT = 5;

function toNoticeItem(item: PharmacyHubNewsItem): NoticeItem {
  return {
    id: item.id,
    title: item.title,
    date: pharmacyHubNewsDate(item),
    href: `/news/${item.id}`,
    // 좌측 공지의 '공지' 배지와 겹치지 않도록 뉴스는 pinned 배지를 쓰지 않는다.
    isPinned: false,
  };
}

export function HomeNewsCard() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    listPharmacyHubNews({ limit: HOME_NEWS_LIMIT })
      .then((result) => {
        if (!cancelled) setItems(result.items.map(toNoticeItem));
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loadError) {
    return <LoadError title="뉴스를 불러오지 못했습니다." onRetry={retry} />;
  }

  return (
    <NewsNoticesSection
      title="뉴스"
      items={items}
      loading={loading}
      viewAllHref="/news"
      emptyTitle="등록된 뉴스가 없습니다."
      emptySubtitle="약국 경영 · 약사 제도 · 의약품 유통 등 PharmacyHub 이용자에게 필요한 소식을 등록하면 여기에 표시됩니다."
      accentColor="#0f766e"
      accentBg="#ccfbf1"
    />
  );
}
