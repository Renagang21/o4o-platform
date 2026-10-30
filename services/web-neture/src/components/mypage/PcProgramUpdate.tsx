import { useCallback, useEffect, useRef, useState } from "react";
import { probeLocalAgent, type LocalAgentHealth } from "../../api/localAgent";
import { Download, Loader2, RefreshCw } from "lucide-react";
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
  onConnectReady,
  onInstallStarted,
  disabled = false,
}: Readonly<{
  health: LocalAgentHealth | null;
  onVerify: () => void;
  onInstallStarted?: () => void;
  onConnectReady?: (
    health: LocalAgentHealth,
    signal: AbortSignal,
  ) => Promise<boolean>;
  disabled?: boolean;
}>) {
  const [release, setRelease] = useState<PcRelease | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [downloaded, setDownloaded] = useState(false),
    [waiting, setWaiting] = useState(false),
    [notice, setNotice] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [connectionStage, setConnectionStage] = useState<
    "waiting" | "ready" | "connecting" | "connected"
  >("waiting");
  const [waitingReason, setWaitingReason] = useState<
    "unknown" | "permission" | "update"
  >("unknown");
  const waitStarted = useRef(0);
  // Time describes observation, never an invented installation percentage.
  useEffect(() => {
    if (!waiting) return;
    const updateElapsed = () =>
      setElapsed(Math.floor((Date.now() - waitStarted.current) / 1000));
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [waiting]);
  const installationRequest = useRef<AbortController | null>(null);
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
      installationRequest.current?.abort();
    };
  }, [refreshRelease]);
  const status = release ? pcReleaseStatus(release, health) : "unknown";
  // Observe only after the user explicitly downloads the installer and requests
  // automatic connection. A matching running release/data state is required.
  useEffect(() => {
    if (!waiting || !release || !onConnectReady) return;
    const controller = new AbortController();
    installationRequest.current = controller;
    const publishedRelease = release;
    const connect = onConnectReady;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = waitStarted.current + 10 * 60 * 1000;
    const timeout = setTimeout(
      () => {
        controller.abort();
        setNotice(
          "10분 동안 연결을 확인하지 못해 자동 확인을 멈췄어요. 받은 파일과 브라우저 권한을 확인한 뒤 연결 확인을 눌러 주세요.",
        );
        setWaiting(false);
      },
      Math.max(0, deadline - Date.now()),
    );
    async function observe() {
      const probe = await probeLocalAgent();
      if (controller.signal.aborted || !active.current) return;
      if (Date.now() >= deadline) {
        setNotice(
          "아직 실행을 확인하지 못했어요. 받은 파일을 열고 연결 확인을 눌러 주세요.",
        );
        setWaiting(false);
        return;
      }
      if (probe.ok) {
        const state = pcReleaseStatus(publishedRelease, probe.health);
        if (state === "data_error") {
          setError(
            "데이터를 확인하지 못했어요. 기존 데이터를 지우지 말고 문의해 주세요.",
          );
          setWaiting(false);
          return;
        }
        if (state === "current") {
          setConnectionStage("connecting");
          setNotice("프로그램을 확인했어요. 이 계정에 연결하고 있어요.");
          const connected = await connect(probe.health, controller.signal);
          if (controller.signal.aborted || !active.current) return;
          setConnectionStage(connected ? "connected" : "ready");
          setNotice(
            connected
              ? "설치와 PC 연결을 확인했어요."
              : "아래 연결 안내를 확인해 주세요.",
          );
          setWaiting(false);
          return;
        }
      }
      setWaitingReason(
        probe.ok
          ? "update"
          : probe.reason === "PERMISSION_REQUIRED"
            ? "permission"
            : "unknown",
      );
      setNotice(
        !probe.ok && probe.reason === "PERMISSION_REQUIRED"
          ? "브라우저에서 PC 연결 허용을 눌러 주세요."
          : probe.ok
            ? "이전 프로그램이 실행 중이에요. 종료한 뒤 받은 설치 파일을 열어 주세요."
            : "PC 프로그램 실행을 기다리고 있어요.",
      );
      timer = setTimeout(check, 2000);
    }
    function check() {
      void observe().catch(() => {
        if (controller.signal.aborted || !active.current) return;
        setError("자동 연결을 확인하지 못했어요. 연결 확인을 눌러 주세요.");
        setWaiting(false);
      });
    }
    check();
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(timeout);
      if (installationRequest.current === controller)
        installationRequest.current = null;
    };
  }, [waiting, release, onConnectReady]);

  function stopWaiting() {
    installationRequest.current?.abort();
    setWaiting(false);
  }
  async function download() {
    if (!release || busy || request.current) return;
    stopWaiting();
    setNotice("");
    setBusy(true);
    setDownloadProgress(0);
    setConnectionStage("waiting");
    setWaitingReason("unknown");
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const file = await downloadPcRelease(
        release,
        controller.signal,
        (received, total) => {
          if (active.current && !controller.signal.aborted)
            setDownloadProgress(Math.floor((received / total) * 100));
        },
      );
      if (!active.current) return;
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = release.setup ? "O4O-PC-Setup.cmd" : release.filename;
      anchor.click();
      setDownloaded(true);
      onInstallStarted?.();
      if (release.setup && onConnectReady) {
        setNotice("PC 프로그램 실행을 기다리고 있어요.");
        waitStarted.current = Date.now();
        setElapsed(0);
        setWaiting(true);
      }
      const revokeUrl = URL.revokeObjectURL.bind(URL);
      setTimeout(() => revokeUrl(url), 1000);
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
  const downloadButton = (
    <button
      type="button"
      disabled={!release || disabled || busy}
      onClick={() => void download()}
      className={
        downloaded
          ? "mt-1 inline-flex items-center gap-1 text-xs text-blue-700 underline disabled:opacity-50"
          : "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      }
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <Download className="h-5 w-5" aria-hidden />
      )}
      {busy
        ? "설치 파일 받는 중…"
        : downloaded
          ? "파일을 못 받았나요? 다시 받기"
          : "설치 파일 받기"}
    </button>
  );
  const installation = (
    <div className="space-y-3 rounded-xl bg-blue-50 p-4">
      {status === "update" && <p>프로그램 업데이트가 필요해요.</p>}
      {!downloaded && downloadButton}
      {busy && (
        <div className="space-y-1">
          <p role="status">
            {downloadProgress < 100
              ? `설치 파일 다운로드 ${downloadProgress}%`
              : "다운로드 완료 · 파일 안전 확인 중…"}
          </p>
          <progress
            aria-label="설치 파일 다운로드"
            value={downloadProgress}
            max={100}
            className="h-2 w-full accent-blue-600"
          />
        </div>
      )}
      {downloaded && release?.setup && connectionStage === "waiting" ? (
        <div role="status" className="space-y-2">
          <p className="font-semibold">이제 받은 파일을 열어 주세요.</p>
          <p>
            브라우저 오른쪽 위 다운로드(↓)에서 <strong>O4O-PC-Setup.cmd</strong>
            를 여세요. 목록이 안 보이면 <strong>Ctrl+J</strong>를 누르세요.
          </p>
          <p className="font-medium text-blue-900">
            저장 후 받은 파일을 열어야 설치가 시작돼요.
          </p>
          <p>압축 해제·설치·프로그램 실행은 자동으로 진행돼요.</p>
        </div>
      ) : connectionStage !== "waiting" ? (
        <p>PC 프로그램 실행을 확인했어요.</p>
      ) : (
        <p>
          {release?.setup ? (
            <>
              받은 파일을 한 번만 열면 설치돼요.
              {onConnectReady && " 실행되면 이 계정에 자동으로 연결해요."}
            </>
          ) : (
            "설치 파일을 준비해요."
          )}
        </p>
      )}
      {release && !release.setup && (
        <p>이전 설치 파일입니다. 압축을 풀고 Install.cmd를 열어 주세요.</p>
      )}
      {downloaded && downloadButton}
    </div>
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
            <div className="mt-2">{installation}</div>
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
      {downloaded && release?.setup && onConnectReady && (
        <div
          className="space-y-3 rounded-xl border border-blue-100 p-4"
          aria-label="PC 연결 진행 단계"
        >
          <ol className="space-y-2">
            {[
              { label: "설치 파일 받기", done: true, current: false },
              {
                label: "받은 파일 열기 · 설치",
                done: connectionStage !== "waiting",
                current: waiting && connectionStage === "waiting",
              },
              {
                label: "이 계정에 PC 연결",
                done: connectionStage === "connected",
                current: waiting && connectionStage === "connecting",
              },
            ].map((step, index) => (
              <li
                key={step.label}
                aria-current={step.current ? "step" : undefined}
                className={`flex items-center gap-2 ${step.done ? "text-emerald-700" : step.current ? "font-semibold text-blue-800" : "text-gray-500"}`}
              >
                <span
                  aria-hidden
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                >
                  {step.done ? "✓" : index + 1}
                </span>
                {step.label}
                <span className="ml-auto text-xs">
                  {step.done
                    ? "완료"
                    : step.current
                      ? index === 1
                        ? "파일 열기 필요"
                        : "연결 중"
                      : "대기"}
                </span>
              </li>
            ))}
          </ol>
          {waiting && (
            <>
              <p className="text-xs text-gray-600">
                연결 확인 경과 {Math.floor(elapsed / 60)}분 {elapsed % 60}초 ·
                최대 10분 자동 확인
              </p>
              {connectionStage === "waiting" && (
                <p className="text-xs text-gray-600">
                  설치 진행률은 이 화면에서 확인할 수 없어요. 파일을 열었다면
                  설치 창을 확인해 주세요.
                </p>
              )}
              {connectionStage === "connecting" && elapsed >= 60 && (
                <p
                  role="status"
                  className="rounded-lg bg-amber-50 p-3 text-amber-900"
                >
                  프로그램은 실행 중이지만 계정 연결 응답이 늦어지고 있어요.
                  브라우저의 PC 연결 권한을 확인해 주세요. 자동 연결을 중지한 뒤
                  다시 확인할 수도 있어요.
                </p>
              )}
              {connectionStage === "waiting" &&
                (elapsed >= 60 || waitingReason !== "unknown") && (
                  <div
                    role="status"
                    className="space-y-1 rounded-lg bg-amber-50 p-3 text-amber-900"
                  >
                    <p className="font-semibold">
                      {waitingReason === "permission"
                        ? "브라우저의 PC 연결 권한을 확인해 주세요."
                        : waitingReason === "update"
                          ? "이전 프로그램을 종료해 주세요."
                          : "아직 프로그램 응답이 없어요. 기다리기만 해서는 설치되지 않아요."}
                    </p>
                    <p>
                      다운로드(↓)에서 O4O-PC-Setup.cmd를 열고, 보안 확인과 설치
                      확인 창을 확인해 주세요.
                    </p>
                    {elapsed >= 180 && (
                      <p>
                        3분 이상 응답이 없어요. 설치 창에 오류가 있는지 확인해
                        주세요. 설치 창이 끝났다면 시작 메뉴의 O4O PC 연결을
                        실행해 주세요.
                      </p>
                    )}
                  </div>
                )}
            </>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="flex items-start gap-2 text-blue-800">
          {waiting && (
            <Loader2
              className="mt-0.5 h-4 w-4 shrink-0 animate-spin"
              aria-hidden
            />
          )}
          {notice}
        </p>
      )}
      {!waiting && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => {
            stopWaiting();
            void refreshRelease();
            onVerify();
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-600 bg-white px-4 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${disabled ? "animate-spin" : ""}`}
            aria-hidden
          />
          {disabled
            ? "연결 확인 중…"
            : health?.connected
              ? "연결 상태 확인"
              : "이미 설치했어요 · 연결 확인"}
        </button>
      )}
      {waiting && (
        <button
          type="button"
          onClick={() => {
            stopWaiting();
            setNotice("자동 연결을 중지했어요.");
          }}
          className="text-gray-500 underline"
        >
          자동 연결 중지
        </button>
      )}
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
        <p>
          브라우저는 받은 파일을 대신 실행할 수 없어요. 파일 열기와 보안 확인은
          직접 눌러 주세요.
        </p>
        {release && <p>버전 {release.version}</p>}
      </details>
    </section>
  );
}
