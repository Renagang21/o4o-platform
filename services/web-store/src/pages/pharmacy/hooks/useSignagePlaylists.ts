import { useLatestStoreRequest } from "./useLatestStoreRequest";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchStorePlaylists,
  updateStorePlaylist,
  deleteStorePlaylist,
  fetchPlaylistItems,
  addPlaylistItem,
  addPlaylistItemFromLibrary,
  addPlaylistItemFromSignage,
  deletePlaylistItem,
  reorderPlaylistItems,
  type StorePlaylist,
  type StorePlaylistItem,
} from "../../../api/storePlaylist";
import type { AssetSelectorResult as LibrarySelectorResult } from "../../../components/store/StoreAssetSelectorModal";
export function useSignagePlaylists(organizationId: string) {
  const listRequest = useLatestStoreRequest(organizationId);
  // ── Playlist state ──
  const [playlists, setPlaylists] = useState<StorePlaylist[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const [playlistActionError, setPlaylistActionError] = useState<string | null>(
    null,
  );
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  );
  const [playlistItems, setPlaylistItems] = useState<StorePlaylistItem[]>([]);
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false);
  const [playlistKeyword, setPlaylistKeyword] = useState("");

  // ── Add video modal state ──
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [addModalSearch, setAddModalSearch] = useState("");
  const [addModalSelected, setAddModalSelected] = useState<Set<string>>(
    new Set(),
  );
  const [addModalSaving, setAddModalSaving] = useState(false);
  const [showLibrarySelector, setShowLibrarySelector] = useState(false);

  const itemRequest = useLatestStoreRequest(
    `${organizationId}:${selectedPlaylistId ?? ""}`,
  );
  const busy = useRef(new Set<string>());
  const [busyPlaylistIds, setBusyPlaylistIds] = useState<Set<string>>(
    new Set(),
  );
  const currentStore = useRef(organizationId);
  const storeRevision = useRef(0);
  if (currentStore.current !== organizationId) {
    currentStore.current = organizationId;
    storeRevision.current++;
  }
  useEffect(
    () => () => {
      storeRevision.current++;
    },
    [],
  );
  const [playlistItemsError, setPlaylistItemsError] = useState<string | null>(
    null,
  );
  const modalRevision = useRef(0);
  const selectionRef = useRef(addModalSelected);
  selectionRef.current = addModalSelected;
  const currentPlaylist = useRef(selectedPlaylistId);
  currentPlaylist.current = selectedPlaylistId;
  const loadPlaylists = useCallback(async () => {
    if (!organizationId || currentStore.current !== organizationId) return;
    const isCurrent = listRequest.begin();
    setPlaylistLoading(true);
    setPlaylistError(null);
    try {
      const data = await fetchStorePlaylists();
      if (isCurrent()) setPlaylists(data);
    } catch {
      if (isCurrent())
        setPlaylistError(
          "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
    } finally {
      if (isCurrent()) setPlaylistLoading(false);
    }
  }, [organizationId, listRequest]);

  const loadPlaylistItems = useCallback(
    async (playlistId: string) => {
      if (
        currentPlaylist.current !== playlistId ||
        currentStore.current !== organizationId
      )
        return;
      const isCurrent = itemRequest.begin();
      setPlaylistItems([]);
      setPlaylistItemsLoading(true);
      setPlaylistItemsError(null);
      try {
        const data = await fetchPlaylistItems(playlistId);
        if (isCurrent()) setPlaylistItems(data);
      } catch {
        if (isCurrent()) setPlaylistItems([]);
        if (isCurrent())
          setPlaylistItemsError(
            "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
      } finally {
        if (isCurrent()) setPlaylistItemsLoading(false);
      }
    },
    [organizationId, itemRequest],
  );

  // Mutations refresh their original store, while editor changes invalidate only their view.
  const runPlaylistMutation = async (
    playlistId: string,
    task: (
      isStoreCurrent: () => boolean,
      isViewCurrent: () => boolean,
    ) => Promise<void>,
  ) => {
    const key = `${organizationId}:${playlistId}`;
    if (
      !organizationId ||
      currentStore.current !== organizationId ||
      busy.current.has(key)
    )
      return;
    const revision = storeRevision.current;
    const viewRevision = modalRevision.current;
    const isStoreCurrent = () =>
      revision === storeRevision.current &&
      currentStore.current === organizationId;
    const isViewCurrent = () =>
      isStoreCurrent() &&
      currentPlaylist.current === playlistId &&
      viewRevision === modalRevision.current;
    busy.current.add(key);
    setBusyPlaylistIds(
      new Set(
        [...busy.current]
          .filter((k) => k.startsWith(`${organizationId}:`))
          .map((k) => k.slice(organizationId.length + 1)),
      ),
    );
    setPlaylistActionError(null);
    try {
      await task(isStoreCurrent, isViewCurrent);
    } catch {
      if (isViewCurrent())
        setPlaylistActionError(
          "재생목록 작업을 완료하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      busy.current.delete(key);
      if (currentStore.current === organizationId)
        setBusyPlaylistIds(
          new Set(
            [...busy.current]
              .filter((k) => k.startsWith(`${organizationId}:`))
              .map((k) => k.slice(organizationId.length + 1)),
          ),
        );
    }
  };
  const handleTogglePublish = (playlist: StorePlaylist) =>
    runPlaylistMutation(playlist.id, async (isStoreCurrent) => {
      try {
        await updateStorePlaylist(playlist.id, {
          publishStatus:
            playlist.publishStatus === "draft" ? "published" : "draft",
        });
        if (isStoreCurrent()) await loadPlaylists();
      } catch {
        if (isStoreCurrent())
          setPlaylistActionError(
            "재생목록 게시 상태를 변경하지 못했습니다. 다시 시도해 주세요.",
          );
      }
    });
  const handleDeletePlaylist = (playlist: StorePlaylist) => {
    if (!confirm(`"${playlist.name}" 플레이리스트를 삭제하시겠습니까?`)) return;
    return runPlaylistMutation(playlist.id, async (isStoreCurrent) => {
      try {
        await deleteStorePlaylist(playlist.id);
        if (!isStoreCurrent()) return;
        if (currentPlaylist.current === playlist.id)
          setSelectedPlaylistId(null);
        await loadPlaylists();
      } catch {
        if (isStoreCurrent())
          setPlaylistActionError(
            "재생목록을 삭제하지 못했습니다. 다시 시도해 주세요.",
          );
      }
    });
  };
  const handleAddFromLibrary = (item: LibrarySelectorResult) => {
    if (!selectedPlaylistId) return;
    const playlistId = selectedPlaylistId;
    return runPlaylistMutation(
      playlistId,
      async (isStoreCurrent, isViewCurrent) => {
        await addPlaylistItemFromLibrary(playlistId, item.id);
        if (isViewCurrent()) setShowLibrarySelector(false);
        if (isStoreCurrent()) await loadPlaylistItems(playlistId);
      },
    );
  };
  const handleDeleteItem = (itemId: string) => {
    if (!selectedPlaylistId || playlistItemsLoading || playlistItemsError)
      return;
    const playlistId = selectedPlaylistId;
    return runPlaylistMutation(playlistId, async (isStoreCurrent) => {
      await deletePlaylistItem(playlistId, itemId);
      if (isStoreCurrent()) await loadPlaylistItems(playlistId);
    });
  };
  const handleBulkAdd = async () => {
    if (!selectedPlaylistId || addModalSelected.size === 0) return;
    const playlistId = selectedPlaylistId;
    const submitted = new Set(addModalSelected);
    await runPlaylistMutation(
      playlistId,
      async (isStoreCurrent, isViewCurrent) => {
        setAddModalSaving(true);
        const failed = new Set<string>();
        try {
          for (const key of submitted) {
            if (!isStoreCurrent()) break;
            try {
              if (key.startsWith("media_"))
                await addPlaylistItemFromSignage(
                  playlistId,
                  key.slice(6),
                  organizationId,
                );
              else await addPlaylistItem(playlistId, key);
            } catch {
              failed.add(key);
            }
          }
          if (isViewCurrent()) {
            const remaining = new Set(
              [...selectionRef.current].filter(
                (key) => !submitted.has(key) || failed.has(key),
              ),
            );
            setAddModalSelected(remaining);
            if (remaining.size === 0) {
              setShowAddVideoModal(false);
              setAddModalSearch("");
            }
            if (failed.size)
              setPlaylistActionError(
                `${failed.size}개 자료를 추가하지 못했습니다. 실패한 자료만 다시 시도해 주세요.`,
              );
          }
          if (isStoreCurrent()) await loadPlaylistItems(playlistId);
        } finally {
          if (isViewCurrent()) setAddModalSaving(false);
        }
      },
    );
  };
  const handleMoveItem = (index: number, direction: -1 | 1) => {
    if (!selectedPlaylistId || playlistItemsLoading || playlistItemsError)
      return;
    const playlistId = selectedPlaylistId,
      swapIndex = index + direction;
    if (
      index < 0 ||
      index >= playlistItems.length ||
      swapIndex < 0 ||
      swapIndex >= playlistItems.length
    )
      return;
    return runPlaylistMutation(
      playlistId,
      async (isStoreCurrent, isViewCurrent) => {
        const next = [...playlistItems];
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        setPlaylistItems(next);
        try {
          await reorderPlaylistItems(
            playlistId,
            next.map((item) => item.id),
          );
        } catch {
          if (isStoreCurrent()) await loadPlaylistItems(playlistId);
          if (isViewCurrent())
            setPlaylistActionError(
              "순서를 변경하지 못했습니다. 다시 시도해 주세요.",
            );
        }
      },
    );
  };
  const changeSelectedPlaylist = (id: string | null) => {
    modalRevision.current++;
    setSelectedPlaylistId(id);
    setPlaylistActionError(null);
    setShowAddVideoModal(false);
    setShowLibrarySelector(false);
    setAddModalSelected(new Set());
    setAddModalSaving(false);
  };
  const changeAddVideoModal = (open: boolean) => {
    modalRevision.current++;
    setShowAddVideoModal(open);
    setAddModalSaving(false);
  };
  const changeLibrarySelector = (open: boolean) => {
    modalRevision.current++;
    setShowLibrarySelector(open);
    setAddModalSaving(false);
  };
  const acceptCreatedPlaylist = (playlist: StorePlaylist) => {
    setPlaylists(previous => [playlist, ...previous.filter(item => item.id !== playlist.id)]);
    changeSelectedPlaylist(playlist.id);
  };
  useEffect(() => {
    setSelectedPlaylistId(null);
    setPlaylistActionError(null);
    setPlaylists([]);
    setPlaylistError(null);
    setBusyPlaylistIds(
      new Set(
        [...busy.current]
          .filter((k) => k.startsWith(`${organizationId}:`))
          .map((k) => k.slice(organizationId.length + 1)),
      ),
    );
    setShowLibrarySelector(false);
    setAddModalSaving(false);
    modalRevision.current++;
    setShowAddVideoModal(false);
    setAddModalSelected(new Set());
  }, [organizationId]);
  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);
  useEffect(() => {
    setPlaylistItemsError(null);
    if (selectedPlaylistId) void loadPlaylistItems(selectedPlaylistId);
    else {
      itemRequest.cancel();
      setPlaylistItems([]);
      setPlaylistItemsLoading(false);
    }
  }, [selectedPlaylistId, loadPlaylistItems, itemRequest]);
  return {
    playlistActionError,
    playlistItemsError,
    loadPlaylistItems,
    playlistBusy:
      selectedPlaylistId !== null && busyPlaylistIds.has(selectedPlaylistId),
    busyPlaylistIds,
    loadPlaylists,
    playlists,
    playlistLoading,
    playlistError,
    selectedPlaylistId,
    setSelectedPlaylistId: changeSelectedPlaylist,
    playlistItems,
    playlistItemsLoading,
    playlistKeyword,
    setPlaylistKeyword,
    showAddVideoModal,
    setShowAddVideoModal: changeAddVideoModal,
    addModalSearch,
    setAddModalSearch,
    addModalSelected,
    setAddModalSelected,
    addModalSaving,
    showLibrarySelector,
    setShowLibrarySelector: changeLibrarySelector,
    handleTogglePublish,
    handleDeletePlaylist,
    handleAddFromLibrary,
    handleDeleteItem,
    handleBulkAdd,
    handleMoveItem,
    acceptCreatedPlaylist,
  };
}
