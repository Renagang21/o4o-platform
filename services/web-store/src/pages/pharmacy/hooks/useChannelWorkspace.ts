import { useState, useEffect, useCallback } from "react";
import { useLatestStoreRequest } from "./useLatestStoreRequest";
import { loadChannelWorkspace } from "./storeWorkspaceLoaders";
import type { ChannelOverview } from "../../../api/storeHub";
import {
  fetchChannelProducts,
  fetchAvailableProducts,
  type ChannelProduct,
  type AvailableProduct,
} from "../../../api/channelProducts";
import type { StoreAssetItem } from "../../../api/assetSnapshot";

/** Overview and product requests have independent revisions and failure states. */
export function useChannelWorkspace(
  showSettings: boolean,
  showToast: (type: "success" | "error", message: string) => void,
  organizationId = "",
) {
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [assets, setAssets] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [channelProducts, setChannelProducts] = useState<ChannelProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<
    AvailableProduct[]
  >([]);
  const [productLoading, setProductLoading] = useState(false);

  const [orgCode, setOrgCode] = useState<string | null>(null);
  // WO-O4O-STORE-SLUG-EDITABLE-V1: slug change capability flag
  const [canChangeSlug, setCanChangeSlug] = useState(false);

  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const overviewRequest = useLatestStoreRequest(
    `${organizationId}:${showSettings}`,
  );
  const productRequest = useLatestStoreRequest(organizationId);
  const fetchData = useCallback(async () => {
    const isCurrent = overviewRequest.begin();
    setLoading(true);
    setLoadError(null);
    try {
      const {
        overview,
        assets: loadedAssets,
        slug,
      } = await loadChannelWorkspace(showSettings);
      if (!isCurrent()) return;
      setChannels(overview.channels);
      setOrgCode(overview.organizationCode);
      if (loadedAssets) setAssets(loadedAssets);
      if (slug) setCanChangeSlug(slug.canChange);
      setLastFetched(new Date());
    } catch {
      if (!isCurrent()) return;
      setLoadError("채널 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
      showToast("error", "채널 정보를 불러오지 못했습니다.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [showToast, showSettings, overviewRequest]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadChannelProducts = useCallback(
    async (channelId: string) => {
      const isCurrent = productRequest.begin();
      setProductLoading(true);
      setProductError(null);
      try {
        const [products, available] = await Promise.all([
          fetchChannelProducts(channelId),
          fetchAvailableProducts(channelId),
        ]);
        if (!isCurrent()) return;
        setChannelProducts(products);
        setAvailableProducts(available);
      } catch {
        if (!isCurrent()) return;
        setProductError("제품 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
        showToast("error", "제품 목록을 불러오지 못했습니다.");
      } finally {
        if (isCurrent()) setProductLoading(false);
      }
    },
    [showToast, productRequest],
  );

  const cancelChannelProducts = useCallback(() => {
    productRequest.cancel();
    setProductLoading(false);
    setProductError(null);
  }, [productRequest]);
  return {
    cancelChannelProducts,
    channels,
    setChannels,
    assets,
    setAssets,
    loading,
    loadError,
    channelProducts,
    setChannelProducts,
    availableProducts,
    setAvailableProducts,
    productLoading,
    productError,
    orgCode,
    setOrgCode,
    canChangeSlug,
    setCanChangeSlug,
    lastFetched,
    fetchData,
    loadChannelProducts,
  };
}
