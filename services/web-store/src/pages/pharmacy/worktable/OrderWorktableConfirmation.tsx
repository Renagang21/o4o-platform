import { useLayoutEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { WorktableConfirmation } from "../hooks/useOrderWorktable";

interface Props {
  confirmation: WorktableConfirmation;
  adding: boolean;
  error: string | null;
  onClose: () => void;
  onAdd: () => void;
  onViewCart: () => void;
}

/** Confirmation renders the captured selection, including only failed targets on retry. */
export function OrderWorktableConfirmation({
  confirmation,
  adding,
  error,
  onClose,
  onAdd,
  onViewCart,
}: Readonly<Props>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (typeof dialog.close === "function") dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, []);
  const suppliers = new Map<string, typeof confirmation.targets>();
  for (const target of confirmation.targets) {
    const group = suppliers.get(target.product.supplierId) ?? [];
    group.push(target);
    suppliers.set(target.product.supplierId, group);
  }
  const total = confirmation.targets.reduce(
    (sum, target) => sum + (target.product.basePrice ?? 0) * target.quantity,
    0,
  );
  const price = (value: number) => `${value.toLocaleString("ko-KR")}원`;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="worktable-confirm-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90vh] rounded-2xl border-0 p-5 backdrop:bg-slate-900/50"
    >
      <h3
        id="worktable-confirm-title"
        className="text-lg font-bold text-slate-800"
      >
        B2B 장바구니 담기 확인
      </h3>
      <p className="my-3 text-sm text-slate-600">
        공급사 {suppliers.size}곳의 {confirmation.targets.length}품목을 내
        장바구니에 담습니다. 실제 주문 확정은 장바구니에서 진행합니다.
      </p>
      <div className="space-y-3">
        {[...suppliers].map(([id, targets]) => (
          <section key={id} className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 font-semibold break-words">
              {targets[0].product.supplierName}
            </h4>
            {targets.map((target) => (
              <div
                key={target.product.id}
                className="flex flex-wrap gap-x-3 gap-y-1 text-sm"
                data-testid={`confirm-offer-${target.product.id}`}
              >
                <span className="min-w-0 flex-1 break-words">
                  {target.product.productName}
                </span>
                <span>{target.quantity}개</span>
                <span>
                  {price((target.product.basePrice ?? 0) * target.quantity)}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
      <p className="my-3 flex flex-wrap justify-between gap-2 font-semibold">
        참고 금액 <span>{price(total)}</span>
      </p>
      <p className="text-xs text-slate-500">
        표시 금액은 참고용입니다. 확정 금액은 주문 시 서버가 공급가 기준으로
        재산정합니다.
      </p>
      {error && (
        <p role="alert" className="my-3 text-sm text-red-700 break-words">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          닫기
        </button>
        <button
          type="button"
          onClick={onViewCart}
          disabled={adding}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          장바구니 보기
        </button>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding || !confirmation.targets.length}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {adding && <Loader2 className="h-4 w-4 animate-spin" />}
          {adding
            ? "담는 중…"
            : `장바구니에 담기 (${confirmation.targets.length}품목)`}
        </button>
      </div>
    </dialog>
  );
}
