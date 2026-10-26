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
import { useEffect, useMemo, useState } from "react";
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
}

export function TabletProductListQuickEditor({
  load,
  save,
  onSaved,
  onClose,
  large = false,
}: TabletProductListQuickEditorProps) {
  const [data, setData] = useState<ProductListEditorData | null>(null);
  const [selected, setSelected] = useState<ProductListSelection[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setSelected(d.selected ?? []);
      })
      .catch((e: any) => {
        if (!cancelled)
          setError(e?.message || "상품 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

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
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
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
        <button type="button" style={btn} onClick={onClose}>
          닫기
        </button>
      </div>
      {error && (
        <div role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </div>
      )}
      {loading ? (
        <div>불러오는 중…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 16,
          }}
        >
          <ProductListEditorFields
            {...{ selected, setSelected, q, setQ, pool, move, large, fs, btn }}
          />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" style={btn} onClick={onClose} disabled={saving}>
          취소
        </button>
        <button
          type="button"
          style={primary}
          onClick={handleSave}
          disabled={saving || loading}
          data-testid="quick-editor-save"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

export default TabletProductListQuickEditor;
