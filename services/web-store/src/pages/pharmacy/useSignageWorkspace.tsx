import { type VideoRegistrationAction } from "@o4o/store-ui-core";
import {
  createYoutubeVideoApi,
  registerSignageVideo,
} from "../../api/signageMedia";
import { askStoreAi, storeAiError } from "../../api/storeAi";
import { type MediaAssetItem } from "../../components/common/MediaPickerModal";
import { StoreAiSlot } from "../../components/store/StoreAiPlacement";
import { useUnifiedStore } from "../../contexts/StoreContext";
import { useLatestStoreRequest } from "./hooks/useLatestStoreRequest";
import { useSignagePlaylists } from "./hooks/useSignagePlaylists";
import { useSignageSchedules } from "./hooks/useSignageSchedules";
import {
  emptySignageMediaDraft,
  readSignageMediaDraft,
  signageMediaMetadata,
  type SignageEditTarget,
  type SignageMediaDraft,
} from "./signage/signageMediaDraft";
import {
  buildSignageVideoList,
  filterSignageVideos,
  summarizePlaylistDuration,
  type SignageSortKey as SortKey,
  type SignageStatusFilter as StatusFilter,
  type UnifiedVideoItem,
} from "./signage/signageVideoList";
import { videoPreviewUrl } from "./signage/videoPreview";
/**
 * StoreSignagePage — 사이니지 운영 엔진
 *
 * WO-O4O-STORE-SIGNAGE-ENGINE-V1
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1: Playlist 탭 추가
 * WO-O4O-SIGNAGE-KPA-PHASE1-MODERNIZATION-V1: 3탭 구조 전환, DataTable 적용
 *
 * /store/signage: 3탭 구조
 *  [Tab 1] 동영상함 — 기존 channel_map 기반 자산 관리
 *  [Tab 2] 재생목록 — Store Playlist CRUD + item 관리
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

import {
  computeSignageKpi,
  detectVideoSource,
  getCurrentSchedule,
  getNextSchedule,
  isForcedExpiringSoon,
  isScheduleNowActive,
} from "@o4o/store-ui-core";
import { AlertTriangle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  assetSnapshotApi,
  storeAssetControlApi,
  type AssetPublishStatus,
  type StoreAssetItem,
} from "../../api/assetSnapshot";
import {
  createSignageMedia,
  deleteSignageMedia,
  fetchSignageMedia,
  updateSignageMedia,
  type SignageMediaItem,
} from "../../api/signageMedia";
import type { StorePlaylist } from "../../api/storePlaylist";
import { storeWorkspaceBase } from "../../components/store/StoreWorkflowNavigation";
import { withWorkspaceMode } from "../../config/storeWorkspace";
import { useStoreOrganizationId } from "../../hooks/useStoreOrganizationId";
import { useStoreResource } from "./hooks/useStoreResource";

/* ─── Constants ──────────────────────────────── */

const PAGE_LIMIT = 20;

const STATUS_CONFIG: Record<
  AssetPublishStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "초안", bg: "bg-slate-100", text: "text-slate-600" },
  published: { label: "게시됨", bg: "bg-green-50", text: "text-green-700" },
  hidden: { label: "숨김", bg: "bg-orange-50", text: "text-orange-700" },
};

/* ─── Helpers ────────────────────────────────── */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}초`;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function deriveYtThumbnail(
  cj: Record<string, unknown> | undefined,
): string | undefined {
  if (!cj) return undefined;
  const t = cj.thumbnailUrl as string | undefined;
  if (t) return t;
  const id = cj.embedId as string | undefined;
  if (id && cj.sourceType === "youtube") {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }
  return undefined;
}

type ActiveTab = "assets" | "playlist" | "schedules";

async function loadSignageAssets(): Promise<StoreAssetItem[]> {
  const response = await storeAssetControlApi.list({
    type: "signage",
    limit: 200,
  });
  if (!response.success) throw new Error("SIGNAGE_LOAD_FAILED");
  return response.data.items || [];
}

export function useSignageWorkspace({
  isCurrent,
}: Readonly<{ isCurrent: () => boolean }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = storeWorkspaceBase(location.pathname);
  const workspaceMode =
    new URLSearchParams(location.search).get("workspace") === "use"
      ? "use"
      : "studio";
  // WO-O4O-KPA-SIGNAGE-CANONICAL-API-403-RESOLUTION-V1:
  //   kpaMembership.organizationId(회원 자격 조직) → canonical 매장 조직으로 교정.
  //   signage store API 는 매장 조직만 인정한다.
  const { organizationId } = useStoreOrganizationId();
  const { effectiveServiceKey } = useUnifiedStore();
  const youtubeVideoApi = useMemo(
    () => createYoutubeVideoApi(organizationId, isCurrent),
    [organizationId, isCurrent],
  );
  const organizationRef = useRef(organizationId);
  organizationRef.current = organizationId;

  // URL-based tab derivation (IA restructure)
  const activeTab = useMemo((): ActiveTab => {
    if (location.pathname.includes("/videos")) return "assets";
    if (location.pathname.includes("/schedules")) return "schedules";
    return "playlist";
  }, [location.pathname]);

  const navigateTab = (tab: ActiveTab) => {
    const map: Record<ActiveTab, string> = {
      playlist: "/store/marketing/signage/playlist",
      assets: "/store/marketing/signage/videos",
      schedules: "/store/marketing/signage/schedules",
    };
    const target = map[tab].replace("/store", base);
    navigate(
      withWorkspaceMode(target, tab === "schedules" ? "use" : "studio"),
      { replace: true },
    );
  };

  const {
    loadSchedules,
    loadSignagePlaylists,
    schedules,
    scheduleLoading,
    deletingScheduleIds,
    scheduleError,
    schedulePlaylistError,
    schedulePlaylistLoading,
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
    savedSchedule,
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
  const {
    data: items,
    setData: setItems,
    loading,
    error: listError,
    reload: reloadItems,
  } = useStoreResource(loadSignageAssets, []);

  const [error, setError] = useState<string | null>(null);
  const fetchItems = useCallback(async () => {
    setError(null);
    await reloadItems();
  }, [reloadItems]);
  const statusBusy = useRef(new Set<string>());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [assetKeyword, setAssetKeyword] = useState("");
  const [originFilter, setOriginFilter] = useState<
    UnifiedVideoItem["origin"] | "all"
  >("all");
  const [businessImport, setBusinessImport] = useState(false);

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
    handleUpdateDetails,
    handleTogglePublish,
    handleDeletePlaylist,
    handleAddFromLibrary,
    handleDeleteItem,
    handleBulkAdd,
    handleMoveItem,
    acceptCreatedPlaylist,
  } = useSignagePlaylists(organizationId);
  const [quickStart, setQuickStart] = useState(false);
  const [videoLibraryOpen, setVideoLibraryOpen] = useState(false);
  const [libraryPending, setLibraryPending] = useState<MediaAssetItem | null>(
    null,
  );
  const [libraryError, setLibraryError] = useState("");
  const [librarySaving, setLibrarySaving] = useState(false);
  const libraryLock = useRef(false);

  const [playlistPreview, setPlaylistPreview] = useState(false);
  const [savedGuide, setSavedGuide] = useState<string | null>(null);
  const consumedEntry = useRef("");
  const addVideoTitleId = useId();
  const closeAddVideo = () => {
    if (playlistBusy || addModalSaving) return;
    setShowAddVideoModal(false);
    setAddModalSelected(new Set());
    setAddModalSearch("");
  };
  useEffect(() => {
    const entry = location.state as {
      signagePlaylistId?: string;
      addSignageMaterials?: boolean;
      openSignageSchedule?: boolean;
    } | null;
    const entryKey = `${location.key}:${entry?.signagePlaylistId}`;
    if (
      !entry?.signagePlaylistId ||
      consumedEntry.current === entryKey ||
      playlistLoading
    )
      return;
    const target = playlists.find(
      (item) => item.id === entry.signagePlaylistId,
    );
    if (!target) return;
    consumedEntry.current = entryKey;
    if (activeTab === "playlist") {
      setSelectedPlaylistId(target.id);
      if (entry.addSignageMaterials) setShowAddVideoModal(true);
    } else if (
      activeTab === "schedules" &&
      entry.openSignageSchedule &&
      target.publishStatus === "published"
    ) {
      resetScheduleForm();
      setSchPlaylistId(target.id);
      setSchName(`${target.name} 재생`);
      setShowScheduleForm(true);
    }
  }, [
    location.key,
    location.state,
    activeTab,
    playlists,
    playlistLoading,
    setSelectedPlaylistId,
    setShowAddVideoModal,
    resetScheduleForm,
    setSchPlaylistId,
    setSchName,
    setShowScheduleForm,
  ]);

  // ── Direct video registration (signage_media) ──
  const mediaReads = useLatestStoreRequest();
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
  const mediaMutation = useRef(false);
  const [signageMediaItems, setSignageMediaItems] = useState<
    SignageMediaItem[]
  >([]);
  const [showVideoRegForm, setShowVideoRegForm] = useState(false);
  const [regVideoTitle, setRegVideoTitle] = useState("");
  const [regVideoUrl, setRegVideoUrl] = useState("");
  const [regVideoDescription, setRegVideoDescription] = useState("");
  const [regVideoTags, setRegVideoTags] = useState("");
  const [regVideoStatus, setRegVideoStatus] = useState<"draft" | "active">(
    "active",
  );
  const [regVideoSaving, setRegVideoSaving] = useState(false);
  const [regVideoError, setRegVideoError] = useState("");

  // Target and draft belong to one editor, with one change action.
  const [editingTarget, setEditingTarget] = useState<SignageEditTarget | null>(
    null,
  );
  const [editDraft, setEditDraft] = useState<SignageMediaDraft>(
    emptySignageMediaDraft,
  );
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const editBusy = useRef(false);
  const editTargetRef = useRef(editingTarget);
  editTargetRef.current = editingTarget;
  const editDraftRef = useRef(editDraft);
  editDraftRef.current = editDraft;
  const registrationBusy = useRef(false);
  const registrationDraft = JSON.stringify([
    regVideoTitle,
    regVideoUrl,
    regVideoDescription,
    regVideoTags,
    regVideoStatus,
  ]);
  const registrationDraftRef = useRef(registrationDraft);
  registrationDraftRef.current = registrationDraft;

  const loadSignageMedia = useCallback(async () => {
    if (!organizationId || !isCurrent()) return;
    const current = mediaReads.begin();
    setMediaLoading(true);
    setMediaLoadError(null);
    try {
      const data = await fetchSignageMedia(organizationId);
      if (!Array.isArray(data)) throw new Error("Invalid media");
      if (current() && isCurrent()) setSignageMediaItems(data);
    } catch {
      if (current() && isCurrent())
        setMediaLoadError(
          "동영상함을 불러오지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (current() && isCurrent()) setMediaLoading(false);
    }
  }, [organizationId, mediaReads, isCurrent]);

  // 마운트 시 콘텐츠·플레이리스트·스케줄 병렬 로드 (상단 요약 패널에 필요)
  useEffect(() => {
    loadSignageMedia();
  }, [loadSignageMedia]);

  const askVideoRegistration = useCallback(
    async (question: string) => {
      try {
        const result = await askStoreAi({
          question,
          serviceId: effectiveServiceKey ?? "neture",
          task: "draft",
          contextData: {
            pageTitle: "내 매장 · 동영상 등록",
            serviceInfo: {
              purpose:
                "등록할 영상의 제목·설명·태그 JSON 준비. 저장·URL·권한 판단은 하지 않는다.",
            },
          },
        });
        return result.answer!;
      } catch (cause) {
        throw new Error(storeAiError(cause));
      }
    },
    [effectiveServiceKey],
  );
  const saveVideoRegistration = useCallback(
    async (payload: import("@o4o/store-ui-core").VideoRegistrationPayload) => {
      if (!isCurrent() || organizationRef.current !== organizationId)
        throw new Error(
          "매장이 변경됐습니다. 현재 매장에서 다시 시작해 주세요.",
        );
      return registerSignageVideo(organizationId, payload);
    },
    [organizationId, isCurrent],
  );
  const videoRequestSlot = useCallback(
    (action: VideoRegistrationAction) => (
      <StoreAiSlot priority={3} label="동영상 등록" action={action} />
    ),
    [],
  );

  const registerLibraryVideo = async (asset: MediaAssetItem) => {
    if (libraryLock.current || mediaMutation.current || !isCurrent()) return;
    const store = organizationId;
    libraryLock.current = true;
    mediaMutation.current = true;
    setLibraryPending(asset);
    setLibrarySaving(true);
    setLibraryError("");
    setVideoLibraryOpen(false);
    try {
      await createSignageMedia(store, {
        name: asset.originalName,
        mediaType: "video",
        sourceType: "url",
        sourceUrl: asset.url,
        mediaLibraryAssetId: asset.id,
        tags: ["매장 영상"],
      });
      if (!isCurrent() || organizationRef.current !== store) return;
      setLibraryPending(null);
      await loadSignageMedia();
    } catch (error) {
      if (isCurrent() && organizationRef.current === store)
        setLibraryError(
          error instanceof Error
            ? error.message
            : "영상은 라이브러리에 보관됐지만 목록 등록을 확인하지 못했습니다. 다시 등록해 주세요.",
        );
    } finally {
      libraryLock.current = false;
      mediaMutation.current = false;
      if (isCurrent() && organizationRef.current === store)
        setLibrarySaving(false);
    }
  };

  // ── Video registration handler ──
  const handleRegisterVideo = async () => {
    setRegVideoError("");
    if (
      registrationBusy.current ||
      mediaMutation.current ||
      !isCurrent() ||
      !regVideoTitle.trim() ||
      !regVideoUrl.trim()
    )
      return;
    const sourceType = detectVideoSource(regVideoUrl.trim());
    if (!sourceType || !videoPreviewUrl(regVideoUrl)) {
      setRegVideoError("올바른 YouTube 또는 Vimeo URL을 입력해 주세요.");
      return;
    }
    const tags = regVideoTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const submitted = registrationDraft,
      store = organizationId;
    mediaReads.cancel();
    setMediaLoading(false);
    mediaMutation.current = true;
    registrationBusy.current = true;
    setRegVideoSaving(true);
    try {
      await createSignageMedia(organizationId, {
        name: regVideoTitle.trim(),
        mediaType: "video",
        sourceType,
        sourceUrl: regVideoUrl.trim(),
        description: regVideoDescription.trim() || undefined,
        tags: tags.length > 0 ? tags : ["매장 영상"],
        status: regVideoStatus,
      });
      if (organizationRef.current !== store || !isCurrent()) return;
      void loadSignageMedia();
      if (registrationDraftRef.current !== submitted) return;
      setRegVideoTitle("");
      setRegVideoUrl("");
      setRegVideoDescription("");
      setRegVideoTags("");
      setRegVideoStatus("active");
      setRegVideoError("");
      setShowVideoRegForm(false);
    } catch (err: unknown) {
      if (organizationRef.current === store && isCurrent())
        setRegVideoError(
          err instanceof Error ? err.message : "동영상 등록에 실패했습니다.",
        );
    } finally {
      mediaMutation.current = false;
      registrationBusy.current = false;
      setRegVideoSaving(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (
      mediaMutation.current ||
      !isCurrent() ||
      !confirm("이 동영상을 삭제하시겠습니까?")
    )
      return;
    mediaReads.cancel();
    setMediaLoading(false);
    mediaMutation.current = true;
    try {
      await deleteSignageMedia(organizationId, mediaId);
      if (isCurrent()) await loadSignageMedia();
    } catch {
      if (isCurrent())
        setError("동영상을 삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      mediaMutation.current = false;
    }
  };

  const handleOpenEdit = (video: UnifiedVideoItem) => {
    if (editBusy.current || mediaMutation.current || !isCurrent()) return;
    const target: SignageEditTarget | null =
      video.source === "direct" && video._media
        ? { kind: "direct", media: video._media }
        : video._snapshot
          ? { kind: "snapshot", snapshot: video._snapshot }
          : null;
    if (!target) return;
    if (
      target.kind === "snapshot" &&
      (target.snapshot.isLocked || target.snapshot.isForced)
    )
      return;
    const draft = readSignageMediaDraft(target);
    editTargetRef.current = target;
    editDraftRef.current = draft;
    setEditingTarget(target);
    setEditDraft(draft);
    setEditError("");
  };
  const handleEditChange = (field: keyof SignageMediaDraft, value: string) => {
    if (editBusy.current || !isCurrent()) return;
    setEditDraft((previous) => {
      const next = { ...previous, [field]: value };
      editDraftRef.current = next;
      return next;
    });
  };
  const handleCloseEditDrawer = () => {
    if (editBusy.current) return;
    editTargetRef.current = null;
    setEditingTarget(null);
    setEditError("");
  };
  const handleSaveEdit = async () => {
    const target = editingTarget,
      draft = editDraft,
      store = organizationId;
    if (
      !target ||
      !draft.name.trim() ||
      editBusy.current ||
      mediaMutation.current ||
      !isCurrent()
    )
      return;
    mediaReads.cancel();
    setMediaLoading(false);
    mediaMutation.current = true;
    editBusy.current = true;
    setEditSaving(true);
    setEditError("");
    try {
      const metadata = signageMediaMetadata(draft);
      if (target.kind === "direct") {
        const updated = await updateSignageMedia(store, target.media.id, {
          name: draft.name.trim(),
          ...metadata,
        });
        if (organizationRef.current !== store || !isCurrent()) return;
        setSignageMediaItems((previous) =>
          previous.map((media) => (media.id === updated.id ? updated : media)),
        );
      } else {
        const response = await assetSnapshotApi.patch(target.snapshot.id, {
          title: draft.name.trim(),
          ...metadata,
        });
        if (organizationRef.current !== store || !isCurrent()) return;
        setItems((previous) =>
          previous.map((item) =>
            item.id === target.snapshot.id
              ? {
                  ...item,
                  title: response.data.title,
                  contentJson: response.data.contentJson,
                }
              : item,
          ),
        );
      }
      if (target.kind === "direct") void loadSignageMedia();
      else {
        void fetchItems();
        if (selectedPlaylistId) void loadPlaylistItems(selectedPlaylistId);
      }
      if (editTargetRef.current === target && editDraftRef.current === draft) {
        editTargetRef.current = null;
        setEditingTarget(null);
        setEditError("");
      }
    } catch (error) {
      if (
        isCurrent() &&
        organizationRef.current === store &&
        editTargetRef.current === target
      )
        setEditError(
          error instanceof Error ? error.message : "저장에 실패했습니다.",
        );
    } finally {
      mediaMutation.current = false;
      editBusy.current = false;
      if (isCurrent()) setEditSaving(false);
    }
  };
  const handleDeleteFromDrawer = async () => {
    const target = editingTarget,
      store = organizationId;
    if (!target || editBusy.current || mediaMutation.current || !isCurrent())
      return;
    const name =
      target.kind === "direct" ? target.media.name : target.snapshot.title;
    if (!confirm(`"${name}" 동영상을 삭제하시겠습니까?`)) return;
    mediaReads.cancel();
    setMediaLoading(false);
    mediaMutation.current = true;
    editBusy.current = true;
    setEditSaving(true);
    setEditError("");
    try {
      if (target.kind === "direct")
        await deleteSignageMedia(store, target.media.id);
      else await assetSnapshotApi.remove(target.snapshot.id);
      if (organizationRef.current !== store || !isCurrent()) return;
      if (editTargetRef.current === target) {
        editTargetRef.current = null;
        setEditingTarget(null);
        setEditError("");
      }
      if (target.kind === "direct") void loadSignageMedia();
      else void fetchItems();
    } catch {
      if (
        isCurrent() &&
        organizationRef.current === store &&
        editTargetRef.current === target
      )
        setEditError("삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      mediaMutation.current = false;
      editBusy.current = false;
      if (isCurrent()) setEditSaving(false);
    }
  };
  useEffect(() => {
    editTargetRef.current = null;
    setEditingTarget(null);
    setEditError("");
  }, [organizationId]);

  // ── Unified video list (snapshots + direct media) ──
  const unifiedVideos = useMemo(
    () => buildSignageVideoList(items, signageMediaItems),
    [items, signageMediaItems],
  );

  // KPI (snapshot 기준 유지)
  const kpi = useMemo(() => computeSignageKpi(items), [items]);
  const forcedExpiringCount = useMemo(
    () => items.filter(isForcedExpiringSoon).length,
    [items],
  );

  // Filter + Sort + Keyword (unified: snapshots + direct media)
  const filteredUnified = useMemo(
    () =>
      filterSignageVideos(unifiedVideos, {
        status: statusFilter,
        sort: sortKey,
        keyword: assetKeyword,
        origin: originFilter,
      }),
    [unifiedVideos, statusFilter, sortKey, assetKeyword, originFilter],
  );

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUnified.length / PAGE_LIMIT),
  );
  const pagedUnified = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredUnified.slice(start, start + PAGE_LIMIT);
  }, [filteredUnified, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortKey, assetKeyword, originFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Total duration + missing-duration count for selected playlist items
  const totalDurationInfo = useMemo(
    () => summarizePlaylistDuration(playlistItems),
    [playlistItems],
  );

  // Filtered unified video list for add modal
  const addModalVideos = useMemo(() => {
    const kw = addModalSearch.trim().toLowerCase();
    const all = unifiedVideos;
    return kw ? all.filter((v) => v.title.toLowerCase().includes(kw)) : all;
  }, [unifiedVideos, addModalSearch]);

  const filteredPlaylists = useMemo(() => {
    if (!playlistKeyword.trim()) return playlists;
    const kw = playlistKeyword.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(kw));
  }, [playlists, playlistKeyword]);

  // Handlers
  const handleToggleStatus = async (item: StoreAssetItem) => {
    if (item.isForced || statusBusy.current.has(item.id) || !isCurrent())
      return;
    statusBusy.current.add(item.id);
    const cycle: AssetPublishStatus[] = ["draft", "published", "hidden"];
    const currentIdx = cycle.indexOf(item.publishStatus);
    const nextStatus = cycle[(currentIdx + 1) % cycle.length];
    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(
        item.id,
        nextStatus,
      );
      if (!isCurrent()) return;
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, publishStatus: res.data.publishStatus }
            : it,
        ),
      );
    } catch {
      if (isCurrent())
        setError("게시 상태를 변경하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      statusBusy.current.delete(item.id);
      if (isCurrent()) setUpdatingId(null);
    }
  };

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ── 운영 가시화 계산 (WO-O4O-STORE-SIGNAGE-OPERATION-VISIBILITY-V1) ──
  const currentSchedule =
    scheduleError || scheduleLoading ? null : getCurrentSchedule(schedules);
  const nextSchedule =
    scheduleError || scheduleLoading
      ? null
      : getNextSchedule(schedules, currentSchedule?.id ?? null);

  /** 현재 시간 기준 활성 스케줄에 연결된 playlistId 집합 */
  const activePlaylistIds = useMemo(() => {
    return new Set(
      schedules
        .filter((s) => isScheduleNowActive(s, clock))
        .map((s) => s.storePlaylistId)
        .filter(Boolean),
    );
  }, [schedules, clock]);

  const openScheduleFor = (playlist: StorePlaylist) => {
    if (playlist.publishStatus !== "published") return;
    navigate(withWorkspaceMode(`${base}/marketing/signage/schedules`, "use"), {
      state: { signagePlaylistId: playlist.id, openSignageSchedule: true },
    });
  };

  // WO-O4O-STORE-LAYOUT-WIDTH-OVERFLOW-FIX-V1: max-w/mx-auto 제거 — StoreDashboardLayout이 max-w-[1200px] 관리
  return {
    KpiCard,
    PAGE_LIMIT,
    STATUS_CONFIG,
    acceptCreatedPlaylist,
    activePlaylistIds,
    activeTab,
    addModalSaving,
    addModalSearch,
    addModalSelected,
    addModalVideos,
    addVideoTitleId,
    askVideoRegistration,
    assetKeyword,
    base,
    businessImport,
    busyPlaylistIds,
    closeAddVideo,
    currentSchedule,
    deletingScheduleIds,
    deriveYtThumbnail,
    editDraft,
    editError,
    editSaving,
    editingSchedule,
    editingTarget,
    error,
    fetchItems,
    filteredPlaylists,
    filteredUnified,
    forcedExpiringCount,
    formatDuration,
    handleAddFromLibrary,
    handleBulkAdd,
    handleCloseEditDrawer,
    handleDeleteFromDrawer,
    handleDeleteItem,
    handleDeleteMedia,
    handleDeletePlaylist,
    handleDeleteSchedule,
    handleEditChange,
    handleMoveItem,
    handleOpenEdit,
    handleRegisterVideo,
    handleSaveEdit,
    handleSaveSchedule,
    handleTogglePublish,
    handleToggleStatus,
    handleUpdateDetails,
    isCurrent,
    kpi,
    libraryError,
    libraryPending,
    librarySaving,
    listError,
    loadPlaylistItems,
    loadPlaylists,
    loadSchedules,
    loadSignageMedia,
    loadSignagePlaylists,
    loading,
    location,
    mediaLoadError,
    mediaLoading,
    navigate,
    navigateTab,
    nextSchedule,
    openEditSchedule,
    openScheduleFor,
    organizationId,
    originFilter,
    page,
    pagedUnified,
    playlistActionError,
    playlistBusy,
    playlistError,
    playlistItems,
    playlistItemsError,
    playlistItemsLoading,
    playlistKeyword,
    playlistLoading,
    playlistPreview,
    playlists,
    quickStart,
    regVideoDescription,
    regVideoError,
    regVideoSaving,
    regVideoStatus,
    regVideoTags,
    regVideoTitle,
    regVideoUrl,
    registerLibraryVideo,
    reloadItems,
    resetScheduleForm,
    saveVideoRegistration,
    savedGuide,
    savedSchedule,
    schDays,
    schEndTime,
    schIsActive,
    schName,
    schPlaylistId,
    schPriority,
    schSaveError,
    schSaving,
    schStartTime,
    schValidFrom,
    schValidUntil,
    scheduleError,
    scheduleLoading,
    schedulePlaylistError,
    schedulePlaylistLoading,
    schedules,
    selectedPlaylist,
    selectedPlaylistId,
    setAddModalSearch,
    setAddModalSelected,
    setAssetKeyword,
    setBusinessImport,
    setOriginFilter,
    setPage,
    setPlaylistKeyword,
    setPlaylistPreview,
    setQuickStart,
    setRegVideoDescription,
    setRegVideoError,
    setRegVideoStatus,
    setRegVideoTags,
    setRegVideoTitle,
    setRegVideoUrl,
    setSavedGuide,
    setSchEndTime,
    setSchIsActive,
    setSchName,
    setSchPlaylistId,
    setSchPriority,
    setSchStartTime,
    setSchValidFrom,
    setSchValidUntil,
    setSelectedPlaylistId,
    setShowAddVideoModal,
    setShowLibrarySelector,
    setShowScheduleForm,
    setShowVideoRegForm,
    setSortKey,
    setStatusFilter,
    setVideoLibraryOpen,
    showAddVideoModal,
    showLibrarySelector,
    showScheduleForm,
    showVideoRegForm,
    signagePlaylists,
    sortKey,
    statusFilter,
    toggleSchDay,
    totalDurationInfo,
    totalPages,
    unifiedVideos,
    updatingId,
    videoLibraryOpen,
    videoRequestSlot,
    workspaceMode,
    youtubeVideoApi,
  };
}

/* ─── Sub-Components ─────────────────────────── */

function KpiCard({
  label,
  count,
  color,
  warning,
}: {
  label: string;
  count: number;
  color: "green" | "slate" | "orange" | "red" | "purple";
  warning?: string;
}) {
  const colorMap = {
    green: { bg: "bg-green-50", text: "text-green-700" },
    slate: { bg: "bg-slate-50", text: "text-slate-700" },
    orange: { bg: "bg-orange-50", text: "text-orange-700" },
    red: { bg: "bg-red-50", text: "text-red-700" },
    purple: { bg: "bg-purple-50", text: "text-purple-700" },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${c.bg}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${c.text}`}>
        {count}
        <span className="text-sm font-normal ml-0.5">건</span>
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

export type SignageWorkspaceState = ReturnType<typeof useSignageWorkspace>;
