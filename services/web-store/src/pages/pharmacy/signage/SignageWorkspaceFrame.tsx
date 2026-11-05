import { toHHMM } from "@o4o/store-ui-core";
import {
  Calendar,
  ListVideo,
  Loader2,
  Monitor,
  Play,
  RefreshCw,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StoreAiSlot } from "../../../components/store/StoreAiPlacement";
import { StoreWorkflowNavigation } from "../../../components/store/StoreWorkflowNavigation";
import { withWorkspaceMode } from "../../../config/storeWorkspace";
import { StoreSignageMediaEditor } from "../StoreSignageMediaEditor";
import { AuthoringDialog } from "../authoring/AuthoringDialog";
import { SignagePlaylistPreview } from "../signage/SignagePlaylistPreview";
import { SignageQuickStart } from "../signage/SignageQuickStart";
import type { SignageWorkspaceState } from "../useSignageWorkspace";
import { SignagePlaylistsPanel } from "./SignagePlaylistsPanel";
import { SignageSchedulesPanel } from "./SignageSchedulesPanel";
import { SignageVideosPanel } from "./SignageVideosPanel";
export function SignageWorkspaceFrame({
  state,
}: Readonly<{ state: SignageWorkspaceState }>) {
  const {
    acceptCreatedPlaylist,
    activeTab,
    addModalSaving,
    addModalSearch,
    addModalSelected,
    addModalVideos,
    addVideoTitleId,
    base,
    closeAddVideo,
    currentSchedule,
    deriveYtThumbnail,
    editDraft,
    editError,
    editSaving,
    editingTarget,
    fetchItems,
    formatDuration,
    handleBulkAdd,
    handleCloseEditDrawer,
    handleDeleteFromDrawer,
    handleEditChange,
    handleSaveEdit,
    isCurrent,
    loadPlaylists,
    loadSchedules,
    loadSignageMedia,
    loadSignagePlaylists,
    mediaLoadError,
    navigate,
    navigateTab,
    nextSchedule,
    organizationId,
    playlistActionError,
    playlistBusy,
    playlistItems,
    playlistPreview,
    playlists,
    quickStart,
    scheduleError,
    scheduleLoading,
    schedulePlaylistError,
    selectedPlaylist,
    setAddModalSearch,
    setAddModalSelected,
    setPlaylistPreview,
    setQuickStart,
    setSavedGuide,
    showAddVideoModal,
    signagePlaylists,
    unifiedVideos,
    workspaceMode,
  } = state;
  return (
    <div className="w-full">
      <StoreWorkflowNavigation
        subject="사이니지"
        studioPath="/marketing/signage/playlist"
        usePath="/marketing/signage/schedules"
      />
      {activeTab === "schedules" && schedulePlaylistError && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          스케줄의 재생목록 정보를 불러오지 못했습니다.
          <button
            type="button"
            onClick={() => void loadSignagePlaylists()}
            className="ml-2 underline"
          >
            다시 시도
          </button>
        </div>
      )}
      {playlistActionError && !showAddVideoModal && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {playlistActionError}
        </div>
      )}
      {mediaLoadError && (
        <div role="alert" className="p-3 text-sm text-red-700">
          {mediaLoadError}
          <button
            type="button"
            onClick={() => void loadSignageMedia()}
            className="min-h-11 underline ml-2"
          >
            동영상 다시 시도
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to={base} className="text-blue-600 hover:underline">
              &larr; 대시보드
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">사이니지</h1>
          <p className="text-sm text-slate-500 mt-1">
            동영상함에서 영상을 모으고 재생목록의 순서를 정한 뒤 매장에
            적용합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchItems();
              loadSignageMedia();
              loadPlaylists();
              if (activeTab === "schedules") {
                loadSchedules();
                loadSignagePlaylists();
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      <StoreAiSlot label="사이니지 안내" />
      {/* ─── Tab Bar ─────────────────────────────── */}
      <div className="flex flex-wrap gap-1 mb-1 border-b border-slate-200">
        <button
          onClick={() => navigateTab("assets")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "assets"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Monitor className="w-4 h-4" />
          동영상함
        </button>
        <button
          onClick={() => navigateTab("playlist")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "playlist"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ListVideo className="w-4 h-4" />
          재생목록
        </button>
        <button
          onClick={() => navigateTab("schedules")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "schedules"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar className="w-4 h-4" />
          스케줄
        </button>
      </div>

      {/* ─── 현재 재생 상태 요약 패널 ─────────────── */}
      {(workspaceMode === "use" || activeTab === "schedules") && (
        <div
          className={`flex flex-wrap items-start gap-4 mb-6 px-4 py-3 rounded-xl border ${
            currentSchedule
              ? "bg-green-50 border-green-200"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          {/* 현재 재생 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${currentSchedule ? "bg-green-500 animate-pulse" : "bg-slate-300"}`}
              />
              <span className="text-xs font-medium text-slate-500">
                현재 시간의 재생 일정
              </span>
            </div>
            {scheduleLoading ? (
              <p className="text-sm text-slate-500">일정 확인 중…</p>
            ) : scheduleError ? (
              <p role="alert" className="text-sm text-red-700">
                일정을 확인하지 못했습니다.{" "}
                <button
                  type="button"
                  onClick={() => void loadSchedules()}
                  className="min-h-11 underline"
                >
                  일정 다시 시도
                </button>
              </p>
            ) : currentSchedule ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {playlists.find(
                    (p) => p.id === currentSchedule.storePlaylistId,
                  )?.name ||
                    currentSchedule.playlist?.name ||
                    playlists.find((p) => p.id === currentSchedule.playlistId)
                      ?.name ||
                    signagePlaylists.find(
                      (p) => p.id === currentSchedule.playlistId,
                    )?.name ||
                    "플레이리스트"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentSchedule.name} · {toHHMM(currentSchedule.startTime)} ~{" "}
                  {toHHMM(currentSchedule.endTime)}
                </p>
                {currentSchedule.storePlaylistId && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        withWorkspaceMode(
                          `${base}/marketing/signage/playlist`,
                          "studio",
                        ),
                        {
                          state: {
                            signagePlaylistId: currentSchedule.storePlaylistId,
                          },
                        },
                      )
                    }
                    className="min-h-11 text-sm text-teal-800 underline"
                  >
                    현재 안내 수정
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                현재 적용된 스케줄이 없습니다
              </p>
            )}
          </div>

          {/* 다음 예정 */}
          {nextSchedule && (
            <div className="flex-shrink-0 border-l border-slate-200 pl-4">
              <p className="text-xs font-medium text-slate-400 mb-0.5">
                다음 예정
              </p>
              <p className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
                {playlists.find((p) => p.id === nextSchedule.storePlaylistId)
                  ?.name ||
                  nextSchedule.playlist?.name ||
                  playlists.find((p) => p.id === nextSchedule.playlistId)
                    ?.name ||
                  nextSchedule.name}
              </p>
              <p className="text-xs text-slate-400">
                {toHHMM(nextSchedule.startTime)} ~{" "}
                {toHHMM(nextSchedule.endTime)}
              </p>
            </div>
          )}

          {/* 스케줄 탭 바로가기 */}
          <button
            onClick={() => navigateTab("schedules")}
            className="flex-shrink-0 text-xs text-slate-400 hover:text-blue-600 underline underline-offset-2"
          >
            스케줄 관리
          </button>
        </div>
      )}

      {/* ═══ Playlist Tab ═══════════════════════════ */}
      {activeTab === "playlist" && <SignagePlaylistsPanel state={state} />}

      {quickStart && (
        <SignageQuickStart
          videos={unifiedVideos}
          organizationId={organizationId}
          isCurrent={isCurrent}
          onSaved={(playlist) => {
            acceptCreatedPlaylist(playlist);
            setSavedGuide(playlist.name);
            setQuickStart(false);
            void fetchItems();
            void loadPlaylists();
          }}
          onClose={(draft) => {
            setQuickStart(false);
            if (draft) acceptCreatedPlaylist(draft);
            void loadPlaylists();
          }}
        />
      )}
      {playlistPreview && selectedPlaylist && (
        <SignagePlaylistPreview
          key={selectedPlaylist.id}
          name={selectedPlaylist.name}
          items={playlistItems}
          onClose={() => setPlaylistPreview(false)}
        />
      )}

      {/* ═══ Schedule Tab ══════════════════════════ */}
      {activeTab === "schedules" && <SignageSchedulesPanel state={state} />}

      {/* ═══ Assets Tab (동영상함) ════════════════ */}
      {activeTab === "assets" && <SignageVideosPanel state={state} />}

      {/* ── Add Video Modal (WO-O4O-STORE-SIGNAGE-PLAYLIST-BUILDER-V1) ── */}
      {showAddVideoModal && (
        <AuthoringDialog labelId={addVideoTitleId} onClose={closeAddVideo}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col"
            style={{ maxHeight: "80vh" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3
                  id={addVideoTitleId}
                  className="text-sm font-semibold text-slate-800"
                >
                  동영상함에서 추가
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  선택한 동영상이 플레이리스트에 추가됩니다
                </p>
              </div>
              {addModalSelected.size > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {addModalSelected.size}개 선택됨
                </span>
              )}
            </div>
            {playlistActionError && (
              <div role="alert" className="px-4 py-3 text-sm text-red-700">
                {playlistActionError}
              </div>
            )}
            {/* Search */}
            <div className="px-4 py-2.5 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  disabled={addModalSaving || playlistBusy}
                  type="text"
                  value={addModalSearch}
                  onChange={(e) => setAddModalSearch(e.target.value)}
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
                  {addModalSearch
                    ? "검색 결과가 없습니다."
                    : "등록된 동영상이 없습니다. 먼저 동영상함 탭에서 동영상을 추가하세요."}
                </div>
              ) : (
                addModalVideos.map((v) => {
                  const isSelected = addModalSelected.has(v.id);
                  const thumb =
                    v.source === "direct"
                      ? v._media?.thumbnailUrl
                      : deriveYtThumbnail(v._snapshot?.contentJson);
                  const dur =
                    v.source === "direct"
                      ? undefined
                      : (v._snapshot?.contentJson?.duration as
                          | number
                          | undefined);
                  const st =
                    v.source === "direct"
                      ? v._media?.sourceType
                      : (v._snapshot?.contentJson?.sourceType as
                          | string
                          | undefined);
                  return (
                    <button
                      key={v.id}
                      disabled={addModalSaving || playlistBusy}
                      onClick={() => {
                        setAddModalSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(v.id)) next.delete(v.id);
                          else next.add(v.id);
                          return next;
                        });
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
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
                          {v.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {v.source === "snapshot" ? (
                            <span className="text-[9px] font-semibold px-1 py-0 rounded bg-blue-50 text-blue-600">
                              HUB복사
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1 py-0 rounded bg-purple-50 text-purple-600">
                              직접등록
                            </span>
                          )}
                          {st && (
                            <span
                              className={`px-1 py-0 rounded text-[9px] font-semibold ${st === "youtube" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
                            >
                              {st === "youtube" ? "YT" : "VM"}
                            </span>
                          )}
                          {dur && dur > 0 && (
                            <span className="text-[11px] text-slate-400">
                              {formatDuration(dur)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
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
                disabled={
                  addModalSelected.size === 0 || addModalSaving || playlistBusy
                }
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addModalSaving && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {addModalSaving
                  ? "추가 중..."
                  : `${addModalSelected.size > 0 ? addModalSelected.size + "개 " : ""}추가`}
              </button>
            </div>
          </div>
        </AuthoringDialog>
      )}

      {/* ─── Media / Snapshot Edit Drawer ─────────── */}
      <StoreSignageMediaEditor
        key={
          editingTarget?.kind === "direct"
            ? `media:${editingTarget.media.id}`
            : `snapshot:${editingTarget?.snapshot.id}`
        }
        target={editingTarget}
        draft={editDraft}
        onChange={handleEditChange}
        editSaving={editSaving}
        editError={editError}
        handleCloseEditDrawer={handleCloseEditDrawer}
        handleDeleteFromDrawer={handleDeleteFromDrawer}
        handleSaveEdit={handleSaveEdit}
      />
    </div>
  );
}
