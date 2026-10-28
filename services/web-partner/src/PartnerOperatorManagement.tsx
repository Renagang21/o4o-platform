import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "./api";

type Person = { userId: string; name: string | null; email: string };
type Invite = { id: string; invited_email: string | null; expires_at: string };
type Snapshot = {
  centralManagementRequired?: boolean;
  operators: Person[];
  candidates: Person[];
  invitations: Invite[];
};
const base = "/api/v1/service-operator-management/partner-support";
/** Uses the existing service-admin delegation and invitation APIs, never grants roles directly. */
export default function PartnerOperatorManagement({
  userId,
}: {
  userId: string;
}) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false),
    generation = useRef(0);
  const load = useCallback(async (q = "") => {
    const ticket = ++generation.current;
    const value = await request<Snapshot>(
      `${base}${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    );
    if (ticket === generation.current) setData(value);
  }, []);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    let active = true;
    void load().catch(() => {
      if (active)
        setError("운영자 목록을 불러오지 못했습니다. 다시 조회해 주세요.");
    });
    return () => {
      active = false;
      invalidate();
    };
  }, [load, invalidate]);
  const act = async (work: () => Promise<unknown>, message: string) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let completed = false;
    try {
      await work();
      completed = true;
      setNotice(message);
      await load(query.trim());
    } catch (e) {
      setData(null);
      setError(
        completed
          ? "처리는 완료됐지만 최신 목록을 불러오지 못했습니다. 목록을 다시 조회하세요."
          : e instanceof Error
            ? e.message
            : "요청을 처리하지 못했습니다.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const manage = (id: string, action: "resend" | "cancel") =>
    act(
      () =>
        request(
          `/api/v1/service-operator-invitations/manage/${id}/${action}`,
          "POST",
        ),
      action === "resend"
        ? "메일 재발송을 요청했습니다. 이전 링크는 사용할 수 없습니다."
        : "초대를 취소했습니다.",
    );
  if(data?.centralManagementRequired)return <section><p>O4O 직영 운영자 지정·회수는 중앙 Admin이 처리합니다.</p><a href="https://admin.neture.co.kr/operators">통합 관리자에서 운영 권한 관리</a></section>;
  return (
    <section className="panel" aria-label="Partner Operator 관리">
      <h2>Operator 지정 · 해제</h2>
      <p>
        Partner Admin이 활성 회원을 초대합니다. 본인 수락 후 권한이
        활성화됩니다. 재발송은 1분 후 가능하며 최초 7일 만료는 연장되지
        않습니다.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => load(query.trim()), "목록을 조회했습니다.");
        }}
      >
        <label className="field">
          대상 사용자 검색
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button className="button" disabled={busy || query.trim().length < 2}>
          검색
        </button>
        <button
          className="button quiet"
          type="button"
          disabled={busy}
          onClick={() => void act(() => load(), "목록을 조회했습니다.")}
        >
          목록 새로고침
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {data && (
        <>
          <h3>검색 결과</h3>
          <ul>
            {data.candidates
              .filter(
                (p) =>
                  p.userId !== userId &&
                  !data.operators.some((op) => op.userId === p.userId),
              )
              .map((p) => (
                <li key={p.userId}>
                  {p.name || "이름 없음"} · {p.email}{" "}
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `${p.email}에 Partner Operator 확인 초대를 보낼까요?`,
                        )
                      )
                        void act(
                          () =>
                            request(`${base}/operators/${p.userId}`, "POST"),
                          "확인 메일 발송을 요청했습니다. 수신함·스팸함을 확인해 주세요.",
                        );
                    }}
                  >
                    확인 메일 보내기
                  </button>
                </li>
              ))}
          </ul>
          <h3>현재 Operator</h3>
          <ul>
            {data.operators.map((p) => (
              <li key={p.userId}>
                {p.name || "이름 없음"} · {p.email}
                <button
                  className="button"
                  disabled={busy || p.userId === userId}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Partner Operator 권한을 해제할까요? 계정과 다른 권한은 유지됩니다.",
                      )
                    )
                      void act(
                        () =>
                          request(`${base}/operators/${p.userId}`, "DELETE"),
                        "Operator 권한을 해제했습니다.",
                      );
                  }}
                >
                  권한 해제
                </button>
              </li>
            ))}
          </ul>
          <h3>수락 대기 초대</h3>
          <ul>
            {data.invitations.map((i) => (
              <li key={i.id}>
                {i.invited_email} · 만료{" "}
                {new Date(i.expires_at).toLocaleString("ko-KR")}
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void manage(i.id, "resend")}
                >
                  재발송
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("초대를 취소할까요?"))
                      void manage(i.id, "cancel");
                  }}
                >
                  초대 취소
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
