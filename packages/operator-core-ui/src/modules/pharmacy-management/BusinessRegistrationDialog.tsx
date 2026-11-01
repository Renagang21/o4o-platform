import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PHARMACY_COLLABORATORS } from "@o4o/types";
import { neturePharmacyAdminApi as api } from "./api";
const services = ["pharmacy", "carepharm", "drugstore"] as const;
export function BusinessRegistrationDialog({
  existing,
  preset = "",
  onClose,
  onCreated,
}: {
  existing: string[];
  preset?: string;
  onClose: () => void;
  onCreated: (key: string) => Promise<void>;
}) {
  const [target, setTarget] = useState(
    services.some((key) => key === preset) ? preset : "",
  );
  const [key, setKey] = useState(target);
  const [name, setName] = useState(
    target
      ? PHARMACY_COLLABORATORS[target as (typeof services)[number]].label
      : "",
  );
  const [conditions, setConditions] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLElement>("select")?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  const duplicate = existing.includes(key.trim().toLowerCase());
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onClose();
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      panel.current?.querySelectorAll<HTMLElement>(
        "input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)",
      ) ?? [],
    );
    const first = controls[0],
      last = controls[controls.length - 1];
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="사업 추가"
        onKeyDown={handleKey}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">사업 추가</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || (!createdKey && (!target || duplicate))) return;
            setBusy(true);
            setError("");
            let committed = createdKey !== null;
            try {
              const finalKey = createdKey ?? key.trim().toLowerCase();
              if (!createdKey) {
                await api.createSemiFranchise({
                  key: finalKey,
                  name: name.trim(),
                  registrationConditions: conditions.trim(),
                });
                committed = true;
                setCreatedKey(finalKey);
              }
              await onCreated(finalKey);
            } catch {
              setError(
                committed
                  ? "사업은 등록됐지만 목록을 확인하지 못했습니다. 다시 조회해 주세요."
                  : "등록하지 못했습니다. 등록 현황과 입력 내용을 확인하고 다시 시도해 주세요.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset
            disabled={busy || createdKey !== null}
            className="space-y-3"
          >
            <label className="block">
              대상 서비스
              <select
                className="mt-1 block w-full rounded border p-2"
                required
                value={target}
                onChange={(event) => {
                  const value = event.target.value;
                  setTarget(value);
                  setKey(value === "custom" ? "" : value);
                  setName(
                    services.some((service) => service === value)
                      ? PHARMACY_COLLABORATORS[
                          value as (typeof services)[number]
                        ].label
                      : "",
                  );
                  setError("");
                }}
              >
                <option value="">서비스를 선택하세요</option>
                {services.map((service) => (
                  <option
                    key={service}
                    value={service}
                    disabled={existing.includes(service)}
                  >
                    {PHARMACY_COLLABORATORS[service].label}
                    {existing.includes(service) ? " · 이미 등록됨" : ""}
                  </option>
                ))}
                <option value="custom">기타 협력사업 직접 등록</option>
              </select>
            </label>
            {target === "custom" && (
              <label className="block">
                새 사업 식별자
                <input
                  required
                  pattern="[a-z0-9][a-z0-9-]{1,62}"
                  maxLength={63}
                  className="mt-1 block w-full rounded border p-2"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </label>
            )}
            <label className="block">
              사업 이름
              <input
                required
                maxLength={255}
                className="mt-1 block w-full rounded border p-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block">
              가입 조건 (선택)
              <textarea
                maxLength={4000}
                className="mt-1 block w-full rounded border p-2"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              />
            </label>
            <p className="text-sm text-gray-600">
              등록 후 해당 사업 가입자를 선택해 제공 기능을 설정하세요. 회원
              가입 승인과 사이트 주소 연결은 별도입니다.
            </p>
            {duplicate && (
              <p role="alert">
                이미 등록된 사업입니다. 기존 대상을 선택해 설정하세요.
              </p>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-h-11 rounded border px-4 py-2"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={
                busy ||
                (!createdKey &&
                  (!target || duplicate || !key.trim() || !name.trim()))
              }
              className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {busy
                ? "처리 중…"
                : createdKey
                  ? "등록 목록 다시 조회"
                  : "사업 등록"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
