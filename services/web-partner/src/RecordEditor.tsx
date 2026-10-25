import { useEffect, useId, useRef } from "react";
import { channels, type Workspace } from "./model";

export type Collection = Exclude<keyof Workspace, "version">;
export type Editing = { kind: Collection; id: string };
type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "url"
    | "number"
    | "date"
    | "channel"
    | "proposal"
    | "creator"
    | "asset";
  optional?: boolean;
};
const definitions: Record<Collection, Field[]> = {
  proposals: [
    { key: "title", label: "홍보 제안 제목" },
    { key: "business", label: "사업자·브랜드" },
    { key: "category", label: "활동 분야" },
    { key: "channel", label: "홍보 채널", type: "channel" },
    { key: "description", label: "제품·홍보 소개", type: "textarea" },
    { key: "destination", label: "제품·서비스 주소", type: "url" },
    { key: "contact", label: "외부 문의처 주소", type: "url", optional: true },
  ],
  creators: [
    {
      key: "channelProfiles",
      label: "추가 채널 (채널명 | 주소, 한 줄씩)",
      type: "textarea",
      optional: true,
    },
    { key: "language", label: "활동 언어", optional: true },
    { key: "region", label: "활동 지역", optional: true },
    { key: "name", label: "활동 이름" },
    { key: "channel", label: "활동 채널", type: "channel" },
    { key: "topic", label: "활동 분야·소개", type: "textarea" },
    {
      key: "portfolio",
      label: "대표 콘텐츠 주소",
      type: "url",
      optional: true,
    },
  ],
  assets: [
    { key: "folder", label: "자료 분류", optional: true },
    { key: "tags", label: "태그 (쉼표로 구분)", optional: true },
    { key: "title", label: "자료 제목" },
    { key: "business", label: "제공자·브랜드" },
    { key: "channel", label: "활용 채널", type: "channel" },
    { key: "content", label: "내용·제품 정보", type: "textarea" },
    { key: "url", label: "원본 자료 주소", type: "url", optional: true },
    { key: "usage", label: "사용 범위·출처", type: "textarea" },
  ],
  activities: [
    { key: "assetId", label: "연결 콘텐츠", type: "asset", optional: true },
    {
      key: "likes",
      label: "직접 확인한 좋아요",
      type: "number",
      optional: true,
    },
    {
      key: "comments",
      label: "직접 확인한 댓글",
      type: "number",
      optional: true,
    },
    {
      key: "shares",
      label: "직접 확인한 공유",
      type: "number",
      optional: true,
    },
    { key: "proposalId", label: "홍보 제안", type: "proposal" },
    { key: "creatorId", label: "홍보자", type: "creator" },
    { key: "url", label: "게시물 주소", type: "url" },
    { key: "publishedAt", label: "게시일", type: "date" },
    {
      key: "views",
      label: "직접 확인한 조회수",
      type: "number",
      optional: true,
    },
  ],
  settlements: [
    { key: "dueDate", label: "지급 예정일", type: "date", optional: true },
    { key: "externalReference", label: "외부 지급 참조", optional: true },
    { key: "proposalId", label: "홍보 제안", type: "proposal" },
    { key: "creatorId", label: "홍보자", type: "creator" },
    { key: "memo", label: "지급 내역 설명" },
    { key: "amount", label: "당사자가 정한 금액 (원)", type: "number" },
  ],
};
export default function RecordEditor({
  target,
  workspace,
  disabled,
  error,
  onSave,
  onClose,
}: {
  target: Editing;
  workspace: Workspace;
  disabled: boolean;
  error: string;
  onSave: (fields: FormData) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    prefix = useId();
  const row = workspace[target.kind].find((r) => r.id === target.id);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showModal === "function") el.showModal();
    else el.setAttribute("open", "");
    return () => {
      if (typeof el.close === "function") el.close();
    };
  }, []);
  if (!row) return null;
  return (
    <dialog
      ref={ref}
      className="editor-dialog"
      aria-labelledby={`${prefix}-title`}
      onCancel={(e) => {
        e.preventDefault();
        if (!disabled) onClose();
      }}
    >
      <h2 id={`${prefix}-title`}>기록 수정</h2>
      <p className="hint">
        정산의 서버 변경 이력은 공동공간 소유자가 확인할 수 있습니다.
      </p>
      {error && (
        <p className="message failure" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(new FormData(e.currentTarget));
        }}
      >
        <fieldset disabled={disabled}>
          {target.kind === "assets" && (
            <label className="check-label">
              <input
                type="checkbox"
                name="isTemplate"
                defaultChecked={"isTemplate" in row && row.isTemplate}
              />
              재사용 템플릿으로 보관
            </label>
          )}
          {definitions[target.kind].map((f) => {
            const id = `${prefix}-${f.key}`,
              value =
                f.key === "channelProfiles"
                  ? "channelProfiles" in row
                    ? row.channelProfiles
                        ?.map((p) => `${p.channel} | ${p.url}`)
                        .join("\n")
                    : ""
                  : f.key === "tags"
                    ? "tags" in row
                      ? row.tags?.join(", ")
                      : ""
                    : ["likes", "comments", "shares"].includes(f.key)
                      ? "metrics" in row
                        ? row.metrics?.[f.key as "likes"]
                        : ""
                      : (row as unknown as Record<string, unknown>)[f.key];
            const props = {
              id,
              name: f.key,
              required: !f.optional,
              defaultValue: value == null ? "" : String(value),
            };
            return (
              <div className="field" key={f.key}>
                <label htmlFor={id}>
                  {f.label}
                  {f.optional ? " (선택)" : ""}
                </label>
                {f.type === "textarea" ? (
                  <textarea {...props} rows={4} maxLength={20000} />
                ) : ["channel", "proposal", "creator", "asset"].includes(
                    f.type || "",
                  ) ? (
                  <select {...props}>
                    {f.optional && <option value="">연결 안 함</option>}
                    {f.type === "channel"
                      ? channels.map((c) => <option key={c}>{c}</option>)
                      : (f.type === "proposal"
                          ? workspace.proposals.map((p) => ({
                              id: p.id,
                              title: p.title,
                            }))
                          : f.type === "asset"
                            ? workspace.assets.map((a) => ({
                                id: a.id,
                                title: a.title,
                              }))
                            : workspace.creators.map((c) => ({
                                id: c.id,
                                title: c.name,
                              }))
                        ).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title}
                          </option>
                        ))}
                  </select>
                ) : (
                  <input
                    {...props}
                    type={f.type || "text"}
                    {...(f.type === "number"
                      ? {
                          min: f.key === "amount" ? 1 : 0,
                          step: 1,
                          max: Number.MAX_SAFE_INTEGER,
                        }
                      : { maxLength: f.type === "url" ? 4000 : 250 })}
                  />
                )}
              </div>
            );
          })}
          <div className="button-row">
            <button
              className="button secondary"
              type="button"
              onClick={onClose}
            >
              취소
            </button>
            <button className="button primary" type="submit">
              변경 저장
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
