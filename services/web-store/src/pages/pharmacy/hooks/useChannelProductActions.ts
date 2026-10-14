import { useEffect, useRef, useState } from "react";
import {
  activateChannelProduct,
  deactivateChannelProduct,
  bulkChannelProductAction,
  reorderChannelProducts,
  type ChannelProduct,
} from "../../../api/channelProducts";
import { useLatestStoreRequest } from "./useLatestStoreRequest";

type Action = "activate" | "deactivate" | "delete";
interface Confirmation {
  type: Action;
  ids: string[];
  isBulk: boolean;
  channelId: string;
}

/** Product mutations belong to the channel selected when the operation starts. */
export function useChannelProductActions({
  organizationId,
  channelId,
  activeProducts,
  refreshProducts,
  refreshOverview,
  showToast,
}: {
  organizationId: string;
  channelId?: string;
  activeProducts: ChannelProduct[];
  refreshProducts: (id: string) => Promise<void>;
  refreshOverview: () => Promise<void>;
  showToast: (type: "success" | "error", message: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<Confirmation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const scope = `${organizationId}:${channelId ?? ""}`;
  const busy = useRef(new Map<string, boolean>());
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const request = useLatestStoreRequest(`${organizationId}:${channelId ?? ""}`);
  useEffect(() => {
    setSelectedIds(new Set());
    setConfirmModal(null);
    setActionLoading(busy.current.has(scope) && !busy.current.get(scope));
    setReordering(busy.current.get(scope) === true);
  }, [scope]);

  const run = async (
    reorder: boolean,
    task: (isCurrent: () => boolean) => Promise<void>,
  ) => {
    if (!channelId || busy.current.has(scope)) return;
    const isCurrent = request.begin();
    busy.current.set(scope, reorder);
    if (reorder) setReordering(true);
    else setActionLoading(true);
    try {
      await task(isCurrent);
    } finally {
      busy.current.delete(scope);
      if (currentScope.current === scope) {
        setActionLoading(false);
        setReordering(false);
      }
    }
  };
  const refresh = async (id: string, isCurrent: () => boolean) => {
    if (!isCurrent()) return;
    await refreshProducts(id);
    if (isCurrent()) await refreshOverview();
  };
  const handleMoveProduct = async (id: string, direction: "up" | "down") => {
    if (!channelId) return;
    const index = activeProducts.findIndex((p) => p.id === id);
    const next = index + (direction === "up" ? -1 : 1);
    if (index < 0 || next < 0 || next >= activeProducts.length) return;
    const products = [...activeProducts];
    [products[index], products[next]] = [products[next], products[index]];
    await run(true, async (isCurrent) => {
      try {
        await reorderChannelProducts(
          channelId,
          products.map((p, displayOrder) => ({ id: p.id, displayOrder })),
        );
      } catch {
        if (isCurrent()) showToast("error", "순서 변경에 실패했습니다.");
      }
      if (isCurrent()) await refreshProducts(channelId);
    });
  };
  const handleSingleAction = async (type: Action, id: string) => {
    if (!channelId || busy.current.has(scope)) return;
    if (type === "delete") {
      setConfirmModal({ type, ids: [id], isBulk: false, channelId });
      return;
    }
    await run(false, async (isCurrent) => {
      try {
        await (
          type === "activate"
            ? activateChannelProduct
            : deactivateChannelProduct
        )(channelId, id);
        if (!isCurrent()) return;
        showToast(
          "success",
          type === "activate"
            ? "제품이 활성화되었습니다."
            : "제품이 비활성화되었습니다.",
        );
        await refresh(channelId, isCurrent);
        if (isCurrent())
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
      } catch {
        if (isCurrent())
          showToast(
            "error",
            type === "activate"
              ? "활성화에 실패했습니다."
              : "비활성화에 실패했습니다.",
          );
      }
    });
  };
  const handleBulkAction = (type: Action) => {
    if (channelId && selectedIds.size && !busy.current.has(scope))
      setConfirmModal({
        type,
        ids: Array.from(selectedIds),
        isBulk: true,
        channelId,
      });
  };
  const handleConfirmAction = async () => {
    const confirmation = confirmModal;
    if (!confirmation || confirmation.channelId !== channelId) return;
    await run(false, async (isCurrent) => {
      try {
        const result = await bulkChannelProductAction(
          confirmation.channelId,
          confirmation.type,
          confirmation.ids,
        );
        if (!isCurrent()) return;
        const labels = {
          delete: "삭제",
          deactivate: "비활성화",
          activate: "활성화",
        };
        if (result.requested === result.processed)
          showToast(
            "success",
            `${result.processed}개 제품이 ${labels[confirmation.type]}되었습니다.`,
          );
        else
          showToast(
            "error",
            `${result.requested}개 중 ${result.processed}개 처리 완료 (일부 실패)`,
          );
        await refresh(confirmation.channelId, isCurrent);
        if (isCurrent())
          setSelectedIds((prev) => {
            const next = new Set(prev);
            confirmation.ids.forEach((id) => next.delete(id));
            return next;
          });
      } catch {
        if (isCurrent()) showToast("error", "작업에 실패했습니다.");
      } finally {
        if (isCurrent()) setConfirmModal(null);
      }
    });
  };
  return {
    selectedIds,
    setSelectedIds,
    confirmModal,
    setConfirmModal,
    actionLoading,
    reordering,
    handleMoveProduct,
    handleSingleAction,
    handleBulkAction,
    handleConfirmAction,
  };
}
