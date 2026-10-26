import { useEffect, useRef, useState } from "react";
import { createStoreQrCode, type StoreQrCode } from "../../../api/storeQr";
import type { AssetSelectorResult } from "../../../components/store/StoreAssetSelectorModal";
import { useLatestStoreRequest } from "../hooks/useLatestStoreRequest";
import { buildLibraryQrPayload } from "./libraryQrPayload";

export interface QrCreationDraft {
  title: string;
  description: string;
  slug: string;
  landingType: string;
  landingTargetId: string;
  ctaEnabled: boolean;
  ctaLabel: string;
}
type Target =
  | { kind: "library"; item: AssetSelectorResult }
  | { kind: "video"; item: { id: string; title: string } };
const emptyDraft: QrCreationDraft = {
  title: "",
  description: "",
  slug: "",
  landingType: "product",
  landingTargetId: "",
  ctaEnabled: false,
  ctaLabel: "",
};
function toSlug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[가-힣]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `qr-${Date.now()}`
  );
}

/** One authoring session; an older save never closes or clears a newer draft. */
export function useQrCreation(
  organizationId: string,
  onCreated: (qr: StoreQrCode) => void,
) {
  const [target, setTarget] = useState<Target | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const revision = useRef(0);
  const busy = useRef(new Set<string>());
  const request = useLatestStoreRequest(organizationId);
  const currentOrganization = useRef(organizationId);
  currentOrganization.current = organizationId;
  const captureDraft = () => {
    const capturedRevision = revision.current;
    const capturedOrganization = organizationId;
    return () =>
      capturedRevision === revision.current &&
      capturedOrganization === currentOrganization.current;
  };
  useEffect(() => {
    revision.current++;
    setTarget(null);
    setDraft(emptyDraft);
    setError(null);
    setSaving(busy.current.has(organizationId));
  }, [organizationId]);
  const changeDraft = <K extends keyof QrCreationDraft>(
    field: K,
    value: QrCreationDraft[K],
  ) => {
    revision.current++;
    setDraft((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };
  const cancel = () => {
    revision.current++;
    setTarget(null);
    setDraft(emptyDraft);
    setError(null);
  };
  const selectLibrary = (item: AssetSelectorResult) => {
    revision.current++;
    const link =
      item.source === "mlc" ||
      item.assetType === "external-link";
    setTarget({ kind: "library", item });
    setDraft({
      ...emptyDraft,
      title: item.title,
      slug: toSlug(item.title),
      landingType: link ? "link" : "page",
      landingTargetId: link ? item.url || "" : "",
    });
    setError(null);
  };
  const selectVideo = (item: { id: string; title: string }) => {
    revision.current++;
    setTarget({ kind: "video", item });
    setDraft({
      ...emptyDraft,
      title: item.title,
      slug: toSlug(item.title),
      landingType: "video",
      landingTargetId: item.id,
    });
    setError(null);
  };
  const save = async () => {
    if (!target || busy.current.has(organizationId)) return;
    if (!draft.slug.trim()) {
      setError("슬러그를 입력해주세요");
      return;
    }
    const submittedRevision = revision.current;
    const isCurrent = request.begin();
    const payload =
      target.kind === "library"
        ? buildLibraryQrPayload({ ...draft, library: target.item })
        : {
            title: draft.title.trim() || target.item.title,
            description: draft.description.trim() || undefined,
            slug: draft.slug.trim(),
            landingType: "video",
            landingTargetId: target.item.id,
          };
    busy.current.add(organizationId);
    setSaving(true);
    setError(null);
    try {
      const result = await createStoreQrCode(payload);
      if (!isCurrent()) return;
      if (!result.success || !result.data) {
        if (submittedRevision === revision.current)
          setError("저장에 실패했습니다");
        return;
      }
      onCreated(result.data);
      if (submittedRevision === revision.current) cancel();
    } catch {
      if (isCurrent() && submittedRevision === revision.current)
        setError("슬러그가 이미 사용중이거나 저장에 실패했습니다");
    } finally {
      busy.current.delete(organizationId);
      if (currentOrganization.current === organizationId) setSaving(false);
    }
  };
  return {
    draft,
    changeDraft,
    cancel,
    captureDraft,
    selectLibrary,
    selectVideo,
    save,
    saving,
    error,
    creating: target !== null,
    selectedLibrary: target?.kind === "library" ? target.item : null,
    videoTarget: target?.kind === "video" ? target.item : null,
  };
}
