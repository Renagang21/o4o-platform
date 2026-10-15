import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@o4o/error-handling";
import { storeCartApi } from "../../../api/storeCart";
import { getActiveStoreOrganizationId } from "../../../lib/storeOrganizationHeader";
import { getActiveServiceKey } from "../../../lib/serviceContext";
import {
  buildWorktableCartPayload,
  isValidCartQuantity,
} from "../../../utils/worktableCart";
import { consumeWorktablePreselection } from "../../../utils/worktablePreselection";
import {
  loadWorktableProducts,
  type WorktableProduct,
} from "../worktable/worktableProducts";
import { useLatestStoreRequest } from "./useLatestStoreRequest";

export interface WorktableCartTarget {
  product: WorktableProduct;
  quantity: number;
  revision: number;
}
export interface WorktableConfirmation {
  targets: WorktableCartTarget[];
  draftRevision: number;
}

/** One owner for complete authority reads, quantities, confirmation and cart writes. */
export function useOrderWorktable(
  organizationId: string | null,
  serviceKey: string,
  onAdded: () => void,
) {
  const scope = `${organizationId ?? ""}:${serviceKey}`;
  const listRequest = useLatestStoreRequest(scope);
  const writeRequest = useLatestStoreRequest(scope);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const onAddedRef = useRef(onAdded);
  onAddedRef.current = onAdded;
  const busy = useRef(new Set<string>());
  const quantityRevisions = useRef(new Map<string, number>());
  const draftRevision = useRef(0);
  const [products, setProducts] = useState<WorktableProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmation, setConfirmation] =
    useState<WorktableConfirmation | null>(null);
  const confirmationRef = useRef(confirmation);
  const changeConfirmation = (value: WorktableConfirmation | null) => {
    confirmationRef.current = value;
    setConfirmation(value);
  };
  const hasContext = useCallback(
    () =>
      !!organizationId &&
      currentScope.current === scope &&
      getActiveStoreOrganizationId() === organizationId &&
      getActiveServiceKey() === serviceKey,
    [organizationId, scope, serviceKey],
  );

  const loadData = useCallback(async () => {
    if (!hasContext()) {
      setProducts([]);
      setLoading(false);
      setError("매장을 선택한 뒤 다시 시도해 주세요.");
      return;
    }
    const isLatest = listRequest.begin();
    const isCurrent = () => isLatest() && hasContext();
    setLoading(true);
    setError(null);
    setProducts([]);
    confirmationRef.current = null;
    setConfirmation(null);
    try {
      const rows = await loadWorktableProducts(isCurrent);
      if (!isCurrent()) return;
      setProducts(rows);
      const preselect = consumeWorktablePreselection(
        organizationId!,
        serviceKey,
      );
      const allowed = new Set(
        rows
          .filter((row) => row.orderability === "ORDERABLE")
          .map((row) => row.id),
      );
      const selected = Object.entries(preselect).filter(([id]) =>
        allowed.has(id),
      );
      if (selected.length) {
        for (const [id] of selected)
          quantityRevisions.current.set(id, ++draftRevision.current);
        toast.success(
          `카탈로그에서 선택한 ${selected.length}건의 상품이 작업대에 추가되었습니다.`,
        );
      }
      setQuantities((current) => {
        const next = Object.fromEntries(
          Object.entries(current).filter(
            ([id, quantity]) =>
              allowed.has(id) && isValidCartQuantity(quantity),
          ),
        );
        for (const [id, quantity] of selected) {
          const total = (next[id] ?? 0) + quantity;
          if (Number.isSafeInteger(total)) next[id] = total;
        }
        return next;
      });
    } catch {
      if (isCurrent())
        setError(
          "전체 상품 목록을 확인하지 못했습니다. 네트워크와 공급 정보를 확인한 뒤 다시 시도해 주세요.",
        );
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [hasContext, listRequest, organizationId, serviceKey]);

  useEffect(() => {
    setProducts([]);
    setQuantities({});
    setOrderError(null);
    setError(null);
    confirmationRef.current = null;
    setConfirmation(null);
    quantityRevisions.current.clear();
    draftRevision.current++;
    setAdding(busy.current.has(scope));
    void loadData();
  }, [scope, loadData]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    quantityRevisions.current.set(id, ++draftRevision.current);
    const normalized =
      Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
    setQuantities((current) => ({ ...current, [id]: normalized }));
  }, []);
  const resetQuantity = useCallback((id: string) => {
    quantityRevisions.current.set(id, ++draftRevision.current);
    setQuantities((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const resetAllQuantities = useCallback(() => {
    for (const id of quantityRevisions.current.keys())
      quantityRevisions.current.set(id, ++draftRevision.current);
    draftRevision.current++;
    setQuantities({});
  }, []);
  const setShowConfirmModal = (open: boolean) => {
    if (!open) {
      changeConfirmation(null);
      return;
    }
    if (loading || error || !hasContext()) return;
    const targets = products
      .filter(
        (product) =>
          product.orderability === "ORDERABLE" &&
          isValidCartQuantity(quantities[product.id]),
      )
      .map((product) => ({
        product,
        quantity: quantities[product.id],
        revision: quantityRevisions.current.get(product.id) ?? 0,
      }));
    if (targets.length) {
      setOrderError(null);
      changeConfirmation({ targets, draftRevision: draftRevision.current });
    }
  };

  const addSelectionToCart = async () => {
    const submitted = confirmationRef.current;
    if (
      !submitted ||
      !submitted.targets.length ||
      !hasContext() ||
      loading ||
      error ||
      busy.current.has(scope)
    )
      return;
    const isLatest = writeRequest.begin();
    const isCurrent = () => isLatest() && hasContext();
    busy.current.add(scope);
    setAdding(true);
    setOrderError(null);
    const succeeded = new Set<string>(),
      failed: WorktableCartTarget[] = [];
    try {
      const current = await storeCartApi.list(serviceKey);
      if (!isCurrent()) return;
      if (current.success !== true || !Array.isArray(current.data?.items))
        throw new Error("Unconfirmed cart");
      if (
        current.data.items.some((item) => item.sourceType === "event_offer")
      ) {
        if (confirmationRef.current === submitted)
          setOrderError(
            "장바구니에 이벤트 상품이 담겨 있습니다. 이벤트 주문을 먼저 완료하거나 비운 뒤에 B2B 발주를 담아주세요.",
          );
        return;
      }
      for (const target of submitted.targets) {
        if (!isCurrent()) return;
        try {
          const response = await storeCartApi.addItem(
            serviceKey,
            buildWorktableCartPayload(target.product, target.quantity),
          );
          if (response.success !== true) throw new Error("Cart item not added");
          succeeded.add(target.product.id);
        } catch {
          failed.push(target);
        }
      }
      if (!isCurrent()) return;
      if (succeeded.size) {
        toast.success(`${succeeded.size}건을 장바구니에 담았습니다.`);
        setQuantities((current) => {
          const next = { ...current };
          for (const target of submitted.targets) {
            if (
              succeeded.has(target.product.id) &&
              quantityRevisions.current.get(target.product.id) ===
                target.revision
            )
              delete next[target.product.id];
          }
          return next;
        });
      }
      if (confirmationRef.current !== submitted) {
        const next = confirmationRef.current;
        if (next) {
          const remaining = next.targets.filter(
            (target) =>
              !submitted.targets.some(
                (previous) =>
                  succeeded.has(previous.product.id) &&
                  previous.product.id === target.product.id &&
                  previous.revision === target.revision,
              ),
          );
          if (remaining.length !== next.targets.length)
            changeConfirmation(
              remaining.length ? { ...next, targets: remaining } : null,
            );
        }
        return;
      }
      if (failed.length) {
        changeConfirmation({ ...submitted, targets: failed });
        setOrderError(
          `${failed.length}건을 담지 못했습니다: ${failed.map((target) => target.product.productName).join(", ")}. 실패한 상품만 다시 시도해 주세요.`,
        );
      } else {
        changeConfirmation(null);
        if (submitted.draftRevision === draftRevision.current)
          onAddedRef.current();
      }
    } catch {
      if (isCurrent() && confirmationRef.current === submitted)
        setOrderError("장바구니를 확인하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      busy.current.delete(scope);
      if (currentScope.current === scope) setAdding(false);
    }
  };
  return {
    products,
    quantities,
    loading,
    error,
    loadData,
    updateQuantity,
    resetQuantity,
    resetAllQuantities,
    confirmation,
    showConfirmModal: confirmation !== null,
    setShowConfirmModal,
    orderError,
    adding,
    addSelectionToCart,
  };
}
