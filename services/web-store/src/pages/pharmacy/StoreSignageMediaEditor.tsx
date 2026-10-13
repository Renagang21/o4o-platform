import { useId } from "react";
import { BaseDetailDrawer } from "@o4o/ui";
import { Trash2, Loader2 } from "lucide-react";
import type {
  SignageEditTarget,
  SignageMediaDraft,
} from "./signage/signageMediaDraft";

interface StoreSignageMediaEditorProps {
  target: SignageEditTarget | null;
  draft: SignageMediaDraft;
  onChange: (field: keyof SignageMediaDraft, value: string) => void;
  editSaving: boolean;
  editError: string;
  handleCloseEditDrawer: () => void;
  handleDeleteFromDrawer: () => void;
  handleSaveEdit: () => void;
}
export function StoreSignageMediaEditor({
  target,
  draft,
  onChange,
  editSaving,
  editError,
  handleCloseEditDrawer,
  handleDeleteFromDrawer,
  handleSaveEdit,
}: Readonly<StoreSignageMediaEditorProps>) {
  const fieldId = useId();
  const editingMedia = target?.kind === "direct" ? target.media : null;
  const editingSnapshot = target?.kind === "snapshot" ? target.snapshot : null;
  const {
    name: editName,
    thumbnailUrl: editThumbnailUrl,
    sourceUrl: editSourceUrl,
  } = draft;
  const fields = [
    { key: "name", label: "제목", placeholder: "동영상 제목", type: "text" },
    {
      key: "description",
      label: "설명",
      placeholder: "동영상 설명 또는 용도 메모",
      type: "textarea",
    },
    {
      key: "tags",
      label: "태그 (쉼표로 구분)",
      placeholder: "예: 약국, 건강, 홍보",
      type: "text",
    },
    {
      key: "thumbnailUrl",
      label: "썸네일 URL",
      placeholder: "https://...",
      type: "url",
    },
  ] as const;
  const setEditSourceUrl = (value: string) => onChange("sourceUrl", value);
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
            disabled={editSaving}
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
                <p
                  role="alert"
                  className="text-xs text-red-600 px-2 py-1.5 bg-red-50 border border-red-200 rounded"
                >
                  {editError}
                </p>
              )}

              {/* 소스 URL (수정 가능) */}
              <div>
                <label
                  htmlFor={`${fieldId}-url`}
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  동영상 URL
                </label>
                <input
                  id={`${fieldId}-url`}
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

              {/* Fields belong to this editor; no shared form/schema engine. */}
              {fields.map((field) => {
                const id = `${fieldId}-${field.key}`;
                const className =
                  "w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500";
                return (
                  <div key={field.key}>
                    <label
                      htmlFor={id}
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      {field.label}{" "}
                      {field.key === "name" && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        id={id}
                        value={draft[field.key]}
                        onChange={(event) =>
                          onChange(field.key, event.target.value)
                        }
                        rows={3}
                        className={className + " resize-none"}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        id={id}
                        type={field.type}
                        value={draft[field.key]}
                        onChange={(event) =>
                          onChange(field.key, event.target.value)
                        }
                        className={className}
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.key === "thumbnailUrl" && editThumbnailUrl && (
                      <img
                        key={editThumbnailUrl}
                        src={editThumbnailUrl}
                        alt="썸네일 미리보기"
                        className="mt-2 rounded-md w-full max-h-32 object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
    </BaseDetailDrawer>
  );
}
