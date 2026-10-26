import { ProductListEditorFields } from "@o4o/store-ui-core/presentation/ProductListEditorFields";
/**
 * TabletProductListQuickEditor — 빠른 상품 수정(추가 / 제거 / 순서)
 *
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
 *
 * 콘텐츠(Screen Set)의 product_list block 선택 목록만 다룬다. 새 상품 저장 형식을 만들지 않고
 * canonical config(`{ source:'selected_products', products:[{productType, productId, qrCodeId}] }`) 를 그대로 사용한다.
 * 경영자 PC 화면(콘텐츠 목록 [상품 수정])과 태블릿 직원 화면([상품 수정]) 이 같은 컴포넌트를 쓰며,
 * 조회/저장 함수만 주입한다(경영자=/screen-sets/:id/product-list · 직원=/tablet-runtime/screen-sets/:id/product-list).
 */
import { useEffect, useMemo, useState, useRef } from "react";
import { useLatestStoreRequest } from "../pharmacy/hooks/useLatestStoreRequest";
import type {
  ProductListEditorData,
  ProductListSelection,
} from "../../api/tabletDisplays";

export interface TabletProductListQuickEditorProps {
  load: () => Promise<ProductListEditorData>;
  save: (
    products: Array<{
      productType: "supplier" | "local";
      productId: string;
      qrCodeId?: string | null;
    }>,
  ) => Promise<void>;
  onSaved?: () => void;
  onClose: () => void;
  /** 태블릿(터치) 문맥이면 버튼/글자를 키운다 */
  large?: boolean;
  isCurrent?: () => boolean;
}

const alwaysCurrent = () => true;

export function TabletProductListQuickEditor({
  load,
  save,
  onSaved,
  onClose,
  large = false,
  isCurrent = alwaysCurrent,
}: Readonly<TabletProductListQuickEditorProps>) {
  const reads = useLatestStoreRequest();
  const writes = useLatestStoreRequest();
  const owner = useRef(load);
  owner.current = load;
  const ready = useRef<typeof load | null>(null);
  const writing = useRef(false);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<ProductListEditorData | null>(null);
  const [selected, setSelected] = useState<ProductListSelection[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = reads.begin();
    writing.current = false;
    setSaving(false);
    setQ("");
    ready.current = null;
    setLoading(true);
    setError(null);
    setData(null);
    setSelected([]);
    load()
      .then((value) => {
        if (!current() || owner.current !== load || !isCurrent()) return;
        if (
          !Array.isArray(value?.selected) ||
          !Array.isArray(value.pool?.supplierProducts) ||
          !Array.isArray(value.pool?.localProducts)
        )
          throw new Error("Invalid product list");
        ready.current = load;
        setData(value);
        setSelected(value.selected);
      })
      .catch(() => {
        if (current() && owner.current === load && isCurrent())
          setError("상품 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
      })
      .finally(() => {
        if (current() && owner.current === load && isCurrent())
          setLoading(false);
      });
    return () => {
      reads.cancel();
      writes.cancel();
    };
  }, [load, retry, reads, writes, isCurrent]);

  const pool = useMemo(() => {
    if (!data) return [];
    const all = [...data.pool.supplierProducts, ...data.pool.localProducts];
    const chosen = new Set(
      selected.map((s) => `${s.productType}:${s.productId}`),
    );
    const kw = q.trim().toLowerCase();
    return all.filter(
      (p) =>
        !chosen.has(`${p.productType}:${p.productId}`) &&
        (!kw || p.name.toLowerCase().includes(kw)),
    );
  }, [data, selected, q]);

  const move = (idx: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (
      writing.current ||
      loading ||
      !data ||
      ready.current !== load ||
      !isCurrent()
    )
      return;
    const current = writes.begin();
    writing.current = true;
    setSaving(true);
    setError(null);
    try {
      await save(
        selected.map((s) => ({
          productType: s.productType,
          productId: s.productId,
          qrCodeId: s.qrCodeId ?? null,
        })),
      );
      if (!current() || owner.current !== load || !isCurrent()) return;
      onSaved?.();
      onClose();
    } catch {
      if (current() && owner.current === load && isCurrent())
        setError(
          "상품 저장에 실패했습니다. 선택과 순서를 유지했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (current() && owner.current === load && isCurrent()) {
        writing.current = false;
        setSaving(false);
      }
    }
  };
  const close = () => {
    if (!writing.current) onClose();
  };

  const fs = large ? 18 : 14;
  const btn: React.CSSProperties = {
    fontSize: fs,
    padding: large ? "10px 14px" : "6px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
  };
  const primary: React.CSSProperties = {
    ...btn,
    background: "#2563eb",
    color: "#fff",
    border: "1px solid #2563eb",
  };

  return (
    <div
      role="dialog"
      aria-label="빠른 상품 수정"
      data-testid="product-quick-editor"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontSize: fs,
        color: "#111827",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: fs + 2 }}>
          빠른 상품 수정{data ? ` — ${data.screenSetName}` : ""}
        </strong>
        <button type="button" style={btn} onClick={close} disabled={saving}>
          닫기
        </button>
      </div>
      {error && (
        <div role="alert" style={{ color: "#b91c1c" }}>
          {error}
          {!data && (
            <button type="button" onClick={() => setRetry((v) => v + 1)}>
              다시 시도
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div>불러오는 중…</div>
      ) : data ? (
        <fieldset
          disabled={saving}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2"
            style={{ display: "grid", gap: 16 }}
          >
            <ProductListEditorFields
              {...{
                selected,
                setSelected,
                q,
                setQ,
                pool,
                move,
                large,
                fs,
                btn,
              }}
            />
          </div>
        </fieldset>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" style={btn} onClick={close} disabled={saving}>
          취소
        </button>
        <button
          type="button"
          style={primary}
          onClick={handleSave}
          disabled={saving || loading || !data}
          data-testid="quick-editor-save"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

export default TabletProductListQuickEditor;
