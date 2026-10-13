import type { SignageMediaItem } from "../../../api/signageMedia";
import type { StoreAssetItem } from "../../../api/assetSnapshot";

export type SignageEditTarget =
  | { kind: "direct"; media: SignageMediaItem }
  | { kind: "snapshot"; snapshot: StoreAssetItem };
export interface SignageMediaDraft {
  name: string;
  description: string;
  tags: string;
  thumbnailUrl: string;
  sourceUrl: string;
}
export const emptySignageMediaDraft: SignageMediaDraft = {
  name: "",
  description: "",
  tags: "",
  thumbnailUrl: "",
  sourceUrl: "",
};
export function readSignageMediaDraft(
  target: SignageEditTarget,
): SignageMediaDraft {
  if (target.kind === "direct")
    return {
      name: target.media.name,
      description: target.media.description ?? "",
      tags: (target.media.tags ?? []).join(", "),
      thumbnailUrl: target.media.thumbnailUrl ?? "",
      sourceUrl: target.media.sourceUrl ?? "",
    };
  const content = target.snapshot.contentJson ?? {};
  return {
    name: target.snapshot.title,
    description: (content.description as string) ?? "",
    tags: ((content.tags as string[]) ?? []).join(", "),
    thumbnailUrl: (content.thumbnailUrl as string) ?? "",
    sourceUrl: (content.sourceUrl as string) ?? "",
  };
}
export function signageMediaMetadata(draft: SignageMediaDraft) {
  return {
    description: draft.description.trim() || undefined,
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    thumbnailUrl: draft.thumbnailUrl.trim() || undefined,
    sourceUrl: draft.sourceUrl.trim() || undefined,
  };
}
