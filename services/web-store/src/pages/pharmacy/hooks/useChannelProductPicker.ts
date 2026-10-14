import { useEffect, useRef, useState } from "react";
import {
  addProductToChannel,
  fetchAvailableProducts,
  type AvailableProduct,
} from "../../../api/channelProducts";
import { useLatestStoreRequest } from "./useLatestStoreRequest";

/** Closing the picker cancels its view, but a successful write still refreshes its channel. */
export function useChannelProductPicker(
  open: boolean,
  organizationId: string,
  channelId: string,
  onAdded: () => void,
  onError?: (message: string) => void,
) {
  const scope = `${organizationId}:${channelId}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const callbacks = useRef({ onAdded, onError });
  callbacks.current = { onAdded, onError };
  const busy = useRef(new Map<string, string>());
  const listRequest = useLatestStoreRequest(`${scope}:${open}`);
  const writeRequest = useLatestStoreRequest(scope);
  const viewRequest = useLatestStoreRequest(`${scope}:${open}`);
  const [available, setAvailable] = useState<AvailableProduct[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setAvailable([]);
    setLoadError(null);
    setAddingId(busy.current.get(scope) ?? null);
    if (!open || !channelId) {
      setLoadingList(false);
      return;
    }
    const isCurrent = listRequest.begin();
    setLoadingList(true);
    fetchAvailableProducts(channelId)
      .then((items) => {
        if (isCurrent()) setAvailable(items);
      })
      .catch(() => {
        if (isCurrent())
          setLoadError("추가 가능한 제품을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isCurrent()) setLoadingList(false);
      });
  }, [open, channelId, scope, listRequest, retry]);
  const add = async (productListingId: string) => {
    if (!open || !channelId || busy.current.has(scope)) return;
    const isCurrent = writeRequest.begin();
    const isCurrentView = viewRequest.begin();
    busy.current.set(scope, productListingId);
    setAddingId(productListingId);
    try {
      await addProductToChannel(channelId, productListingId);
      if (!isCurrent()) return;
      callbacks.current.onAdded();
      if (isCurrentView())
        setAvailable((prev) => prev.filter((p) => p.id !== productListingId));
      setRetry((value) => value + 1);
    } catch {
      if (isCurrent()) callbacks.current.onError?.("제품 추가에 실패했습니다.");
    } finally {
      busy.current.delete(scope);
      if (currentScope.current === scope) setAddingId(null);
    }
  };
  return {
    available,
    loadingList,
    loadError,
    addingId,
    add,
    retry: () => setRetry((value) => value + 1),
  };
}
