import { videoPreviewUrl } from './signage/videoPreview';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';
import { readSignageMediaDraft, signageMediaMetadata, emptySignageMediaDraft, type SignageEditTarget, type SignageMediaDraft } from './signage/signageMediaDraft';
import { buildSignageVideoList, filterSignageVideos, summarizePlaylistDuration, type UnifiedVideoItem, type SignageStatusFilter as StatusFilter, type SignageSortKey as SortKey } from './signage/signageVideoList';
import { useSignagePlaylists } from './hooks/useSignagePlaylists';
import { useSignageSchedules } from './hooks/useSignageSchedules';
/**
 * StoreSignagePage — 사이니지 운영 엔진
 *
 * WO-O4O-STORE-SIGNAGE-ENGINE-V1
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1: Playlist 탭 추가
 * WO-O4O-SIGNAGE-KPA-PHASE1-MODERNIZATION-V1: 3탭 구조 전환, DataTable 적용
 *
 * /store/signage: 3탭 구조
 *  [Tab 1] 내 동영상 — 기존 channel_map 기반 자산 관리
 *  [Tab 2] 내 플레이리스트 — Store Playlist CRUD + item 관리
 *  [Tab 3] 스케줄 — 시간/요일 기반 재생 스케줄 CRUD
 *
 * 전이 패턴: Hub → assetSnapshotApi.copy → o4o_asset_snapshots → Playlist에 추가
 *
 * ── 사이니지 구조 원칙 (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) ──
 * 1. Hub = 원본, Store = snapshot 조합
 * 2. clone 사용 금지 — assetSnapshotApi.copy() 단일 경로
 * 3. Playlist = 유일한 재생 단위
 * 4. 공개 렌더링: /public/signage?playlist=:id
 */

import { StoreSignageScheduleForm } from './StoreSignageScheduleForm';
import { StoreSignageMediaEditor } from './StoreSignageMediaEditor';
import { StoreWorkflowNavigation, storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { withWorkspaceMode } from '../../config/storeWorkspace';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStoreResource } from './hooks/useStoreResource';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  GuideBackLink,
  // WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-B: 공통 사이니지 순수 로직
  SIGNAGE_DAY_LABELS as DAY_LABELS,
  formatSignageDate as formatDate,
  formatSignageShortDate as formatShortDate,
  daysUntil,
  isForcedExpiringSoon,
  isForcedExpired,
  toHHMM,
  isScheduleNowActive,
  getCurrentSchedule,
  getNextSchedule,
  computeSignageKpi,
  detectVideoSource,
} from '@o4o/store-ui-core';
import {
  Monitor,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldAlert,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Plus,
  ListVideo,
  Trash2,
  Play,
  Calendar,
  Pencil,
  Search,
} from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import type { SignageScheduleItem } from '../../api/signageSchedule';
import {
  assetSnapshotApi,
  storeAssetControlApi,
  type StoreAssetItem,
  type AssetPublishStatus,
} from '../../api/assetSnapshot';
import type { StorePlaylist } from '../../api/storePlaylist';
import {
  fetchSignageMedia,
  createSignageMedia,
  updateSignageMedia,
  deleteSignageMedia,
  type SignageMediaItem,
} from '../../api/signageMedia';
import { StoreAssetSelectorModal } from '../../components/store/StoreAssetSelectorModal';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';

/* ─── Constants ──────────────────────────────── */

const PAGE_LIMIT = 20;

const STATUS_CONFIG: Record<AssetPublishStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-600' },
  published: { label: '게시됨', bg: 'bg-green-50', text: 'text-green-700' },
  hidden: { label: '숨김', bg: 'bg-orange-50', text: 'text-orange-700' },
};


/* ─── Helpers ────────────────────────────────── */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}초`;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function deriveYtThumbnail(cj: Record<string, unknown> | undefined): string | undefined {
  if (!cj) return undefined;
  const t = cj.thumbnailUrl as string | undefined;
  if (t) return t;
  const id = cj.embedId as string | undefined;
  if (id && cj.sourceType === 'youtube') {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }
  return undefined;
}

type ActiveTab = 'assets' | 'playlist' | 'schedules';

async function loadSignageAssets(): Promise<StoreAssetItem[]> {
  const response = await storeAssetControlApi.list({ type: 'signage', limit: 200 });
  if (!response.success) throw new Error('SIGNAGE_LOAD_FAILED');
  return response.data.items || [];
}

export function StoreSignagePage() {
  const scope = useStoreOperationScope();
  return <SignageSession key={scope.key} isCurrent={scope.isCurrent} />;
}

function SignageSession({ isCurrent }: Readonly<{ isCurrent: () => boolean }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = storeWorkspaceBase(location.pathname);
  // WO-O4O-KPA-SIGNAGE-CANONICAL-API-403-RESOLUTION-V1:
  //   kpaMembership.organizationId(회원 자격 조직) → canonical 매장 조직으로 교정.
  //   signage store API 는 매장 조직만 인정한다.
  const { organizationId } = useStoreOrganizationId();
  const organizationRef = useRef(organizationId); organizationRef.current = organizationId;

  // URL-based tab derivation (IA restructure)
  const activeTab = useMemo((): ActiveTab => {
    if (location.pathname.includes('/videos')) return 'assets';
    if (location.pathname.includes('/schedules')) return 'schedules';
    return 'playlist';
  }, [location.pathname]);

  const navigateTab = (tab: ActiveTab) => {
    const map: Record<ActiveTab, string> = {
      playlist: '/store/marketing/signage/playlist',
      assets: '/store/marketing/signage/videos',
      schedules: '/store/marketing/signage/schedules',
    };
    const target = map[tab].replace('/store', base);
    navigate(withWorkspaceMode(target, tab === 'schedules' ? 'use' : 'studio'), { replace: true });
  };

  const {
    loadSchedules,
    loadSignagePlaylists,
    schedules,
    scheduleLoading,
    deletingScheduleIds,
    scheduleError,
    schedulePlaylistError,
    signagePlaylists,
    showScheduleForm,
    editingSchedule,
    schName,
    schPlaylistId,
    schDays,
    schStartTime,
    schEndTime,
    schValidFrom,
    schValidUntil,
    schPriority,
    schIsActive,
    schSaving,
    schSaveError,
    setShowScheduleForm,
    setSchName,
    setSchPlaylistId,
    setSchPriority,
    setSchStartTime,
    setSchEndTime,
    setSchValidFrom,
    setSchValidUntil,
    setSchIsActive,
    resetScheduleForm,
    openEditSchedule,
    handleSaveSchedule,
    handleDeleteSchedule,
    toggleSchDay,
  } = useSignageSchedules(organizationId);

  // ── Legacy asset state ──
  const { data: items, setData: setItems, loading, error: listError, reload: reloadItems } = useStoreResource(loadSignageAssets, []);

  const [error, setError] = useState<string | null>(null);
  const fetchItems = useCallback(async () => { setError(null); await reloadItems(); }, [reloadItems]);
  const statusBusy = useRef(new Set<string>());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [assetKeyword, setAssetKeyword] = useState('');

  const {
    playlistActionError,
    playlistItemsError,
    loadPlaylistItems,
    playlistBusy,
    busyPlaylistIds,
    loadPlaylists,
    playlists,
    playlistLoading,
    playlistError,
    selectedPlaylistId,
    setSelectedPlaylistId,
    playlistItems,
    playlistItemsLoading,
    playlistKeyword,
    setPlaylistKeyword,
    selectedPlaylistKeys,
    setSelectedPlaylistKeys,
    showAddVideoModal,
    setShowAddVideoModal,
    addModalSearch,
    setAddModalSearch,
    addModalSelected,
    setAddModalSelected,
    addModalSaving,
    showLibrarySelector,
    setShowLibrarySelector,
    handleTogglePublish,
    handleDeletePlaylist,
    handleAddFromLibrary,
    handleDeleteItem,
    handleBulkAdd,
    handleMoveItem,
  } = useSignagePlaylists(organizationId);

  // ── Direct video registration (signage_media) ──
  const mediaReads = useLatestStoreRequest();
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
  const mediaMutation = useRef(false);
  const [signageMediaItems, setSignageMediaItems] = useState<SignageMediaItem[]>([]);
  const [showVideoRegForm, setShowVideoRegForm] = useState(false);
  const [regVideoTitle, setRegVideoTitle] = useState('');
  const [regVideoUrl, setRegVideoUrl] = useState('');
  const [regVideoDescription, setRegVideoDescription] = useState('');
  const [regVideoTags, setRegVideoTags] = useState('');
  const [regVideoStatus, setRegVideoStatus] = useState<'draft' | 'active'>('active');
  const [regVideoSaving, setRegVideoSaving] = useState(false);
  const [regVideoError, setRegVideoError] = useState('');
  const [selectedVideoKeys, setSelectedVideoKeys] = useState<string[]>([]);

  // Target and draft belong to one editor, with one change action.
  const [editingTarget, setEditingTarget] = useState<SignageEditTarget | null>(null);
  const [editDraft, setEditDraft] = useState<SignageMediaDraft>(emptySignageMediaDraft);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const editBusy = useRef(false);
  const editTargetRef = useRef(editingTarget); editTargetRef.current = editingTarget;
  const editDraftRef = useRef(editDraft); editDraftRef.current = editDraft;
  const registrationBusy = useRef(false);
  const registrationDraft = JSON.stringify([regVideoTitle, regVideoUrl, regVideoDescription, regVideoTags, regVideoStatus]);
  const registrationDraftRef = useRef(registrationDraft); registrationDraftRef.current = registrationDraft;

  const loadSignageMedia = useCallback(async () => {
    if (!organizationId || !isCurrent()) return;
    const current = mediaReads.begin(); setMediaLoading(true); setMediaLoadError(null);
    try {
      const data = await fetchSignageMedia(organizationId);
      if (!Array.isArray(data)) throw new Error('Invalid media');
      if (current() && isCurrent()) setSignageMediaItems(data);
    } catch { if (current() && isCurrent()) setMediaLoadError('내 동영상을 불러오지 못했습니다. 다시 시도해 주세요.'); }
    finally { if (current() && isCurrent()) setMediaLoading(false); }
  }, [organizationId, mediaReads, isCurrent]);

  // 마운트 시 콘텐츠·플레이리스트·스케줄 병렬 로드 (상단 요약 패널에 필요)
  useEffect(() => {
    loadSignageMedia();
  }, [loadSignageMedia]);

  // ── Video registration handler ──
  const handleRegisterVideo = async () => {
    setRegVideoError('');
    if (registrationBusy.current || mediaMutation.current || !isCurrent() || !regVideoTitle.trim() || !regVideoUrl.trim()) return;
    const sourceType = detectVideoSource(regVideoUrl.trim());
    if (!sourceType || !videoPreviewUrl(regVideoUrl)) {
      setRegVideoError('올바른 YouTube 또는 Vimeo URL을 입력해 주세요.');
      return;
    }
    const tags = regVideoTags.split(',').map(t => t.trim()).filter(Boolean);
    const submitted = registrationDraft, store = organizationId;
    mediaReads.cancel(); setMediaLoading(false);
    mediaMutation.current = true; registrationBusy.current = true;
    setRegVideoSaving(true);
    try {
      await createSignageMedia(organizationId, {
        name: regVideoTitle.trim(),
        mediaType: 'video',
        sourceType,
        sourceUrl: regVideoUrl.trim(),
        description: regVideoDescription.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        status: regVideoStatus,
      });
      if (organizationRef.current !== store || !isCurrent()) return;
      void loadSignageMedia();
      if (registrationDraftRef.current !== submitted) return;
      setRegVideoTitle('');
      setRegVideoUrl('');
      setRegVideoDescription('');
      setRegVideoTags('');
      setRegVideoStatus('active');
      setRegVideoError('');
      setShowVideoRegForm(false);
    } catch (err: unknown) {
      if (organizationRef.current === store && isCurrent()) setRegVideoError(err instanceof Error ? err.message : '동영상 등록에 실패했습니다.');
    } finally {
      mediaMutation.current = false; registrationBusy.current = false;
      setRegVideoSaving(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (mediaMutation.current || !isCurrent() || !confirm('이 동영상을 삭제하시겠습니까?')) return;
    mediaReads.cancel(); setMediaLoading(false);
    mediaMutation.current = true;
    try {
      await deleteSignageMedia(organizationId, mediaId);
      if (isCurrent()) await loadSignageMedia();
    } catch { if (isCurrent()) setError('동영상을 삭제하지 못했습니다. 다시 시도해 주세요.'); }
    finally { mediaMutation.current = false; }
  };

  const handleOpenEdit = (video: UnifiedVideoItem) => {
    if (editBusy.current || mediaMutation.current || !isCurrent()) return;
    const target: SignageEditTarget | null = video.source === 'direct' && video._media
      ? { kind: 'direct', media: video._media }
      : video._snapshot ? { kind: 'snapshot', snapshot: video._snapshot } : null;
    if (!target) return;
    const draft = readSignageMediaDraft(target);
    editTargetRef.current = target; editDraftRef.current = draft;
    setEditingTarget(target); setEditDraft(draft); setEditError('');
  };
  const handleEditChange = (field: keyof SignageMediaDraft, value: string) => {
    if (editBusy.current || !isCurrent()) return;
    setEditDraft(previous => {
      const next = { ...previous, [field]: value }; editDraftRef.current = next; return next;
    });
  };
  const handleCloseEditDrawer = () => {
    if (editBusy.current) return;
    editTargetRef.current = null;
    setEditingTarget(null); setEditError('');
  };
  const handleSaveEdit = async () => {
    const target = editingTarget, draft = editDraft, store = organizationId;
    if (!target || !draft.name.trim() || editBusy.current || mediaMutation.current || !isCurrent()) return;
    mediaReads.cancel(); setMediaLoading(false);
    mediaMutation.current = true; editBusy.current = true; setEditSaving(true); setEditError('');
    try {
      const metadata = signageMediaMetadata(draft);
      if (target.kind === 'direct') {
        const updated = await updateSignageMedia(store, target.media.id, { name: draft.name.trim(), ...metadata });
        if (organizationRef.current !== store || !isCurrent()) return;
        setSignageMediaItems(previous => previous.map(media => media.id === updated.id ? updated : media));
      } else {
        const response = await assetSnapshotApi.patch(target.snapshot.id, { title: draft.name.trim(), ...metadata });
        if (organizationRef.current !== store || !isCurrent()) return;
        setItems(previous => previous.map(item => item.id === target.snapshot.id
          ? { ...item, title: response.data.title, contentJson: response.data.contentJson } : item));
      }
      if (target.kind === 'direct') void loadSignageMedia(); else void fetchItems();
      if (editTargetRef.current === target && editDraftRef.current === draft) { editTargetRef.current = null; setEditingTarget(null); setEditError(''); }
    } catch (error) {
      if (isCurrent() && organizationRef.current === store && editTargetRef.current === target) setEditError(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally { mediaMutation.current = false; editBusy.current = false; if (isCurrent()) setEditSaving(false); }
  };
  const handleDeleteFromDrawer = async () => {
    const target = editingTarget, store = organizationId;
    if (!target || editBusy.current || mediaMutation.current || !isCurrent()) return;
    const name = target.kind === 'direct' ? target.media.name : target.snapshot.title;
    if (!confirm(`"${name}" 동영상을 삭제하시겠습니까?`)) return;
    mediaReads.cancel(); setMediaLoading(false);
    mediaMutation.current = true; editBusy.current = true; setEditSaving(true); setEditError('');
    try {
      if (target.kind === 'direct') await deleteSignageMedia(store, target.media.id);
      else await assetSnapshotApi.remove(target.snapshot.id);
      if (organizationRef.current !== store || !isCurrent()) return;
      if (editTargetRef.current === target) { editTargetRef.current = null; setEditingTarget(null); setEditError(''); }
      if (target.kind === 'direct') void loadSignageMedia(); else void fetchItems();
    } catch {
      if (isCurrent() && organizationRef.current === store && editTargetRef.current === target) setEditError('삭제하지 못했습니다. 다시 시도해 주세요.');
    } finally { mediaMutation.current = false; editBusy.current = false; if (isCurrent()) setEditSaving(false); }
  };
  useEffect(() => { editTargetRef.current = null; setEditingTarget(null); setEditError(''); }, [organizationId]);

  // ── Unified video list (snapshots + direct media) ──
  const unifiedVideos = useMemo(() => buildSignageVideoList(items, signageMediaItems), [items, signageMediaItems]);

  // KPI (snapshot 기준 유지)
  const kpi = useMemo(() => computeSignageKpi(items), [items]);
  const forcedExpiringCount = useMemo(() => items.filter(isForcedExpiringSoon).length, [items]);

  // Filter + Sort + Keyword (unified: snapshots + direct media)
  const filteredUnified = useMemo(() => filterSignageVideos(unifiedVideos, {
    status: statusFilter, sort: sortKey, keyword: assetKeyword,
  }), [unifiedVideos, statusFilter, sortKey, assetKeyword]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUnified.length / PAGE_LIMIT));
  const pagedUnified = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredUnified.slice(start, start + PAGE_LIMIT);
  }, [filteredUnified, page]);

  useEffect(() => { setPage(1); }, [statusFilter, sortKey, assetKeyword]);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // Total duration + missing-duration count for selected playlist items
  const totalDurationInfo = useMemo(() => summarizePlaylistDuration(playlistItems), [playlistItems]);

  // Filtered unified video list for add modal
  const addModalVideos = useMemo(() => {
    const kw = addModalSearch.trim().toLowerCase();
    const all = unifiedVideos;
    return kw ? all.filter(v => v.title.toLowerCase().includes(kw)) : all;
  }, [unifiedVideos, addModalSearch]);

  const filteredPlaylists = useMemo(() => {
    if (!playlistKeyword.trim()) return playlists;
    const kw = playlistKeyword.toLowerCase();
    return playlists.filter(p => p.name.toLowerCase().includes(kw));
  }, [playlists, playlistKeyword]);

  // Handlers
  const handleToggleStatus = async (item: StoreAssetItem) => {
    if (item.isForced || statusBusy.current.has(item.id) || !isCurrent()) return;
    statusBusy.current.add(item.id);
    const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const currentIdx = cycle.indexOf(item.publishStatus);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];
    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(item.id, nextStatus);
      if (!isCurrent()) return;
      setItems(prev => prev.map(it =>
        it.id === item.id ? { ...it, publishStatus: res.data.publishStatus } : it,
      ));
    } catch { if (isCurrent()) setError('게시 상태를 변경하지 못했습니다. 다시 시도해 주세요.'); } finally {
      statusBusy.current.delete(item.id); if (isCurrent()) setUpdatingId(null);
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  // ── 운영 가시화 계산 (WO-O4O-STORE-SIGNAGE-OPERATION-VISIBILITY-V1) ──
  const currentSchedule = useMemo(() => getCurrentSchedule(schedules), [schedules]);
  const nextSchedule = useMemo(() => getNextSchedule(schedules, currentSchedule?.id ?? null), [schedules, currentSchedule]);

  /** 현재 시간 기준 활성 스케줄에 연결된 playlistId 집합 */
  const activePlaylistIds = useMemo(() => {
    const now = new Date();
    return new Set(schedules.filter(s => isScheduleNowActive(s, now)).map(s => s.playlistId));
  }, [schedules]);

  // WO-O4O-STORE-LAYOUT-WIDTH-OVERFLOW-FIX-V1: max-w/mx-auto 제거 — StoreDashboardLayout이 max-w-[1200px] 관리
  return (
    <div className="w-full">
      <StoreWorkflowNavigation subject="사이니지" studioPath="/marketing/signage/playlist" usePath="/marketing/signage/schedules" />
      {activeTab === 'schedules' && schedulePlaylistError && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          스케줄의 재생목록 정보를 불러오지 못했습니다.
          <button type="button" onClick={() => void loadSignagePlaylists()} className="ml-2 underline">다시 시도</button>
        </div>
      )}
      {playlistActionError && !showAddVideoModal && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{playlistActionError}</div>}
      {mediaLoadError && <div role="alert" className="p-3 text-sm text-red-700">{mediaLoadError}<button type="button" onClick={() => void loadSignageMedia()} className="min-h-11 underline ml-2">동영상 다시 시도</button></div>}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to={base} className="text-blue-600 hover:underline">&larr; 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">디지털사이니지 운영</h1>
          <p className="text-sm text-slate-500 mt-1">매장 화면에 송출할 콘텐츠를 등록하고, 플레이리스트로 구성하고, 스케줄을 적용합니다</p>
          <div className="mt-2"><GuideBackLink to="/guide/features/signage" label="디지털사이니지 운영 방법" /></div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchItems(); loadSignageMedia(); loadPlaylists();
              if (activeTab === 'schedules') { loadSchedules(); loadSignagePlaylists(); }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* ─── Tab Bar ─────────────────────────────── */}
      <div className="flex flex-wrap gap-1 mb-1 border-b border-slate-200">
        <button
          onClick={() => navigateTab('assets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'assets'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor className="w-4 h-4" />
          내 동영상
        </button>
        <button
          onClick={() => navigateTab('playlist')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'playlist'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListVideo className="w-4 h-4" />
          내 플레이리스트
        </button>
        <button
          onClick={() => navigateTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'schedules'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          스케줄
        </button>
      </div>

      {/* ─── 현재 재생 상태 요약 패널 ─────────────── */}
      <div className={`flex items-start gap-4 mb-6 px-4 py-3 rounded-xl border ${
        currentSchedule
          ? 'bg-green-50 border-green-200'
          : 'bg-slate-50 border-slate-200'
      }`}>
        {/* 현재 재생 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${currentSchedule ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs font-medium text-slate-500">현재 재생</span>
          </div>
          {currentSchedule ? (
            <div>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {playlists.find(p => p.id === currentSchedule.storePlaylistId)?.name
                  || currentSchedule.playlist?.name
                  || playlists.find(p => p.id === currentSchedule.playlistId)?.name
                  || signagePlaylists.find(p => p.id === currentSchedule.playlistId)?.name
                  || '플레이리스트'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentSchedule.name} · {toHHMM(currentSchedule.startTime)} ~ {toHHMM(currentSchedule.endTime)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">현재 적용된 스케줄이 없습니다</p>
          )}
        </div>

        {/* 다음 예정 */}
        {nextSchedule && (
          <div className="flex-shrink-0 border-l border-slate-200 pl-4">
            <p className="text-xs font-medium text-slate-400 mb-0.5">다음 예정</p>
            <p className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
              {playlists.find(p => p.id === nextSchedule.storePlaylistId)?.name
                || nextSchedule.playlist?.name
                || playlists.find(p => p.id === nextSchedule.playlistId)?.name
                || nextSchedule.name}
            </p>
            <p className="text-xs text-slate-400">{toHHMM(nextSchedule.startTime)} ~ {toHHMM(nextSchedule.endTime)}</p>
          </div>
        )}

        {/* 스케줄 탭 바로가기 */}
        <button
          onClick={() => navigateTab('schedules')}
          className="flex-shrink-0 text-xs text-slate-400 hover:text-blue-600 underline underline-offset-2"
        >
          스케줄 관리
        </button>
      </div>

      {/* ═══ Playlist Tab ═══════════════════════════ */}
      {activeTab === 'playlist' && (
        <div>
          {/* Create + list */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">내 플레이리스트</h2>
            {/* WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1: 모달 → 표준 /new 등록 페이지 */}
            <button
              onClick={() => navigate(`${base}/marketing/signage/playlist/new`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              새 플레이리스트
            </button>
          </div>

          {/* Playlist search */}
          {!playlistLoading && !playlistError && playlists.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={playlistKeyword}
                onChange={e => setPlaylistKeyword(e.target.value)}
                placeholder="플레이리스트 이름으로 검색..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Playlist list — DataTable */}
          {playlistError ? (
            <div className="text-center py-12 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              {playlistError}
              <div>
                <button onClick={() => void loadPlaylists()} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
              </div>
            </div>
          ) : playlists.length === 0 && !playlistLoading ? (
            <div className="text-center py-12 text-slate-400">
              <ListVideo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">플레이리스트가 없습니다.</p>
              <p className="text-xs mt-1">'새 플레이리스트' 버튼으로 플레이리스트를 만드세요.</p>
            </div>
          ) : (
            <div className="mb-6">
              <DataTable<StorePlaylist>
                rowSelection={{
                  selectedRowKeys: selectedPlaylistKeys,
                  onChange: setSelectedPlaylistKeys,
                }}
                columns={[
                  {
                    key: 'name',
                    title: '이름',
                    render: (_v, pl) => (
                      <div>
                        <div className="flex items-center gap-2">
                          <ListVideo className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-900 truncate max-w-xs">{pl.name}</span>
                          {pl.forcedCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                              강제 {pl.forcedCount}
                            </span>
                          )}
                        </div>
                        {pl.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs ml-6">{pl.description}</p>
                        )}
                        {pl.tags && pl.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-6">
                            {pl.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0 rounded text-[10px] bg-slate-100 text-slate-500">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'itemCount',
                    title: '항목 수',
                    dataIndex: 'itemCount',
                    align: 'center',
                    render: (v) => <span className="text-slate-600">{v}</span>,
                  },
                  {
                    key: 'playlistType',
                    title: '유형',
                    dataIndex: 'playlistType',
                    align: 'center',
                    render: (v) => (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600">
                        {v === 'SINGLE' ? '단일' : '목록'}
                      </span>
                    ),
                  },
                  {
                    key: 'updatedAt',
                    title: '수정일',
                    dataIndex: 'updatedAt',
                    render: (v) => <span className="text-xs text-slate-500">{new Date(v).toLocaleDateString('ko-KR')}</span>,
                  },
                  {
                    key: 'publishStatus',
                    title: '게시',
                    dataIndex: 'publishStatus',
                    render: (_v, pl) => (
                      <button
                        disabled={busyPlaylistIds.has(pl.id)}
                        onClick={e => { e.stopPropagation(); handleTogglePublish(pl); }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          pl.publishStatus === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                        title="클릭하여 게시 상태 변경"
                      >
                        {pl.publishStatus === 'published' ? '게시 중' : '초안'}
                      </button>
                    ),
                  },
                  {
                    key: 'inUse',
                    title: '사용',
                    align: 'center',
                    render: (_v, pl) => activePlaylistIds.has(pl.id) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        사용 중
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">미사용</span>
                    ),
                  },
                  {
                    key: 'actions',
                    title: '',
                    align: 'right',
                    render: (_v, pl) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedPlaylistId(pl.id === selectedPlaylistId ? null : pl.id); }}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                            selectedPlaylistId === pl.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {selectedPlaylistId === pl.id ? '닫기' : '편집'}
                        </button>
                        <button
                          disabled={busyPlaylistIds.has(pl.id)}
                          onClick={e => { e.stopPropagation(); handleDeletePlaylist(pl); }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ),
                  },
                ] as Column<StorePlaylist>[]}
                dataSource={filteredPlaylists}
                rowKey="id"
                loading={playlistLoading}
                onRow={pl => ({
                  onClick: () => setSelectedPlaylistId(pl.id === selectedPlaylistId ? null : pl.id),
                  className: selectedPlaylistId === pl.id ? 'bg-blue-50/40' : '',
                })}
                emptyText="검색 결과가 없습니다"
              />
            </div>
          )}

          {/* ── Playlist Builder ── */}
          {selectedPlaylistId && selectedPlaylist && (
            <div className="border border-slate-200 rounded-lg bg-white mt-2">
              {/* Builder header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{selectedPlaylist.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">({playlistItems.length}개)</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setShowLibrarySelector(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-600 border border-emerald-300 rounded-md hover:bg-emerald-50"
                    title="HUB Library에서 추가"
                  >
                    <Plus className="w-3 h-3" />
                    라이브러리
                  </button>
                  <button
                    onClick={() => { setAddModalSearch(''); setAddModalSelected(new Set()); setShowAddVideoModal(true); }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                  >
                    <Plus className="w-3 h-3" />
                    내 동영상에서 추가
                  </button>
                </div>
              </div>

              {/* Total duration summary */}
              {playlistItems.length > 0 && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500">
                    총 재생시간:&nbsp;
                    <span className="font-medium text-slate-700">
                      {totalDurationInfo.totalSec > 0 ? formatDuration(totalDurationInfo.totalSec) : '—'}
                    </span>
                  </span>
                  {totalDurationInfo.missingCount > 0 && (
                    <span className="text-amber-600">
                      (재생시간 미등록 영상 {totalDurationInfo.missingCount}개 제외)
                    </span>
                  )}
                </div>
              )}

              {/* Item list */}
              {playlistItemsError ? (
                <div role="alert" className="p-4 text-sm text-red-700">{playlistItemsError}<button type="button" onClick={() => void loadPlaylistItems(selectedPlaylistId)} className="ml-2 underline">다시 시도</button></div>
              ) : playlistItemsLoading ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> 로딩 중...
                </div>
              ) : playlistItems.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <ListVideo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">재생 항목이 없습니다.</p>
                  <p className="text-xs mt-1">'내 동영상에서 추가' 버튼으로 동영상을 추가하세요.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {playlistItems.map((item, idx) => {
                    const thumb = deriveYtThumbnail(item.contentJson);
                    const dur = item.contentJson?.duration as number | undefined;
                    const st = item.contentJson?.sourceType as string | undefined;
                    return (
                      <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 ${item.isForced ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}`}>
                        {/* Order number + reorder buttons */}
                        <div className="flex flex-col items-center gap-0 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 w-5 text-center leading-none mb-0.5">{idx + 1}</span>
                          <button
                            onClick={() => handleMoveItem(idx, -1)}
                            disabled={playlistBusy || idx === 0}
                            className="text-slate-300 hover:text-slate-600 disabled:opacity-20 p-0.5"
                            title="위로"
                          >
                            <ChevronLeft className="w-3 h-3 rotate-90" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(idx, 1)}
                            disabled={playlistBusy || idx === playlistItems.length - 1}
                            className="text-slate-300 hover:text-slate-600 disabled:opacity-20 p-0.5"
                            title="아래로"
                          >
                            <ChevronRight className="w-3 h-3 rotate-90" />
                          </button>
                        </div>
                        {/* Thumbnail */}
                        <div className="w-14 h-9 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-3 h-3 text-slate-300" />
                            </div>
                          )}
                        </div>
                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{item.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {st && (
                              <span className={`px-1.5 py-0 rounded text-[9px] font-semibold ${st === 'youtube' ? 'bg-red-100 text-red-600' : st === 'vimeo' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                {st === 'youtube' ? 'YT' : st === 'vimeo' ? 'VM' : st.toUpperCase()}
                              </span>
                            )}
                            {dur && dur > 0 ? (
                              <span className="text-[11px] text-slate-400">{formatDuration(dur)}</span>
                            ) : (
                              <span className="text-[11px] text-amber-400">재생시간 미등록</span>
                            )}
                            {item.isForced && (
                              <span className="px-1.5 py-0 rounded text-[9px] font-semibold bg-red-100 text-red-700">강제</span>
                            )}
                          </div>
                        </div>
                        {/* Delete / Lock */}
                        {item.isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        ) : (
                          <button
                            disabled={playlistBusy}
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded flex-shrink-0"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Schedule Tab ══════════════════════════ */}
      {activeTab === 'schedules' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">스케줄</h2>
            <button
              onClick={() => { resetScheduleForm(); setShowScheduleForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              새 스케줄
            </button>
          </div>

          {/* ── Create / Edit Form ── */}
          {showScheduleForm && <StoreSignageScheduleForm
            editing={!!editingSchedule}
            playlists={playlists}
            schName={schName}
            schPlaylistId={schPlaylistId}
            schPriority={schPriority}
            schDays={schDays}
            schStartTime={schStartTime}
            schEndTime={schEndTime}
            schValidFrom={schValidFrom}
            schValidUntil={schValidUntil}
            schIsActive={schIsActive}
            schSaving={schSaving}
            saveError={schSaveError}
            setSchName={setSchName}
            setSchPlaylistId={setSchPlaylistId}
            setSchPriority={setSchPriority}
            setSchStartTime={setSchStartTime}
            setSchEndTime={setSchEndTime}
            setSchValidFrom={setSchValidFrom}
            setSchValidUntil={setSchValidUntil}
            setSchIsActive={setSchIsActive}
            toggleSchDay={toggleSchDay}
            handleSaveSchedule={handleSaveSchedule}
            resetScheduleForm={resetScheduleForm}
          />}

          {/* ── Schedule List ── */}
          {scheduleLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 스케줄 로딩 중...
            </div>
          ) : scheduleError ? (
            <div className="text-center py-12 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              {scheduleError}
              <div>
                <button onClick={() => void loadSchedules()} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">스케줄이 없습니다.</p>
              <p className="text-xs mt-1">먼저 '내 플레이리스트' 탭에서 플레이리스트를 만들고 콘텐츠를 추가하세요.</p>
            </div>
          ) : (
            <DataTable<SignageScheduleItem>
              columns={[
                {
                  key: 'name',
                  title: '이름',
                  dataIndex: 'name',
                  render: (v) => <span className="font-medium text-slate-900">{v}</span>,
                },
                {
                  key: 'playlist',
                  title: '플레이리스트',
                  render: (_v, sch) => (
                    <span className="text-slate-600 text-xs">
                      {playlists.find(p => p.id === sch.storePlaylistId)?.name || sch.playlist?.name || signagePlaylists.find(p => p.id === sch.playlistId)?.name || playlists.find(p => p.id === sch.playlistId)?.name || sch.name}
                    </span>
                  ),
                },
                {
                  key: 'daysOfWeek',
                  title: '요일',
                  render: (_v, sch) => (
                    <div className="flex gap-0.5">
                      {DAY_LABELS.map((label, idx) => (
                        <span
                          key={idx}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                            sch.daysOfWeek.includes(idx) ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-300'
                          }`}
                        >{label}</span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'time',
                  title: '시간',
                  render: (_v, sch) => <span className="text-xs text-slate-600">{sch.startTime.slice(0, 5)}–{sch.endTime.slice(0, 5)}</span>,
                },
                {
                  key: 'period',
                  title: '기간',
                  render: (_v, sch) => (
                    <span className="text-xs text-slate-500">
                      {sch.validFrom || sch.validUntil ? `${sch.validFrom ?? '∞'} ~ ${sch.validUntil ?? '∞'}` : '상시'}
                    </span>
                  ),
                },
                {
                  key: 'priority',
                  title: '우선순위',
                  dataIndex: 'priority',
                  align: 'center' as const,
                  render: (v) => <span className="text-xs text-slate-500">{v}</span>,
                },
                {
                  key: 'isActive',
                  title: '상태',
                  align: 'center' as const,
                  render: (_v, sch) => (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                      sch.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sch.isActive ? '활성' : '비활성'}
                    </span>
                  ),
                },
                {
                  key: 'playback',
                  title: '재생',
                  align: 'center' as const,
                  render: (_v, sch) => {
                    const now = new Date();
                    const isNowActive = isScheduleNowActive(sch, now);
                    const isUpcoming = !isNowActive && sch.isActive && sch.daysOfWeek.includes(now.getDay())
                      && toHHMM(sch.startTime) > `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                    return isNowActive ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />현재
                      </span>
                    ) : isUpcoming ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600">예정</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    );
                  },
                },
                {
                  key: 'actions',
                  title: '',
                  align: 'right' as const,
                  render: (_v, sch) => (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditSchedule(sch)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button disabled={deletingScheduleIds.has(sch.id)}
                          onClick={() => handleDeleteSchedule(sch)} className="p-1 text-slate-400 hover:text-red-500 rounded" title="삭제">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ),
                },
              ] as Column<SignageScheduleItem>[]}
              dataSource={schedules}
              rowKey="id"
              loading={false}
              onRow={sch => ({
                className: isScheduleNowActive(sch, new Date()) ? 'bg-green-50 border-l-2 border-green-500' : '',
              })}
              emptyText="스케줄이 없습니다"
            />
          )}
        </div>
      )}

      {/* ═══ Assets Tab (내 동영상) ════════════════ */}
      {activeTab === 'assets' && <>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-slate-800">내 동영상</h2>
        <button
          onClick={() => setShowVideoRegForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          <Plus className="w-4 h-4" />
          동영상 등록
        </button>
      </div>
      {/* Video registration form — modal */}
      {showVideoRegForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowVideoRegForm(false); setRegVideoTitle(''); setRegVideoUrl(''); setRegVideoDescription(''); setRegVideoTags(''); setRegVideoStatus('active'); setRegVideoError(''); } }}
          onKeyDown={e => { if (e.key === 'Escape') { setShowVideoRegForm(false); setRegVideoTitle(''); setRegVideoUrl(''); setRegVideoDescription(''); setRegVideoTags(''); setRegVideoStatus('active'); setRegVideoError(''); } }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">동영상 등록</h3>
            {regVideoError && (
              <p className="text-xs text-red-600 mb-3 px-2 py-1.5 bg-red-50 border border-red-200 rounded">{regVideoError}</p>
            )}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">제목 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={regVideoTitle}
                onChange={e => { setRegVideoTitle(e.target.value); setRegVideoError(''); }}
                placeholder="동영상 제목을 입력하세요"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">YouTube / Vimeo URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                value={regVideoUrl}
                onChange={e => { setRegVideoUrl(e.target.value); setRegVideoError(''); }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">설명 / 용도 메모</label>
              <textarea
                value={regVideoDescription}
                onChange={e => setRegVideoDescription(e.target.value)}
                placeholder="이 동영상의 활용 위치나 용도를 간략히 기록하세요"
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">태그 <span className="text-slate-400 font-normal">(쉼표로 구분)</span></label>
                <input
                  type="text"
                  value={regVideoTags}
                  onChange={e => setRegVideoTags(e.target.value)}
                  placeholder="예: 약국, 건강, 홍보"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">공개 상태</label>
                <select
                  value={regVideoStatus}
                  onChange={e => setRegVideoStatus(e.target.value as 'draft' | 'active')}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="active">공개</option>
                  <option value="draft">초안 (숨김)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowVideoRegForm(false);
                  setRegVideoTitle('');
                  setRegVideoUrl('');
                  setRegVideoDescription('');
                  setRegVideoTags('');
                  setRegVideoStatus('active');
                  setRegVideoError('');
                }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleRegisterVideo}
                disabled={regVideoSaving || !regVideoTitle.trim() || !regVideoUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regVideoSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {regVideoSaving ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── [A] Signage KPI ─────────────────────── */}
      {!loading && !mediaLoading && !mediaLoadError && !error && !listError && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <KpiCard label="게시 중" count={kpi.published} color="green" />
          <KpiCard label="초안" count={kpi.draft} color="slate" />
          <KpiCard label="숨김" count={kpi.hidden} color="orange" />
          <KpiCard label="강제노출" count={kpi.forcedActive} color="red"
            warning={forcedExpiringCount > 0 ? `${forcedExpiringCount}건 만료 임박` : undefined}
          />
          <KpiCard label="사이니지 채널" count={kpi.signageChannel} color="purple" />
        </div>
      )}

      {/* ─── [B] 검색 + 필터 바 ─────────────────── */}
      {!loading && !mediaLoading && !mediaLoadError && !error && !listError && unifiedVideos.length > 0 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={assetKeyword}
            onChange={e => setAssetKeyword(e.target.value)}
            placeholder="동영상 이름으로 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      {!loading && !mediaLoading && !mediaLoadError && !error && !listError && unifiedVideos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {([
              { key: 'all', label: '전체' },
              { key: 'published', label: '게시됨' },
              { key: 'draft', label: '초안' },
              { key: 'hidden', label: '숨김' },
              { key: 'forced', label: '강제노출' },
            ] as { key: StatusFilter; label: string }[]).map(opt => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === opt.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">최신순</option>
              <option value="forced-first">강제노출 우선</option>
              <option value="published-first">게시 상태 우선</option>
            </select>
          </div>
        </div>
      )}

      {/* Forced expiry banner */}
      {forcedExpiringCount > 0 && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            강제노출 만료 임박: <strong>{forcedExpiringCount}건</strong>의 사이니지가 7일 이내 만료됩니다.
          </span>
        </div>
      )}

      {/* ─── [C] 사이니지 리스트 ───────────────────── */}
      {loading || mediaLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          사이니지 목록을 불러오는 중...
        </div>
      ) : (error || listError || mediaLoadError) ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{listError || error || mediaLoadError}</p>
          <button onClick={() => { void fetchItems(); void loadSignageMedia(); }} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
        </div>
      ) : filteredUnified.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          {unifiedVideos.length === 0 ? (
            <>
              <Monitor className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">동영상이 없습니다.</p>
              <p className="text-xs mt-1">'동영상 등록' 버튼으로 YouTube 또는 Vimeo 동영상을 등록하세요.</p>
            </>
          ) : (
            <p className="text-sm">선택한 필터 조건에 해당하는 동영상이 없습니다.</p>
          )}
        </div>
      ) : (
        <>
          <DataTable<UnifiedVideoItem>
            rowSelection={{
              selectedRowKeys: selectedVideoKeys,
              onChange: setSelectedVideoKeys,
            }}
            columns={[
              {
                key: 'title',
                title: '제목',
                render: (_v, v) => {
                  if (v.source === 'direct') {
                    const media = v._media;
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate max-w-md">{v.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                            {v.sourceType === 'youtube' ? 'YouTube' : v.sourceType === 'vimeo' ? 'Vimeo' : '직접'}
                          </span>
                        </div>
                        {media?.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">{media.description}</p>
                        )}
                        {media?.tags && media.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {media.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0 rounded text-[10px] bg-slate-100 text-slate-500">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const item = v._snapshot!;
                  const expired = isForcedExpired(item);
                  const expiringSoon = isForcedExpiringSoon(item);
                  return (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate max-w-md">{v.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">HUB</span>
                      </div>
                      {item.isForced && (
                        <div className="flex items-center gap-2 mt-1">
                          {expired ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">강제노출 만료</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${expiringSoon ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {expiringSoon ? <AlertTriangle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                              {expiringSoon ? '만료 임박' : '강제노출'}
                            </span>
                          )}
                          {item.isLocked && <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400"><Lock className="w-3 h-3" /></span>}
                          {(item.forcedStartAt || item.forcedEndAt) && (
                            <span className="text-[10px] text-slate-400">
                              {formatShortDate(item.forcedStartAt)} ~ {formatShortDate(item.forcedEndAt)}
                              {expiringSoon && item.forcedEndAt && <span className="ml-1 text-amber-600 font-medium">(D-{daysUntil(item.forcedEndAt)})</span>}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'publishStatus',
                title: '상태',
                render: (_v, v) => {
                  if (v.source === 'direct') {
                    const mediaStatus = v._media?.status;
                    const isDraft = mediaStatus === 'draft';
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDraft ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700'}`}>
                        {isDraft ? '초안' : '공개'}
                      </span>
                    );
                  }
                  const item = v._snapshot!;
                  const statusCfg = STATUS_CONFIG[item.publishStatus] || STATUS_CONFIG.draft;
                  const isUpdating = updatingId === item.id;
                  return item.isForced ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 cursor-not-allowed opacity-70" title="관리자 강제노출 - 변경 불가">
                      <Lock className="w-3 h-3 mr-1" />{statusCfg.label}
                    </span>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleStatus(item); }}
                      disabled={isUpdating}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${statusCfg.bg} ${statusCfg.text}`}
                      title="클릭하여 상태 변경 (초안 → 게시됨 → 숨김)"
                    >
                      {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}{statusCfg.label}
                    </button>
                  );
                },
              },
              {
                key: 'createdAt',
                title: '등록일',
                dataIndex: 'createdAt',
                render: (v) => <span className="text-slate-500">{formatDate(v as string)}</span>,
              },
              {
                key: 'actions',
                title: '',
                align: 'right' as const,
                render: (_v, v) => {
                  if (v.source === 'direct') {
                    return (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); handleOpenEdit(v); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                          title="편집"
                        >
                          <Pencil className="w-3 h-3" />
                          편집
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteMedia(v._media!.id); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-red-600 border border-red-200 rounded hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          삭제
                        </button>
                      </div>
                    );
                  }
                  // snapshot row
                  const snap = v._snapshot!;
                  const canEditSnap = !snap.isForced && !snap.isLocked;
                  return (
                    <div className="flex items-center justify-end gap-1">
                      {canEditSnap && (
                        <button
                          onClick={e => { e.stopPropagation(); handleOpenEdit(v); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                          title="편집"
                        >
                          <Pencil className="w-3 h-3" />
                          편집
                        </button>
                      )}
                      <button
                        onClick={() => navigateTab('playlist')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                        title="플레이리스트 탭으로 이동하여 추가"
                      >
                        <ListVideo className="w-3 h-3" />
                        플레이리스트에 추가
                      </button>
                    </div>
                  );
                },
              },
            ] as Column<UnifiedVideoItem>[]}
            dataSource={pagedUnified}
            rowKey="id"
            loading={false}
            onRow={v => ({
              className: v.source === 'snapshot' && v._snapshot && v._snapshot.isForced && !isForcedExpired(v._snapshot) ? 'bg-red-50/30'
                : v.source === 'snapshot' && v._snapshot && isForcedExpired(v._snapshot) ? 'opacity-60'
                : '',
            })}
            emptyText="동영상이 없습니다"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>{filteredUnified.length}건 중 {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, filteredUnified.length)} · {page}/{totalPages} 페이지</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </>}

      {/* ── Add Video Modal (WO-O4O-STORE-SIGNAGE-PLAYLIST-BUILDER-V1) ── */}
      {showAddVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowAddVideoModal(false); setAddModalSelected(new Set()); setAddModalSearch(''); } }}
          onKeyDown={e => { if (e.key === 'Escape') { setShowAddVideoModal(false); setAddModalSelected(new Set()); setAddModalSearch(''); } }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">내 동영상에서 추가</h3>
                <p className="text-xs text-slate-400 mt-0.5">선택한 동영상이 플레이리스트에 추가됩니다</p>
              </div>
              {addModalSelected.size > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {addModalSelected.size}개 선택됨
                </span>
              )}
            </div>
            {playlistActionError && <div role="alert" className="px-4 py-3 text-sm text-red-700">{playlistActionError}</div>}
            {/* Search */}
            <div className="px-4 py-2.5 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={addModalSearch}
                  onChange={e => setAddModalSearch(e.target.value)}
                  placeholder="동영상 제목으로 검색..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            {/* Video list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {addModalVideos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  {addModalSearch ? '검색 결과가 없습니다.' : '등록된 동영상이 없습니다. 먼저 내 동영상 탭에서 동영상을 추가하세요.'}
                </div>
              ) : addModalVideos.map(v => {
                const isSelected = addModalSelected.has(v.id);
                const thumb = v.source === 'direct'
                  ? v._media?.thumbnailUrl
                  : deriveYtThumbnail(v._snapshot?.contentJson);
                const dur = v.source === 'direct'
                  ? undefined
                  : v._snapshot?.contentJson?.duration as number | undefined;
                const st = v.source === 'direct'
                  ? v._media?.sourceType
                  : v._snapshot?.contentJson?.sourceType as string | undefined;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setAddModalSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(v.id)) next.delete(v.id);
                        else next.add(v.id);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    {/* Thumbnail */}
                    <div className="w-14 h-9 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-3 h-3 text-slate-300" />
                        </div>
                      )}
                    </div>
                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{v.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {v.source === 'snapshot' ? (
                          <span className="text-[9px] font-semibold px-1 py-0 rounded bg-blue-50 text-blue-600">HUB복사</span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1 py-0 rounded bg-purple-50 text-purple-600">직접등록</span>
                        )}
                        {st && (
                          <span className={`px-1 py-0 rounded text-[9px] font-semibold ${st === 'youtube' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {st === 'youtube' ? 'YT' : 'VM'}
                          </span>
                        )}
                        {dur && dur > 0 && (
                          <span className="text-[11px] text-slate-400">{formatDuration(dur)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <button
                onClick={() => { setShowAddVideoModal(false); setAddModalSelected(new Set()); setAddModalSearch(''); }}
                className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleBulkAdd}
                disabled={addModalSelected.size === 0 || addModalSaving || playlistBusy}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addModalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {addModalSaving ? '추가 중...' : `${addModalSelected.size > 0 ? addModalSelected.size + '개 ' : ''}추가`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Selector Modal (WO-O4O-SIGNAGE-LIBRARY-INTEGRATION-V1) */}
      <StoreAssetSelectorModal
        open={showLibrarySelector}
        onSelect={handleAddFromLibrary}
        onClose={() => setShowLibrarySelector(false)}
        usageType="signage"
      />

      {/* ─── Media / Snapshot Edit Drawer ─────────── */}
      <StoreSignageMediaEditor key={editingTarget?.kind === 'direct' ? `media:${editingTarget.media.id}` : `snapshot:${editingTarget?.snapshot.id}`}
        target={editingTarget} draft={editDraft} onChange={handleEditChange}
        editSaving={editSaving} editError={editError}
        handleCloseEditDrawer={handleCloseEditDrawer}
        handleDeleteFromDrawer={handleDeleteFromDrawer} handleSaveEdit={handleSaveEdit}
      />
    </div>
  );
}

/* ─── Sub-Components ─────────────────────────── */

function KpiCard({ label, count, color, warning }: {
  label: string;
  count: number;
  color: 'green' | 'slate' | 'orange' | 'red' | 'purple';
  warning?: string;
}) {
  const colorMap = {
    green: { bg: 'bg-green-50', text: 'text-green-700' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${c.bg}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${c.text}`}>
        {count}<span className="text-sm font-normal ml-0.5">건</span>
      </div>
      {warning && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-600 font-medium">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </div>
      )}
    </div>
  );
}

