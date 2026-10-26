import type { Dispatch, SetStateAction, CSSProperties } from "react";
import type {
  ProductListEditorData,
  ProductListSelection,
} from "../api/tabletDisplays";
type Product =
  | ProductListEditorData["pool"]["supplierProducts"][number]
  | ProductListEditorData["pool"]["localProducts"][number];
export function ProductListEditorFields({
  selected,
  setSelected,
  q,
  setQ,
  pool,
  move,
  large,
  fs,
  btn,
}: {
  selected: ProductListSelection[];
  setSelected: Dispatch<SetStateAction<ProductListSelection[]>>;
  q: string;
  setQ: Dispatch<SetStateAction<string>>;
  pool: Product[];
  move: (index: number, direction: -1 | 1) => void;
  large: boolean;
  fs: number;
  btn: CSSProperties;
}) {
  return (
    <>
      <section>
        <h4 style={{ margin: "0 0 8px" }}>표시 상품 ({selected.length})</h4>
        {selected.length === 0 && (
          <div style={{ color: "#6b7280" }}>
            선택된 상품이 없습니다. 오른쪽에서 추가하세요.
          </div>
        )}
        <ol
          data-testid="quick-editor-selected"
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: large ? "48vh" : 320,
            overflowY: "auto",
          }}
        >
          {selected.map((s, i) => (
            <li
              key={`${s.productType}:${s.productId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "6px 8px",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {i + 1}. {s.name || s.productId}
                <span
                  style={{ marginLeft: 6, color: "#6b7280", fontSize: fs - 3 }}
                >
                  {s.productType === "local" ? "매장" : "공급"}
                </span>
              </span>
              <button
                type="button"
                style={btn}
                aria-label="위로"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ▲
              </button>
              <button
                type="button"
                style={btn}
                aria-label="아래로"
                disabled={i === selected.length - 1}
                onClick={() => move(i, 1)}
              >
                ▼
              </button>
              <button
                type="button"
                style={btn}
                aria-label="제거"
                onClick={() =>
                  setSelected((prev) => prev.filter((_, j) => j !== i))
                }
              >
                제거
              </button>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h4 style={{ margin: "0 0 8px" }}>매장 상품 추가</h4>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="상품명 검색"
          aria-label="상품명 검색"
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontSize: fs,
            padding: large ? 10 : 6,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            marginBottom: 8,
          }}
        />
        <ul
          data-testid="quick-editor-pool"
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: large ? "44vh" : 280,
            overflowY: "auto",
          }}
        >
          {pool.length === 0 && (
            <li style={{ color: "#6b7280" }}>추가할 상품이 없습니다.</li>
          )}
          {pool.map((p) => (
            <li
              key={`${p.productType}:${p.productId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "6px 8px",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
                <span
                  style={{ marginLeft: 6, color: "#6b7280", fontSize: fs - 3 }}
                >
                  {p.productType === "local" ? "매장" : "공급"}
                </span>
              </span>
              <button
                type="button"
                style={btn}
                onClick={() =>
                  setSelected((prev) => [
                    ...prev,
                    {
                      productType: p.productType,
                      productId: p.productId,
                      qrCodeId: null,
                      name: p.name,
                    },
                  ])
                }
              >
                추가
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
