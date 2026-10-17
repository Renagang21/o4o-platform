import { useEffect, useRef, useState } from "react";
import {
  operatorApi,
  errorMessage,
  type CertificateAuditHistory,
} from "../../api/lecture";
const labels: Record<string, string> = {
  "lecture.certificate.issued": "발급",
  "lecture.certificate.revoked": "폐기",
  "lecture.certificate.renewed": "갱신",
  "lecture.certificate.updated": "정보 수정",
};
const fields: Record<string, string> = {
  isValid: "유효 설정",
  expiresAt: "만료일",
  certificateUrl: "수료증 파일",
  badgeUrl: "배지",
  metadata: "추가 정보",
};
function validity(
  value: { isValid: boolean; expiresAt: string | null } | null,
) {
  if (!value) return "발급 전";
  return `${value.isValid ? "유효" : "폐기"} · 만료 ${value.expiresAt ? new Date(value.expiresAt).toLocaleDateString("ko-KR") : "없음"}`;
}
/** Keyed by target: requests from an earlier certificate never replace the current history. */
export default function CertificateHistoryPanel({
  id,
  revision,
  busy,
}: {
  id: string;
  revision: number;
  busy: boolean;
}) {
  const [data, setData] = useState<CertificateAuditHistory | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const current = ++sequence.current;
    let active = true;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    void operatorApi
      .certificateHistory(id, page)
      .then((response) => {
        if (
          !response.success ||
          !response.data ||
          !Array.isArray(response.data.items)
        )
          throw new Error("이력 응답을 확인해 주세요.");
        if (active && sequence.current === current) setData(response.data);
      })
      .catch((err) => {
        if (active && sequence.current === current)
          setError(errorMessage(err, "처리 이력을 조회하지 못했습니다."));
      })
      .finally(() => {
        if (active && sequence.current === current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, page, revision, retry]);
  return (
    <section className="panel" aria-label="수료증 처리 이력">
      <h2>처리 이력</h2>
      <p className="muted">
        대상 {id}. 기록은 현행 보유기간 안에서 조회됩니다. 이전 처리에 대한 소급
        기록은 없습니다.
      </p>
      <button
        className="btn"
        disabled={loading || busy}
        onClick={() => setRetry((v) => v + 1)}
      >
        이력 다시 조회
      </button>
      {loading && <p role="status">이력 조회 중…</p>}
      {error && (
        <p role="alert">
          {error} 저장 완료 안내가 있다면 이력 조회만 재시도해 주세요.
        </p>
      )}
      {data && !loading && (
        <>
          {!data.items.length && (
            <p>조회된 이력이 없습니다. 과거 처리 여부를 의미하지는 않습니다.</p>
          )}
          {data.items.map((item) => (
            <article
              key={item.id}
              className="panel"
              style={{ overflowWrap: "anywhere" }}
            >
              <strong>
                {labels[item.action] ?? "처리"} 완료 ·{" "}
                {new Date(item.at).toLocaleString("ko-KR")}
              </strong>
              <p>
                수료증 {item.certificateId} · 강의 {item.courseId} · 학습자{" "}
                {item.subjectId}
              </p>
              <p>
                처리자{" "}
                {item.actorId ??
                  (item.source === "system" ? "자동 처리" : "확인 불가")}
              </p>
              <p>
                {validity(item.before)} → {validity(item.after)}
              </p>
              {item.months != null && <p>갱신 기간 {item.months}개월</p>}
              {item.changedFields?.length ? (
                <p>
                  변경 항목:{" "}
                  {item.changedFields
                    .map((key) => fields[key])
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {item.action === "lecture.certificate.revoked" && (
                <p style={{ whiteSpace: "pre-wrap" }}>
                  폐기 사유: {item.reason ?? "입력 없음"}
                </p>
              )}
            </article>
          ))}
          <div className="row-actions">
            <button
              className="btn"
              disabled={busy || page === 1}
              onClick={() => setPage((v) => v - 1)}
            >
              이전 이력
            </button>
            <span>{page}쪽</span>
            <button
              className="btn"
              disabled={busy || !data.hasMore}
              onClick={() => setPage((v) => v + 1)}
            >
              다음 이력
            </button>
          </div>
        </>
      )}
    </section>
  );
}
