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
    [mailRead,setMailRead] = useState(false),
    [mailManage,setMailManage] = useState(false),
    [mailBody,setMailBody] = useState(false),
    [selectedMail,setSelectedMail] = useState<string[]>([]),
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
    setMailRead(false);setMailManage(false);setMailBody(false);setSelectedMail([]);
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
            [...selected,...(mailRead?selectedMail:[])],
            ['o4o:read',...(write?['o4o:draft:write']:[]),...(mailRead?['o4o:mail:read']:[]),...(mailRead&&mailManage?['o4o:mail:manage']:[]),...(mailRead&&mailBody?['o4o:mail:body']:[])],
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
              {data.scopes.includes('o4o:mail:read')&&<fieldset disabled={busy} className="space-y-3 rounded border p-4">
                <legend>개인 메일 별도 동의</legend>
                <p className="text-sm">콘텐츠 초안 권한과 별개입니다. 아래에서 선택한 본인 메일 계정만 AI에 연결합니다.</p>
                <label className="flex items-center gap-2"><input type="checkbox" checked={mailRead} onChange={e=>{setMailRead(e.target.checked);if(!e.target.checked){setMailManage(false);setMailBody(false);setSelectedMail([]);}}}/>메일 목록·발신처·처리 현황 조회</label>
                {data.scopes.includes('o4o:mail:manage')&&<label className="flex items-center gap-2"><input type="checkbox" checked={mailManage} disabled={!mailRead} onChange={e=>setMailManage(e.target.checked)}/>정리·규칙 제안과 직접 승인한 작업 관리</label>}
                {data.scopes.includes('o4o:mail:body')&&<label className="flex items-center gap-2"><input type="checkbox" checked={mailBody} disabled={!mailRead} onChange={e=>setMailBody(e.target.checked)}/>선택한 메일 본문을 연결한 AI에 전달</label>}
                <p className="text-sm text-gray-600">본문에는 개인정보가 포함될 수 있습니다. 일괄 정리와 자동 규칙은 O4O 확인 화면에서 대상과 건수를 직접 승인해야 합니다.</p>
                {(data.mailAccounts??[]).map(account=><label key={account.id} className="flex items-start gap-2"><input type="checkbox" checked={selectedMail.includes(account.id)} disabled={!mailRead} onChange={e=>setSelectedMail(current=>e.target.checked?[...current,account.id]:current.filter(id=>id!==account.id))}/><span className="break-all">{account.name}</span></label>)}
                {!data.mailAccounts?.length&&<p>연결 가능한 개인 메일 계정이 없습니다. My Home의 개인 메일 관리에서 먼저 연결하세요.</p>}
              </fieldset>}
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
                    />{" "}
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
                  disabled={busy || (!selected.length && (!mailRead || !selectedMail.length)) || (mailRead && !selectedMail.length)}
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
