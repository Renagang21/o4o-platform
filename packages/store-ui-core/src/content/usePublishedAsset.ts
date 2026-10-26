import { useEffect, useState } from "react";
import type { PublishedAssetItem } from "../api/assetSnapshot";

type PublishedAssetLoader = (
  organizationId: string,
  snapshotId: string,
) => Promise<{ success: boolean; data?: PublishedAssetItem }>;

/** Shared loading state for public and print views; callers retain rendering and print behavior. */
export function usePublishedAsset(
  load: PublishedAssetLoader,
  snapshotId: string | undefined,
  organizationId: string | null,
  resetLoadingOnChange = true,
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<PublishedAssetItem | null>(null);

  useEffect(() => {
    if (!snapshotId || !organizationId) {
      setError("필수 파라미터가 누락되었습니다");
      setLoading(false);
      return;
    }
    if (resetLoadingOnChange) setLoading(true);
    load(organizationId, snapshotId)
      .then((res) => {
        if (res.success && res.data) setAsset(res.data);
        else setError("콘텐츠를 찾을 수 없습니다");
      })
      .catch(() => setError("콘텐츠를 불러올 수 없습니다"))
      .finally(() => setLoading(false));
  }, [load, snapshotId, organizationId, resetLoadingOnChange]);

  return { loading, error, asset };
}
