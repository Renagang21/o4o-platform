import { BaseDetailDrawer } from "@o4o/ui";
import { Trash2, Loader2 } from "lucide-react";
import type { SignageMediaItem } from "../../api/signageMedia";
import type { StoreAssetItem } from "../../api/assetSnapshot";

interface StoreSignageMediaEditorProps {
  editingMedia: SignageMediaItem | null;
  editingSnapshot: StoreAssetItem | null;
  editName: string;
  editDescription: string;
  editTags: string;
  editThumbnailUrl: string;
  editSourceUrl: string;
  editSaving: boolean;
  editError: string;
  setEditName: (value: string) => void;
  setEditDescription: (value: string) => void;
  setEditTags: (value: string) => void;
  setEditThumbnailUrl: (value: string) => void;
  setEditSourceUrl: (value: string) => void;
  handleCloseEditDrawer: () => void;
  handleDeleteFromDrawer: () => void;
  handleSaveEdit: () => void;
}

export function StoreSignageMediaEditor({
  editingMedia,
  editingSnapshot,
  editName,
  editDescription,
  editTags,
  editThumbnailUrl,
  editSourceUrl,
  editSaving,
  editError,
  setEditName,
  setEditDescription,
  setEditTags,
  setEditThumbnailUrl,
  setEditSourceUrl,
  handleCloseEditDrawer,
  handleDeleteFromDrawer,
  handleSaveEdit,
}: StoreSignageMediaEditorProps) {
  return (
    <BaseDetailDrawer
      open={!!editingMedia || !!editingSnapshot}
      onClose={handleCloseEditDrawer}
      title="동영상 편집"
      width={480}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handleDeleteFromDrawer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCloseEditDrawer}
              className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editSaving || !editName.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      }
    >
      {(editingMedia || editingSnapshot) &&
        (() => {
          const sourceType = editingMedia
            ? editingMedia.sourceType
            : ((editingSnapshot!.contentJson?.sourceType as
                | string
                | undefined) ?? "");
          const createdAt = editingMedia
            ? editingMedia.createdAt
            : editingSnapshot!.createdAt;
          return (
            <div className="space-y-5">
              {editError && (
                <p className="text-xs text-red-600 px-2 py-1.5 bg-red-50 border border-red-200 rounded">
                  {editError}
                </p>
              )}

              {/* 소스 URL (수정 가능) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  동영상 URL
                </label>
                <input
                  type="url"
                  value={editSourceUrl}
                  onChange={(e) => setEditSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  URL을 변경하면 이 항목이 재생하는 동영상이 변경됩니다. 기존
                  플레이리스트에는 변경된 URL이 적용됩니다.
                </p>
              </div>

              {/* 읽기 전용 메타 */}
              <div className="flex gap-4 text-[11px]">
                <div>
                  <span className="font-medium text-slate-400">유형 · </span>
                  <span className="text-slate-500 capitalize">
                    {sourceType}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-400">등록일 · </span>
                  <span className="text-slate-500">
                    {new Date(createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                {editingSnapshot && (
                  <div>
                    <span className="font-medium text-slate-400">출처 · </span>
                    <span className="text-slate-500">
                      자료 원본의 독립 사본
                    </span>
                  </div>
                )}
              </div>

              {/* 수정 가능 필드 */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="동영상 제목"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  설명
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="동영상 설명 또는 용도 메모"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  태그{" "}
                  <span className="text-slate-400 font-normal">
                    (쉼표로 구분)
                  </span>
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="예: 약국, 건강, 홍보"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  썸네일 URL
                </label>
                <input
                  type="url"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://..."
                />
                {editThumbnailUrl && (
                  <img
                    src={editThumbnailUrl}
                    alt="썸네일 미리보기"
                    className="mt-2 rounded-md w-full max-h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            </div>
          );
        })()}
    </BaseDetailDrawer>
  );
}
