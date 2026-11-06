import { fetchRequiredPlaylistVideos, type StorePlaylistItem, type StorePlaylist } from '../../api/storePlaylist';
import { inRequiredWindow, useSignageClock } from './signage/requiredVideoWindow';
import { PlaylistNameEditor } from './signage/PlaylistNameEditor';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { CommunityVideoImport } from './signage/CommunityVideoImport';
import { VideoRegistration, type VideoRegistrationAction } from '@o4o/store-ui-core';
import { askStoreAi, storeAiError } from '../../api/storeAi';
import { mediaApi } from '../../api/media';
import { createYoutubeVideoApi, registerSignageVideo } from '../../api/signageMedia';
import { StoreAiSlot } from '../../components/store/StoreAiPlacement';
import { SignageQuickStart } from './signage/SignageQuickStart';
import { SignagePlaylistPreview } from './signage/SignagePlaylistPreview';
import { AuthoringDialog } from './authoring/AuthoringDialog';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';
import { readSignageMediaDraft, signageMediaMetadata, emptySignageMediaDraft, type SignageEditTarget, type SignageMediaDraft } from './signage/signageMediaDraft';
import { buildSignageVideoList, filterSignageVideos, signageVideoOrigin, signageVideoTags, summarizePlaylistDuration, SIGNAGE_VIDEO_ORIGINS, type UnifiedVideoItem, type SignageSortKey as SortKey } from './signage/signageVideoList';
import { SignageTabs } from './signage/SignageTabs';
import { BusinessVideoImport } from './signage/BusinessVideoImport';
import { useSignagePlaylists } from './hooks/useSignagePlaylists';
/**
 * StoreSignagePage — 사이니지 운영 엔진
 *
 * WO-O4O-STORE-SIGNAGE-ENGINE-V1
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1: Playlist 탭 추가
 * 동영상 / 재생목록 / 디스플레이 재생. 매장 시간표 기능은 폐기.
 *
 * 목록 업무 계약: docs/architecture/O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md
 *  /marketing/signage/videos          동영상 목록
 *  /marketing/signage/videos/new      동영상 등록 (O4O 영상 · 외부 영상 · 제공 영상 가져오기)
 *  /marketing/signage/playlist        재생목록 목록
 *  /marketing/signage/playlist/:id    재생목록 상세 · 편집
 * 디스플레이 재생은 별도 화면(SignagePlayerSelectPage)에서 새 탭으로 선택한다.
 *
 * 전이 패턴: Hub → assetSnapshotApi.copy → o4o_asset_snapshots → Playlist에 추가
 *
 * ── 사이니지 구조 원칙 (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) ──
 * 1. Hub = 원본, Store = snapshot 조합
 * 2. clone 사용 금지 — assetSnapshotApi.copy() 단일 경로
 * 3. Playlist = 유일한 재생 단위
 * 4. 공개 렌더링: /public/signage?playlist=:id
 */

import { StoreSignageMediaEditor } from './StoreSignageMediaEditor';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { withWorkspaceMode } from '../../config/storeWorkspace';
import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react';
import { useStoreResource } from './hooks/useStoreResource';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Pagination } from '@o4o/operator-ux-core';
import {
  // WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-B: 공통 사이니지 순수 로직
  formatSignageShortDate as formatShortDate,
  daysUntil,
  isForcedExpiringSoon,
  isForcedExpired,
} from '@o4o/store-ui-core';
import {
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldAlert,
  AlertTriangle,
  Plus,
  ListVideo,
  Trash2,
  Play,
  Search,
} from 'lucide-react';
import { DataTable, ListWorkspace, useListSelection, type Column } from '@o4o/ui';
import {
  assetSnapshotApi,
  storeAssetControlApi,
  type StoreAssetItem,
} from '../../api/assetSnapshot';
import {
  fetchSignageMedia,
  updateSignageMedia,
  deleteSignageMedia,
  type SignageMediaItem,
} from '../../api/signageMedia';
import { StoreAssetSelectorModal } from '../../components/store/StoreAssetSelectorModal';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';

/* ─── Constants ──────────────────────────────── */

const PAGE_LIMIT = 20;

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

/** 표 썸네일. 직접 등록 영상은 저장된 값, 가져온 영상은 사본의 값에서 얻는다. */
function videoThumbnail(video: UnifiedVideoItem): string | undefined {
  if (video.source === 'direct') {
    return video._media?.thumbnailUrl
      ?? deriveYtThumbnail({ embedId: video._media?.embedId ?? undefined, sourceType: video._media?.sourceType });
  }
  return deriveYtThumbnail(video._snapshot?.contentJson);
}

type SignageView = 'videos' | 'video-new' | 'playlists' | 'playlist-detail';

function readRoutePlaylistId(pathname: string): string | null {
  const match = pathname.match(/\/marketing\/signage\/playlist\/([^/]+)\/?$/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

function readSignageView(pathname: string, playlistId: string | null): SignageView {
  if (/\/marketing\/signage\/videos\/new\/?$/.test(pathname)) return 'video-new';
  if (pathname.includes('/marketing/signage/videos')) return 'videos';
  return playlistId ? 'playlist-detail' : 'playlists';
}

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
  const { effectiveServiceKey } = useUnifiedStore();
  const youtubeVideoApi = useMemo(() => createYoutubeVideoApi(organizationId, isCurrent), [organizationId, isCurrent]);
  const organizationRef = useRef(organizationId); organizationRef.current = organizationId;

  // 화면은 URL 이 정한다. 직접 주소 · 새로고침 · 뒤로가기가 같은 화면을 복원한다.
  const routePlaylistId = useMemo(() => readRoutePlaylistId(location.pathname), [location.pathname]);
  const view = readSignageView(location.pathname, routePlaylistId);
  const videosPath = withWorkspaceMode(`${base}/marketing/signage/videos`, 'studio');
  const playlistsPath = withWorkspaceMode(`${base}/marketing/signage/playlist`, 'studio');
  const playlistDetailPath = (id: string) => withWorkspaceMode(`${base}/marketing/signage/playlist/${encodeURIComponent(id)}`, 'studio');

  // ── Legacy asset state ──
  const { data: items, setData: setItems, loading, error: listError, reload: reloadItems } = useStoreResource(loadSignageAssets, []);

  const [error, setError] = useState<string | null>(null);
  const fetchItems = useCallback(async () => { setError(null); await reloadItems(); }, [reloadItems]);

  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [assetQuery, setAssetQuery] = useState('');
  const [assetKeyword, setAssetKeyword] = useState('');
  const [assetOrigin, setAssetOrigin] = useState('');
  const [businessImportOpen, setBusinessImportOpen] = useState(false);

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
    handleRenamePlaylist,
    handleAddFromLibrary,
    handleDeleteItem,
    handleBulkAdd,
    handleMoveItem,
    acceptCreatedPlaylist,
  } = useSignagePlaylists(organizationId);
  const [quickStart, setQuickStart] = useState(false);
  const [initialVideos, setInitialVideos] = useState<string[]>([]);
  const [playlistPreview, setPlaylistPreview] = useState(false);
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [playlistPage, setPlaylistPage] = useState(1);
  const entryState = location.state as { addSignageMaterials?: boolean; signagePlaylistSaved?: string } | null;
  const savedGuide = view === 'playlist-detail' ? entryState?.signagePlaylistSaved ?? null : null;
  const consumedEntry = useRef('');
  const deletingPlaylist = useRef<string | null>(null);
  const addVideoTitleId = useId();
  const closeAddVideo = () => {
    if (playlistBusy || addModalSaving) return;
    setShowAddVideoModal(false); setAddModalSelected(new Set()); setAddModalSearch('');
  };
  // 상세 화면의 대상은 주소가 정한다. 매장이 바뀌면 훅이 선택을 비우므로 그 뒤에 다시 맞춘다.
  // 이 매장 목록에서 확인한 ID 만 항목을 읽는다. 다른 매장의 ID 로 요청을 보내지 않는다.
  const knownRoutePlaylistId = routePlaylistId && playlists.some(item => item.id === routePlaylistId) ? routePlaylistId : null;
  useEffect(() => { setSelectedPlaylistId(knownRoutePlaylistId); }, [knownRoutePlaylistId, organizationId]);
  // 이름만 먼저 만든 재생목록은 상세에 도착하면 바로 동영상 추가를 연다.
  useEffect(() => {
    const entryKey = `${location.key}:${routePlaylistId}`;
    if (view !== 'playlist-detail' || !entryState?.addSignageMaterials || consumedEntry.current === entryKey || playlistLoading) return;
    if (!playlists.some(item => item.id === routePlaylistId)) return;
    consumedEntry.current = entryKey;
    setShowAddVideoModal(true);
  }, [location.key, entryState, view, routePlaylistId, playlists, playlistLoading, setShowAddVideoModal]);
  // 상세에서 삭제가 끝나면 목록으로 돌아간다. 실패하면 재생목록이 남아 있어 이동하지 않는다.
  useEffect(() => {
    if (!routePlaylistId || deletingPlaylist.current !== routePlaylistId || playlistLoading) return;
    if (playlists.some(item => item.id === routePlaylistId)) return;
    deletingPlaylist.current = null;
    navigate(playlistsPath, { replace: true });
  }, [routePlaylistId, playlists, playlistLoading, navigate, playlistsPath]);

  // ── Direct video registration (signage_media) ──
  const mediaReads = useLatestStoreRequest();
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
  const mediaMutation = useRef(false);
  const [signageMediaItems, setSignageMediaItems] = useState<SignageMediaItem[]>([]);
  // Target and draft belong to one editor, with one change action.
  const [editingTarget, setEditingTarget] = useState<SignageEditTarget | null>(null);
  const [editDraft, setEditDraft] = useState<SignageMediaDraft>(emptySignageMediaDraft);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const editBusy = useRef(false);
  const editTargetRef = useRef(editingTarget); editTargetRef.current = editingTarget;
  const editDraftRef = useRef(editDraft); editDraftRef.current = editDraft;
  const loadSignageMedia = useCallback(async () => {
    if (!organizationId || !isCurrent()) return;
    const current = mediaReads.begin(); setMediaLoading(true); setMediaLoadError(null);
    try {
      const data = await fetchSignageMedia(organizationId);
      if (!Array.isArray(data)) throw new Error('Invalid media');
      if (current() && isCurrent()) setSignageMediaItems(data);
    } catch { if (current() && isCurrent()) setMediaLoadError('동영상을 불러오지 못했습니다. 다시 시도해 주시기 바랍니다.'); }
    finally { if (current() && isCurrent()) setMediaLoading(false); }
  }, [organizationId, mediaReads, isCurrent]);

  // Load the video library for the current store.
  useEffect(() => {
    loadSignageMedia();
  }, [loadSignageMedia]);

  const askVideoRegistration = useCallback(async (question: string) => {
    try {
    const result = await askStoreAi({ question, serviceId: effectiveServiceKey ?? 'neture', task: 'draft', contextData: { pageTitle: '내 매장 · 동영상 등록', serviceInfo: { purpose: '등록할 영상의 제목·설명·태그 JSON 준비. 저장·URL·권한 판단은 하지 않는다.' } } });
    return result.answer!;
    } catch (cause) { throw new Error(storeAiError(cause)); }
  }, [effectiveServiceKey]);
  const saveVideoRegistration = useCallback(async (payload: import('@o4o/store-ui-core').VideoRegistrationPayload) => {
    if (!isCurrent() || organizationRef.current !== organizationId) throw new Error('매장이 변경됐습니다. 현재 매장에서 다시 시작해 주시기 바랍니다.');
    return registerSignageVideo(organizationId, payload);
  }, [organizationId, isCurrent]);
  const videoRequestSlot = useCallback((action: VideoRegistrationAction) => <StoreAiSlot priority={3} label="동영상 등록" action={action} />, []);

  const handleDeleteVideo = async (video: UnifiedVideoItem) => {
    if (mediaMutation.current || !isCurrent() || !confirm(`"${video.title}" 동영상을 삭제하시겠습니까? 재생목록에서 제거하는 작업과 다릅니다.`)) return;
    mediaReads.cancel(); setMediaLoading(false);
    mediaMutation.current = true; setError(null);
    try {
      if (video.source === 'direct' && video._media) {
        await deleteSignageMedia(organizationId, video._media.id);
        if (isCurrent()) await loadSignageMedia();
      } else if (video._snapshot) {
        await assetSnapshotApi.remove(video._snapshot.id);
        if (isCurrent()) await reloadItems();
      }
    } catch { if (isCurrent()) setError('동영상을 삭제하지 못했습니다. 다시 시도해 주시기 바랍니다.'); }
    finally { mediaMutation.current = false; }
  };

  const handleOpenEdit = (video: UnifiedVideoItem) => {
    if (editBusy.current || mediaMutation.current || !isCurrent()) return;
    const target: SignageEditTarget | null = video.source === 'direct' && video._media
      ? { kind: 'direct', media: video._media }
      : video._snapshot ? { kind: 'snapshot', snapshot: video._snapshot } : null;
    if (!target) return;
    if (target.kind === 'snapshot' && (target.snapshot.isLocked || target.snapshot.isForced)) return;
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
      if (target.kind === 'direct') void loadSignageMedia(); else {
        void fetchItems();
        if (selectedPlaylistId) void loadPlaylistItems(selectedPlaylistId);
      }
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
      if (isCurrent() && organizationRef.current === store && editTargetRef.current === target) setEditError('삭제하지 못했습니다. 다시 시도해 주시기 바랍니다.');
    } finally { mediaMutation.current = false; editBusy.current = false; if (isCurrent()) setEditSaving(false); }
  };
  useEffect(() => { editTargetRef.current = null; setEditingTarget(null); setEditError(''); }, [organizationId]);
  // ── Unified video list (snapshots + direct media) ──
  const [requiredVideos, setRequiredVideos] = useState<StorePlaylistItem[]>([]);
  const [requiredReadError, setRequiredReadError] = useState('');
  const now = useSignageClock();
  useEffect(() => {
    let active = true, busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try { const data = await fetchRequiredPlaylistVideos(); if (active && isCurrent()) { setRequiredVideos(previous => JSON.stringify(previous) === JSON.stringify(data) ? previous : data); setRequiredReadError(''); } }
      catch { if (active) setRequiredReadError('필수 영상을 갱신하지 못했습니다. 잠시 후 다시 확인합니다.'); }
      finally { busy = false; }
    };
    void refresh(); const timer = setInterval(() => void refresh(), 15000);
    return () => { active = false; clearInterval(timer); };
  }, [organizationId, isCurrent]);
  const windowSignature = [...items.filter(item => inRequiredWindow(item, now)).map(item => item.id), ...requiredVideos.filter(item => inRequiredWindow(item, now)).map(item => item.id)].join(',');
  const unifiedVideos = useMemo(() => [
    ...buildSignageVideoList(items, signageMediaItems).filter(video => inRequiredWindow(video, now)),
    ...requiredVideos.filter(item => inRequiredWindow(item, now)).map(item => ({
      id: item.id, title: item.title, source: 'snapshot' as const, publishStatus: 'published' as const,
      isForced: true, isLocked: true, forcedStartAt: item.forcedStartAt, forcedEndAt: item.forcedEndAt, createdAt: item.createdAt,
      _snapshot: { ...item, publishStatus: 'published', contentJson: item.contentJson, assetType: 'signage' } as unknown as StoreAssetItem,
    })),
  ], [items, signageMediaItems, requiredVideos, windowSignature]);

  const forcedExpiringCount = useMemo(() => items.filter(isForcedExpiringSoon).length, [items]);

  // Filter + Sort + Keyword (unified: snapshots + direct media)
  const filteredUnified = useMemo(() => filterSignageVideos(unifiedVideos, {
    status: 'published', sort: sortKey, keyword: assetKeyword, origin: assetOrigin,
  }), [unifiedVideos, sortKey, assetKeyword, assetOrigin]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUnified.length / PAGE_LIMIT));
  const pagedUnified = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredUnified.slice(start, start + PAGE_LIMIT);
  }, [filteredUnified, page]);

  useEffect(() => { setPage(1); }, [sortKey, assetKeyword, assetOrigin]);

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

  const playlistTotalPages = Math.max(1, Math.ceil(filteredPlaylists.length / PAGE_LIMIT));
  const pagedPlaylists = useMemo(() => {
    const start = (playlistPage - 1) * PAGE_LIMIT;
    return filteredPlaylists.slice(start, start + PAGE_LIMIT);
  }, [filteredPlaylists, playlistPage]);
  useEffect(() => { setPlaylistPage(1); }, [organizationId, playlistKeyword]);
  useEffect(() => { if (playlistPage > playlistTotalPages) setPlaylistPage(playlistTotalPages); }, [playlistPage, playlistTotalPages]);

  // 매장 · 화면 · 검색 · 필터 · 페이지가 바뀌면 선택은 그 렌더부터 비어 있다.
  const videoSelection = useListSelection(`${organizationId}:${view}:${sortKey}:${assetKeyword}:${assetOrigin}:${page}`);
  const playlistSelection = useListSelection(`${organizationId}:${view}:${playlistKeyword}:${playlistPage}`);
  const retainVideos = videoSelection.retain, retainPlaylists = playlistSelection.retain;
  useEffect(() => { retainVideos(pagedUnified.map(item => item.id)); }, [pagedUnified, retainVideos]);
  useEffect(() => { retainPlaylists(pagedPlaylists.map(item => item.id)); }, [pagedPlaylists, retainPlaylists]);
  useEffect(() => { editTargetRef.current = null; setEditingTarget(null); }, [organizationId, view, page, sortKey, assetKeyword, assetOrigin]);

  const checkedVideos = pagedUnified.filter(item => videoSelection.isSelected(item.id));
  const checkedVideo = checkedVideos.length === 1 ? checkedVideos[0] : undefined;
  const checkedPlaylists = pagedPlaylists.filter(item => playlistSelection.isSelected(item.id));
  const checkedPlaylist = checkedPlaylists.length === 1 ? checkedPlaylists[0] : undefined;
  const videoActionBusy = editSaving;
  const videoFilterActive = !!assetKeyword.trim() || !!assetOrigin;
  const videoListError = listError || mediaLoadError;
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);
  const canCreatePlaylist = !loading && !mediaLoading && !listError && !mediaLoadError;
  const refreshAll = () => { void fetchItems(); void loadSignageMedia(); void loadPlaylists(); };
  const refreshButton = (
    <button type="button" onClick={refreshAll} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50">
      <RefreshCw className="w-4 h-4" />
      새로고침
    </button>
  );
  const clearCommunityEntry = () => {
    const params = new URLSearchParams(location.search);
    params.delete('communityVideo'); params.delete('communityRequest');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };
  const communityParams = new URLSearchParams(location.search);
  const communityVideoId = communityParams.get('communityVideo');
  const materialErrors = (
    <>
      {listError && <p role="alert" className="text-sm text-red-700">매장 자료를 불러오지 못했습니다. <button type="button" onClick={() => void fetchItems()} className="min-h-11 underline">매장 자료 다시 시도</button></p>}
      {mediaLoadError && <p role="alert" className="text-sm text-red-700">{mediaLoadError}<button type="button" onClick={() => void loadSignageMedia()} className="ml-2 min-h-11 underline">동영상 다시 시도</button></p>}
    </>
  );
  const videoColumns = [
    { key: 'select', title: <input type="checkbox" aria-label="동영상 현재 페이지 전체 선택" checked={pagedUnified.length > 0 && pagedUnified.every(item => videoSelection.isSelected(item.id))} onChange={event => videoSelection.setMany(pagedUnified.map(item => item.id), event.target.checked)} />, render: (_v: unknown, item: UnifiedVideoItem) => <input type="checkbox" aria-label={`${item.title} 영상 선택`} checked={videoSelection.isSelected(item.id)} onChange={event => videoSelection.toggle(item.id, event.target.checked)} /> },
    {
      key: 'thumbnail',
      title: '썸네일',
      render: (_v: unknown, v: UnifiedVideoItem) => {
        const thumb = videoThumbnail(v);
        return (
          <div className="h-10 w-16 overflow-hidden rounded bg-slate-100">
            {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="flex h-full w-full items-center justify-center"><Play className="h-3 w-3 text-slate-300" /></div>}
          </div>
        );
      },
    },
    {
      key: 'title',
      title: '영상 이름',
      render: (_v: unknown, v: UnifiedVideoItem) => {
        const tags = signageVideoTags(v);
        const item = v._snapshot;
        const editable = !v.isLocked && !v.isForced;
        const expired = !!item && isForcedExpired(item);
        const expiringSoon = !!item && isForcedExpiringSoon(item);
        return (
          <div>
            {editable
              ? <button type="button" onClick={() => handleOpenEdit(v)} className="min-h-11 text-left font-medium text-slate-900 underline-offset-2 hover:underline sm:min-h-0 break-words whitespace-normal">{v.title}</button>
              : <span className="font-medium text-slate-900 break-words whitespace-normal">{v.title}</span>}
            {tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{tags.map(tag => <span key={tag} className="px-1.5 rounded text-xs bg-slate-100 text-slate-500">{tag}</span>)}</div>}
            {item?.isForced && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
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
    { key: 'origin', title: '출처', render: (_v: unknown, v: UnifiedVideoItem) => <span className="text-sm text-slate-600">{signageVideoOrigin(v)}</span> },
    { key: 'createdAt', title: '등록일', render: (_v: unknown, v: UnifiedVideoItem) => <span className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleDateString('ko-KR')}</span> },
  ] as Column<UnifiedVideoItem>[];
  const playlistColumns = [
    { key: 'select', title: <input type="checkbox" aria-label="재생목록 현재 페이지 전체 선택" checked={pagedPlaylists.length > 0 && pagedPlaylists.every(item => playlistSelection.isSelected(item.id))} onChange={event => playlistSelection.setMany(pagedPlaylists.map(item => item.id), event.target.checked)} />, render: (_v: unknown, item: StorePlaylist) => <input type="checkbox" aria-label={`${item.name} 재생목록 선택`} checked={playlistSelection.isSelected(item.id)} onChange={event => playlistSelection.toggle(item.id, event.target.checked)} /> },
    {
      key: 'name',
      title: '이름',
      render: (_v: unknown, pl: StorePlaylist) => (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={playlistDetailPath(pl.id)} className="inline-flex min-h-11 items-center font-medium text-slate-900 underline-offset-2 hover:underline sm:min-h-0">{pl.name}</Link>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${pl.publishStatus === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{pl.publishStatus === 'published' ? '게시 중' : '초안'}</span>
            {pl.forcedCount > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">강제 {pl.forcedCount}</span>}
          </div>
          {pl.tags && pl.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{pl.tags.map(tag => <span key={tag} className="px-1.5 rounded text-[10px] bg-slate-100 text-slate-500">{tag}</span>)}</div>}
        </div>
      ),
    },
    { key: 'itemCount', title: '동영상 수', dataIndex: 'itemCount', align: 'center', render: (v: number) => <span className="text-slate-600">{v}</span> },
    {
      key: 'duration',
      title: '총 재생시간',
      render: (_v: unknown, pl: StorePlaylist) => (
        <span className="text-sm text-slate-600">
          {pl.totalDurationSec ? formatDuration(pl.totalDurationSec) : '—'}
          {!!pl.missingDurationCount && <span className="ml-1 text-xs text-amber-700">(미등록 {pl.missingDurationCount}개 제외)</span>}
        </span>
      ),
    },
    { key: 'updatedAt', title: '수정일', dataIndex: 'updatedAt', render: (v: string) => <span className="text-xs text-slate-500">{new Date(v).toLocaleDateString('ko-KR')}</span> },
  ] as Column<StorePlaylist>[];


  // WO-O4O-STORE-LAYOUT-WIDTH-OVERFLOW-FIX-V1: max-w/mx-auto 제거 — StoreDashboardLayout이 max-w-[1200px] 관리
  return (
    <div className="w-full">
      {view === 'videos' && (
        <ListWorkspace
          navigation={<SignageTabs base={base} active="videos" />}
          title="동영상"
          headerActions={refreshButton}
          createAction={{
            label: '동영상 등록',
            render: ({ className }) => <Link to={withWorkspaceMode(`${base}/marketing/signage/videos/new`, 'studio')} className={className}><Plus className="w-4 h-4" />동영상 등록</Link>,
          }}
          filters={
            <form role="search" aria-label="동영상 검색" className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); setAssetKeyword(assetQuery); }}>
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" aria-label="동영상 검색어" value={assetQuery} onChange={e => setAssetQuery(e.target.value)} placeholder="제목·태그로 검색..." className="min-h-11 w-full rounded-lg border border-slate-200 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select aria-label="출처" value={assetOrigin} onChange={e => setAssetOrigin(e.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600">
                <option value="">전체 출처</option>
                {SIGNAGE_VIDEO_ORIGINS.map(origin => <option key={origin} value={origin}>{origin}</option>)}
              </select>
              <select aria-label="정렬" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600">
                <option value="newest">최신순</option>
                <option value="forced-first">강제노출 우선</option>
              </select>
              <button type="submit" className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50">검색</button>
            </form>
          }
          notice={
            <>
              {communityVideoId && <CommunityVideoImport requestKey={communityParams.get('communityRequest') ?? undefined} videoId={communityVideoId} organizationId={organizationId} isCurrent={isCurrent} onClose={clearCommunityEntry} onImported={() => { void reloadItems(); clearCommunityEntry(); }} />}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {requiredReadError && <output className="block text-sm text-amber-800">{requiredReadError}</output>}
              {forcedExpiringCount > 0 && !loading && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">강제노출 만료 임박: <strong>{forcedExpiringCount}건</strong>의 사이니지가 7일 이내 만료됩니다.</span>
                </div>
              )}
            </>
          }
          loading={loading || mediaLoading}
          loadingMessage="동영상 목록을 불러오고 있습니다."
          error={videoListError ? { message: videoListError, onRetry: () => { void fetchItems(); void loadSignageMedia(); }, retryLabel: '동영상 다시 시도' } : null}
          isEmpty={filteredUnified.length === 0}
          filterActive={videoFilterActive}
          emptyMessage="아직 등록한 동영상이 없습니다."
          noResultsMessage="검색 조건에 맞는 동영상이 없습니다."
          selection={{
            selectedCount: videoSelection.selectedCount,
            onClearSelection: videoSelection.clear,
            actions: [
              { key: 'create', label: '선택 영상으로 재생목록 만들기', disabled: videoActionBusy || checkedVideos.some(video => video.isForced || video.isLocked), onClick: () => { setInitialVideos(checkedVideos.map(video => video.id)); setQuickStart(true); } },
              { key: 'detail', label: '선택 영상 상세·수정', disabled: !checkedVideo || videoActionBusy || checkedVideo.isLocked || checkedVideo.isForced, onClick: () => { if (checkedVideo) handleOpenEdit(checkedVideo); } },
              { key: 'delete', label: '선택 영상 삭제', variant: 'danger', disabled: !checkedVideo || videoActionBusy || checkedVideo.isLocked || checkedVideo.isForced, onClick: () => (checkedVideo ? handleDeleteVideo(checkedVideo) : undefined) },
            ],
            statusInfo: '여러 영상을 선택해 새 재생목록을 만들 수 있습니다. 상세·수정·삭제는 한 개를 선택합니다.',
          }}
          pagination={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filteredUnified.length} />}
        >
          <DataTable<UnifiedVideoItem>
            columns={videoColumns}
            dataSource={pagedUnified}
            rowKey="id"
            loading={false}
            onRow={v => ({
              className: v._snapshot && v._snapshot.isForced && !isForcedExpired(v._snapshot) ? 'bg-red-50/30'
                : v._snapshot && isForcedExpired(v._snapshot) ? 'opacity-60'
                : '',
            })}
            emptyText="동영상이 없습니다"
          />
        </ListWorkspace>
      )}

      {view === 'video-new' && (
        <div className="space-y-4">
          <SignageTabs base={base} active="videos" />
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">동영상 등록</h1>
              <p className="mt-1 text-sm text-slate-600">O4O 영상을 등록하거나 외부 영상을 연결합니다.</p>
            </div>
            <Link to={videosPath} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50">동영상 목록으로</Link>
          </header>
          {mediaLoadError && <p role="alert" className="text-sm text-red-700">{mediaLoadError}<button type="button" onClick={() => void loadSignageMedia()} className="ml-2 min-h-11 underline">동영상 다시 시도</button></p>}
          <VideoRegistration contextKey={organizationId} youtube={youtubeVideoApi} mediaApi={mediaApi} ask={askVideoRegistration} save={saveVideoRegistration} onSaved={loadSignageMedia} requestSlot={videoRequestSlot} />
          <section aria-label="제공 영상 가져오기" className="rounded-xl border border-slate-300 bg-white p-4">
            <h2 className="font-semibold text-slate-900">제공 영상 가져오기</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <a className="inline-flex min-h-11 items-center underline" href="https://community.neture.co.kr">커뮤니티에서 영상 찾기</a>
              {effectiveServiceKey === 'kpa-society' && <button type="button" className="min-h-11 underline" onClick={() => setBusinessImportOpen(true)}>가입 협업체 영상 가져오기</button>}
            </div>
          </section>
          {businessImportOpen && <BusinessVideoImport organizationId={organizationId} isCurrent={isCurrent} onImported={() => void reloadItems()} onClose={() => setBusinessImportOpen(false)} />}
        </div>
      )}

      {view === 'playlists' && (
        <ListWorkspace
          navigation={<SignageTabs base={base} active="playlists" />}
          title="재생목록"
          headerActions={refreshButton}
          createAction={{ label: '재생목록 만들기', icon: <Plus className="w-4 h-4" />, disabled: !canCreatePlaylist, onClick: () => { setInitialVideos([]); setQuickStart(true); } }}
          filters={
            <form role="search" aria-label="재생목록 검색" className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); setPlaylistKeyword(playlistQuery); }}>
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" aria-label="재생목록 검색어" value={playlistQuery} onChange={e => setPlaylistQuery(e.target.value)} placeholder="재생목록 이름으로 검색..." className="min-h-11 w-full rounded-lg border border-slate-200 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50">검색</button>
            </form>
          }
          notice={<>{playlistActionError && !showAddVideoModal && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{playlistActionError}</p>}{materialErrors}</>}
          loading={playlistLoading && !playlists.length}
          loadingMessage="재생목록을 불러오고 있습니다."
          error={playlistError ? { message: playlistError, onRetry: () => void loadPlaylists() } : null}
          isEmpty={filteredPlaylists.length === 0}
          filterActive={!!playlistKeyword.trim()}
          emptyMessage="아직 만든 재생목록이 없습니다."
          noResultsMessage="검색 조건에 맞는 재생목록이 없습니다."
          selection={{
            selectedCount: playlistSelection.selectedCount,
            onClearSelection: playlistSelection.clear,
            actions: [
              { key: 'edit', label: '선택 재생목록 수정', disabled: !checkedPlaylist, onClick: () => { if (checkedPlaylist) navigate(playlistDetailPath(checkedPlaylist.id)); } },
              { key: 'publish', label: checkedPlaylist?.publishStatus === 'published' ? '선택 재생목록 게시 중단' : '선택 재생목록 게시', disabled: !checkedPlaylist || busyPlaylistIds.has(checkedPlaylist.id) || (checkedPlaylist.publishStatus !== 'published' && !checkedPlaylist.itemCount), onClick: () => (checkedPlaylist ? handleTogglePublish(checkedPlaylist) : undefined) },
              { key: 'delete', label: '선택 재생목록 삭제', variant: 'danger', disabled: !checkedPlaylist || busyPlaylistIds.has(checkedPlaylist.id), onClick: () => (checkedPlaylist ? handleDeletePlaylist(checkedPlaylist) : undefined) },
            ],
            statusInfo: '수정·게시·삭제는 한 개의 재생목록을 선택한 경우 실행합니다.',
          }}
          pagination={<Pagination page={playlistPage} totalPages={playlistTotalPages} onPageChange={setPlaylistPage} total={filteredPlaylists.length} />}
        >
          <DataTable<StorePlaylist> columns={playlistColumns} dataSource={pagedPlaylists} rowKey="id" loading={false} emptyText="재생목록이 없습니다" />
        </ListWorkspace>
      )}

      {view === 'playlist-detail' && (
        <div className="space-y-4">
          <SignageTabs base={base} active="playlists" />
          <header className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-xl font-semibold text-slate-900">{selectedPlaylist?.name ?? '재생목록'}</h1>
            <Link to={playlistsPath} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50">재생목록 목록으로</Link>
          </header>
          {savedGuide && selectedPlaylist && <output className="block rounded-lg bg-teal-50 p-4 text-sm text-teal-900">{savedGuide} 초안을 저장했습니다. 자료를 확인한 뒤 게시하고 디스플레이에서 재생목록을 선택하시기 바랍니다.</output>}
          {playlistActionError && !showAddVideoModal && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{playlistActionError}</p>}
          {materialErrors}
          {playlistError ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
              <p>{playlistError}</p>
              <button type="button" onClick={() => void loadPlaylists()} className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 text-sm">다시 시도</button>
            </div>
          ) : !selectedPlaylist && (playlistLoading || knownRoutePlaylistId) ? (
            <p role="status" className="py-12 text-center text-sm text-slate-600">재생목록을 불러오고 있습니다.</p>
          ) : !selectedPlaylist || !selectedPlaylistId ? (
            <div role="alert" className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-600">
              <p>이 매장에서 찾을 수 없는 재생목록입니다. 삭제되었거나 다른 매장의 재생목록일 수 있습니다.</p>
            </div>
          ) : (
            <>
            <div className="border border-slate-200 rounded-lg bg-white mt-2">
              {/* Builder header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{selectedPlaylist.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">({playlistItems.length}개)</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    disabled={playlistBusy}
                    onClick={() => setShowLibrarySelector(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-600 border border-emerald-300 rounded-md hover:bg-emerald-50"
                    title="HUB Library에서 추가"
                  >
                    <Plus className="w-3 h-3" />
                    라이브러리
                  </button>
                  <button
                    disabled={playlistBusy}
                    onClick={() => { setAddModalSearch(''); setAddModalSelected(new Set()); setShowAddVideoModal(true); }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                  >
                    <Plus className="w-3 h-3" />
                    동영상 추가
                  </button>
                </div>
              </div>

              <section aria-label="선택 안내 다음 작업" className="space-y-3 border-b border-slate-100 bg-teal-50/40 p-4">
                <p className="text-sm text-slate-700">자료·순서 변경은 바로 저장됩니다. 실제 재생 화면은 다시 열어 확인하시기 바랍니다. 등록 영상에서 가져온 사본은 원본과 자동 동기화되지 않습니다. 필수 자료의 잠금·시간 조건은 유지됩니다.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={playlistItemsLoading || !!playlistItemsError || !playlistItems.length} onClick={() => setPlaylistPreview(true)} className="min-h-11 rounded-lg border border-teal-300 bg-white px-3 text-sm disabled:opacity-50">저장된 안내 미리보기</button>
                  <button type="button" disabled={playlistBusy || !playlistItems.length || !!playlistItemsError || playlistItemsLoading} onClick={() => void handleTogglePublish(selectedPlaylist)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50">{selectedPlaylist.publishStatus === 'published' ? '게시 중단' : '자료 확인 후 게시'}</button>
                  <button type="button" disabled={selectedPlaylist.publishStatus !== 'published' || !playlistItems.length || !!playlistItemsError || playlistItemsLoading} onClick={() => window.open(`${base}/marketing/signage/play/${encodeURIComponent(selectedPlaylist.id)}`, '_blank', 'noopener,noreferrer')} className="min-h-11 rounded-lg bg-teal-700 px-3 text-sm text-white disabled:opacity-50">이 재생목록으로 화면 열기</button>
                  <button type="button" disabled={playlistBusy} onClick={() => { deletingPlaylist.current = selectedPlaylist.id; void handleDeletePlaylist(selectedPlaylist); }} className="min-h-11 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-700 disabled:opacity-50">재생목록 삭제</button>
                </div>
              </section>

              <PlaylistNameEditor key={selectedPlaylist.id} playlist={selectedPlaylist} busy={playlistBusy} onSave={handleRenamePlaylist} />
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
                  <p className="text-xs mt-1">'동영상 추가' 버튼으로 동영상을 추가하시기 바랍니다.</p>
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
                            onClick={() => handleMoveItem(item.id, -1)}
                            disabled={playlistBusy || idx === 0}
                            className="text-slate-300 hover:text-slate-600 disabled:opacity-20 p-0.5"
                            title="위로"
                          >
                            <ChevronLeft className="w-3 h-3 rotate-90" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(item.id, 1)}
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
                          {!item.isLocked && !item.isForced && unifiedVideos.find(video => video._snapshot?.id === item.snapshotId && !video.isLocked && !video.isForced) && <button type="button" onClick={() => handleOpenEdit(unifiedVideos.find(video => video._snapshot?.id === item.snapshotId)!)} className="min-h-11 text-sm text-teal-800 underline">이 안내 자료 수정</button>}
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
                            aria-label={`${item.title} 재생목록에서 제거`}
                            className="p-1 text-slate-300 hover:text-red-500 rounded flex-shrink-0"
                            title="재생목록에서 제거"
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
              <details className="text-sm text-slate-600">
                <summary className="min-h-11 cursor-pointer content-center">AI로 안내 문구 작성 보조(선택)</summary>
                <StoreAiSlot label="사이니지 안내" />
              </details>
            </>
          )}
        </div>
      )}

      {quickStart && <SignageQuickStart videos={unifiedVideos} initialSelected={initialVideos} organizationId={organizationId} isCurrent={isCurrent}
        onSaved={playlist => { acceptCreatedPlaylist(playlist); setQuickStart(false); videoSelection.clear(); navigate(playlistDetailPath(playlist.id), { state: { signagePlaylistSaved: playlist.name } }); void fetchItems(); void loadPlaylists(); }}
        onClose={draft => { setQuickStart(false); if (draft) { acceptCreatedPlaylist(draft); navigate(playlistDetailPath(draft.id)); } void loadPlaylists(); }} />}
      {playlistPreview && selectedPlaylist && <SignagePlaylistPreview key={selectedPlaylist.id} name={selectedPlaylist.name} items={playlistItems} onClose={() => setPlaylistPreview(false)} />}

      {/* ── Add Video Modal (WO-O4O-STORE-SIGNAGE-PLAYLIST-BUILDER-V1) ── */}
      {showAddVideoModal && (
        <AuthoringDialog labelId={addVideoTitleId} onClose={closeAddVideo}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 id={addVideoTitleId} className="text-sm font-semibold text-slate-800">동영상 추가</h3>
                <p className="text-xs text-slate-400 mt-0.5">선택한 동영상이 재생목록에 추가됩니다</p>
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
                  disabled={addModalSaving || playlistBusy}
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
                  {addModalSearch ? '검색 결과가 없습니다.' : '등록된 동영상이 없습니다. 먼저 동영상 탭에서 동영상을 등록하시기 바랍니다.'}
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
                    disabled={addModalSaving || playlistBusy}
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
                disabled={addModalSaving || playlistBusy}
                onClick={closeAddVideo}
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
        </AuthoringDialog>
      )}

      {/* Asset Selector Modal (WO-O4O-SIGNAGE-LIBRARY-INTEGRATION-V1) */}
      <StoreAssetSelectorModal
        open={showLibrarySelector}
        onSelect={handleAddFromLibrary}
        onClose={() => { if (!playlistBusy) setShowLibrarySelector(false); }}
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
