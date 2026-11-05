import { type Column } from "@o4o/ui";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  Loader2,
  Lock,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { StorePlaylist } from "../../../api/storePlaylist";
import { PlaylistNameForm } from "../signage/PlaylistNameForm";
import { SignageSelectionTable } from "../signage/SignageSelectionTable";
import type { SignageWorkspaceState } from "../useSignageWorkspace";

export function SignagePlaylistsPanel({
  state,
}: Readonly<{ state: SignageWorkspaceState }>) {
  const {
    activePlaylistIds,
    base,
    busyPlaylistIds,
    deriveYtThumbnail,
    fetchItems,
    filteredPlaylists,
    formatDuration,
    handleDeleteItem,
    handleDeletePlaylist,
    handleMoveItem,
    handleOpenEdit,
    handleTogglePublish,
    handleUpdateDetails,
    listError,
    loadPlaylistItems,
    loadPlaylists,
    loading,
    mediaLoadError,
    mediaLoading,
    openScheduleFor,
    organizationId,
    playlistBusy,
    playlistError,
    playlistItems,
    playlistItemsError,
    playlistItemsLoading,
    playlistKeyword,
    playlistLoading,
    playlists,
    savedGuide,
    scheduleError,
    scheduleLoading,
    selectedPlaylist,
    selectedPlaylistId,
    setAddModalSearch,
    setAddModalSelected,
    setPlaylistKeyword,
    setPlaylistPreview,
    setQuickStart,
    setSelectedPlaylistId,
    setShowAddVideoModal,
    totalDurationInfo,
    unifiedVideos,
  } = state;
  return (
    <div>
      {savedGuide && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-teal-50 p-4 text-sm text-teal-900"
        >
          {savedGuide} 초안을 저장했습니다. 자료를 확인한 뒤 게시하고 재생
          시간을 정하세요.
        </p>
      )}
      {/* Create + list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">재생목록</h2>
        {/* WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1: 모달 → 표준 /new 등록 페이지 */}
        <button
          disabled={loading || mediaLoading || !!listError || !!mediaLoadError}
          onClick={() => setQuickStart(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          <Plus className="w-4 h-4" />새 안내 만들기
        </button>
      </div>
      {listError && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          매장 자료를 불러오지 못했습니다.{" "}
          <button
            type="button"
            onClick={() => void fetchItems()}
            className="min-h-11 underline"
          >
            매장 자료 다시 시도
          </button>
        </p>
      )}
      <p className="mb-3 text-sm text-slate-600">
        자료 선택 → 확인·저장 → 게시 → 재생 시간 설정 순서로 준비합니다.{" "}
        <Link
          to={`${base}/marketing/signage/videos`}
          className="inline-flex min-h-11 items-center text-teal-800 underline"
        >
          영상 등록·수정
        </Link>
      </p>
      <details className="mb-4 text-sm text-slate-600">
        <summary className="min-h-11 cursor-pointer">상세 관리</summary>
        <Link
          to={`${base}/marketing/signage/playlist/new`}
          className="inline-flex min-h-11 items-center underline"
        >
          이름만 먼저 정하고 자료 추가
        </Link>
      </details>

      <details open={!selectedPlaylistId} className="mb-4">
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-slate-700">
          {selectedPlaylistId
            ? `다른 안내 선택 · ${playlists.length}개`
            : "저장한 안내 선택"}
        </summary>
        {/* Playlist search */}
        {!playlistLoading && !playlistError && playlists.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={playlistKeyword}
              onChange={(e) => setPlaylistKeyword(e.target.value)}
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
              <button
                onClick={() => void loadPlaylists()}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : playlists.length === 0 && !playlistLoading ? (
          <div className="text-center py-12 text-slate-400">
            <ListVideo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">플레이리스트가 없습니다.</p>
            <p className="text-xs mt-1">
              '새 안내 만들기'에서 자료를 고르면 초안이 저장됩니다.
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <SignageSelectionTable<StorePlaylist>
              selectionKey={`${organizationId}:${playlistKeyword}`}
              actions={[
                {
                  key: "edit",
                  label: "재생목록 수정",
                  onSelect: (row) => setSelectedPlaylistId(row.id),
                },
                {
                  key: "publish",
                  label: "게시·초안 전환",
                  disabled: (row) => busyPlaylistIds.has(row.id),
                  onSelect: handleTogglePublish,
                },
                {
                  key: "delete",
                  label: "재생목록 삭제",
                  disabled: (row) => busyPlaylistIds.has(row.id),
                  onSelect: handleDeletePlaylist,
                },
              ]}
              columns={
                [
                  {
                    key: "name",
                    title: "이름",
                    render: (_v, pl) => (
                      <div>
                        <div className="flex items-center gap-2">
                          <ListVideo className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-900 truncate max-w-xs">
                            {pl.name}
                          </span>
                          {pl.forcedCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                              강제 {pl.forcedCount}
                            </span>
                          )}
                        </div>
                        {pl.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs ml-6">
                            {pl.description}
                          </p>
                        )}
                        {pl.tags && pl.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-6">
                            {pl.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0 rounded text-[10px] bg-slate-100 text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "itemCount",
                    title: "항목 수",
                    dataIndex: "itemCount",
                    align: "center",
                    render: (v) => <span className="text-slate-600">{v}</span>,
                  },
                  {
                    key: "playlistType",
                    title: "유형",
                    dataIndex: "playlistType",
                    align: "center",
                    render: (v) => (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600">
                        {v === "SINGLE" ? "단일" : "목록"}
                      </span>
                    ),
                  },
                  {
                    key: "updatedAt",
                    title: "수정일",
                    dataIndex: "updatedAt",
                    render: (v) => (
                      <span className="text-xs text-slate-500">
                        {new Date(v).toLocaleDateString("ko-KR")}
                      </span>
                    ),
                  },
                  {
                    key: "publishStatus",
                    title: "게시",
                    dataIndex: "publishStatus",
                    render: (_v, pl) => (
                      <button
                        disabled={busyPlaylistIds.has(pl.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePublish(pl);
                        }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          pl.publishStatus === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                        title="클릭하여 게시 상태 변경"
                      >
                        {pl.publishStatus === "published" ? "게시 중" : "초안"}
                      </button>
                    ),
                  },
                  {
                    key: "inUse",
                    title: "사용",
                    align: "center",
                    render: (_v, pl) =>
                      scheduleError || scheduleLoading ? (
                        <span className="text-xs text-slate-500">
                          일정 확인 필요
                        </span>
                      ) : activePlaylistIds.has(pl.id) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          현재 일정
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          현재 일정 없음
                        </span>
                      ),
                  },
                  {
                    key: "actions",
                    title: "",
                    align: "right",
                    render: (_v, pl) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlaylistId(
                              pl.id === selectedPlaylistId ? null : pl.id,
                            );
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                            selectedPlaylistId === pl.id
                              ? "bg-blue-600 text-white border-blue-600"
                              : "text-blue-600 border-blue-200 hover:bg-blue-50"
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {selectedPlaylistId === pl.id ? "닫기" : "편집"}
                        </button>
                        <button
                          disabled={busyPlaylistIds.has(pl.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlaylist(pl);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ),
                  },
                ] as Column<StorePlaylist>[]
              }
              dataSource={filteredPlaylists}
              rowKey="id"
              loading={playlistLoading}
              onRow={(pl) => ({
                onClick: () =>
                  setSelectedPlaylistId(
                    pl.id === selectedPlaylistId ? null : pl.id,
                  ),
                className: selectedPlaylistId === pl.id ? "bg-blue-50/40" : "",
              })}
              emptyText="검색 결과가 없습니다"
            />
          </div>
        )}
      </details>
      {/* ── Playlist Builder ── */}
      {selectedPlaylistId && selectedPlaylist && (
        <div className="border border-slate-200 rounded-lg bg-white mt-2">
          <PlaylistNameForm
            key={`${selectedPlaylist.id}:${selectedPlaylist.updatedAt}`}
            playlist={selectedPlaylist}
            busy={playlistBusy}
            onSave={handleUpdateDetails}
          />
          {/* Builder header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-medium text-slate-800 truncate">
                {selectedPlaylist.name}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                ({playlistItems.length}개)
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Link
                to={`${base}/marketing/signage/videos?workspace=studio`}
                className="inline-flex min-h-11 items-center rounded border px-3 text-sm"
              >
                동영상함에서 영상 준비
              </Link>
              <button
                disabled={playlistBusy}
                onClick={() => {
                  setAddModalSearch("");
                  setAddModalSelected(new Set());
                  setShowAddVideoModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
              >
                <Plus className="w-3 h-3" />
                동영상함에서 추가
              </button>
            </div>
          </div>

          <section
            aria-label="선택 안내 다음 작업"
            className="space-y-3 border-b border-slate-100 bg-teal-50/40 p-4"
          >
            <p className="text-sm text-slate-700">
              자료·순서 변경은 바로 저장됩니다. 실제 재생 화면은 다시 열어
              확인하세요. 등록 영상에서 가져온 사본은 원본과 자동 동기화되지
              않습니다. 필수 자료의 잠금·시간 조건은 유지됩니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  playlistItemsLoading ||
                  !!playlistItemsError ||
                  !playlistItems.length
                }
                onClick={() => setPlaylistPreview(true)}
                className="min-h-11 rounded-lg border border-teal-300 bg-white px-3 text-sm disabled:opacity-50"
              >
                저장된 안내 미리보기
              </button>
              <button
                type="button"
                disabled={
                  playlistBusy ||
                  !playlistItems.length ||
                  !!playlistItemsError ||
                  playlistItemsLoading
                }
                onClick={() => void handleTogglePublish(selectedPlaylist)}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50"
              >
                {selectedPlaylist.publishStatus === "published"
                  ? "게시 중단"
                  : "자료 확인 후 게시"}
              </button>
              <button
                type="button"
                disabled={
                  selectedPlaylist.publishStatus !== "published" ||
                  !playlistItems.length ||
                  !!playlistItemsError ||
                  playlistItemsLoading
                }
                onClick={() => openScheduleFor(selectedPlaylist)}
                className="min-h-11 rounded-lg bg-teal-700 px-3 text-sm text-white disabled:opacity-50"
              >
                이 안내의 재생 시간 정하기
              </button>
              {selectedPlaylist.publishStatus === "published" && (
                <a
                  href={`/store/marketing/signage/play/${encodeURIComponent(selectedPlaylist.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center px-3 text-sm text-teal-800 underline"
                >
                  재생 화면 열기
                </a>
              )}
            </div>
          </section>

          {/* Total duration summary */}
          {playlistItems.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3 text-[11px]">
              <span className="text-slate-500">
                총 재생시간:&nbsp;
                <span className="font-medium text-slate-700">
                  {totalDurationInfo.totalSec > 0
                    ? formatDuration(totalDurationInfo.totalSec)
                    : "—"}
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
            <div role="alert" className="p-4 text-sm text-red-700">
              {playlistItemsError}
              <button
                type="button"
                onClick={() => void loadPlaylistItems(selectedPlaylistId)}
                className="ml-2 underline"
              >
                다시 시도
              </button>
            </div>
          ) : playlistItemsLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> 로딩
              중...
            </div>
          ) : playlistItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <ListVideo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">재생 항목이 없습니다.</p>
              <p className="text-xs mt-1">
                '동영상함에서 추가' 버튼으로 동영상을 추가하세요.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {playlistItems.map((item, idx) => {
                const thumb = deriveYtThumbnail(item.contentJson);
                const dur = item.contentJson?.duration as number | undefined;
                const st = item.contentJson?.sourceType as string | undefined;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${item.isForced ? "bg-red-50/30" : "hover:bg-slate-50/50"}`}
                  >
                    {/* Order number + reorder buttons */}
                    <div className="flex flex-col items-center gap-0 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 w-5 text-center leading-none mb-0.5">
                        {idx + 1}
                      </span>
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
                        disabled={
                          playlistBusy || idx === playlistItems.length - 1
                        }
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-20 p-0.5"
                        title="아래로"
                      >
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                    </div>
                    {/* Thumbnail */}
                    <div className="w-14 h-9 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-3 h-3 text-slate-300" />
                        </div>
                      )}
                    </div>
                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {item.title}
                      </div>
                      {!item.isLocked &&
                        !item.isForced &&
                        unifiedVideos.find(
                          (video) =>
                            video._snapshot?.id === item.snapshotId &&
                            !video.isLocked &&
                            !video.isForced,
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenEdit(
                                unifiedVideos.find(
                                  (video) =>
                                    video._snapshot?.id === item.snapshotId,
                                )!,
                              )
                            }
                            className="min-h-11 text-sm text-teal-800 underline"
                          >
                            이 안내 자료 수정
                          </button>
                        )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {st && (
                          <span
                            className={`px-1.5 py-0 rounded text-[9px] font-semibold ${st === "youtube" ? "bg-red-100 text-red-600" : st === "vimeo" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}
                          >
                            {st === "youtube"
                              ? "YT"
                              : st === "vimeo"
                                ? "VM"
                                : st.toUpperCase()}
                          </span>
                        )}
                        {dur && dur > 0 ? (
                          <span className="text-[11px] text-slate-400">
                            {formatDuration(dur)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400">
                            재생시간 미등록
                          </span>
                        )}
                        {item.isForced && (
                          <span className="px-1.5 py-0 rounded text-[9px] font-semibold bg-red-100 text-red-700">
                            강제
                          </span>
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
  );
}
