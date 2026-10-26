import { useEffect, useState } from "react";
import {
  listExternalConnections,
  revokeExternalConnection,
  type ExternalConnection,
} from "../../api/externalAi";

export default function ExternalAiConnectionsCard() {
  const [items, setItems] = useState<ExternalConnection[] | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setMessage("");
    listExternalConnections()
      .then((value) => {
        if (!cancelled) setItems(value);
      })
      .catch(() => {
        if (!cancelled)
          setMessage("외부 AI 연결을 확인하지 못했습니다. 다시 확인해 주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  async function revoke(id: string) {
    setBusy(true);
    setMessage("");
    try {
      await revokeExternalConnection(id);
      setItems((current) => current?.filter((item) => item.id !== id) ?? []);
      setMessage(
        items
          ?.find((item) => item.id === id)
          ?.scopes.some((scope) => scope.startsWith("o4o:mail:"))
          ? "연결을 해제했습니다. 위임된 메일 작업·규칙은 중단되며 이미 처리된 메일은 되돌리지 않습니다."
          : "연결을 해제했습니다. 저장된 콘텐츠는 유지됩니다.",
      );
    } catch {
      setMessage("연결을 해제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="my-6 space-y-4 rounded-xl border bg-white p-5"
      aria-label="외부 AI 계정 연결"
    >
      <h2 className="text-lg font-semibold">외부 AI 연결</h2>
      <p className="text-sm text-gray-600">
        외부 AI에서 허용한 O4O 자료를 조회하고 콘텐츠 초안을 저장할 수 있습니다.
      </p>
      {message && <p role="status">{message}</p>}
      {!items && !message && <p role="status">연결을 확인하는 중입니다.</p>}
      {items?.length === 0 && (
        <p className="text-sm text-gray-600">연결된 외부 AI가 없습니다.</p>
      )}
      {items?.map((item) => (
        <div key={item.id} className="space-y-2 rounded border p-3">
          <p className="font-medium">
            {item.clientName || "외부 AI"}{" "}
            <span className="text-xs font-normal text-gray-500">
              연결 앱이 제공한 이름
            </span>
          </p>
          <p className="text-sm">
            {item.workspaceNames?.join(", ") || "허용한 작업공간"}
          </p>
          <p className="text-sm">
            자료 조회
            {item.scopes.includes("o4o:draft:write") ? " · 초안 저장·수정" : ""}
            {item.scopes.includes("o4o:mail:read")
              ? " · 개인 메일 현황 조회"
              : ""}
            {item.scopes.includes("o4o:mail:manage")
              ? " · 메일 정리 제안·승인 작업 관리"
              : ""}
            {item.scopes.includes("o4o:mail:body")
              ? " · 선택 메일 본문 전달"
              : ""}
          </p>
          {item.createdAt && (
            <p className="text-sm text-gray-600">
              연결한 때: {new Date(item.createdAt).toLocaleString("ko-KR")}
            </p>
          )}
          <p className="text-sm text-gray-600">
            연결 만료: {new Date(item.expiresAt).toLocaleString("ko-KR")}
          </p>
          <button
            disabled={busy}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => void revoke(item.id)}
          >
            연결 해제
          </button>
        </div>
      ))}
      <button
        disabled={busy}
        className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        onClick={() => setRetry((v) => v + 1)}
      >
        다시 확인
      </button>
    </section>
  );
}
