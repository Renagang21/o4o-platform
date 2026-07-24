/**
 * StoreHubLatestFeed — KPA 매장 HUB 홈 "최신 자원 피드" (읽기 전용)
 *
 * WO-O4O-KPA-STORE-HUB-HOME-LATEST-RESOURCE-FEED-V1
 * WO-O4O-KPA-STORE-HUB-STANDARD-TABLE-AND-SIGNAGE-MENU-IA-V1:
 *   카드형 그리드 → O4O 표준 테이블(DataTable @o4o/operator-ux-core) 미리보기로 전환.
 *   홈은 전체 데이터를 관리하는 화면이 아니라 최신 자원 요약 대시보드이므로
 *   섹션별 최신 4~5행만 표시하고, 관리(검색·필터·정렬·페이지네이션·선택 ActionBar)는
 *   각 영역의 전체 목록 화면(/store-hub/b2b · /content · /pop · /qr · /video · /signage)이 담당한다.
 *   큰 카드 썸네일 제거 — 자료명 앞 20px 대표 이미지 / 유형 아이콘 fallback 만 유지.
 *
 * 정적 안내 카드 대신, 방문 시점에 새로 공급 가능한 상품 + 최신 운영자 콘텐츠 +
 * 최신 디지털 자료(POP/QR/동영상/사이니지)를 미리보기로 안내한다.
 * - 복사·신청·가져오기 mutation 없음(미리보기만). 각 항목/섹션은 기존 HUB 하위 목록으로 이동.
 * - 섹션별 독립 로딩/빈/부분오류 — 한 소스 실패가 전체 페이지로 전파되지 않는다.
 * - StoreHubTemplate.renderMainSections 슬롯으로 주입(KPA opt-in, GP/KCos 무영향).
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Image as ImageIcon, QrCode, Video, MonitorPlay, RefreshCw, FileText } from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
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

/** 홈 미리보기 행 수 — 상품/콘텐츠 4행, 디지털 자료(4개 소스 병합) 5행 */
const PREVIEW_ROWS = 4;
const PREVIEW_ROWS_DIGITAL = 5;

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
function tsOf(iso: string | null | undefined): number {
  const t = new Date(iso ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const DISTRIBUTION_LABEL: Record<string, string> = {
  PUBLIC: 'B2B 공개',
  SERVICE: '서비스 공급',
  PRIVATE: '비공개 공급',
};

const PRODUCER_LABEL: Record<string, string> = {
  operator: '운영자',
  supplier: '공급자',
  community: '커뮤니티',
};

// ─── 섹션 상태 훅 ───────────────────────────────────────────────────────────
type SectionState<T> = { loading: boolean; error: boolean; items: T[] };
const INIT = { loading: true, error: false, items: [] as never[] };

// ─── 정규화 타입 ────────────────────────────────────────────────────────────
interface ContentFeedItem {
  key: string;
  title: string;
  summary: string | null;
  typeLabel: string;
  date: string | null;
  sourceBadge: '콘텐츠 허브' | '운영자 자료';
}
interface DigitalFeedItem {
  key: string;
  title: string;
  date: string | null;
  thumbnailUrl: string | null;
  producer: string | null;
  kind: 'pop' | 'qr' | 'video' | 'signage';
}

const DIGITAL_META: Record<DigitalFeedItem['kind'], { label: string; icon: ReactNode; route: string; color: string; bg: string }> = {
  pop: { label: 'POP', icon: <ImageIcon size={14} />, route: '/store-hub/pop', color: '#B45309', bg: '#FEF3C7' },
  qr: { label: 'QR 템플릿', icon: <QrCode size={14} />, route: '/store-hub/qr', color: '#4338CA', bg: '#E0E7FF' },
  video: { label: '동영상', icon: <Video size={14} />, route: '/store-hub/video', color: '#BE185D', bg: '#FCE7F3' },
  signage: { label: '사이니지', icon: <MonitorPlay size={14} />, route: '/store-hub/signage', color: '#047857', bg: '#D1FAE5' },
};
const DIGITAL_KINDS: DigitalFeedItem['kind'][] = ['pop', 'qr', 'video', 'signage'];

// ─── 셀 조각 ────────────────────────────────────────────────────────────────
/** 자료명 셀 — 20px 대표 이미지(없으면 유형 아이콘) + 제목 1행 줄임 + NEW 배지 */
function NameCell({ thumbnailUrl, fallbackIcon, title, isNewItem }: {
  thumbnailUrl?: string | null;
  fallbackIcon: ReactNode;
  title: string;
  isNewItem?: boolean;
}) {
  return (
    <span style={st.nameCell}>
      <span style={st.miniThumb}>
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt="" style={st.miniThumbImg} />
          : fallbackIcon}
      </span>
      <span style={st.nameText} title={title}>{title}</span>
      {isNewItem && <span style={st.newBadgeInline}>NEW</span>}
    </span>
  );
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ ...st.chip, color, backgroundColor: bg }}>{label}</span>;
}

// ─── 컴포넌트 ───────────────────────────────────────────────────────────────
export function StoreHubLatestFeed() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<SectionState<CatalogProduct>>(INIT);
  const [contents, setContents] = useState<SectionState<ContentFeedItem>>(INIT);
  const [digital, setDigital] = useState<SectionState<DigitalFeedItem>>(INIT);

  // 1) 새로 공급 가능한 상품
  const loadProducts = useCallback(() => {
    setProducts(INIT);
    return getCatalog({ limit: PREVIEW_ROWS, offset: 0 })
      .then((res) => setProducts({ loading: false, error: false, items: res.data || [] }))
      .catch(() => setProducts({ loading: false, error: true, items: [] }));
  }, []);

  // 2) 새로운 콘텐츠 (콘텐츠 허브 ready + CMS published 병합 → 날짜순 최대 4)
  const loadContents = useCallback(() => {
    setContents(INIT);
    return Promise.allSettled([
      listContentHubItems({ status: 'ready', page: 1, limit: PREVIEW_ROWS }),
      cmsApi.getContents({ serviceKey: 'kpa', status: 'published', limit: PREVIEW_ROWS, offset: 0 }),
    ]).then((results) => {
      const merged: ContentFeedItem[] = [];
      let anyOk = false;
      if (results[0].status === 'fulfilled') {
        anyOk = true;
        for (const it of results[0].value.items || []) {
          merged.push({
            key: `hub:${it.id}`,
            title: it.title,
            summary: it.summary,
            typeLabel: it.category || it.source_type || '일반',
            date: it.created_at,
            sourceBadge: '콘텐츠 허브',
          });
        }
      }
      if (results[1].status === 'fulfilled') {
        anyOk = true;
        for (const c of results[1].value.data || []) {
          merged.push({
            key: `cms:${c.id}`,
            title: c.title,
            summary: c.summary,
            typeLabel: c.type || '일반',
            date: c.publishedAt ?? c.createdAt,
            sourceBadge: '운영자 자료',
          });
        }
      }
      merged.sort((a, b) => tsOf(b.date) - tsOf(a.date));
      setContents({ loading: false, error: !anyOk, items: merged.slice(0, PREVIEW_ROWS) });
    });
  }, []);

  // 3) 새로운 디지털 자료 (POP/QR/동영상 = operator@kpa, 사이니지 = kpa-society) → 날짜순 최대 5
  const loadDigital = useCallback(() => {
    setDigital(INIT);
    return Promise.allSettled([
      hubContentApi.list({ serviceKey: 'kpa', producer: 'operator', sourceDomain: 'pop', page: 1, limit: PREVIEW_ROWS }),
      hubContentApi.list({ serviceKey: 'kpa', producer: 'operator', sourceDomain: 'qr', page: 1, limit: PREVIEW_ROWS }),
      hubContentApi.list({ serviceKey: 'kpa', producer: 'operator', sourceDomain: 'video', page: 1, limit: PREVIEW_ROWS }),
      hubContentApi.list({ serviceKey: 'kpa-society', sourceDomain: 'signage-media', page: 1, limit: PREVIEW_ROWS }),
    ]).then((results) => {
      const merged: DigitalFeedItem[] = [];
      let anyOk = false;
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        anyOk = true;
        for (const it of r.value.data || []) {
          merged.push({
            key: `${DIGITAL_KINDS[i]}:${it.id}`,
            title: it.title,
            date: it.createdAt,
            thumbnailUrl: it.thumbnailUrl ?? null,
            producer: it.producer ?? null,
            kind: DIGITAL_KINDS[i],
          });
        }
      });
      merged.sort((a, b) => tsOf(b.date) - tsOf(a.date));
      setDigital({ loading: false, error: !anyOk, items: merged.slice(0, PREVIEW_ROWS_DIGITAL) });
    });
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadContents(); }, [loadContents]);
  useEffect(() => { void loadDigital(); }, [loadDigital]);

  // ─── 컬럼 정의 ────────────────────────────────────────────────────────────
  const productColumns: ListColumnDef<CatalogProduct>[] = useMemo(() => [
    {
      key: 'name', header: '상품명', sortable: true, sortAccessor: (p) => p.name,
      render: (_v, p) => (
        <NameCell
          thumbnailUrl={p.imageUrl}
          fallbackIcon={<Package size={13} color={NEUTRAL400} />}
          title={p.name}
          isNewItem={isNew(p.updatedAt)}
        />
      ),
    },
    {
      key: 'distributionType', header: '상품 구분', width: '110px',
      render: (_v, p) => <Chip label={DISTRIBUTION_LABEL[p.distributionType] ?? p.distributionType} color="#2563EB" bg="#DBEAFE" />,
    },
    {
      key: 'supplierName', header: '공급자', width: '140px',
      render: (_v, p) => <span style={st.sub} title={p.supplierName}>{p.supplierName || '—'}</span>,
    },
    {
      key: 'price', header: '공급가', width: '110px', align: 'right',
      sortAccessor: (p) => p.priceGold ?? p.priceGeneral ?? 0,
      render: (_v, p) => <span style={st.price}>{fmtPrice(p.priceGold ?? p.priceGeneral)}</span>,
    },
    {
      key: 'updatedAt', header: '등록일', width: '100px', sortable: true,
      sortAccessor: (p) => tsOf(p.updatedAt),
      render: (_v, p) => <span style={st.date}>{fmtDate(p.updatedAt)}</span>,
    },
    {
      key: 'isAdded', header: '매장 등록 상태', width: '110px', align: 'center',
      render: (_v, p) => (p.isAdded
        ? <Chip label="등록됨" color="#059669" bg="#D1FAE5" />
        : <span style={st.muted}>미등록</span>),
    },
    {
      key: '_action', header: '작업', width: '90px', align: 'center', system: true,
      render: () => <span style={st.linkAction}>목록에서 보기</span>,
    },
  ], []);

  const contentColumns: ListColumnDef<ContentFeedItem>[] = useMemo(() => [
    {
      key: 'title', header: '콘텐츠명', sortable: true, sortAccessor: (c) => c.title,
      render: (_v, c) => (
        <NameCell
          fallbackIcon={<FileText size={13} color={NEUTRAL400} />}
          title={c.title}
          isNewItem={isNew(c.date)}
        />
      ),
    },
    {
      key: 'typeLabel', header: '콘텐츠 유형', width: '120px',
      render: (_v, c) => <span style={st.sub} title={c.typeLabel}>{c.typeLabel}</span>,
    },
    {
      key: 'sourceBadge', header: '출처', width: '110px',
      render: (_v, c) => (c.sourceBadge === '콘텐츠 허브'
        ? <Chip label="콘텐츠 허브" color="#1D4ED8" bg="#DBEAFE" />
        : <Chip label="운영자 자료" color="#7C3AED" bg="#EDE9FE" />),
    },
    {
      key: 'date', header: '등록일', width: '100px', sortable: true,
      sortAccessor: (c) => tsOf(c.date),
      render: (_v, c) => <span style={st.date}>{fmtDate(c.date)}</span>,
    },
    {
      key: '_action', header: '작업', width: '90px', align: 'center', system: true,
      render: () => <span style={st.linkAction}>목록에서 보기</span>,
    },
  ], []);

  const digitalColumns: ListColumnDef<DigitalFeedItem>[] = useMemo(() => [
    {
      key: 'title', header: '자료명', sortable: true, sortAccessor: (d) => d.title,
      render: (_v, d) => (
        <NameCell
          thumbnailUrl={d.thumbnailUrl}
          fallbackIcon={DIGITAL_META[d.kind].icon}
          title={d.title}
          isNewItem={isNew(d.date)}
        />
      ),
    },
    {
      key: 'kind', header: '자료 유형', width: '120px',
      render: (_v, d) => {
        const meta = DIGITAL_META[d.kind];
        return <Chip label={meta.label} color={meta.color} bg={meta.bg} />;
      },
    },
    {
      key: 'producer', header: '제공자', width: '100px',
      render: (_v, d) => <span style={st.sub}>{d.producer ? (PRODUCER_LABEL[d.producer] ?? d.producer) : '—'}</span>,
    },
    {
      key: 'date', header: '등록일', width: '100px', sortable: true,
      sortAccessor: (d) => tsOf(d.date),
      render: (_v, d) => <span style={st.date}>{fmtDate(d.date)}</span>,
    },
    {
      key: '_action', header: '작업', width: '90px', align: 'center', system: true,
      render: () => <span style={st.linkAction}>목록에서 보기</span>,
    },
  ], []);

  return (
    <div>
      {/* 1. 새로 공급 가능한 상품 */}
      <FeedSection
        title="새로 공급 가능한 상품"
        viewAllLabel="상품 전체 보기"
        onViewAll={() => navigate('/store-hub/b2b')}
        state={products}
        emptyText="현재 새로 공급 가능한 상품이 없습니다."
        onRetry={loadProducts}
      >
        <DataTable<CatalogProduct>
          columns={productColumns}
          data={products.items}
          rowKey="id"
          tableId="kpa-store-hub-home-products"
          emptyMessage="현재 새로 공급 가능한 상품이 없습니다."
          onRowClick={() => navigate('/store-hub/b2b')}
        />
      </FeedSection>

      {/* 2. 새로운 콘텐츠 */}
      <FeedSection
        title="새로운 콘텐츠"
        viewAllLabel="콘텐츠 전체 보기"
        onViewAll={() => navigate('/store-hub/content')}
        state={contents}
        emptyText="현재 새로 제공되는 콘텐츠가 없습니다."
        onRetry={loadContents}
      >
        <DataTable<ContentFeedItem>
          columns={contentColumns}
          data={contents.items}
          rowKey="key"
          tableId="kpa-store-hub-home-contents"
          emptyMessage="현재 새로 제공되는 콘텐츠가 없습니다."
          onRowClick={() => navigate('/store-hub/content')}
        />
      </FeedSection>

      {/* 3. 새로운 디지털 자료
          POP/QR/동영상/사이니지 4개 도메인 병합 — 통합 전체 목록 route 가 없으므로
          섹션 헤더에 유형별 전체 목록 링크를 제공한다(신규 route 생성 없음). */}
      <FeedSection
        title="새로운 디지털 자료"
        state={digital}
        emptyText="현재 새로 제공되는 디지털 자료가 없습니다."
        onRetry={loadDigital}
        headerExtra={
          <span style={st.viewAllGroup}>
            {DIGITAL_KINDS.map((k) => (
              <button key={k} type="button" style={st.viewAll} onClick={() => navigate(DIGITAL_META[k].route)}>
                {DIGITAL_META[k].label} 전체 보기 →
              </button>
            ))}
          </span>
        }
      >
        <DataTable<DigitalFeedItem>
          columns={digitalColumns}
          data={digital.items}
          rowKey="key"
          tableId="kpa-store-hub-home-digital"
          emptyMessage="현재 새로 제공되는 디지털 자료가 없습니다."
          onRowClick={(d) => navigate(DIGITAL_META[d.kind].route)}
        />
      </FeedSection>

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
  /** viewAll 대신 헤더 우측에 커스텀 노드(유형별 링크 등) */
  headerExtra?: ReactNode;
  state: SectionState<T>;
  emptyText: string;
  onRetry: () => void;
  children: ReactNode;
}
function FeedSection<T>({ title, viewAllLabel, onViewAll, headerExtra, state, emptyText, onRetry, children }: FeedSectionProps<T>) {
  return (
    <section style={st.section}>
      <div style={st.sectionHead}>
        <h2 style={st.sectionTitle}>{title}</h2>
        {headerExtra ?? (viewAllLabel && onViewAll && (
          <button type="button" style={st.viewAll} onClick={onViewAll}>{viewAllLabel} →</button>
        ))}
      </div>
      {state.loading ? (
        <div style={st.skeletonBox}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} style={st.skeletonRow} />)}
        </div>
      ) : state.error ? (
        <div style={st.stateBox}>
          <span style={{ color: NEUTRAL500, fontSize: '0.8125rem' }}>불러오지 못했습니다.</span>
          <button type="button" style={st.retryBtn} onClick={onRetry}><RefreshCw size={13} /> 다시 시도</button>
        </div>
      ) : state.items.length === 0 ? (
        <div style={st.stateBox}><span style={{ color: NEUTRAL400, fontSize: '0.8125rem' }}>{emptyText}</span></div>
      ) : (
        children
      )}
    </section>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────
const st: Record<string, CSSProperties> = {
  section: { marginBottom: 28 },
  sectionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: NEUTRAL900, margin: 0 },
  viewAll: { background: 'none', border: 'none', color: PRIMARY, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' },
  viewAllGroup: { display: 'inline-flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  skeletonBox: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, backgroundColor: WHITE, border: `1px solid ${NEUTRAL200}`, borderRadius: 10 },
  skeletonRow: { height: 32, borderRadius: 6, backgroundColor: NEUTRAL100 },
  stateBox: { display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', backgroundColor: WHITE, border: `1px solid ${NEUTRAL200}`, borderRadius: 10 },
  retryBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: '0.75rem', color: PRIMARY, background: WHITE, border: `1px solid ${PRIMARY}`, borderRadius: 6, cursor: 'pointer' },
  // 셀
  nameCell: { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' },
  miniThumb: { flexShrink: 0, width: 20, height: 20, borderRadius: 4, backgroundColor: NEUTRAL100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  miniThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  nameText: { fontSize: '0.8125rem', fontWeight: 600, color: NEUTRAL900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
  newBadgeInline: { flexShrink: 0, fontSize: '0.625rem', fontWeight: 700, color: '#EF4444', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', padding: '1px 5px', borderRadius: 4 },
  chip: { display: 'inline-block', fontSize: '0.6875rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' },
  sub: { fontSize: '0.75rem', color: NEUTRAL500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' },
  price: { fontSize: '0.8125rem', fontWeight: 700, color: NEUTRAL900, whiteSpace: 'nowrap' },
  date: { fontSize: '0.75rem', color: NEUTRAL400, whiteSpace: 'nowrap' },
  muted: { fontSize: '0.75rem', color: NEUTRAL400 },
  linkAction: { fontSize: '0.75rem', fontWeight: 600, color: PRIMARY, whiteSpace: 'nowrap' },
  footnote: { fontSize: '0.75rem', color: NEUTRAL400, padding: '12px 0 32px', lineHeight: 1.6 },
};

export default StoreHubLatestFeed;
