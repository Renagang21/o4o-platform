/**
 * ContentListPage — 콘텐츠 허브 (섹션 기반)
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-CONTENT-HUB-TEMPLATE-TYPE-ALIGNMENT-V1
 * WO-KPA-CONTENT-LIST-TABS-ALIGN-WITH-CREATE-TYPES-V1
 * WO-KPA-CONTENT-SECTION-CREATE-FLOW-ALIGN-V1 (Phase 1: 등록 흐름 정렬)
 * WO-KPA-CONTENT-HUB-SECTION-UI-V1 (Phase 2: 섹션 허브 UI 전환)
 *
 * /content를 3개 섹션의 허브로 표시:
 *   1. 문서형 콘텐츠 — 메인 섹션 (리스트, 등록/상세/링크/수정/삭제)
 *   2. 코스형 자료  — 두 번째 섹션 (리스트, 등록 + 더보기)
 *   3. 설문조사     — 세 번째 섹션 (카드 preview 6개, 등록 + 더보기)
 *
 * 데이터 소스:
 *   - 문서: contentApi.list (content_type='information', sub_type='content')
 *   - 코스: lmsInstructorApi.myCourses (Phase 3에서 코스형/강의 분리)
 *   - 설문: participationApi.getParticipationSets
 *
 * 권한: 작성자만 수정/삭제 노출 (createdBy === currentUserId)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { contentApi, type ContentItem } from '../../api/content';
import { participationApi } from '../../api/participation';
import { lmsInstructorApi } from '../../api/lms-instructor';
import type { ParticipationSet } from '../participation/types';
import type { Course } from '../../api/lms-instructor';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Row Action Menu (문서 섹션 전용) ─────────────────────────────────────────

function RowActionMenu({
  onView,
  onCopyLink,
  onEdit,
  onDelete,
  isOwner,
}: {
  onView: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={styles.menuBtn}
        title="액션"
      >
        ···
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div style={styles.dropdown}>
            <button style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}>
              상세보기
            </button>
            <button style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); setOpen(false); onCopyLink(); }}>
              링크 복사
            </button>
            {isOwner && (
              <button style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}>
                수정
              </button>
            )}
            {isOwner && (
              <button
                style={{ ...styles.dropdownItem, color: '#ef4444' }}
                onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              >
                삭제
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section Header (공통) ────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
  primaryAction,
  moreLink,
}: {
  title: string;
  description?: string;
  primaryAction?: { label: string; to: string };
  moreLink?: { label: string; to: string };
}) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {description && <p style={styles.sectionDesc}>{description}</p>}
      </div>
      <div style={styles.sectionActions}>
        {moreLink && (
          <Link to={moreLink.to} style={styles.moreLink}>
            {moreLink.label} →
          </Link>
        )}
        {primaryAction && (
          <Link to={primaryAction.to} style={styles.primaryBtn}>
            {primaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Section 1: 문서형 콘텐츠 ─────────────────────────────────────────────────

function DocumentsSection({
  currentUserId,
  isAuthenticated,
  refreshKey,
  onChanged,
}: {
  currentUserId?: string;
  isAuthenticated: boolean;
  refreshKey: number;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    contentApi.list({
      page: 1,
      limit: 10,
      sort: 'latest',
      content_type: 'information',
      sub_type: 'content',
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data?.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleCopyLink = useCallback((id: string) => {
    const url = `${window.location.origin}/content/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('링크가 복사되었습니다'))
      .catch(() => toast.error('링크 복사에 실패했습니다'));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('이 콘텐츠를 삭제하시겠습니까?')) return;
    try {
      await contentApi.remove(id);
      toast.success('삭제되었습니다');
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, [onChanged]);

  return (
    <section style={styles.section}>
      <SectionHeader
        title="문서형 콘텐츠"
        description="리치 텍스트 편집기로 작성한 문서"
        primaryAction={isAuthenticated ? { label: '+ 새 문서', to: '/content/documents/new' } : undefined}
      />

      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.placeholder}>불러오는 중...</div>
        ) : items.length === 0 ? (
          <div style={styles.placeholder}>아직 문서가 없습니다</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>제목</th>
                <th style={{ ...styles.th, width: 96 }}>작성자</th>
                <th style={{ ...styles.th, width: 100 }}>작성일</th>
                <th style={{ ...styles.th, width: 56, textAlign: 'center' }}>조회</th>
                <th style={{ ...styles.th, width: 56, textAlign: 'center' }}>좋아요</th>
                <th style={{ ...styles.th, width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isOwner = !!(currentUserId && item.created_by === currentUserId);
                return (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/content/${item.id}`)}
                    style={styles.row}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                  >
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{item.title}</span>
                    </td>
                    <td style={{ ...styles.td, color: '#64748b', fontSize: '0.8125rem' }}>{item.author_name || '-'}</td>
                    <td style={{ ...styles.td, color: '#94a3b8', fontSize: '0.8125rem' }}>{formatDate(item.created_at)}</td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>👁 {item.view_count ?? 0}</td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>👍 {item.like_count ?? 0}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu
                        isOwner={isOwner}
                        onView={() => navigate(`/content/${item.id}`)}
                        onCopyLink={() => handleCopyLink(item.id)}
                        onEdit={() => navigate(`/content/${item.id}/edit`)}
                        onDelete={() => handleDelete(item.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// ─── Section 2: 코스형 자료 ──────────────────────────────────────────────────

function CoursesSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    lmsInstructorApi.myCourses(1, 10)
      .then((res: any) => {
        if (cancelled) return;
        // axios response shape: res.data = { success, data: Course[] }
        const list = res?.data?.data ?? [];
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCourses([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section style={styles.section}>
      <SectionHeader
        title="코스형 자료"
        description="목록형으로 구성된 분량 많은 콘텐츠"
        primaryAction={isAuthenticated ? { label: '+ 새 코스형 자료', to: '/content/courses/new' } : undefined}
        moreLink={{ label: '전체 보기', to: '/content/courses' }}
      />

      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.placeholder}>불러오는 중...</div>
        ) : courses.length === 0 ? (
          <div style={styles.placeholder}>아직 코스형 자료가 없습니다</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>제목</th>
                <th style={{ ...styles.th, width: 80 }}>레슨</th>
                <th style={{ ...styles.th, width: 100 }}>작성일</th>
                <th style={{ ...styles.th, width: 80 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/instructor/courses/${c.id}`)}
                  style={styles.row}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                >
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{c.title}</span>
                  </td>
                  <td style={{ ...styles.td, color: '#64748b', fontSize: '0.8125rem' }}>{c.duration > 0 ? `${c.duration}분` : '-'}</td>
                  <td style={{ ...styles.td, color: '#94a3b8', fontSize: '0.8125rem' }}>{formatDate(c.createdAt)}</td>
                  <td style={{ ...styles.td }}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: c.status === 'published' ? '#ecfdf5' : '#f1f5f9',
                      color: c.status === 'published' ? '#047857' : '#64748b',
                    }}>
                      {c.status === 'published' ? '공개' : c.status === 'archived' ? '보관' : '초안'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// ─── Section 3: 설문조사 ──────────────────────────────────────────────────────

function SurveysSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<ParticipationSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    participationApi.getParticipationSets({ page: 1, limit: 6 })
      .then((res) => {
        if (cancelled) return;
        // PaginatedResponse: { items: T[], total, page, limit, totalPages } 또는 axios wrapping
        const payload = (res as any)?.data ?? res;
        const list = payload?.items ?? payload?.data?.items ?? [];
        setSurveys(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (cancelled) return;
        setSurveys([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section style={styles.section}>
      <SectionHeader
        title="설문조사"
        description="구성원 의견을 수집하는 설문"
        primaryAction={isAuthenticated ? { label: '+ 새 설문', to: '/content/surveys/new' } : undefined}
        moreLink={{ label: '전체 보기', to: '/content/surveys' }}
      />

      {loading ? (
        <div style={{ ...styles.tableWrap, padding: 0 }}>
          <div style={styles.placeholder}>불러오는 중...</div>
        </div>
      ) : surveys.length === 0 ? (
        <div style={{ ...styles.tableWrap, padding: 0 }}>
          <div style={styles.placeholder}>아직 설문이 없습니다</div>
        </div>
      ) : (
        <div style={styles.cardGrid}>
          {surveys.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/participation/${s.id}/respond`)}
              style={styles.card}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; }}
            >
              <div style={styles.cardTitle}>{s.title}</div>
              {s.description && <div style={styles.cardDesc}>{s.description}</div>}
              <div style={styles.cardMeta}>
                <span>질문 {s.questions?.length ?? 0}개</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: s.status === 'active' ? '#ecfdf5' : s.status === 'closed' ? '#fef2f2' : '#f1f5f9',
                  color: s.status === 'active' ? '#047857' : s.status === 'closed' ? '#b91c1c' : '#64748b',
                }}>
                  {s.status === 'active' ? '진행중' : s.status === 'closed' ? '종료' : '초안'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentListPage() {
  const { user, isAuthenticated } = useAuth();

  // 문서 섹션의 삭제 후 재조회 트리거
  const [refreshKey, setRefreshKey] = useState(0);
  const handleDocumentsChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.heroHeader}>
        <h1 style={styles.heroTitle}>콘텐츠</h1>
        <p style={styles.heroDesc}>문서·코스형 자료·설문을 한 곳에서 관리합니다.</p>
      </header>

      <DocumentsSection
        currentUserId={user?.id}
        isAuthenticated={isAuthenticated}
        refreshKey={refreshKey}
        onChanged={handleDocumentsChanged}
      />

      <CoursesSection isAuthenticated={isAuthenticated} />

      <SurveysSection isAuthenticated={isAuthenticated} />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 16px 60px',
  },
  heroHeader: {
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px',
  },
  heroDesc: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: 0,
  },

  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px',
  },
  sectionDesc: {
    fontSize: '0.8125rem',
    color: '#64748b',
    margin: 0,
  },
  sectionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  moreLink: {
    fontSize: '0.8125rem',
    color: '#475569',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },

  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  placeholder: {
    padding: '32px 16px',
    fontSize: '0.875rem',
    color: '#94a3b8',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    padding: '10px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
  },
  td: {
    padding: '12px',
    fontSize: '0.875rem',
    color: '#0f172a',
    borderBottom: '1px solid #f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: 4,
  },

  // RowActionMenu
  menuBtn: {
    padding: '2px 8px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#64748b',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    cursor: 'pointer',
    letterSpacing: 2,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: 4,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    zIndex: 20,
    minWidth: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#334155',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
  },

  // Survey cards
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 12,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s',
    minHeight: 100,
  },
  cardTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    width: '100%',
  },
  cardDesc: {
    fontSize: '0.8125rem',
    color: '#64748b',
    marginBottom: 12,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    width: '100%',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: 'auto',
  },
};

export default ContentListPage;
