import { useLayoutEffect, useRef } from "react";
import type { OperatorCommonIdleCandidate } from "../../../api/tabletDisplays";

export interface TabletOperationToast {
  type: "success" | "error";
  message: string;
  action?: { label: string; onClick: () => void };
}

interface TabletCommonIdlePickerProps {
  ocLoading: boolean;
  ocLoadError: boolean;
  ocCandidates: OperatorCommonIdleCandidate[];
  ocStatusLabel: Record<string, string>;
  ocBusy: boolean;
  onRetry: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function TabletCommonIdlePicker({
  ocLoading,
  ocLoadError,
  ocCandidates,
  ocStatusLabel,
  ocBusy,
  onRetry,
  onSelect,
  onClose,
}: Readonly<TabletCommonIdlePickerProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const candidates = ocCandidates.filter(
    (candidate) => candidate.status !== "expired",
  );
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (typeof dialog.close === "function") dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, []);
  let body;
  if (ocLoading) {
    body = (
      <div className="text-center py-8 text-sm text-slate-500">
        불러오는 중…
      </div>
    );
  } else if (ocLoadError) {
    body = (
      <div className="text-center py-8">
        <p className="text-sm font-medium text-slate-900">
          데이터를 불러오지 못했습니다.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
        >
          다시 시도
        </button>
      </div>
    );
  } else if (candidates.length === 0) {
    body = (
      <div className="text-center py-8 text-sm text-slate-500">
        현재 사용 가능한 서비스 공통 영상이 없습니다.
      </div>
    );
  } else {
    body = (
      <ul className="divide-y">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex items-center gap-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900 truncate">
                {candidate.title}
              </div>
              <div className="text-[11px] text-slate-500 break-words">
                {candidate.sourceType.toUpperCase()} · 방영{" "}
                {candidate.startAt.slice(0, 10)} ~{" "}
                {candidate.endAt.slice(0, 10)} ·{" "}
                {ocStatusLabel[candidate.status] ?? candidate.status}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(candidate.id)}
              disabled={ocBusy}
              className="min-h-11 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap"
            >
              선택
            </button>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dialog
      ref={dialogRef}
      aria-label="서비스 공통 대기 영상 선택"
      className="m-auto p-0 border-0 bg-white rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto backdrop:bg-slate-900/50"
      style={{ zIndex: 100000, width: "calc(100% - 2rem)" }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          typeof dialogRef.current?.showModal !== "function"
        )
          onClose();
      }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">
          서비스 공통 대기 영상 선택
        </h3>
        <button
          onClick={() => onClose()}
          aria-label="공통 대기 영상 선택 닫기"
          className="min-h-11 min-w-11 text-slate-400 hover:text-slate-600 text-lg"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto">
        {body}
        <p className="text-[11px] text-slate-400 mt-3">
          영상 등록·수정·삭제·기간 변경은 서비스 운영자만 할 수 있습니다.
        </p>
      </div>
    </dialog>
  );
}

export function TabletOperationNotice({
  toast,
  onDismiss,
}: {
  toast: TabletOperationToast | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <output
      className="fixed bottom-6 left-4 right-4 sm:left-auto sm:max-w-xl z-[100002] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex flex-wrap items-center gap-3"
      style={{
        backgroundColor: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
        borderColor: toast.type === "success" ? "#86efac" : "#fecaca",
        color: toast.type === "success" ? "#166534" : "#991b1b",
      }}
    >
      <span>
        {toast.type === "success" ? "✅" : "❌"} {toast.message}
      </span>
      {toast.action && (
        <button
          onClick={() => {
            const a = toast.action!;
            onDismiss();
            a.onClick();
          }}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          {toast.action.label}
        </button>
      )}
    </output>
  );
}
