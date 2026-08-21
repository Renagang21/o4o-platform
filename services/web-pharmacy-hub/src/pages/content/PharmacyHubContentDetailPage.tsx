/**
 * PharmacyHubContentDetailPage — Pharmacy-Hub 회원 콘텐츠 상세
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1
 *
 * 공통 `CommunityContentDetailView` (KPA/GP/KCos 소비) + PH adapter. Route: `/content/:id`.
 * 원장은 공통 `cms_contents` — 신규 table / migration / backend API 0.
 *
 * 조회 실패를 빈 화면으로 위장하지 않는다 — 오류 상태를 표시한다.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CommunityContentDetailView } from '@o4o/shared-space-ui';
import { getPharmacyHubContent, type CmsContentItem } from '../../lib/api/pharmacyHubContents';

export default function PharmacyHubContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<CmsContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPharmacyHubContent(id)
      .then((c) => { if (!cancelled) setItem(c); })
      .catch(() => { if (!cancelled) setError('콘텐츠를 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const backSlot = (
    <Link to="/content" style={{ fontSize: 14, color: '#64748b', textDecoration: 'none' }}>
      ← 콘텐츠 목록
    </Link>
  );

  if (loading) {
    return <div style={{ padding: 32, color: '#64748b' }}>불러오는 중...</div>;
  }

  if (error || !item) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 12 }}>{backSlot}</div>
        <p style={{ color: '#dc2626' }}>{error ?? '콘텐츠를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  return (
    <CommunityContentDetailView
      data={{
        title: item.title,
        authorName: null,
        dateLabel: (item.publishedAt || item.createdAt || '').slice(0, 10),
        summary: item.summary ?? null,
        bodyHtml: item.body ?? null,
      }}
      backSlot={backSlot}
    />
  );
}
