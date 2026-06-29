/**
 * StoreHubLatestFeed — KPA 매장 HUB 홈 "최신 자원 피드" (읽기 전용)
 *
 * WO-O4O-KPA-STORE-HUB-HOME-LATEST-RESOURCE-FEED-V1
 *
 * 정적 안내 카드 대신, 방문 시점에 새로 공급 가능한 상품 + 최신 운영자 콘텐츠 +
 * 최신 디지털 자료(POP/QR/동영상/사이니지)를 미리보기로 안내한다.
 * - 복사·신청·가져오기 mutation 없음(미리보기만). 각 항목/섹션은 기존 HUB 하위 목록으로 이동.
 * - 섹션별 독립 로딩/빈/부분오류 — 한 소스 실패가 전체 페이지로 전파되지 않는다.
 * - StoreHubTemplate.renderMainSections 슬롯으로 주입(KPA opt-in, GP/KCos 무영향).
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Image as ImageIcon, QrCode, Video, MonitorPlay, RefreshCw } from 'lucide-react';
import { getCatalog, type CatalogProduct } from '../../api/pharmacyProducts';
import { listContentHubItems } from '../../api/contentHub';
import { cmsApi } from '../../api/cms';
import { hubContentApi } from '../../api/hubContent';

// ─── 공통 상수 ──────────────────────────────────────────────────────────────
const PRIMARY = '#2563EB';
const NEUTRAL900 = '#0F172A';
const NEUTRAL500 = '#64748B';
const NEUTRAL400 = '#94A3B8';
const NEUTRAL200 = '#E2E8F0';
const NEUTRAL100 = '#F1F5F9';
const WHITE = '#FFFFFF';
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isNew(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= NEW_WINDOW_MS;
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ko-KR');
}
function fmtPrice(p: number | null | undefined): string {
  if (p == null) return '가격 문의';
  return new Intl.NumberFormat('ko-KR').format(p) + '원';
}

const DISTRIBUTION_LABEL: Record<string, string> = {
  PUBLIC: 'B2B 공개',
  SERVICE: '서비스 공급',
  PRIVATE: '비공개 공급',
};

// ─── 섹션 상태 훅 ───────────────────────────────────────────────────────────
type SectionState<T> = { loading: boolean; error: boolean; items: T[] };
const INIT = { loading: true, error: false, items: [] as never[] };

// ─── 정규화 타입 ────────────────────────────────────────────────────────────
interface ContentFeedItem {
  key: string;
  title: string;
  summary: string | null;
  date: string | null;
  sourceBadge: '콘텐츠 허브' | '운영자 자료';
}
interface DigitalFeedItem {
  key: string;
  title: string;
  date: string | null;
  thumbnailUrl: string | null;
  kind: 'pop' | 'qr' | 'video' | 'signage';
}

const DIGITAL_META: Record<DigitalFeedItem['kind'], { label: string; icon: ReactNode; route: string; color: string; bg: string }> = {
  pop: { label: 'POP', icon: <ImageIcon size={14} />, route: '/store-hub/pop', color: '#B45309', bg: '#FEF3C7' },
  qr: { label: 'QR 템플릿', icon: <QrCode size={14} />, route: '/store-hub/qr', color: '#4338CA', bg: '#E0E7FF' },
  video: { label: '동영상', icon: <Video size={14} />, route: '/store-hub/video', color: '#BE185D', bg: '#FCE7F3' },
  signage: { label: '사이니지', icon: <MonitorPlay size={14} />, route: '/store-hub/signage', color: '#047857', bg: '#D1FAE5' },
};

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────
export function StoreHubLatestFeed() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<SectionState<CatalogProduct>>(INIT);
  const [contents, setContents] = useState<SectionState<ContentFeedItem>>(INIT);
  const [digital, setDigital] = useState<SectionState<DigitalFeedItem>>(INIT);

  // 1) 새로 공급 가능한 상품
  useEffect(() => {
    let cancelled = false;
    getCatalog({ limit: 4, offset: 0 })
      .then((res) => { if (!cancelled) setProducts({ loading: false, error: false, items: res.data || [] }); })
      .catch(() => { if (!cancelled) setProducts({ loading: false, error: true, items: [] }); });
    return () => { cancelled = true; };
  }, []);

  // 2) 새로운 콘텐츠 (콘텐츠 허브 ready + CMS published 병합 → 날짜순 최대 4)
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      listContentHubItems({ status: 'ready', page: 1, limit: 4 }),
      cmsApi.getContents({ serviceKey: 'kpa', status: 'published', limit: 4, offset: 0 }),
    ]).then((results) => {
      if (cancelled) return;
      const merged: ContentFeedItem[] = [];
      let anyOk = false;
      if (results[0].status === 'fulfilled') {
        anyOk = true;
        for (const it of results[0].value.items || []) {
          merged.push({ key: `hub:${it.id}`, title: it.title, summary: it.summary, date: it.created_at, sourceBadge: '콘텐츠 허브' });
        }
      }
      if (results[1].status === 'fulfilled') {
        anyOk = true;
        for (const c of results[1].value.data || []) {
          merged.push({ key: `cms:${c.id}`, title: c.title, summary: c.summary, date: c.publishedAt ?? c.createdAt, sourceBadge: '운영자 자료' });
        }
      }
      merged.sort((a, b) => (new Date(b.date ?? 0).getTime()) - (new Date(a.date ?? 0).getTime()));
      setContents({ loading: false, error: !anyOk, items: merged.slice(0, 4) });
    });
    return () => { cancelled = true; };
  }, []);

  // 3) 새로운 디지털 자료 (POP/QR/동영상 = operator@kpa, 사이니지 = kpa-society) → 날짜순 최대 6
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      hubContentApi.list({ serviceKey: 'kpa', producer: 'operator', sourceDomain: 'pop', page: 1, limit: 4 }),
      hubContentApi.list({ serviceKey: 'kpa', producer: 'operator', sourceDomain: 'qr', page: 1, limit: 4 }),
      hubContentApi.list({ serviceKey: 'kpa', producer: 'operator', sourceDomain: 'video', page: 1, limit: 4 }),
      hubContentApi.list({ serviceKey: 'kpa-society', sourceDomain: 'signage-media', page: 1, limit: 4 }),
    ]).then((results) => {
      if (cancelled) return;
      const kinds: DigitalFeedItem['kind'][] = ['pop', 'qr', 'video', 'signage'];
      const merged: DigitalFeedItem[] = [];
      let anyOk = false;
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        anyOk = true;
        for (const it of r.value.data || []) {
          merged.push({ key: `${kinds[i]}:${it.id}`, title: it.title, date: it.createdAt, thumbnailUrl: it.thumbnailUrl ?? null, kind: kinds[i] });
        }
      });
      merged.sort((a, b) => (new Date(b.date ?? 0).getTime()) - (new Date(a.date ?? 0).getTime()));
      setDigital({ loading: false, error: !anyOk, items: merged.slice(0, 6) });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      {/* 1. 새로 공급 가능한 상품 */}
      <FeedSection
        title="새로 공급 가능한 상품"
        viewAllLabel="상품 전체 보기"
        onViewAll={() => navigate('/store-hub/b2b')}
        state={products}
        emptyText="현재 새로 공급 가능한 상품이 없습니다."
        onRetry={() => { setProducts(INIT); getCatalog({ limit: 4, offset: 0 }).then((res) => setProducts({ loading: false, error: false, items: res.data || [] })).catch(() => setProducts({ loading: false, error: true, items: [] })); }}
        minCard={220}
        renderItem={(p) => (
          <button key={p.id} type="button" style={st.card} onClick={() => navigate('/store-hub/b2b')}>
            <div style={st.thumbWrap}>
              {p.imageUrl ? <img src={p.imageUrl} alt="" style={st.thumbImg} /> : <div style={st.thumbPh}><Package size={22} color={NEUTRAL400} /></div>}
              {isNew(p.updatedAt) && <span style={st.newBadge}>NEW</span>}
            </div>
            <div style={st.cardBody}>
              <div style={st.badgeRow}>
                <span style={st.typeBadge}>{DISTRIBUTION_LABEL[p.distributionType] ?? p.distributionType}</span>
                {p.isAdded && <span style={st.myStoreBadge}>내 매장</span>}
              </div>
              <span style={st.cardTitle} title={p.name}>{p.name}</span>
              <span style={st.cardSub} title={p.supplierName}>{p.supplierName}</span>
              <span style={st.cardPrice}>{fmtPrice(p.priceGold ?? p.priceGeneral)}</span>
            </div>
          </button>
        )}
      />

      {/* 2. 새로운 콘텐츠 */}
      <FeedSection
        title="새로운 콘텐츠"
        viewAllLabel="콘텐츠 전체 보기"
        onViewAll={() => navigate('/store-hub/content')}
        state={contents}
        emptyText="현재 새로 제공되는 콘텐츠가 없습니다."
        onRetry={() => setContents(INIT)}
        minCard={240}
        renderItem={(c) => (
          <button key={c.key} type="button" style={st.card} onClick={() => navigate('/store-hub/content')}>
            <div style={st.cardBody}>
              <div style={st.badgeRow}>
                <span style={c.sourceBadge === '콘텐츠 허브' ? st.srcHub : st.srcCms}>{c.sourceBadge}</span>
                {isNew(c.date) && <span style={st.newBadgeInline}>NEW</span>}
              </div>
              <span style={st.cardTitle} title={c.title}>{c.title}</span>
              {c.summary && <span style={st.cardSummary} title={c.summary}>{c.summary}</span>}
              <span style={st.cardDate}>{fmtDate(c.date)}</span>
            </div>
          </button>
        )}
      />

      {/* 3. 새로운 디지털 자료 */}
      <FeedSection
        title="새로운 디지털 자료"
        state={digital}
        emptyText="현재 새로 제공되는 디지털 자료가 없습니다."
        onRetry={() => setDigital(INIT)}
        minCard={200}
        renderItem={(d) => {
          const meta = DIGITAL_META[d.kind];
          return (
            <button key={d.key} type="button" style={st.card} onClick={() => navigate(meta.route)}>
              <div style={st.thumbWrap}>
                {d.thumbnailUrl ? <img src={d.thumbnailUrl} alt="" style={st.thumbImg} /> : <div style={st.thumbPh}>{meta.icon}</div>}
                {isNew(d.date) && <span style={st.newBadge}>NEW</span>}
              </div>
              <div style={st.cardBody}>
                <span style={{ ...st.typeBadge, color: meta.color, backgroundColor: meta.bg, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>{meta.icon}{meta.label}</span>
                <span style={st.cardTitle} title={d.title}>{d.title}</span>
                <span style={st.cardDate}>{fmtDate(d.date)}</span>
              </div>
            </button>
          );
        }}
      />

      {/* 이용 안내 (보조 링크 — surface 없으면 생략 가능) */}
      <div style={st.footnote}>
        매장 HUB 의 상품·콘텐츠·디지털 자료는 각 목록에서 내 약국으로 가져와 운영에 활용합니다.
      </div>
    </div>
  );
}

// ─── 섹션 래퍼 ──────────────────────────────────────────────────────────────
interface FeedSectionProps<T> {
  title: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
  state: SectionState<T>;
  emptyText: string;
  onRetry: () => void;
  minCard: number;
  renderItem: (item: T) => ReactNode;
}
function FeedSection<T>({ title, viewAllLabel, onViewAll, state, emptyText, onRetry, minCard, renderItem }: FeedSectionProps<T>) {
  return (
    <section style={st.section}>
      <div style={st.sectionHead}>
        <h2 style={st.sectionTitle}>{title}</h2>
        {viewAllLabel && onViewAll && (
          <button type="button" style={st.viewAll} onClick={onViewAll}>{viewAllLabel} →</button>
        )}
      </div>
      {state.loading ? (
        <div style={{ ...st.grid, gridTemplateColumns: `repeat(auto-fill, minmax(${minCard}px, 1fr))` }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} style={st.skeleton} />)}
        </div>
      ) : state.error ? (
        <div style={st.stateBox}>
          <span style={{ color: NEUTRAL500, fontSize: '0.8125rem' }}>불러오지 못했습니다.</span>
          <button type="button" style={st.retryBtn} onClick={onRetry}><RefreshCw size={13} /> 다시 시도</button>
        </div>
      ) : state.items.length === 0 ? (
        <div style={st.stateBox}><span style={{ color: NEUTRAL400, fontSize: '0.8125rem' }}>{emptyText}</span></div>
      ) : (
        <div style={{ ...st.grid, gridTemplateColumns: `repeat(auto-fill, minmax(${minCard}px, 1fr))` }}>
          {state.items.map(renderItem)}
        </div>
      )}
    </section>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────
const st: Record<string, CSSProperties> = {
  section: { marginBottom: 28 },
  sectionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: NEUTRAL900, margin: 0 },
  viewAll: { background: 'none', border: 'none', color: PRIMARY, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' },
  grid: { display: 'grid', gap: 12 },
  skeleton: { height: 150, borderRadius: 10, backgroundColor: NEUTRAL100, border: `1px solid ${NEUTRAL200}` },
  stateBox: { display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', backgroundColor: WHITE, border: `1px solid ${NEUTRAL200}`, borderRadius: 10 },
  retryBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: '0.75rem', color: PRIMARY, background: WHITE, border: `1px solid ${PRIMARY}`, borderRadius: 6, cursor: 'pointer' },
  card: { display: 'flex', flexDirection: 'column', textAlign: 'left', padding: 0, backgroundColor: WHITE, border: `1px solid ${NEUTRAL200}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', minWidth: 0 },
  thumbWrap: { position: 'relative', width: '100%', aspectRatio: '4 / 3', backgroundColor: NEUTRAL100 },
  thumbImg: { width: '100%', height: '100%', objectFit: 'contain' },
  thumbPh: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  newBadge: { position: 'absolute', top: 6, left: 6, fontSize: '0.625rem', fontWeight: 700, color: WHITE, backgroundColor: '#EF4444', padding: '2px 6px', borderRadius: 4 },
  newBadgeInline: { fontSize: '0.625rem', fontWeight: 700, color: '#EF4444', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', padding: '1px 5px', borderRadius: 4 },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', minWidth: 0 },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: { fontSize: '0.6875rem', fontWeight: 600, color: '#2563EB', backgroundColor: '#DBEAFE', padding: '2px 7px', borderRadius: 4 },
  myStoreBadge: { fontSize: '0.6875rem', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '2px 7px', borderRadius: 4 },
  srcHub: { fontSize: '0.6875rem', fontWeight: 600, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '2px 7px', borderRadius: 4 },
  srcCms: { fontSize: '0.6875rem', fontWeight: 600, color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '2px 7px', borderRadius: 4 },
  cardTitle: { fontSize: '0.875rem', fontWeight: 600, color: NEUTRAL900, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, lineHeight: 1.35 },
  cardSub: { fontSize: '0.75rem', color: NEUTRAL500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardSummary: { fontSize: '0.75rem', color: NEUTRAL500, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, lineHeight: 1.4 },
  cardPrice: { fontSize: '0.8125rem', fontWeight: 700, color: NEUTRAL900, marginTop: 2 },
  cardDate: { fontSize: '0.6875rem', color: NEUTRAL400, marginTop: 2 },
  footnote: { fontSize: '0.75rem', color: NEUTRAL400, padding: '12px 0 32px', lineHeight: 1.6 },
};

export default StoreHubLatestFeed;
