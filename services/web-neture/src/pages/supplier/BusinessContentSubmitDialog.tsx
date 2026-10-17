import { useEffect, useRef, useState } from "react";
import { OperatorDialog } from "../operator/OperatorDialog";
import { neturePharmacySupplierApi as api } from "../../lib/api/neturePharmacy";

export function BusinessContentSubmitDialog({
  item,
  onClose,
  onSuccess,
}: {
  item: { id: string; title: string };
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [businesses, setBusinesses] = useState<Array<{
    key: string;
    name: string;
  }> | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const fallback = useRef<HTMLButtonElement>(null);
  const lifecycle = useRef({ alive: true, writing: false });
  useEffect(() => {
    const state = { alive: true, writing: false };
    lifecycle.current = state;
    setBusinesses(null);
    setSelected("");
    setError("");
    api
      .listSemiFranchises()
      .then((rows) => {
        if (!state.alive) return;
        if (!Array.isArray(rows))
          throw new Error("대상 목록을 확인할 수 없습니다.");
        setBusinesses(rows);
        setSelected(rows[0]?.key || "");
      })
      .catch((e) => {
        if (state.alive)
          setError(
            e instanceof Error ? e.message : "대상 목록을 불러오지 못했습니다.",
          );
      });
    return () => {
      state.alive = false;
    };
  }, [item.id, revision]);
  const submit = async () => {
    const state = lifecycle.current;
    if (state.writing || !businesses?.some((b) => b.key === selected)) return;
    state.writing = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.submitContent(item.id, selected);
      if (state.alive)
        onSuccess(
          result.reused
            ? "이미 이 협업체에 제출된 자료입니다. 중복 제출하지 않았습니다."
            : "선택한 협업체에 자료를 제출했습니다. 담당 운영자 승인 후 회원 공간에 게시됩니다.",
        );
    } catch (e) {
      if (state.alive)
        setError(
          e instanceof Error ? e.message : "자료를 제출하지 못했습니다.",
        );
    } finally {
      state.writing = false;
      if (state.alive) setBusy(false);
    }
  };
  return (
    <OperatorDialog
      label="약국 협력사업에 자료 제출"
      busy={busy}
      onCancel={onClose}
      fallbackFocus={fallback}
    >
      <div className="max-w-lg space-y-4 p-6">
        <h2 className="text-lg font-semibold">약국 협력사업에 자료 제출</h2>
        <p className="text-sm text-gray-600">
          <strong>{item.title}</strong>의 현재 내용을 선택한 협업체 운영자에게
          제출합니다. 승인 전에는 회원에게 공개되지 않으며, 제출 후 원본을
          수정해도 제출 내용은 바뀌지 않습니다.
        </p>
        <label className="block text-sm">
          제공할 약국 협력사업
          <select
            aria-label="제공할 약국 협력사업"
            data-dialog-initial-focus
            className="mt-2 w-full rounded border p-2"
            value={selected}
            disabled={busy || !businesses}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!businesses?.length && (
              <option value="">
                {businesses ? "제공 가능한 협업체가 없습니다" : "대상 조회 중…"}
              </option>
            )}
            {businesses?.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <div role="alert" className="text-sm text-red-700">
            {error}
            {!businesses && (
              <button
                type="button"
                className="ml-3 underline"
                onClick={() => setRevision((n) => n + 1)}
              >
                대상 다시 조회
              </button>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            ref={fallback}
            disabled={busy}
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-2"
          >
            취소
          </button>
          <button
            disabled={busy || !selected || !businesses}
            type="button"
            onClick={() => void submit()}
            className="rounded bg-teal-700 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? "제출 중…" : "검토 요청"}
          </button>
        </div>
      </div>
    </OperatorDialog>
  );
}
