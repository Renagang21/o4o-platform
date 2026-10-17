import { useEffect, useState } from "react";
import { api } from "../../lib/apiClient";
export default function SupplierActiveFundings({
  supplierId,
}: {
  supplierId: string;
}) {
  const [rows, setRows] = useState<
      { id: string; title: string; status: string }[] | null
    >(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [more, setMore] = useState(false);
  useEffect(() => {
    let alive = true;
    setRows(null);
    setError("");
    void api
      .get(`/neture/operator/suppliers/${supplierId}/active-fundings`)
      .then((r: { data: any }) => {
        if (!r.data.success || !Array.isArray(r.data.data?.items))
          throw Error("조회 오류");
        if (alive) {
          setRows(r.data.data.items);
          setMore(r.data.data.hasMore);
        }
      })
      .catch(() => {
        if (alive) setError("진행 펀딩 확인에 실패했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [supplierId, retry]);
  return (
    <section className="my-3 rounded border p-3">
      <h3 className="font-semibold">공급자 진행 펀딩 확인</h3>
      <p className="text-sm">
        비활성화가 펀딩을 자동 중지하지 않습니다. 펀딩 운영자가 중지하고
        오프라인 사후 처리를 기록합니다.
      </p>
      {error ? (
        <p role="alert">
          {error}
          <button onClick={() => setRetry((v) => v + 1)}>다시 확인</button>
        </p>
      ) : !rows ? (
        <p>확인 중…</p>
      ) : (
        <>
          {rows.length === 0 && <p>조회된 진행 펀딩이 없습니다.</p>}
          {rows.map((r) => (
            <p key={r.id}>
              <a
                className="text-blue-700 underline"
                href={`https://funding.neture.co.kr/operator/market-trial/${r.id}`}
              >
                {r.title}
              </a>{" "}
              · {r.status}
            </p>
          ))}
          {more && (
            <p>
              100건을 초과합니다. 펀딩 운영 화면에서 전체 현황을 확인하세요.
            </p>
          )}
        </>
      )}
    </section>
  );
}
