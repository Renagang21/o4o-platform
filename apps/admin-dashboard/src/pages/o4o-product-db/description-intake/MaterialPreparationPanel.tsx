import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ActionBar, BaseTable, type O4OColumn } from "@o4o/ui";
import {
  materialPreparationApi as api,
  type MaterialPreparationPage,
  type MaterialPreparationRow,
} from "@/api/product-material-preparation.api";

const columns: O4OColumn<MaterialPreparationRow>[] = [
  { key: "_select", header: "", width: 44 },
  {
    key: "name",
    header: "공통 상품",
    render: (_, row) => (
      <Link
        className="underline"
        to={`/admin/o4o-product-db/masters/${row.id}`}
      >
        {row.name}
        <small className="block">
          {row.barcode} · {row.manufacturer} · {row.specification}
        </small>
      </Link>
    ),
  },
  { key: "storeCount", header: "취급 매장 수" },
  {
    key: "consultation",
    header: "상품 상담자료",
    render: (value) =>
      ({
        structured: "준비됨",
        unclassified: "미분류·검토 필요",
        missing: "미확보·원천 확인 필요",
      })[value as string],
  },
  {
    key: "standardDescription",
    header: "QR 표준설명서",
    render: (value) => (value === "ready" ? "준비됨" : "미확보"),
  },
];
export default function MaterialPreparationPanel() {
  const [language, setLanguage] = useState("ko"),
    [search, setSearch] = useState(""),
    [state, setState] = useState("needs_preparation");
  const [draftSearch, setDraftSearch] = useState("");
  const [history, setHistory] = useState<string[]>([]),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<MaterialPreparationPage | null>(null),
    [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [requestText, setRequestText] = useState("");
  const generation = useRef(0),
    lock = useRef(false);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const cursor = history.at(-1);
  const tableColumns = useMemo(
    () => [
      {
        ...columns[0],
        render: (_: unknown, row: MaterialPreparationRow) => (
          <input
            type="checkbox"
            aria-label={`${row.name} 선택`}
            disabled={busy}
            checked={selected.has(row.id)}
            onChange={() => {
              setSelected((previous) => {
                const next = new Set(previous);
                if (next.has(row.id)) next.delete(row.id);
                else next.add(row.id);
                return next;
              });
              setRequestText("");
            }}
          />
        ),
      },
      ...columns.slice(1),
    ],
    [busy, selected],
  );
  useEffect(() => {
    const token = ++generation.current;
    setData(null);
    setSelected(new Set());
    setRequestText("");
    setError("");
    setBusy(true);
    void api
      .list({ language, search, state, ...(cursor ? { cursor } : {}) })
      .then((result) => {
        if (token !== generation.current) return;
        if (result.language !== language || !Array.isArray(result.items))
          throw new Error("Mismatched scope");
        setData(result);
      })
      .catch(() => {
        if (token === generation.current)
          setError(
            "공통 자료 준비 현황을 조회하지 못했습니다. 다시 확인하세요.",
          );
      })
      .finally(() => {
        if (token === generation.current) setBusy(false);
      });
    return invalidate;
  }, [language, search, state, cursor, revision, invalidate]);
  const change = (fn: () => void) => {
    if (busy || lock.current) return;
    generation.current++;
    setSelected(new Set());
    setRequestText("");
    setHistory([]);
    fn();
  };
  const request = async (purpose: "CONSULTATION" | "STORE") => {
    if (busy || lock.current || !selected.size) return;
    const token = generation.current;
    lock.current = true;
    setBusy(true);
    setError("");
    setRequestText("");
    try {
      const result = await api.request({
        ids: [...selected],
        language,
        purpose,
      });
      if (token === generation.current) setRequestText(result.requestText);
    } catch {
      if (token === generation.current)
        setError(
          "대상 상품이 변경되었거나 요청문을 준비하지 못했습니다. 현황을 새로 조회하세요.",
        );
    } finally {
      lock.current = false;
      if (token === generation.current) setBusy(false);
    }
  };
  return (
    <section
      className="space-y-3 rounded border p-4"
      aria-label="공통 자료 준비 현황"
    >
      <h3 className="font-semibold">공통 상품 상담자료·QR 표준설명서 준비</h3>
      <Link className="underline" to="/admin/o4o-product-db/maintenance">정기 점검 기준·일정 관리</Link>
      <p>
        여러 매장이 취급하는 상품을 한 번씩 모아 확인합니다. 기존 공통 자료를
        먼저 재사용하고 미확보·변경 자료를 별도로 접수·승인하세요. 정기 점검
        기준에서도 같은 공통 상품을 대상으로 검토할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-3">
        <label>
          자료 언어
          <select
            disabled={busy}
            value={language}
            onChange={(e) => change(() => setLanguage(e.target.value))}
          >
            {["ko", "en", "ja", "zh"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          준비 상태
          <select
            disabled={busy}
            value={state}
            onChange={(e) => change(() => setState(e.target.value))}
          >
            <option value="needs_preparation">준비·검토 필요</option>
            <option value="all">전체 취급 상품</option>
          </select>
        </label>
        <label>
          상품명·바코드
          <input
            disabled={busy}
            value={draftSearch}
            onChange={(e) => {
              setDraftSearch(e.target.value);
              setSelected(new Set());
              setRequestText("");
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            change(() => {
              setSearch(draftSearch.trim());
              setRevision((v) => v + 1);
            })
          }
        >
          상품 검색
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => change(() => setRevision((v) => v + 1))}
        >
          자료 현황 새로 조회
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {selected.size > 0 && (
        <ActionBar
          selectedCount={selected.size}
          onClearSelection={() => !busy && setSelected(new Set())}
          actions={[
            {
              key: "consultation",
              label: "상담자료 조사 요청문 받기",
              disabled: busy,
              onClick: () => request("CONSULTATION"),
            },
            {
              key: "qr",
              label: "QR 설명서 조사 요청문 받기",
              disabled: busy,
              onClick: () => request("STORE"),
            },
          ]}
        />
      )}
      <div className="overflow-x-auto">
        <BaseTable
          columns={tableColumns}
          data={data?.items ?? []}
          rowKey={(row) => row.id}
          selectable
          selectedKeys={selected}
          onSelectionChange={(keys) => {
            if (!busy) {
              setSelected(keys);
              setRequestText("");
            }
          }}
          tableId="common-product-material-preparation"
          emptyMessage={
            error && !data ? '현황 조회 실패 · 새로 조회해 주세요.' : busy
              ? "자료 현황 확인 중…"
              : data?.nextCursor
                ? "이 조회 범위에는 준비 대상이 없습니다. 다음 범위를 확인하세요."
                : "현재 조건에서 확인할 준비 대상이 없습니다."
          }
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || !history.length}
          onClick={() => {
            setSelected(new Set());
            setRequestText("");
            setHistory((v) => v.slice(0, -1));
          }}
        >
          이전 범위
        </button>
        <span>{data ? `현재 조회 ${data.items.length}개` : busy ? '확인 중' : '자료 현황 확인 필요'}</span>
        <button
          type="button"
          disabled={busy || !data?.nextCursor}
          onClick={() => {
            setSelected(new Set());
            setRequestText("");
            setHistory((v) => [...v, data!.nextCursor!]);
          }}
        >
          다음 범위
        </button>
      </div>
      {requestText && (
        <label className="block">
          외부 AI에서 사용할 조사 요청문
          <textarea
            className="min-h-48 w-full rounded border p-3"
            readOnly
            value={requestText}
          />
        </label>
      )}
    </section>
  );
}
