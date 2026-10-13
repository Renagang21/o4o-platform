import type { createStoreQrCode } from "../../../api/storeQr";
import type { AssetSelectorResult } from "../../../components/store/StoreAssetSelectorModal";

interface LibraryQrDraft {
  library: AssetSelectorResult;
  title: string;
  description: string;
  slug: string;
  landingType: string;
  landingTargetId: string;
  ctaEnabled: boolean;
  ctaLabel: string;
}

/** Authoring-page payload only; public landing resolution and authorization remain on the server. */
export function buildLibraryQrPayload(
  draft: LibraryQrDraft,
): Parameters<typeof createStoreQrCode>[0] {
  const { library } = draft;
  const isPageReference =
    library.source === "content-hub" || library.source === "direct-content";
  const isPublicLinkReference =
    library.source === "blog" || library.source === "mlc";
  return {
    title: draft.title.trim() || library.title,
    description: draft.description.trim() || undefined,
    libraryItemId:
      isPageReference || isPublicLinkReference ? undefined : library.id,
    landingType: isPageReference ? "page" : draft.landingType,
    landingTargetId: isPageReference
      ? library.id
      : draft.landingTargetId || undefined,
    slug: draft.slug.trim(),
    ...(isPageReference && draft.ctaEnabled
      ? {
          consultationCtaEnabled: true,
          consultationCtaLabel: draft.ctaLabel.trim() || undefined,
        }
      : {}),
  };
}
