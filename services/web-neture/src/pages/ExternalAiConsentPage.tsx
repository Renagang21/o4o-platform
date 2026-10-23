import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts";
import { useLoginModal } from "../contexts/LoginModalContext";
import {
  approveExternalConsent,
  denyExternalConsent,
  getExternalConsent,
  type ConsentInfo,
} from "../api/externalAi";

export default function ExternalAiConsentPage() {
  const { isAuthenticated, isLoading, user } = useAuth(),
    { openLoginModal } = useLoginModal(),
    location = useLocation();
  const request = new URLSearchParams(location.search).get("request") ?? "";
  const [data, setData] = useState<ConsentInfo | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [write, setWrite] = useState(false),
    [replaceExisting, setReplaceExisting] = useState(true);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setData(null);
    setSelected([]);
    setWrite(false);
    setReplaceExisting(true);
    setMessage("");
    getExternalConsent(request)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled)
          setMessage(
            "연결 요청이 만료되었거나 연결할 수 없습니다. 원래 AI 화면에서 다시 연결해 주세요.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, request, retry]);
  async function complete(approve: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const redirect = approve
        ? await approveExternalConsent(
            request,
            selected,
            write ? ["o4o:read", "o4o:draft:write"] : ["o4o:read"],
            (data?.existingConnections ?? 0) > 0 && replaceExisting,
          )
        : await denyExternalConsent(request);
      window.location.assign(redirect);
    } catch {
      setMessage("연결을 처리하지 못했습니다. 상태를 다시 확인해 주세요.");
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-xl space-y-5 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">O4O 외부 AI 연결</h1>
      {isLoading ? (
        <p role="status">계정을 확인하는 중입니다.</p>
      ) : !isAuthenticated ? (
        <>
          <p>연결할 O4O 계정으로 로그인해 주세요.</p>
          <button
            className="rounded bg-blue-600 px-4 py-3 text-white"
            onClick={() =>
              openLoginModal(`${location.pathname}${location.search}`)
            }
          >
            O4O 로그인
          </button>
        </>
      ) : (
        <>
          {message && <p role="alert">{message}</p>}
          {!data && !message && (
            <p role="status">연결 요청을 확인하는 중입니다.</p>
          )}
          {data && (
            <>
              <p>
                <strong>{data.clientName}</strong>에서 O4O 연결을 요청했습니다.
              </p>
              <p className="text-sm text-gray-600">
                위 이름은 연결 앱이 제공한 이름입니다. 선택한 공간의 기존 이용
                권한 안에서 작동합니다. 조회한 자료는 연결한 AI에 전달됩니다.
              </p>
              <fieldset
                disabled={busy}
                className="space-y-3 rounded border p-4"
              >
                <legend>허용할 작업공간</legend>
                {!data.workspaces.length && (
                  <p>연결할 수 있는 작업공간이 없습니다.</p>
                )}
                {data.workspaces.map((workspace) => (
                  <label key={workspace.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(workspace.id)}
                      disabled={write && !workspace.writable}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, workspace.id]
                            : current.filter((id) => id !== workspace.id),
                        )
                      }
                    />
                    {workspace.name}
                    {workspace.kind && (
                      <span className="text-sm text-gray-500">
                        {
                          {
                            supplier: "공급자",
                            store: "약국",
                            organization: "협력조직",
                            community: "커뮤니티 게시판",
                          }[workspace.kind]
                        }
                      </span>
                    )}
                    {!workspace.writable && (
                      <span className="text-sm text-gray-500">조회 가능</span>
                    )}
                  </label>
                ))}
              </fieldset>
              <fieldset
                disabled={busy}
                className="space-y-3 rounded border p-4"
              >
                <legend>허용할 기능</legend>
                <p>자료 조회</p>
                {data.scopes.includes("o4o:draft:write") && (
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={write}
                      onChange={(event) => {
                        setWrite(event.target.checked);
                        if (event.target.checked)
                          setSelected((current) =>
                            current.filter((id) =>
                              data.workspaces.some(
                                (w) => w.id === id && w.writable,
                              ),
                            ),
                          );
                      }}
                    />
                    초안 저장·수정
                  </label>
                )}
                <p className="text-sm text-gray-600">
                  공개·게시·검수 요청은 기존 O4O 화면에서 처리합니다. 연결은 내
                  계정 설정에서 해제할 수 있습니다.
                </p>
              </fieldset>
              {(data.existingConnections ?? 0) > 0 && (
                <fieldset
                  disabled={busy}
                  className="space-y-2 rounded border p-4"
                >
                  <legend>기존 연결</legend>
                  <p className="text-sm text-gray-600">
                    이 앱으로 이미 연결된 O4O 연결이 {data.existingConnections}개
                    있습니다.
                  </p>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(event) =>
                        setReplaceExisting(event.target.checked)
                      }
                    />
                    이전 연결을 이 연결로 바꾸기(이전 연결 해제)
                  </label>
                  <p className="text-sm text-gray-600">
                    다른 AI 계정에서 따로 쓰는 연결이면 선택을 해제하세요. 연결은
                    내 계정 설정에서 언제든 해제할 수 있습니다.
                  </p>
                </fieldset>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy || !selected.length}
                  className="rounded bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
                  onClick={() => void complete(true)}
                >
                  선택한 범위로 연결
                </button>
                <button
                  disabled={busy}
                  className="rounded border px-4 py-3"
                  onClick={() => void complete(false)}
                >
                  연결 취소
                </button>
              </div>
            </>
          )}
          {message && (
            <button
              disabled={busy}
              className="rounded border px-4 py-3"
              onClick={() => setRetry((v) => v + 1)}
            >
              다시 확인
            </button>
          )}
        </>
      )}
    </main>
  );
}
