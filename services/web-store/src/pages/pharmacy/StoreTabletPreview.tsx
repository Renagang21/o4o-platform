import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { TabletKioskPage, type TabletKioskApi } from "@o4o/tablet-kiosk-core";
import type { TabletDisplaySettings } from "../../api/tabletDisplays";

interface StoreTabletPreviewProps {
  previewSlug: string;
  previewView: "tablet" | "mobile";
  previewSettings: TabletDisplaySettings | undefined;
  previewApi: TabletKioskApi;
  tabletId: string | null;
  storeSlug: string | null;
  publicUrl: string;
  onCopy: () => void;
  onClose: () => void;
  onViewChange: (view: "tablet" | "mobile") => void;
}

export function StoreTabletPreview({
  previewSlug,
  previewView,
  previewSettings,
  previewApi,
  tabletId,
  storeSlug,
  publicUrl,
  onCopy,
  onClose,
  onViewChange,
}: StoreTabletPreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallback = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current(); };
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    else { dialog?.setAttribute('open', ''); document.addEventListener('keydown', fallback); }
    return () => { document.removeEventListener('keydown', fallback); dialog?.close?.(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return (
    <dialog ref={dialogRef} aria-label="고객 화면 미리보기" className="open:flex open:flex-col"
      onCancel={event => { event.preventDefault(); onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(15,23,42,0.85)",
        margin: 0, padding: 0, border: 0, width: '100vw', height: '100dvh', maxWidth: 'none', maxHeight: 'none',
      }}
    >
      {/* 상단 바: 보기 전환 + 보조 메뉴 + 닫기 */}
      <div
        style={{ position: "relative", zIndex: 100001 }}
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-slate-900/95 text-white px-4 py-2"
      >
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <p className="text-sm font-semibold whitespace-nowrap">
            고객 화면 미리보기
          </p>
          {/* 태블릿 / 휴대전화 보기 */}
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            {(
              [
                { key: "tablet", label: "태블릿" },
                { key: "mobile", label: "휴대전화" },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                onClick={() => onViewChange(v.key)}
                className={`min-h-11 px-3 py-1 text-xs font-semibold ${previewView === v.key ? "bg-white text-slate-900" : "bg-transparent text-slate-200 hover:bg-white/10"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 보조 메뉴 */}
          {tabletId && storeSlug && (
            <>
              <button
                onClick={() =>
                  window.open(publicUrl, "_blank", "noopener,noreferrer")
                }
                className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium whitespace-nowrap"
              >
                새 창에서 열기
              </button>
              <button
                onClick={() => onCopy()}
                className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium whitespace-nowrap"
              >
                주소 복사
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="flex min-h-11 items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            <X className="w-4 h-4" /> 닫기
          </button>
        </div>
      </div>
      {/* kiosk-core 재사용 (Router 중첩 금지 → slug prop 직접 주입). 휴대전화 보기 = 390px 프레임. */}
      <div className="relative flex min-h-0 flex-1 justify-center overflow-auto">
        <div
          style={
            previewView === "mobile"
              ? {
                  position: "relative",
                  width: 390,
                  maxWidth: "100%",
                  height: "100%",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
                  background: "#fff",
                  overflow: "hidden",
                }
              : {
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }
          }
        >
          <TabletKioskPage
            api={previewApi}
            slug={previewSlug}
            displaySettings={previewSettings}
            showQrBadge={previewSettings?.showQr !== false}
            embedded
          />
        </div>
      </div>
    </dialog>
  );
}
