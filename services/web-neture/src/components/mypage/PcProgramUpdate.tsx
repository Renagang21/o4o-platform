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
    [busy, setBusy] = useState(false);
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
      anchor.download = release.filename;
      anchor.click();
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
  return (
    <section
      aria-label="PC 프로그램 설치와 업데이트"
      className="mt-4 space-y-2 rounded-lg border border-gray-200 p-3 text-sm"
    >
      <h4 className="font-semibold">PC 프로그램 설치·업데이트</h4>
      {release && (
        <p>
          배포 버전 {release.version}
          {health ? ` · 현재 실행 버전 ${health.agentVersion}` : ""}
        </p>
      )}
      {status === "current" && (
        <p role="status" className="text-emerald-700">
          최신 프로그램과 데이터 준비 상태를 확인했습니다.
        </p>
      )}
      {status === "update" && (
        <p role="status">현재 실행 중인 프로그램은 업데이트가 필요합니다.</p>
      )}
      {status === "unknown" && (
        <p>
          프로그램 실행과 브라우저의 PC 연결 권한을 확인한 뒤 버전을 다시 확인해
          주세요.
        </p>
      )}
      {status === "data_error" && (
        <p role="alert">
          프로그램 버전은 최신이지만 데이터 준비 상태를 확인하지 못했습니다.
          기존 데이터를 초기화하지 말고 확인해 주세요.
        </p>
      )}
      <button
        type="button"
        disabled={!release || disabled || busy}
        onClick={() => void download()}
        className="rounded border px-3 py-2 disabled:opacity-50"
      >
        {busy
          ? "파일 검증·다운로드 중..."
          : "Windows PC 설치·업데이트 파일 받기"}
      </button>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          파일을 받은 뒤 압축을 풀고 Install.cmd를 실행합니다. Node·SQLite를
          따로 설치할 필요가 없습니다.
        </li>
        <li>
          기존 PC 프로그램이 실행 중이면 업무를 마치고 정상 종료한 뒤
          설치합니다. 데이터와 계정 연결 정보는 유지됩니다.
        </li>
        <li>
          설치 후 시작 메뉴의 O4O PC 연결을 실행하고 아래에서 다시 확인합니다.
        </li>
      </ol>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          void refreshRelease();
          onVerify();
        }}
        className="rounded border px-3 py-1.5 disabled:opacity-50"
      >
        설치·업데이트 후 다시 확인
      </button>
      <p className="text-xs text-gray-500">
        Windows 10/11 x64용입니다. 모바일에서 이용 중이라면 연결할 Windows
        PC에서 설치해 주세요. 다운로드만으로 PC 프로그램이 바뀌지는 않습니다.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
