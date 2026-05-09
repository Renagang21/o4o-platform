/**
 * StoreLibraryContentsPage — 내 자료함 / 콘텐츠
 *
 * WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1: checkbox + 제작 시작 진입
 * WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: lesson 항목(LMS 강의 reference metadata) 표시 + type filter
 * WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: lesson 인라인 표시를 LessonCardPreview 공용 컴포넌트로 교체
 * WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: KPA 콘텐츠 허브 가져온 항목(asset_type='content') 표시.
 *   "콘텐츠" 필터에서 'cms'(레거시 CmsContent)와 'content'(kpa_contents)를 통합 표시.
 *
 * 매장이 보유한 콘텐츠 source/reference 저장소.
 * - 커뮤니티에서 가져온 snapshot-based 콘텐츠 (asset_type='cms' / 'content')
 * - LMS 강의 메타데이터 (asset_type='lesson') — Reference Metadata, lesson body 미포함
 * - 매장이 직접 작성한 direct 콘텐츠
 *
 * 본 페이지는 제작 시작 단일 진입점:
 *   자료 선택 → "제작 시작" → modal (POP/QR/블로그/상품 상세설명) → 편집기 route 이동
 */

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, Trash2, RefreshCw, FileText, Sparkles } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { LessonCardPreview, type LessonSnapshotContent } from '@o4o/shared-space-ui';
import {
  storeAssetControlApi,
  directContentApi,
  type StoreAssetItem,
} from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource } from './StartProductionModal';

// WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1 / WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
// type filter — 매장 운영자가 "전체 / 콘텐츠 / 강의"로 보기 좁히기. 강좌형 콘텐츠는 별도 메뉴 신설하지 않고
// 본 페이지 안에서 type 분류만으로 노출한다([storeMenuConfig.ts:212] design intent).
// "콘텐츠" 필터는 'cms'(레거시 platform CMS) + 'content'(KPA 콘텐츠 허브 가져옴) 통합 표시.
type SnapshotTypeFilter = 'all' | 'content' | 'lesson';

interface DirectItem {
  id: string;
  sourceType: string;
  snapshotId: string | null;
  title: string;
  updatedAt: string;
}

type SelectionKey = string; // `${origin}:${id}`

const keyOf = (origin: 'snapshot' | 'direct', id: string): SelectionKey => `${origin}:${id}`;

export default function StoreLibraryContentsPage() {
  const [snapshots, setSnapshots] = useState<StoreAssetItem[]>([]);
  const [directs, setDirects] = useState<DirectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<SelectionKey>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);
  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: snapshot type filter (전체/콘텐츠/강의)
  const [typeFilter, setTypeFilter] = useState<SnapshotTypeFilter>('all');

  const changeTypeFilter = (next: SnapshotTypeFilter) => {
    if (next === typeFilter) return;
    setTypeFilter(next);
    // 필터 전환 시 이전 선택 초기화 — 보이지 않는 항목이 selected에 남아있는 것 방지
    setSelected(new Set());
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1 / WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
      // cms / content / lesson 세 type 병렬 fetch.
      //   - cms     : 레거시 platform CmsContent 기반
      //   - content : KPA 콘텐츠 허브(kpa_contents) 가져옴 — 신규 표준
      //   - lesson  : LMS 강의 reference metadata
      // signage는 본 페이지(콘텐츠) 범위 외이므로 미요청.
      const emptyPage = { items: [] as StoreAssetItem[], total: 0, page: 1, limit: 200 };
      const [cmsRes, contentRes, lessonRes, directRes] = await Promise.all([
        storeAssetControlApi.list({ type: 'cms', limit: 200 }).catch(() => ({ data: emptyPage })),
        storeAssetControlApi.list({ type: 'content', limit: 200 }).catch(() => ({ data: emptyPage })),
        storeAssetControlApi.list({ type: 'lesson', limit: 200 }).catch(() => ({ data: emptyPage })),
        directContentApi.list().catch(() => ({ data: [] as DirectItem[] })),
      ]);
      const merged = [
        ...(cmsRes.data?.items ?? []),
        ...(contentRes.data?.items ?? []),
        ...(lessonRes.data?.items ?? []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSnapshots(merged);
      const directItems = (directRes.data || []).filter((it: DirectItem) => it.sourceType === 'direct');
      setDirects(directItems);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || '불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDeleteDirect = async (id: string) => {
    if (!confirm('이 콘텐츠를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await directContentApi.remove(id);
      setDirects((prev) => prev.filter((it) => it.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(keyOf('direct', id));
        return next;
      });
      toast.success('삭제되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleOne = (key: SelectionKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1 / WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
  // filter 적용된 snapshot 목록 + direct는 typeFilter='lesson' 시 제외.
  // "콘텐츠" 필터는 cms(레거시) + content(KPA 콘텐츠 허브) 통합 표시.
  const filteredSnapshots = useMemo<StoreAssetItem[]>(() => {
    if (typeFilter === 'all') return snapshots;
    if (typeFilter === 'content') {
      return snapshots.filter((s) => s.assetType === 'cms' || s.assetType === 'content');
    }
    return snapshots.filter((s) => s.assetType === typeFilter);
  }, [snapshots, typeFilter]);

  const filteredDirects = useMemo<DirectItem[]>(() => {
    // direct 콘텐츠는 cms 분류로 본다 — '강의' 필터에서는 직접 작성 콘텐츠를 제외.
    if (typeFilter === 'lesson') return [];
    return directs;
  }, [directs, typeFilter]);

  const allKeys = useMemo<SelectionKey[]>(
    () => [
      ...filteredDirects.map((it) => keyOf('direct', it.id)),
      ...filteredSnapshots.map((it) => keyOf('snapshot', it.id)),
    ],
    [filteredDirects, filteredSnapshots],
  );

  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allKeys));
  };

  const handleStartProduction = () => {
    if (selected.size === 0) return;
    const items: ProductionSource['items'] = [];
    for (const key of selected) {
      const [origin, id] = key.split(':') as ['snapshot' | 'direct', string];
      if (origin === 'direct') {
        const it = directs.find((d) => d.id === id);
        if (it) items.push({ id: it.id, title: it.title, origin: 'direct' });
      } else {
        const it = snapshots.find((s) => s.id === id);
        if (it) items.push({ id: it.id, title: it.title, origin: 'snapshot' });
      }
    }
    setModalSource({ fromLibrary: 'contents', items });
    setModalOpen(true);
  };

  const handleBulkDelete = async () => {
    const directIds: string[] = [];
    for (const key of selected) {
      const [origin, id] = key.split(':') as ['snapshot' | 'direct', string];
      if (origin === 'direct') directIds.push(id);
      // snapshot 삭제는 본 단계에서는 미지원 (snapshot lifecycle 별도)
    }
    if (directIds.length === 0) {
      toast.error('선택 항목 중 삭제 가능한 직접 작성 콘텐츠가 없습니다');
      return;
    }
    if (!confirm(`선택한 ${directIds.length}개 콘텐츠를 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(directIds.map((id) => directContentApi.remove(id)));
      setDirects((prev) => prev.filter((it) => !directIds.includes(it.id)));
      setSelected(new Set());
      toast.success(`${directIds.length}개 삭제되었습니다`);
    } catch (e: any) {
      toast.error(e?.message || '일괄 삭제에 실패했습니다');
    }
  };

  const totalCount = filteredSnapshots.length + filteredDirects.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>콘텐츠</span>
          </div>
          <h1 style={styles.title}>
            <BookOpen size={20} style={{ color: colors.primary }} />
            콘텐츠
          </h1>
          <p style={styles.subtitle}>
            보유한 콘텐츠를 선택하여 POP / QR / 블로그 / 상품 상세설명 제작을 시작합니다.
          </p>
        </div>
        <button onClick={fetchAll} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1 / WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
          type filter — 전체 / 콘텐츠 / 강의. "콘텐츠"는 cms+content 통합. */}
      <div style={styles.filterBar}>
        {(['all', 'content', 'lesson'] as const).map((type) => {
          const label = type === 'all' ? '전체' : type === 'content' ? '콘텐츠' : '강의';
          const isActive = typeFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => changeTypeFilter(type)}
              style={{
                ...styles.filterChip,
                ...(isActive ? styles.filterChipActive : null),
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Batch toolbar */}
      {totalCount > 0 && (
        <div style={styles.toolbar}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={styles.checkbox}
            />
            전체 선택 ({selected.size}/{totalCount})
          </label>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleStartProduction}
            disabled={selected.size === 0}
            style={{ ...styles.startBtn, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            <Sparkles size={14} />
            제작 시작
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selected.size === 0}
            style={{ ...styles.bulkDeleteBtn, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            <Trash2 size={14} />
            선택 삭제
          </button>
        </div>
      )}

      {loading ? (
        <div style={styles.empty}>불러오는 중...</div>
      ) : totalCount === 0 ? (
        <div style={styles.empty}>
          <BookOpen size={32} style={{ color: colors.neutral300, marginBottom: 12 }} />
          <p style={{ margin: 0, color: colors.neutral500, fontSize: 14 }}>
            보관된 콘텐츠가 없습니다.
          </p>
          <p style={{ margin: '6px 0 0', color: colors.neutral400, fontSize: 12 }}>
            커뮤니티 콘텐츠 페이지에서 "내 매장으로 가져오기"를 눌러 추가할 수 있습니다.
          </p>
        </div>
      ) : (
        <>
          {filteredDirects.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>
                내 매장 작성 ({filteredDirects.length})
                <span style={{ ...styles.badge, background: '#DCFCE7', color: '#16A34A' }}>직접 작성</span>
              </h2>
              <ul style={styles.list}>
                {filteredDirects.map((item) => {
                  const k = keyOf('direct', item.id);
                  return (
                    <li key={item.id} style={styles.listItem}>
                      <input
                        type="checkbox"
                        checked={selected.has(k)}
                        onChange={() => toggleOne(k)}
                        style={styles.checkbox}
                        aria-label={`${item.title} 선택`}
                      />
                      <div style={styles.itemMain}>
                        <FileText size={16} style={{ color: colors.accentGreen, flexShrink: 0 }} />
                        <Link to={`/store/content/direct/${item.id}`} style={styles.itemTitle}>
                          {item.title}
                        </Link>
                      </div>
                      <div style={styles.itemMeta}>
                        <span style={styles.metaText}>
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : ''}
                        </span>
                        <button
                          onClick={() => handleDeleteDirect(item.id)}
                          disabled={deletingId === item.id}
                          style={styles.deleteBtn}
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {filteredSnapshots.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>
                {/* WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: 섹션 라벨을 lesson 포함으로 일반화 */}
                가져온 콘텐츠 / 강의 ({filteredSnapshots.length})
                <span style={{ ...styles.badge, background: '#EFF6FF', color: '#2563EB' }}>snapshot</span>
              </h2>
              <ul style={styles.list}>
                {filteredSnapshots.map((item) => {
                  const k = keyOf('snapshot', item.id);
                  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: lesson은 Reference Metadata.
                  // WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: lesson 항목은 공용 LessonCardPreview를 사용.
                  if (item.assetType === 'lesson') {
                    const lessonSnap = item.contentJson as LessonSnapshotContent | undefined;
                    if (!lessonSnap || typeof lessonSnap !== 'object') return null;
                    return (
                      <li key={item.id} style={styles.lessonListItem}>
                        <input
                          type="checkbox"
                          checked={selected.has(k)}
                          onChange={() => toggleOne(k)}
                          style={styles.checkbox}
                          aria-label={`${item.title} 선택`}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <LessonCardPreview
                            snapshot={lessonSnap}
                            variant="compact"
                            rightSlot={
                              item.lifecycleStatus === 'archived' ? (
                                <span style={{ ...styles.badge, background: '#FEF3C7', color: '#D97706' }}>보관</span>
                              ) : item.lifecycleStatus === 'expired' ? (
                                <span style={{ ...styles.badge, background: '#FEE2E2', color: '#DC2626' }}>만료</span>
                              ) : null
                            }
                          />
                        </div>
                      </li>
                    );
                  }
                  // 기존 cms snapshot — 인라인 1줄 표시 (변경 없음)
                  return (
                    <li key={item.id} style={styles.listItem}>
                      <input
                        type="checkbox"
                        checked={selected.has(k)}
                        onChange={() => toggleOne(k)}
                        style={styles.checkbox}
                        aria-label={`${item.title} 선택`}
                      />
                      <div style={styles.itemMain}>
                        <BookOpen size={16} style={{ color: colors.primary, flexShrink: 0 }} />
                        <Link to={`/view/${item.id}`} style={styles.itemTitle}>
                          {item.title}
                        </Link>
                        {item.lifecycleStatus === 'archived' && (
                          <span style={{ ...styles.badge, background: '#FEF3C7', color: '#D97706' }}>보관</span>
                        )}
                        {item.lifecycleStatus === 'expired' && (
                          <span style={{ ...styles.badge, background: '#FEE2E2', color: '#DC2626' }}>만료</span>
                        )}
                      </div>
                      <div style={styles.itemMeta}>
                        <span style={styles.metaText}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : ''}
                        </span>
                        <Link
                          to={`/view/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.openLink}
                          title="원본 열기"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.neutral400,
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    marginBottom: '12px',
  },
  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  filterChip: {
    padding: '6px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '999px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  filterChipActive: {
    background: '#EDE9FE',
    border: `1px solid #C4B5FD`,
    color: '#5B21B6',
    fontWeight: 600,
  },
  // (lesson inline meta는 LessonCardPreview가 처리하므로 페이지 로컬 스타일 제거)
  selectAllLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  bulkDeleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '10px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '12px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
  },
  // WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1
  // lesson 항목은 LessonCardPreview(자체 border/padding 보유)를 임베드 — 외곽 컨테이너는 체크박스 정렬만 담당.
  lessonListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  itemMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  metaText: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  openLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    color: colors.neutral500,
    borderRadius: '4px',
    textDecoration: 'none',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: colors.neutral400,
    cursor: 'pointer',
    borderRadius: '4px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    textAlign: 'center',
  },
};
