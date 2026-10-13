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
  const [selectedPlaylistKeys, setSelectedPlaylistKeys] = useState<string[]>(
    [],
  );

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
  const busy = useRef(false);
  const currentPlaylist = useRef(selectedPlaylistId);
  currentPlaylist.current = selectedPlaylistId;
  const mutationRequest = useLatestStoreRequest(
    `${organizationId}:${selectedPlaylistId ?? ""}`,
  );

  const loadPlaylists = useCallback(async () => {
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
  }, [listRequest]);

  const loadPlaylistItems = useCallback(
    async (playlistId: string) => {
      if (currentPlaylist.current !== playlistId) return;
      const isCurrent = itemRequest.begin();
      setPlaylistItemsLoading(true);
      setPlaylistError(null);
      try {
        const data = await fetchPlaylistItems(playlistId);
        if (isCurrent()) setPlaylistItems(data);
      } catch {
        if (isCurrent()) setPlaylistItems([]);
        if (isCurrent())
          setPlaylistError(
            "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
      } finally {
        if (isCurrent()) setPlaylistItemsLoading(false);
      }
    },
    [itemRequest],
  );

  // ── Playlist handlers ──
  const handleTogglePublishTask = async (pl: StorePlaylist) => {
    const next = pl.publishStatus === "draft" ? "published" : "draft";
    try {
      await updateStorePlaylist(pl.id, { publishStatus: next });
      loadPlaylists();
    } catch {
      setPlaylistActionError(
        "재생목록 작업을 완료하지 못했습니다. 다시 시도해 주세요.",
      );
    }
  };

  const handleDeletePlaylistTask = async (pl: StorePlaylist) => {
    if (!confirm(`"${pl.name}" 플레이리스트를 삭제하시겠습니까?`)) return;
    try {
      await deleteStorePlaylist(pl.id);
      if (selectedPlaylistId === pl.id) {
        setSelectedPlaylistId(null);
        setPlaylistItems([]);
      }
      loadPlaylists();
    } catch {
      setPlaylistActionError(
        "재생목록 작업을 완료하지 못했습니다. 다시 시도해 주세요.",
      );
    }
  };

  const handleAddFromLibraryTask = async (item: LibrarySelectorResult) => {
    if (!selectedPlaylistId) return;
    try {
      await addPlaylistItemFromLibrary(selectedPlaylistId, item.id);
      setShowLibrarySelector(false);
      loadPlaylistItems(selectedPlaylistId);
    } catch {
      setPlaylistActionError(
        "재생목록 작업을 완료하지 못했습니다. 다시 시도해 주세요.",
      );
    }
  };

  const handleDeleteItemTask = async (itemId: string) => {
    if (!selectedPlaylistId) return;
    try {
      await deletePlaylistItem(selectedPlaylistId, itemId);
      loadPlaylistItems(selectedPlaylistId);
    } catch {
      setPlaylistActionError(
        "재생목록 작업을 완료하지 못했습니다. 다시 시도해 주세요.",
      );
    }
  };

  const handleBulkAdd = async () => {
    if (!selectedPlaylistId || addModalSelected.size === 0 || busy.current)
      return;
    const playlistId = selectedPlaylistId;
    const isCurrent = mutationRequest.begin();
    busy.current = true;
    setAddModalSaving(true);
    setPlaylistActionError(null);
    const failed = new Set<string>();
    try {
      for (const key of addModalSelected) {
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
      if (!isCurrent()) return;
      setAddModalSelected(failed);
      if (failed.size === 0) {
        setShowAddVideoModal(false);
        setAddModalSearch("");
      }
      await loadPlaylistItems(playlistId);
      if (isCurrent() && failed.size)
        setPlaylistActionError(
          `${failed.size}개 자료를 추가하지 못했습니다. 실패한 자료만 다시 시도해 주세요.`,
        );
    } finally {
      busy.current = false;
      setAddModalSaving(false);
    }
  };

  const handleMoveItemTask = async (index: number, direction: -1 | 1) => {
    if (!selectedPlaylistId) return;
    const newItems = [...playlistItems];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[index], newItems[swapIdx]] = [newItems[swapIdx], newItems[index]];
    setPlaylistItems(newItems);
    try {
      await reorderPlaylistItems(
        selectedPlaylistId,
        newItems.map((i) => i.id),
      );
    } catch {
      await loadPlaylistItems(selectedPlaylistId);
      setPlaylistActionError("순서를 변경하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const runPlaylistMutation = async (task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPlaylistActionError(null);
    try {
      await task();
    } finally {
      busy.current = false;
    }
  };
  const handleTogglePublish = (playlist: StorePlaylist) =>
    runPlaylistMutation(() => handleTogglePublishTask(playlist));
  const handleDeletePlaylist = (playlist: StorePlaylist) =>
    runPlaylistMutation(() => handleDeletePlaylistTask(playlist));
  const handleAddFromLibrary = (item: LibrarySelectorResult) =>
    runPlaylistMutation(() => handleAddFromLibraryTask(item));
  const handleDeleteItem = (itemId: string) =>
    runPlaylistMutation(() => handleDeleteItemTask(itemId));
  const handleMoveItem = (index: number, direction: -1 | 1) =>
    runPlaylistMutation(() => handleMoveItemTask(index, direction));
  useEffect(() => {
    setSelectedPlaylistId(null);
    setPlaylistActionError(null);
    setSelectedPlaylistKeys([]);
    setPlaylists([]);
    setShowAddVideoModal(false);
    setAddModalSelected(new Set());
  }, [organizationId]);
  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);
  useEffect(() => {
    if (selectedPlaylistId) void loadPlaylistItems(selectedPlaylistId);
    else {
      itemRequest.cancel();
      setPlaylistItems([]);
      setPlaylistItemsLoading(false);
    }
  }, [selectedPlaylistId, loadPlaylistItems, itemRequest]);
  return {
    playlistActionError,
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
  };
}
