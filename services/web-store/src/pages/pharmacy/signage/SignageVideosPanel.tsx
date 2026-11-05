import {
  VideoRegistration,
  daysUntil,
  formatSignageDate as formatDate,
  formatSignageShortDate as formatShortDate,
  isForcedExpired,
  isForcedExpiringSoon,
} from "@o4o/store-ui-core";
import { type Column } from "@o4o/ui";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListVideo,
  Loader2,
  Lock,
  Monitor,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { mediaApi } from "../../../api/media";
import MediaPickerModal from "../../../components/common/MediaPickerModal";
import { BusinessVideoImport } from "../signage/BusinessVideoImport";
import { CommunityVideoImport } from "../signage/CommunityVideoImport";
import { SignageSelectionTable } from "../signage/SignageSelectionTable";
import {
  type SignageSortKey as SortKey,
  type SignageStatusFilter as StatusFilter,
  type UnifiedVideoItem,
} from "../signage/signageVideoList";
import type { SignageWorkspaceState } from "../useSignageWorkspace";

export function SignageVideosPanel({
  state,
}: Readonly<{ state: SignageWorkspaceState }>) {
  const {
    KpiCard,
    PAGE_LIMIT,
    STATUS_CONFIG,
    askVideoRegistration,
    assetKeyword,
    base,
    businessImport,
    error,
    fetchItems,
    filteredUnified,
    forcedExpiringCount,
    handleDeleteMedia,
    handleOpenEdit,
    handleRegisterVideo,
    handleToggleStatus,
    isCurrent,
    kpi,
    libraryError,
    libraryPending,
    librarySaving,
    listError,
    loadSignageMedia,
    loading,
    location,
    mediaLoadError,
    mediaLoading,
    navigate,
    navigateTab,
    organizationId,
    originFilter,
    page,
    pagedUnified,
    regVideoDescription,
    regVideoError,
    regVideoSaving,
    regVideoStatus,
    regVideoTags,
    regVideoTitle,
    regVideoUrl,
    registerLibraryVideo,
    reloadItems,
    saveVideoRegistration,
    setAssetKeyword,
    setBusinessImport,
    setOriginFilter,
    setPage,
    setRegVideoDescription,
    setRegVideoError,
    setRegVideoStatus,
    setRegVideoTags,
    setRegVideoTitle,
    setRegVideoUrl,
    setShowVideoRegForm,
    setSortKey,
    setStatusFilter,
    setVideoLibraryOpen,
    showVideoRegForm,
    sortKey,
    statusFilter,
    totalPages,
    unifiedVideos,
    updatingId,
    videoLibraryOpen,
    videoRequestSlot,
    youtubeVideoApi,
  } = state;
  return (
    <>
      {new URLSearchParams(location.search).get("communityVideo") && (
        <CommunityVideoImport
          requestKey={
            new URLSearchParams(location.search).get("communityRequest") ??
            undefined
          }
          videoId={new URLSearchParams(location.search).get("communityVideo")!}
          organizationId={organizationId}
          isCurrent={isCurrent}
          onClose={() => {
            const params = new URLSearchParams(location.search);
            params.delete("communityVideo");
            params.delete("communityRequest");
            navigate(
              { pathname: location.pathname, search: params.toString() },
              { replace: true },
            );
          }}
          onImported={() => {
            void reloadItems();
            const params = new URLSearchParams(location.search);
            params.delete("communityVideo");
            params.delete("communityRequest");
            navigate(
              { pathname: location.pathname, search: params.toString() },
              { replace: true },
            );
          }}
        />
      )}
      <details>
        <summary className="min-h-11 cursor-pointer">
          AI로 등록 정보 준비 · YouTube 업로드
        </summary>
        <VideoRegistration
          defaultDestination="o4o"
          contextKey={organizationId}
          youtube={youtubeVideoApi}
          mediaApi={mediaApi}
          ask={askVideoRegistration}
          save={saveVideoRegistration}
          onSaved={loadSignageMedia}
          requestSlot={videoRequestSlot}
        />
      </details>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-slate-800">동영상함</h2>
        <button
          onClick={() => setShowVideoRegForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          <Plus className="w-4 h-4" />
          동영상 등록
        </button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={librarySaving}
          onClick={() => setVideoLibraryOpen(true)}
          className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm text-white"
        >
          O4O에 보관 · 영상 선택
        </button>
        <Link
          to={`${base}/library/signage`}
          className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm"
        >
          커뮤니티·제공 영상 찾기
        </Link>
        <button
          type="button"
          onClick={() => setBusinessImport((value) => !value)}
          className="min-h-11 rounded-lg border px-4 text-sm"
        >
          가입 협업체 영상 가져오기
        </button>
      </div>
      <p className="mb-3 text-sm text-slate-600">
        O4O 보관은 미디어 라이브러리를 사용합니다. YouTube 업로드와 영상
        처리에는 수 분 이상 걸릴 수 있습니다. YouTube 화면에서 완료를 확인한 뒤
        개별 영상 주소를 등록하세요. 채널 주소 자체는 재생할 수 없습니다.
      </p>
      {librarySaving && (
        <output>보관 영상을 동영상함에 연결하고 있습니다…</output>
      )}
      {libraryError && (
        <div role="alert" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm">
          {libraryError}
          {libraryPending && (
            <button
              type="button"
              disabled={librarySaving}
              onClick={() => void registerLibraryVideo(libraryPending)}
              className="min-h-11 px-3 underline"
            >
              같은 보관 영상 다시 등록
            </button>
          )}
        </div>
      )}
      <MediaPickerModal
        open={videoLibraryOpen}
        onClose={() => setVideoLibraryOpen(false)}
        onSelect={(asset) => void registerLibraryVideo(asset)}
        assetType="video"
        contextKey={organizationId}
        title="O4O 보관 영상"
        defaultFolder="general"
      />
      {/* Video registration form — modal */}
      {showVideoRegForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVideoRegForm(false);
              setRegVideoTitle("");
              setRegVideoUrl("");
              setRegVideoDescription("");
              setRegVideoTags("");
              setRegVideoStatus("active");
              setRegVideoError("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowVideoRegForm(false);
              setRegVideoTitle("");
              setRegVideoUrl("");
              setRegVideoDescription("");
              setRegVideoTags("");
              setRegVideoStatus("active");
              setRegVideoError("");
            }
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              동영상 등록
            </h3>
            {regVideoError && (
              <p className="text-xs text-red-600 mb-3 px-2 py-1.5 bg-red-50 border border-red-200 rounded">
                {regVideoError}
              </p>
            )}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={regVideoTitle}
                onChange={(e) => {
                  setRegVideoTitle(e.target.value);
                  setRegVideoError("");
                }}
                placeholder="동영상 제목을 입력하세요"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                YouTube / Vimeo URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={regVideoUrl}
                onChange={(e) => {
                  setRegVideoUrl(e.target.value);
                  setRegVideoError("");
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                설명 / 용도 메모
              </label>
              <textarea
                value={regVideoDescription}
                onChange={(e) => setRegVideoDescription(e.target.value)}
                placeholder="이 동영상의 활용 위치나 용도를 간략히 기록하세요"
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  태그{" "}
                  <span className="text-slate-400 font-normal">
                    (쉼표로 구분)
                  </span>
                </label>
                <input
                  type="text"
                  value={regVideoTags}
                  onChange={(e) => setRegVideoTags(e.target.value)}
                  placeholder="예: 약국, 건강, 홍보"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  공개 상태
                </label>
                <select
                  value={regVideoStatus}
                  onChange={(e) =>
                    setRegVideoStatus(e.target.value as "draft" | "active")
                  }
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
                  setRegVideoTitle("");
                  setRegVideoUrl("");
                  setRegVideoDescription("");
                  setRegVideoTags("");
                  setRegVideoStatus("active");
                  setRegVideoError("");
                }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleRegisterVideo}
                disabled={
                  regVideoSaving || !regVideoTitle.trim() || !regVideoUrl.trim()
                }
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regVideoSaving && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {regVideoSaving ? "등록 중..." : "등록"}
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
          <KpiCard
            label="강제노출"
            count={kpi.forcedActive}
            color="red"
            warning={
              forcedExpiringCount > 0
                ? `${forcedExpiringCount}건 만료 임박`
                : undefined
            }
          />
          <KpiCard
            label="사이니지 채널"
            count={kpi.signageChannel}
            color="purple"
          />
        </div>
      )}

      {businessImport && (
        <BusinessVideoImport
          organizationId={organizationId}
          isCurrent={isCurrent}
          onClose={() => setBusinessImport(false)}
          onImported={() => {
            void reloadItems();
          }}
        />
      )}
      <label className="mb-3 flex min-h-11 items-center gap-3">
        영상 출처
        <select
          aria-label="영상 출처"
          value={originFilter}
          onChange={(event) =>
            setOriginFilter(event.target.value as typeof originFilter)
          }
          className="min-h-11 rounded border px-3"
        >
          <option value="all">전체</option>
          <option value="community">커뮤니티</option>
          <option value="business">가입 협업체</option>
          <option value="own">직접 등록</option>
          <option value="provided">기타 제공 자료</option>
        </select>
      </label>
      {/* ─── [B] 검색 + 필터 바 ─────────────────── */}
      {!loading &&
        !mediaLoading &&
        !mediaLoadError &&
        !error &&
        !listError &&
        unifiedVideos.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={assetKeyword}
              onChange={(e) => setAssetKeyword(e.target.value)}
              placeholder="동영상 이름으로 검색..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      {!loading &&
        !mediaLoading &&
        !mediaLoadError &&
        !error &&
        !listError &&
        unifiedVideos.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {(
                [
                  { key: "all", label: "전체" },
                  { key: "published", label: "게시됨" },
                  { key: "draft", label: "초안" },
                  { key: "hidden", label: "숨김" },
                  { key: "forced", label: "강제노출" },
                ] as { key: StatusFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === opt.key
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-500 hover:bg-slate-100"
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
                onChange={(e) => setSortKey(e.target.value as SortKey)}
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
            강제노출 만료 임박: <strong>{forcedExpiringCount}건</strong>의
            사이니지가 7일 이내 만료됩니다.
          </span>
        </div>
      )}

      {/* ─── [C] 사이니지 리스트 ───────────────────── */}
      {loading || mediaLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          사이니지 목록을 불러오는 중...
        </div>
      ) : error || listError || mediaLoadError ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p className="text-sm">{listError || error || mediaLoadError}</p>
          <button
            onClick={() => {
              void fetchItems();
              void loadSignageMedia();
            }}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            다시 시도
          </button>
        </div>
      ) : filteredUnified.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          {unifiedVideos.length === 0 ? (
            <>
              <Monitor className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">동영상이 없습니다.</p>
              <p className="text-xs mt-1">
                O4O 보관 영상을 선택하거나 YouTube/Vimeo 영상 주소를 등록하세요.
              </p>
            </>
          ) : (
            <p className="text-sm">
              선택한 필터 조건에 해당하는 동영상이 없습니다.
            </p>
          )}
        </div>
      ) : (
        <>
          <SignageSelectionTable<UnifiedVideoItem>
            selectionKey={`${organizationId}:${page}:${assetKeyword}:${originFilter}:${statusFilter}:${sortKey}`}
            actions={[
              {
                key: "edit",
                label: "영상 상세·수정",
                disabled: (row) => !!row.isForced || !!row.isLocked,
                onSelect: handleOpenEdit,
              },
            ]}
            columns={
              [
                {
                  key: "title",
                  title: "제목",
                  render: (_v, v) => {
                    if (v.source === "direct") {
                      const media = v._media;
                      return (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 truncate max-w-md">
                              {v.title}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                              {v.sourceType === "youtube"
                                ? "YouTube"
                                : v.sourceType === "vimeo"
                                  ? "Vimeo"
                                  : "직접"}
                            </span>
                          </div>
                          {media?.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                              {media.description}
                            </p>
                          )}
                          {media?.tags && media.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {media.tags.map((tag) => (
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
                      );
                    }
                    const item = v._snapshot!;
                    const expired = isForcedExpired(item);
                    const expiringSoon = isForcedExpiringSoon(item);
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate max-w-md">
                            {v.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                            {v.originLabel}
                          </span>
                        </div>
                        {item.isForced && (
                          <div className="flex items-center gap-2 mt-1">
                            {expired ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">
                                강제노출 만료
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${expiringSoon ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                              >
                                {expiringSoon ? (
                                  <AlertTriangle className="w-3 h-3" />
                                ) : (
                                  <ShieldAlert className="w-3 h-3" />
                                )}
                                {expiringSoon ? "만료 임박" : "강제노출"}
                              </span>
                            )}
                            {item.isLocked && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                            {(item.forcedStartAt || item.forcedEndAt) && (
                              <span className="text-[10px] text-slate-400">
                                {formatShortDate(item.forcedStartAt)} ~{" "}
                                {formatShortDate(item.forcedEndAt)}
                                {expiringSoon && item.forcedEndAt && (
                                  <span className="ml-1 text-amber-600 font-medium">
                                    (D-{daysUntil(item.forcedEndAt)})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "publishStatus",
                  title: "상태",
                  render: (_v, v) => {
                    if (v.source === "direct") {
                      const mediaStatus = v._media?.status;
                      const isDraft = mediaStatus === "draft";
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDraft ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700"}`}
                        >
                          {isDraft ? "초안" : "공개"}
                        </span>
                      );
                    }
                    const item = v._snapshot!;
                    const statusCfg =
                      STATUS_CONFIG[item.publishStatus] || STATUS_CONFIG.draft;
                    const isUpdating = updatingId === item.id;
                    return item.isForced ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 cursor-not-allowed opacity-70"
                        title="관리자 강제노출 - 변경 불가"
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        {statusCfg.label}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(item);
                        }}
                        disabled={isUpdating}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${statusCfg.bg} ${statusCfg.text}`}
                        title="클릭하여 상태 변경 (초안 → 게시됨 → 숨김)"
                      >
                        {isUpdating && (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        )}
                        {statusCfg.label}
                      </button>
                    );
                  },
                },
                {
                  key: "createdAt",
                  title: "등록일",
                  dataIndex: "createdAt",
                  render: (v) => (
                    <span className="text-slate-500">
                      {formatDate(v as string)}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  title: "",
                  align: "right" as const,
                  render: (_v, v) => {
                    if (v.source === "direct") {
                      return (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(v);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                            title="편집"
                          >
                            <Pencil className="w-3 h-3" />
                            편집
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMedia(v._media!.id);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(v);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                            title="편집"
                          >
                            <Pencil className="w-3 h-3" />
                            편집
                          </button>
                        )}
                        <button
                          onClick={() => navigateTab("playlist")}
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
              ] as Column<UnifiedVideoItem>[]
            }
            dataSource={pagedUnified}
            rowKey="id"
            loading={false}
            onRow={(v) => ({
              className:
                v.source === "snapshot" &&
                v._snapshot &&
                v._snapshot.isForced &&
                !isForcedExpired(v._snapshot)
                  ? "bg-red-50/30"
                  : v.source === "snapshot" &&
                      v._snapshot &&
                      isForcedExpired(v._snapshot)
                    ? "opacity-60"
                    : "",
            })}
            emptyText="동영상이 없습니다"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>
                {filteredUnified.length}건 중 {(page - 1) * PAGE_LIMIT + 1}–
                {Math.min(page * PAGE_LIMIT, filteredUnified.length)} · {page}/
                {totalPages} 페이지
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </>
  );
}
