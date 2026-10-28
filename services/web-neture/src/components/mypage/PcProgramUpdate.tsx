import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalAgentHealth } from "../../api/localAgent";
import {
  PC_RELEASE_BASE,
  validatePcRelease,
  pcReleaseStatus,
  downloadPcRelease,
  type PcRelease,
} from "../../lib/pcRelease";
export default function PcProgramUpdate({
  health,
  onVerify,
  disabled = false,
}: Readonly<{
  health: LocalAgentHealth | null;
  onVerify: () => void;
  disabled?: boolean;
}>) {
  const [release, setRelease] = useState<PcRelease | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [downloaded, setDownloaded] = useState(false);
  const active = useRef(true),
    request = useRef<AbortController | null>(null);
  const manifestRequest = useRef<AbortController | null>(null);
  const refreshRelease = useCallback(async () => {
    manifestRequest.current?.abort();
    const controller = new AbortController();
    manifestRequest.current = controller;
    setRelease(null);
    setError("");
    try {
      const response = await fetch(PC_RELEASE_BASE + "release.json", {
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("PC_RELEASE_UNAVAILABLE");
      const next = validatePcRelease(await response.json());
      if (active.current && !controller.signal.aborted) setRelease(next);
    } catch {
      if (active.current && !controller.signal.aborted)
        setError("PC 설치 자료를 확인하지 못했습니다. 다시 확인해 주세요.");
    }
  }, []);
  useEffect(() => {
    active.current = true;
    void refreshRelease();
    return () => {
      active.current = false;
      manifestRequest.current?.abort();
      request.current?.abort();
    };
  }, [refreshRelease]);
  const status = release ? pcReleaseStatus(release, health) : "unknown";
  async function download() {
    if (!release || busy || request.current) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const file = await downloadPcRelease(release, controller.signal);
      if (!active.current) return;
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = release.setup?.filename ?? release.filename;
      anchor.click();
      setDownloaded(true);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error ? e.message : "설치 파일을 내려받지 못했습니다.",
        );
    } finally {
      request.current = null;
      if (active.current) setBusy(false);
    }
  }
  const installation = (
    <>
      {status === "update" && <p>업데이트가 필요합니다.</p>}
      <button
        type="button"
        disabled={!release || disabled || busy}
        onClick={() => void download()}
        className="rounded-lg bg-gray-900 px-5 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {busy ? "준비 중…" : status === "update" ? "업데이트하기" : "설치하기"}
      </button>
      {downloaded ? (
        <p role="status">
          받은 파일을 열어 주세요. 설치가 끝나면 연결하기를 누르세요.
        </p>
      ) : (
        <p>처음 한 번만 설치하면 됩니다. 받은 파일을 열어 주세요.</p>
      )}
      {release && !release.setup && (
        <p>압축을 풀고 Install.cmd를 열어 주세요.</p>
      )}
    </>
  );
  return (
    <section
      aria-label="PC 프로그램 설치와 업데이트"
      className="mt-4 space-y-3 text-sm"
    >
      {status === "current" ? (
        <>
          <output className="block text-emerald-700">
            최신 프로그램입니다.
          </output>
          <details>
            <summary className="cursor-pointer text-gray-500">
              다시 설치
            </summary>
            <div className="mt-2 space-y-2">{installation}</div>
          </details>
        </>
      ) : (
        installation
      )}
      {status === "data_error" && (
        <p role="alert">
          데이터 확인이 필요합니다. 기존 데이터를 지우지 말고 문의해 주세요.
        </p>
      )}
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          void refreshRelease();
          onVerify();
        }}
        className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50"
      >
        {health?.connected ? "연결 확인" : "연결하기"}
      </button>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => void refreshRelease()}
            className="underline"
          >
            다시 시도
          </button>
        </p>
      )}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">도움말</summary>
        <p className="mt-2">
          Windows 10/11용입니다. 업데이트할 때는 열린 PC 연결 프로그램을 먼저
          종료해 주세요. 기존 데이터는 유지됩니다.
        </p>
        {release && <p>버전 {release.version}</p>}
      </details>
    </section>
  );
}
