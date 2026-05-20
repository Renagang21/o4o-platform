/**
 * ForumHubSection - 포럼 채널 목록 (테이블/리스트형)
 *
 * WO-KPA-FORUM-HUB-V2-PHASE1 + PHASE2 (원본 로직 유지)
 * WO-O4O-KPA-FORUM-LIST-TABLE-ALIGNMENT-V1:
 *   카드형 그리드 → 테이블형 리스트로 변경.
 *   정렬 탭(전체/최근 활동/인기/내가 참여한), 태그 필터 구조 유지.
 *   데이터 페치/필터 로직 변경 없음.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import { useAuth } from '../../contexts/AuthContext';
import { BaseTable, type O4OColumn } from '@o4o/ui';
import type { ForumHubItem } from '../../types';
import { colors, spacing, typography } from '../../styles/theme';

const BASE_SORT_TABS = [
  { key: 'default', label: '전체' },
  { key: 'recent', label: '최근 활동' },
  { key: 'popular', label: '인기' },
];

const JOINED_TAB = { key: 'joined', label: '내가 참여한' };

interface Props {
  prefetchedForums?: ForumHubItem[];
  loading?: boolean;
}

export function ForumHubSection({ prefetchedForums, loading: parentLoading }: Props) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [forums, setForums] = useState<ForumHubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<string>('default');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const sortTabs = isAuthenticated ? [...BASE_SORT_TABS, JOINED_TAB] : BASE_SORT_TABS;
  const initialLoaded = useRef(false);

  // 현재 허브 데이터에서 실제 사용 중인 태그를 유니크 추출
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    forums.forEach((f) => (f.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [forums]);

  // 정렬 결과에 태그 필터 후처리
  const filteredForums = useMemo(() => {
    if (!selectedTag) return forums;
    return forums.filter((f) => (f.tags || []).includes(selectedTag));
  }, [forums, selectedTag]);

  // Initial load from prefetch
  useEffect(() => {
    if (prefetchedForums && !initialLoaded.current) {
      setForums(prefetchedForums);
      setLoading(false);
      initialLoaded.current = true;
      return;
    }
    if (!initialLoaded.current) {
      fetchForums('default');
      initialLoaded.current = true;
    }
  }, [prefetchedForums]);

  // Reset to default tab if logged out while on joined tab
  useEffect(() => {
    if (!isAuthenticated && sort === 'joined') {
      setSort('default');
    }
  }, [isAuthenticated, sort]);

  // Re-fetch when sort changes (after initial load)
  useEffect(() => {
    if (!initialLoaded.current) return;
    fetchForums(sort);
  }, [sort]);

  function fetchForums(sortVal: string) {
    setLoading(true);
    const params: { sort?: string } = {};
    if (sortVal !== 'default') params.sort = sortVal;
    homeApi.getForumHub(Object.keys(params).length > 0 ? params : undefined)
      .then((res) => { if (res.data) setForums(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  const isLoading = parentLoading ?? loading;

  // ── 컬럼 정의 ──────────────────────────────────────────────────────────────

  const columns = useMemo((): O4OColumn<ForumHubItem>[] => [
    // 포럼명 (아이콘 + 이름 + 설명 + 태그)
    {
      key: 'name',
      header: '포럼명',
      render: (_v, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, color: '#111827' }}>
            {row.iconEmoji && <span>{row.iconEmoji}</span>}
            <span>{row.name}</span>
          </div>
          {/* 공개 포럼만 설명 표시 — 회원제 포럼은 최소 정보만 노출 */}
          {row.forumType !== 'closed' && row.description && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.description}
            </div>
          )}
          {Array.isArray(row.tags) && row.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {row.tags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => { e.stopPropagation(); setSelectedTag(selectedTag === tag ? null : tag); }}
                  style={{
                    padding: '2px 8px', fontSize: 11, fontWeight: 500,
                    borderRadius: 999,
                    border: `1px solid ${selectedTag === tag ? colors.primary : '#e2e8f0'}`,
                    background: selectedTag === tag ? '#EFF6FF' : '#f8fafc',
                    color: selectedTag === tag ? colors.primary : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
    // 개설자
    {
      key: 'creatorName',
      header: '개설자',
      width: '100px',
      render: (val) => (
        <span style={{ fontSize: 13, color: '#374151' }}>{(val as string) || '-'}</span>
      ),
    },
    // 공개범위 + 멤버십 상태 (WO-O4O-KPA-FORUM-MEMBERSHIP-UX-ENHANCEMENT-V1)
    {
      key: 'forumType',
      header: '공개범위',
      width: '110px',
      align: 'center' as const,
      render: (_v, row) => {
        const isClosed = row.forumType === 'closed';
        if (!isClosed) {
          return (
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 999,
              fontSize: 11, fontWeight: 600,
              background: '#d1fae5', color: '#065f46',
            }}>
              공개
            </span>
          );
        }
        const ms = row.myMembershipStatus;
        if (ms === 'owner') {
          return (
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 999,
              fontSize: 11, fontWeight: 600,
              background: '#fef9c3', color: '#854d0e',
            }}>
              👑 개설자
            </span>
          );
        }
        if (ms === 'member') {
          return (
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 999,
              fontSize: 11, fontWeight: 600,
              background: '#dcfce7', color: '#166534',
            }}>
              ✅ 가입됨
            </span>
          );
        }
        if (ms === 'pending') {
          return (
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 999,
              fontSize: 11, fontWeight: 600,
              background: '#fefce8', color: '#854d0e',
            }}>
              ⏳ 승인 대기
            </span>
          );
        }
        return (
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            background: '#fff7ed', color: '#9a3412',
          }}>
            🔒 가입 필요
          </span>
        );
      },
    },
    // 참여자 수 (가입제 포럼만 표시)
    {
      key: 'memberCount',
      header: '참여자',
      width: '70px',
      align: 'center' as const,
      render: (_v, row) => (
        <span style={{ fontSize: 13, color: '#374151' }}>
          {row.forumType === 'closed' ? `${row.memberCount}명` : '-'}
        </span>
      ),
    },
    // 글 수
    {
      key: 'postCount',
      header: '글 수',
      width: '70px',
      align: 'center' as const,
      render: (val) => (
        <span style={{ fontSize: 13, color: '#374151' }}>{(val as number) ?? 0}</span>
      ),
    },
    // 액션
    {
      key: '_actions',
      header: '',
      width: '90px',
      align: 'center' as const,
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <Link
          to={`/forum/${row.slug}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-block', padding: '5px 14px',
            fontSize: 12, fontWeight: 600,
            color: colors.primary, background: '#EFF6FF',
            border: `1px solid ${colors.primary}`,
            borderRadius: 6, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          바로 보기
        </Link>
      ),
    },
  ], [selectedTag]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section style={{ padding: `${spacing.xl} 0` }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <h2 style={{ ...typography.headingM, color: colors.neutral900, margin: 0 }}>포럼</h2>
        <Link to="/forum/all" style={{ fontSize: '0.875rem', color: colors.primary, textDecoration: 'none' }}>
          전체 보기 →
        </Link>
      </div>

      {/* 정렬 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: spacing.sm }}>
        {sortTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSort(tab.key)}
            style={{
              background: sort === tab.key ? '#EFF6FF' : 'none',
              border: 'none',
              padding: '6px 12px', fontSize: '0.813rem', fontWeight: 500,
              color: sort === tab.key ? colors.primary : colors.neutral400,
              cursor: 'pointer', borderRadius: 6,
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 태그 필터 바 */}
      {availableTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
          <button
            onClick={() => setSelectedTag(null)}
            style={{
              background: selectedTag === null ? '#EFF6FF' : 'none',
              border: `1px solid ${selectedTag === null ? colors.primary : colors.neutral200}`,
              padding: '4px 10px', fontSize: '0.75rem', fontWeight: 500,
              color: selectedTag === null ? colors.primary : colors.neutral500,
              cursor: 'pointer', borderRadius: 999,
              transition: 'all 0.15s ease',
            }}
          >
            전체
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              style={{
                background: selectedTag === tag ? '#EFF6FF' : 'none',
                border: `1px solid ${selectedTag === tag ? colors.primary : colors.neutral200}`,
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 500,
                color: selectedTag === tag ? colors.primary : colors.neutral500,
                cursor: 'pointer', borderRadius: 999,
                transition: 'all 0.15s ease',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* 포럼 테이블 */}
      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: colors.neutral500 }}>
          불러오는 중...
        </div>
      ) : filteredForums.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: colors.neutral500 }}>
          {selectedTag
            ? `'${selectedTag}' 태그에 해당하는 포럼이 없습니다.`
            : sort === 'joined'
              ? '참여한 포럼이 없습니다. 글이나 댓글을 작성하면 여기에 표시됩니다.'
              : '아직 개설된 포럼이 없습니다.'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <BaseTable<ForumHubItem>
            columns={columns}
            data={filteredForums}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/forum/${row.slug}`)}
          />
        </div>
      )}
    </section>
  );
}
