import { useEffect, useLayoutEffect, useRef } from "react";
import { Link2, Loader2, MoveRight, Tablet, Unplug, X } from "lucide-react";
import {
  cornerPrimaryLabel,
  type TabletCornerItem,
} from "@o4o/tablet-screen-set-editor";
import type {
  TabletPairing,
  useTabletDevices,
} from "../hooks/useTabletDevices";

export function tabletLastSeenLabel(iso: string | null) {
  if (!iso) return "아직 접속 없음";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "방금 접속";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전 접속`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전 접속`;
  return `${new Date(iso).toLocaleDateString("ko-KR")} 접속`;
}

export function TabletPairingModal({
  pairing,
  onClose,
}: Readonly<{ pairing: TabletPairing | null; onClose: () => void }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !pairing) return;
    const returnFocus =
      pairing.returnFocus ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (typeof dialog.close === "function") dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [pairing]);
  useEffect(() => {
    if (!pairing) return;
    // 대화상자 밖에 초점이 있을 때(showModal 미지원 환경)만 처리한다. 안쪽은 dialog onKeyDown 이 처리.
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Node && dialogRef.current?.contains(event.target)) return;
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pairing, onClose]);
  if (!pairing) return null;
  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border-0 p-0 bg-transparent backdrop:bg-slate-900/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="tablet-pairing-title"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        data-testid="pairing-code-modal"
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3
            id="tablet-pairing-title"
            className="text-base font-bold text-slate-800 flex items-center gap-2"
          >
            <Link2 className="w-5 h-5 text-teal-600" /> 태블릿 연결 —{" "}
            {pairing.locationLabel}
          </h3>
          <button
            onClick={() => onClose()}
            className="text-slate-400 hover:text-slate-600"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4 text-sm text-slate-700">
          <p>
            태블릿의 크롬 브라우저에서 아래 주소를 열고 연결 코드를 입력하세요.
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="text-[11px] text-slate-400">연결 주소</div>
            <div className="font-mono text-sm break-all select-all">{`${window.location.origin}/tablet/setup`}</div>
          </div>
          <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-4 text-center">
            <div className="text-[11px] text-teal-700">연결 코드</div>
            <div
              className="font-mono text-4xl font-bold tracking-[0.3em] text-teal-800 select-all"
              data-testid="pairing-code-value"
            >
              {pairing.code}
            </div>
            <div className="mt-1 text-[11px] text-teal-700">
              {new Date(pairing.expiresAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              까지 · 1회만 사용
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            연결이 끝나면 그 태블릿은 이 위치의 콘텐츠를 자동으로 보여주며, 이후
            위치를 옮기거나 콘텐츠를 바꿔도 자동 반영됩니다.
          </p>
        </div>
        <div className="px-5 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800"
          >
            닫기
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function TabletDeviceList({
  tablets,
  operations,
}: Readonly<{
  tablets: TabletCornerItem[];
  operations: ReturnType<typeof useTabletDevices>;
}>) {
  const {
    connectedDevices,
    busyIds,
    loading,
    loadError,
    reloadDevices,
    handleMoveDevice,
    handleDisconnectDevice,
  } = operations;
  return (
    <div className="space-y-3" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span role="status">
          {loading ? "연결된 태블릿 확인 중…" : "태블릿 연결 상태"}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => void reloadDevices()}
          className="px-3 py-2 text-teal-700 rounded-lg border border-teal-200 disabled:opacity-50"
        >
          새로고침
        </button>
      </div>
      {loadError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {loadError}
          <button
            type="button"
            disabled={loading}
            onClick={() => void reloadDevices()}
            className="ml-2 underline"
          >
            다시 시도
          </button>
        </div>
      )}
      {!loading && !loadError && connectedDevices.length === 0 && (
        <p className="text-sm text-slate-500">
          연결된 실제 태블릿이 없습니다. 위치 카드에서 태블릿을 연결하세요.
        </p>
      )}
      {connectedDevices.length > 0 && (
        <section
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          data-testid="connected-devices"
        >
          <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap items-center gap-2">
            <Tablet className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-700">
              연결된 실제 태블릿 ({connectedDevices.length})
            </h3>
            <span className="text-xs text-slate-400">
              기기를 다른 위치로 옮기면 그 태블릿 화면이 자동으로 바뀝니다.
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {connectedDevices.map((d) => {
              const loc = d.currentLocationId
                ? tablets.find((t) => t.id === d.currentLocationId)
                : null;
              return (
                <li
                  key={d.id}
                  className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm"
                  data-testid={`device-row-${d.id}`}
                >
                  <div className="min-w-[160px] flex-1">
                    <div className="font-medium text-slate-800 truncate">
                      {d.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {tabletLastSeenLabel(d.lastSeenAt)} · 현재 위치:{" "}
                      {loc ? cornerPrimaryLabel(loc) : "미지정"}
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MoveRight className="w-3.5 h-3.5" /> 위치 이동
                    <select
                      className="min-w-0 max-w-40 px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      value={d.currentLocationId ?? ""}
                      disabled={busyIds.has(d.id)}
                      onChange={(e) => {
                        void handleMoveDevice(d, e.target.value);
                      }}
                      aria-label={`${d.name} 위치 이동`}
                      data-testid={`device-move-${d.id}`}
                    >
                      {!d.currentLocationId && (
                        <option value="">(미지정)</option>
                      )}
                      {tablets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {cornerPrimaryLabel(t)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDisconnectDevice(d);
                    }}
                    disabled={busyIds.has(d.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    data-testid={`device-disconnect-${d.id}`}
                  >
                    {busyIds.has(d.id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Unplug className="w-3 h-3" />
                    )}{" "}
                    연결 해제
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
