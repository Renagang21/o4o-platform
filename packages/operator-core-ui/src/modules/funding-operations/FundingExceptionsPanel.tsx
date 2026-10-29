import { useFundingOperations } from './runtime';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from 'react-router-dom';
import { OperationLink as Link } from './runtime';
import { FUNDING_EXCEPTION_LABELS, type FundingException } from './fundingExceptions';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from './types';
const button = "min-h-11 rounded border px-3 text-sm disabled:opacity-50";
const money = (amount: string | number | null) =>
  amount === null ? "미기록" : `${Number(amount).toLocaleString("ko-KR")}원`;
export default function FundingExceptionsPanel() {
 const { api: { fundingExceptionsApi } } = useFundingOperations();



  const [searchParams] = useSearchParams();
  const initialType=searchParams.get("type")??"all";
  const [type, setType] = useState(Object.prototype.hasOwnProperty.call(FUNDING_EXCEPTION_LABELS,initialType)?initialType:"all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FundingException[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scope = useRef({ mounted: false, sequence: 0 });
  useLayoutEffect(() => {
    const current = { mounted: true, sequence: 0 };
    scope.current = current;
    return () => {
      current.mounted = false;
      current.sequence++;
    };
  }, []);
  const key = `${type}:${page}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const load = useCallback(async () => {
    const current = scope.current;
    const sequence = ++current.sequence;
    const active = () =>
      current.mounted &&
      current.sequence === sequence &&
      currentKey.current === key;
    setLoading(true);
    setError("");
    try {
      const result = await fundingExceptionsApi.list(type, page);
      if (active()) {
        setItems(result.items);
        setHasMore(result.hasMore);
      }
    } catch {
      if (active()) {
        setError("예외 현황을 조회하지 못했습니다. 다시 조회해 주세요.");
        setItems([]);
        setHasMore(false);
      }
    } finally {
      if (active()) setLoading(false);
    }
  }, [type, page, key]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="space-y-4" aria-label="펀딩 입금·이행 확인 대상">
      <h2 className="font-semibold">입금·이행 확인 대상</h2>
      <p className="text-sm text-slate-600">
        현재 오프라인 기록을 기준으로 한 확인 목록입니다. 입금 대기는 연체
        판정이 아니며, 실제 송금·환불을 실행하지 않습니다. 기록을 수정한 뒤 다시
        조회해 해소 여부를 확인하세요.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          확인 유형{" "}
          <select
            aria-label="펀딩 확인 유형"
            value={type}
            onChange={(e) => {
              if (type === e.target.value && page === 1) return;
              scope.current.sequence++;
              setType(e.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded border px-2"
          >
            <option value="all">전체 확인 대상</option>
            {Object.entries(FUNDING_EXCEPTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className={button}
          disabled={loading}
          onClick={() => void load()}
        >
          확인 대상 다시 조회
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">확인 대상 조회 중...</p>
      ) : !error && !items.length ? (
        <p>해당 조건의 확인 대상이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.participantId}
              className="space-y-2 rounded-lg border p-4 text-sm"
            >
              <h3 className="break-words font-medium">
                {item.trialTitle} · {item.participantName}
              </h3>
              <p className="break-words text-amber-800">
                {item.types
                  .map((t) => FUNDING_EXCEPTION_LABELS[t] || t)
                  .join(" · ")}
              </p>
              <p>
                입금:{" "}
                {PAYMENT_STATUS_LABELS[item.paymentStatus as PaymentStatus] ||
                  "입금 전"}{" "}
                · 이행: {item.rewardStatus === "fulfilled" ? "완료" : "대기"}
              </p>
              <p>
                참여금 {money(item.contributionAmount)} · 확인 금액{" "}
                {money(item.paidAmount)}
              </p>
              <p className="text-xs text-slate-500">
                최근 기록 변경{" "}
                {new Date(item.updatedAt).toLocaleString("ko-KR")}
              </p>
              <Link
                className="inline-flex min-h-11 items-center text-blue-700 underline"
                to={`/operator/market-trial/${item.trialId}?participantId=${encodeURIComponent(item.participantId)}`}
              >
                대상 참여자 기록·이력 확인
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-3">
        <button
          className={button}
          disabled={loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          이전 확인 목록
        </button>
        <span className="self-center text-sm">{page} 페이지</span>
        <button
          className={button}
          disabled={loading || !!error || !hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          다음 확인 목록
        </button>
      </div>
    </section>
  );
}
