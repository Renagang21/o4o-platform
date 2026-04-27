/**
 * SignageManagerTemplate — Signage Hub 동영상 + 플레이리스트 관리 템플릿
 *
 * WO-O4O-SIGNAGE-HUB-TEMPLATE-FOUNDATION-V1
 *
 * 구조:
 *   Hero    — 타이틀 + 설명 + 탭별 액션 버튼 (동영상 등록 / 플레이리스트 등록)
 *   Tabs    — 동영상 | 플레이리스트
 *   Search  — 제목 검색 (debounce → onVideoSearch/onPlaylistSearch 콜백)
 *   Table   — 동영상: 제목·링크·재생시간·상태·등록일·액션(새창재생/수정/삭제)
 *             플레이리스트: 제목·영상수·총재생시간·상태·수정일·액션(편집/삭제)
 *   Pagination + Empty State
 *
 * 핵심 경계:
 *   template — 렌더링, 탭 UI, 검색 debounce, 페이지네이션 UI
 *   page     — API 호출, 데이터 상태, 모달, 인증 체크
 *
 * 금지: 스케줄·HQ운영·강제노출 탭을 이 Template에 추가하지 말 것
 */

import { useState, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignageHubVideo {
  id: string;
  name: string;
  description?: string | null;
  sourceUrl?: string | null;
  /** sourceUrl fallback */
  url?: string | null;
  duration?: number | null;
  status?: string | null;
  tags?: string[];
  source?: string | null;
  createdAt?: string | null;
  createdByUserId?: string | null;
}

export interface SignageHubPlaylist {
  id: string;
  name: string;
  description?: string | null;
  itemCount: number;
  totalDuration: number;
  status?: string | null;
  tags?: string[];
  source?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdByUserId?: string | null;
}

export interface SignageManagerConfig {
  // Hero
  title: string;
  description?: string;

  // ── 동영상 탭 ──────────────────────────────────────────────────────────────
  videos: SignageHubVideo[];
  videosLoading?: boolean;
  videoTotal: number;
  videoPage: number;
  videoPageLimit?: number;
  onVideoPageChange: (page: number) => void;
  /** debounce 후 호출 — 페이지 쪽에서 re-fetch or 클라이언트 필터 */
  onVideoSearch?: (keyword: string) => void;
  /** 버튼 표시 여부: 있으면 "동영상 등록" 버튼 노출 */
  onAddVideo?: () => void;
  /** 새창 재생 (없으면 sourceUrl 직접 open) */
  onPlayVideo?: (v: SignageHubVideo) => void;
  onEditVideo?: (v: SignageHubVideo) => void;
  onDeleteVideo?: (v: SignageHubVideo) => void;
  /** true를 반환하는 row만 수정/삭제 버튼 노출 */
  canEditVideo?: (v: SignageHubVideo) => boolean;

  // ── 플레이리스트 탭 ────────────────────────────────────────────────────────
  playlists: SignageHubPlaylist[];
  playlistsLoading?: boolean;
  playlistTotal: number;
  playlistPage: number;
  playlistPageLimit?: number;
  onPlaylistPageChange: (page: number) => void;
  onPlaylistSearch?: (keyword: string) => void;
  /** "플레이리스트 등록" 버튼 */
  onAddPlaylist?: () => void;
  /** 제목/행 클릭 — 상세 이동 등 */
  onPlaylistClick?: (p: SignageHubPlaylist) => void;
  onEditPlaylist?: (p: SignageHubPlaylist) => void;
  onDeletePlaylist?: (p: SignageHubPlaylist) => void;
  canEditPlaylist?: (p: SignageHubPlaylist) => boolean;

  // ── 탭 제어 ────────────────────────────────────────────────────────────────
  initialTab?: 'videos' | 'playlists';
  onTabChange?: (tab: 'videos' | 'playlists') => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '-';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SignageManagerTemplate({ config }: { config: SignageManagerConfig }) {
  const [activeTab, setActiveTab] = useState<'videos' | 'playlists'>(
    config.initialTab ?? 'videos',
  );
  const [videoKeyword, setVideoKeyword] = useState('');
  const [playlistKeyword, setPlaylistKeyword] = useState('');
  const videoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playlistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabChange = (tab: 'videos' | 'playlists') => {
    setActiveTab(tab);
    config.onTabChange?.(tab);
  };

  const handleVideoSearchChange = (v: string) => {
    setVideoKeyword(v);
    if (videoDebounceRef.current) clearTimeout(videoDebounceRef.current);
    videoDebounceRef.current = setTimeout(() => {
      config.onVideoSearch?.(v);
    }, 350);
  };

  const handlePlaylistSearchChange = (v: string) => {
    setPlaylistKeyword(v);
    if (playlistDebounceRef.current) clearTimeout(playlistDebounceRef.current);
    playlistDebounceRef.current = setTimeout(() => {
      config.onPlaylistSearch?.(v);
    }, 350);
  };

  const videoPageLimit = config.videoPageLimit ?? 20;
  const playlistPageLimit = config.playlistPageLimit ?? 20;
  const videoTotalPages = Math.max(1, Math.ceil(config.videoTotal / videoPageLimit));
  const playlistTotalPages = Math.max(1, Math.ceil(config.playlistTotal / playlistPageLimit));

  return (
    <div style={st.page}>
      <div style={st.container}>

        {/* ── Hero ── */}
        <header style={st.hero}>
          <div>
            <h1 style={st.heroTitle}>{config.title}</h1>
            {config.description && <p style={st.heroDesc}>{config.description}</p>}
          </div>
          <div style={st.heroAction}>
            {activeTab === 'videos' && config.onAddVideo && (
              <button onClick={config.onAddVideo} style={st.primaryBtn}>+ 동영상 등록</button>
            )}
            {activeTab === 'playlists' && config.onAddPlaylist && (
              <button onClick={config.onAddPlaylist} style={st.primaryBtn}>+ 플레이리스트 등록</button>
            )}
          </div>
        </header>

        {/* ── Tabs ── */}
        <div style={st.tabBar}>
          <button
            onClick={() => handleTabChange('videos')}
            style={activeTab === 'videos' ? st.tabActive : st.tab}
          >
            동영상
            {config.videoTotal > 0 && (
              <span style={{ ...st.tabCount, ...(activeTab === 'videos' ? st.tabCountActive : {}) }}>
                {config.videoTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('playlists')}
            style={activeTab === 'playlists' ? st.tabActive : st.tab}
          >
            플레이리스트
            {config.playlistTotal > 0 && (
              <span style={{ ...st.tabCount, ...(activeTab === 'playlists' ? st.tabCountActive : {}) }}>
                {config.playlistTotal}
              </span>
            )}
          </button>
        </div>

        {/* ── 동영상 탭 ── */}
        {activeTab === 'videos' && (
          <>
            {config.onVideoSearch && (
              <div style={st.searchBar}>
                <input
                  type="text"
                  value={videoKeyword}
                  onChange={(e) => handleVideoSearchChange(e.target.value)}
                  placeholder="제목으로 검색..."
                  style={st.searchInput}
                />
              </div>
            )}
            <VideoTable config={config} />
            <HubPagination
              page={config.videoPage}
              totalPages={videoTotalPages}
              total={config.videoTotal}
              onPageChange={config.onVideoPageChange}
            />
          </>
        )}

        {/* ── 플레이리스트 탭 ── */}
        {activeTab === 'playlists' && (
          <>
            {config.onPlaylistSearch && (
              <div style={st.searchBar}>
                <input
                  type="text"
                  value={playlistKeyword}
                  onChange={(e) => handlePlaylistSearchChange(e.target.value)}
                  placeholder="제목으로 검색..."
                  style={st.searchInput}
                />
              </div>
            )}
            <PlaylistTable config={config} />
            <HubPagination
              page={config.playlistPage}
              totalPages={playlistTotalPages}
              total={config.playlistTotal}
              onPageChange={config.onPlaylistPageChange}
            />
          </>
        )}

      </div>
    </div>
  );
}

export default SignageManagerTemplate;

// ─── Video Table ──────────────────────────────────────────────────────────────

function VideoTable({ config }: { config: SignageManagerConfig }) {
  if (config.videosLoading) return <LoadingState />;
  if (config.videos.length === 0) {
    return (
      <EmptyState
        icon={VideoIcon}
        message="등록된 동영상이 없습니다"
        sub={config.onAddVideo ? '동영상 등록 버튼을 눌러 첫 번째 동영상을 추가하세요.' : undefined}
      />
    );
  }

  return (
    <div style={st.tableWrap}>
      <table style={st.table}>
        <thead>
          <tr>
            <th style={st.th}>제목</th>
            <th style={{ ...st.th, width: 180 }}>영상 링크</th>
            <th style={{ ...st.th, width: 80, textAlign: 'center' as const }}>재생시간</th>
            <th style={{ ...st.th, width: 70, textAlign: 'center' as const }}>상태</th>
            <th style={{ ...st.th, width: 90 }}>등록일</th>
            <th style={{ ...st.th, width: 100, textAlign: 'right' as const }}>액션</th>
          </tr>
        </thead>
        <tbody>
          {config.videos.map((v) => {
            const playUrl = v.sourceUrl || v.url || '';
            const canEdit = config.canEditVideo ? config.canEditVideo(v) : false;
            return (
              <tr key={v.id} style={st.tr}>
                <td style={st.td}>
                  <span style={st.cellTitle}>{v.name}</span>
                  {v.description && <span style={st.cellDesc}>{v.description}</span>}
                  {(v.tags ?? []).length > 0 && (
                    <div style={st.tagRow}>
                      {(v.tags ?? []).slice(0, 2).map((t) => (
                        <span key={t} style={st.tagBadge}>#{t}</span>
                      ))}
                      {(v.tags ?? []).length > 2 && (
                        <span style={st.tagBadge}>+{(v.tags ?? []).length - 2}</span>
                      )}
                    </div>
                  )}
                </td>
                <td style={st.td}>
                  {playUrl ? (
                    <a href={playUrl} target="_blank" rel="noopener noreferrer" style={st.urlLink}>
                      {playUrl}
                    </a>
                  ) : (
                    <span style={{ color: N400, fontSize: 13 }}>-</span>
                  )}
                </td>
                <td style={{ ...st.td, textAlign: 'center' as const, color: N500, fontSize: 13 }}>
                  {formatDuration(v.duration)}
                </td>
                <td style={{ ...st.td, textAlign: 'center' as const }}>
                  <StatusBadge status={v.status} />
                </td>
                <td style={{ ...st.td, fontSize: 13, color: N500 }}>
                  {v.createdAt ? new Date(v.createdAt).toLocaleDateString('ko-KR') : '-'}
                </td>
                <td style={st.td}>
                  <div style={st.actionRow}>
                    {playUrl && (
                      <button
                        onClick={() => config.onPlayVideo ? config.onPlayVideo(v) : window.open(playUrl, '_blank')}
                        style={st.actionBtn}
                        title="새창 재생"
                      >▶</button>
                    )}
                    {canEdit && config.onEditVideo && (
                      <button onClick={() => config.onEditVideo!(v)} style={st.actionBtn} title="수정">✎</button>
                    )}
                    {canEdit && config.onDeleteVideo && (
                      <button onClick={() => config.onDeleteVideo!(v)} style={st.deleteBtn} title="삭제">✕</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Playlist Table ───────────────────────────────────────────────────────────

function PlaylistTable({ config }: { config: SignageManagerConfig }) {
  if (config.playlistsLoading) return <LoadingState />;
  if (config.playlists.length === 0) {
    return (
      <EmptyState
        icon={PlaylistIcon}
        message="등록된 플레이리스트가 없습니다"
        sub={config.onAddPlaylist ? '플레이리스트 등록 버튼을 눌러 첫 번째 플레이리스트를 추가하세요.' : undefined}
      />
    );
  }

  return (
    <div style={st.tableWrap}>
      <table style={st.table}>
        <thead>
          <tr>
            <th style={st.th}>제목</th>
            <th style={{ ...st.th, width: 80, textAlign: 'center' as const }}>영상 수</th>
            <th style={{ ...st.th, width: 100, textAlign: 'center' as const }}>총 재생시간</th>
            <th style={{ ...st.th, width: 70, textAlign: 'center' as const }}>상태</th>
            <th style={{ ...st.th, width: 90 }}>수정일</th>
            <th style={{ ...st.th, width: 100, textAlign: 'right' as const }}>액션</th>
          </tr>
        </thead>
        <tbody>
          {config.playlists.map((p) => {
            const canEdit = config.canEditPlaylist ? config.canEditPlaylist(p) : false;
            return (
              <tr
                key={p.id}
                style={{ ...st.tr, ...(config.onPlaylistClick ? st.trClickable : {}) }}
                onClick={config.onPlaylistClick ? () => config.onPlaylistClick!(p) : undefined}
              >
                <td style={st.td}>
                  <span style={config.onPlaylistClick ? st.cellTitleLink : st.cellTitle}>{p.name}</span>
                  {p.description && <span style={st.cellDesc}>{p.description}</span>}
                  {(p.tags ?? []).length > 0 && (
                    <div style={st.tagRow}>
                      {(p.tags ?? []).slice(0, 2).map((t) => (
                        <span key={t} style={st.tagBadge}>#{t}</span>
                      ))}
                      {(p.tags ?? []).length > 2 && (
                        <span style={st.tagBadge}>+{(p.tags ?? []).length - 2}</span>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ ...st.td, textAlign: 'center' as const, color: N700, fontWeight: 500 }}>
                  {p.itemCount}
                </td>
                <td style={{ ...st.td, textAlign: 'center' as const, color: N500, fontSize: 13 }}>
                  {formatDuration(p.totalDuration)}
                </td>
                <td style={{ ...st.td, textAlign: 'center' as const }}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ ...st.td, fontSize: 13, color: N500 }}>
                  {(p.updatedAt || p.createdAt)
                    ? new Date(p.updatedAt || p.createdAt!).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
                <td
                  style={st.td}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={st.actionRow}>
                    {canEdit && config.onEditPlaylist && (
                      <button onClick={() => config.onEditPlaylist!(p)} style={st.actionBtn} title="편집">✎</button>
                    )}
                    {canEdit && config.onDeletePlaylist && (
                      <button onClick={() => config.onDeletePlaylist!(p)} style={st.deleteBtn} title="삭제">✕</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function HubPagination({ page, totalPages, total, onPageChange }: {
  page: number; totalPages: number; total: number; onPageChange: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div style={st.pagination}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        style={st.pageBtn}
      >이전</button>
      <span style={st.pageInfo}>{page} / {totalPages}</span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        style={st.pageBtn}
      >다음</button>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    active:   { label: '활성',   bg: '#dcfce7', color: '#166534' },
    draft:    { label: '임시',   bg: '#f1f5f9', color: '#475569' },
    pending:  { label: '검토중', bg: '#fef9c3', color: '#854d0e' },
    archived: { label: '보관',   bg: '#f1f5f9', color: '#94a3b8' },
  };
  const c = cfg[status] ?? { label: status, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', fontSize: 11,
      fontWeight: 600, borderRadius: 4,
      backgroundColor: c.bg, color: c.color,
    }}>{c.label}</span>
  );
}

function EmptyState({ icon: Icon, message, sub }: {
  icon?: React.FC<{ style?: React.CSSProperties }>;
  message: string;
  sub?: string;
}) {
  return (
    <div style={st.emptyBox}>
      {Icon && <Icon style={{ width: 40, height: 40, color: N300, marginBottom: 12 }} />}
      <p style={st.emptyTitle}>{message}</p>
      {sub && <p style={st.emptySub}>{sub}</p>}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={st.emptyBox}>
      <p style={{ fontSize: 14, color: N400 }}>불러오는 중...</p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function VideoIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function PlaylistIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" />
    </svg>
  );
}

// ─── Style Constants ──────────────────────────────────────────────────────────

const PRIMARY = '#2563EB';
const N300 = '#CBD5E1';
const N400 = '#94A3B8';
const N500 = '#64748B';
const N700 = '#334155';
const N900 = '#0F172A';

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#F8FAFC' },
  container: { maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' },

  hero: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 16, marginBottom: 24,
  },
  heroTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: N900 },
  heroDesc: { margin: '4px 0 0', fontSize: 14, color: N500 },
  heroAction: { flexShrink: 0 },

  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', fontSize: 14, fontWeight: 500,
    backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
  },

  tabBar: {
    display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', marginBottom: 16,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 20px', fontSize: 14, fontWeight: 500, color: N500,
    backgroundColor: 'transparent', border: 'none',
    borderBottom: '2px solid transparent', marginBottom: -2, cursor: 'pointer',
  },
  tabActive: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 20px', fontSize: 14, fontWeight: 600, color: PRIMARY,
    backgroundColor: 'transparent', border: 'none',
    borderBottom: '2px solid #2563EB', marginBottom: -2, cursor: 'pointer',
  },
  tabCount: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 18, height: 18, padding: '0 5px',
    fontSize: 10, fontWeight: 700, borderRadius: 9,
    backgroundColor: '#E2E8F0', color: N500,
  },
  tabCountActive: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },

  searchBar: { marginBottom: 16 },
  searchInput: {
    width: '100%', maxWidth: 360, padding: '8px 12px', fontSize: 14,
    border: '1px solid #E2E8F0', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const,
  },

  tableWrap: {
    overflowX: 'auto' as const, backgroundColor: '#fff',
    borderRadius: 12, border: '1px solid #E2E8F0',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const, padding: '10px 12px',
    fontSize: 12, fontWeight: 600, color: N500,
    borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC',
  },
  tr: { borderBottom: '1px solid #F1F5F9' },
  trClickable: { cursor: 'pointer' },
  td: { padding: '10px 12px', verticalAlign: 'middle' as const },

  cellTitle: { display: 'block', fontWeight: 500, color: N900, marginBottom: 2 },
  cellTitleLink: {
    display: 'block', fontWeight: 500, color: PRIMARY,
    marginBottom: 2, textDecoration: 'underline',
  },
  cellDesc: {
    display: 'block', fontSize: 12, color: N400,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 300,
  },
  urlLink: {
    fontSize: 12, color: N500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    display: 'block', maxWidth: 170, textDecoration: 'none',
  },
  tagRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginTop: 4 },
  tagBadge: {
    fontSize: 11, padding: '1px 6px',
    backgroundColor: '#F1F5F9', color: '#475569', borderRadius: 10,
  },

  actionRow: { display: 'flex', justifyContent: 'flex-end', gap: 4 },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, fontSize: 14, color: PRIMARY,
    backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
    borderRadius: 6, cursor: 'pointer', textDecoration: 'none',
  },
  deleteBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, fontSize: 14, color: '#DC2626',
    backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
    borderRadius: 6, cursor: 'pointer',
  },

  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 12, marginTop: 16,
  },
  pageBtn: {
    padding: '6px 14px', fontSize: 13, color: '#475569',
    backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
  },
  pageInfo: { fontSize: 13, color: N500 },

  emptyBox: {
    display: 'flex', flexDirection: 'column' as const,
    justifyContent: 'center', alignItems: 'center',
    minHeight: 200, backgroundColor: '#fff', borderRadius: 12,
    border: '1px solid #E2E8F0', padding: '40px 20px',
  },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: N500, margin: '0 0 6px' },
  emptySub: { fontSize: 13, color: N400, margin: 0, textAlign: 'center' as const },
};
