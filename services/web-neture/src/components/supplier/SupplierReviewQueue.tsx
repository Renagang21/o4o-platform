import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  supplierReviewApi,
  SUPPLIER_REVIEW_LABELS,
  type SupplierReviewQueueItem,
} from "../../lib/api/supplierReview";
import SupplierReviewRequestsPanel from "./SupplierReviewRequestsPanel";
export default function SupplierReviewQueue({
  disabled,
  onBusyChange,
}: {
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [state, setState] = useState("submitted");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SupplierReviewQueueItem[]>([]);
  const [selected, setSelected] = useState<SupplierReviewQueueItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const scope = useRef({ mounted: false, seq: 0, writing: false });
  useLayoutEffect(() => {
    const current = { mounted: true, seq: 0, writing: false };
    scope.current = current;
    return () => {
      current.mounted = false;
      current.seq++;
    };
  }, []);
  const key = `${state}:${page}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const load = useCallback(async () => {
    const current = scope.current;
    const seq = ++current.seq;
    const active = () =>
      current.mounted && seq === current.seq && key === currentKey.current;
    setLoading(true);
    setError("");
    try {
      const result = await supplierReviewApi.queue(state, page);
      if (!Array.isArray(result.items)) throw new Error("Invalid queue");
      if (active()) {
        setItems(result.items);
        setMore(result.hasMore);
      }
    } catch {
      if (active()) setError("보완 요청 목록을 조회하지 못했습니다.");
    } finally {
      if (active()) setLoading(false);
    }
  }, [state, page, key]);
  useEffect(() => {
    void load();
  }, [load]);
  const busyChanged = useCallback(
    (value: boolean) => {
      scope.current.writing = value;
      onBusyChange(value);
    },
    [onBusyChange],
  );
  return (
    <section
      className="space-y-3 rounded-lg border p-4"
      aria-label="공급자 보완 요청 대기 목록"
    >
      <h2 className="font-semibold">보완 요청 대기 목록</h2>
      <p className="text-xs text-slate-500">
        제출된 보완 내용을 찾고 검토합니다. 기본정보·서류는 아래 공급자 목록의
        상세에서 함께 확인해 주세요.
      </p>
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="보완 요청 상태"
          disabled={disabled || loading}
          value={state}
          className="min-h-11 rounded border px-2"
          onChange={(e) => {
            if (scope.current.writing) return;
            setState(e.target.value);
            setPage(1);
            setSelected(null);
          }}
        >
          <option value="submitted">보완 제출 · 검토 대기</option>
          <option value="requested">공급자 보완 대기</option>
          <option value="resolved">검토 완료</option>
        </select>
        <button
          className="min-h-11 rounded border px-3 text-sm"
          disabled={disabled || loading}
          onClick={() => void load()}
        >
          보완 대기 목록 다시 조회
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">보완 대기 목록 조회 중...</p>
      ) : (
        !error && (
          <ul className="space-y-2">
            {!items.length && (
              <li className="text-sm">해당 상태의 보완 요청이 없습니다.</li>
            )}
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
              >
                <span className="min-w-0 break-words">
                  {item.supplier_name} ·{" "}
                  {item.items
                    .map((i) => SUPPLIER_REVIEW_LABELS[i] || i)
                    .join(" · ")}
                </span>
                <button
                  disabled={disabled}
                  className="min-h-11 text-blue-700 underline"
                  onClick={() => {
                    if (!scope.current.writing) setSelected(item);
                  }}
                >
                  요청 상세 확인
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      <div className="flex gap-3 text-sm">
        <button
          disabled={disabled || loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          이전 보완 목록
        </button>
        <span>{page} 페이지</span>
        <button
          disabled={disabled || loading || !!error || !more}
          onClick={() => setPage((p) => p + 1)}
        >
          다음 보완 목록
        </button>
      </div>
      {selected && (
        <div>
          <div className="flex justify-between gap-3">
            <strong className="break-words">{selected.supplier_name}</strong>
            <button
              disabled={disabled}
              onClick={() => {
                if (!scope.current.writing) setSelected(null);
              }}
            >
              요청 상세 닫기
            </button>
          </div>
          <SupplierReviewRequestsPanel
            key={selected.supplier_id}
            supplierId={selected.supplier_id}
            operator
            disabled={disabled}
            onBusyChange={busyChanged}
            onSaved={load}
          />
        </div>
      )}
    </section>
  );
}
