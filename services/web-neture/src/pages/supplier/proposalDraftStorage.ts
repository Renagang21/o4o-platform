/** Tab-only, account+supplier-scoped working copy; never an authorization source. */
export interface ProposalDraftFields {
  offerId: string;
  unitPrice: string;
  note: string;
  baseShippingFee: string;
  freeShippingThreshold: string;
  minOrderAmount: string;
}
export interface ProposalDraft extends ProposalDraftFields {
  key: string;
  name: string;
  targetOrganizationId: string;
  status: "draft" | "sending" | "submitted" | "error";
  error?: string;
  requestId: string;
}
export const EMPTY_PROPOSAL_TERMS: ProposalDraftFields = {
  offerId: "",
  unitPrice: "",
  note: "",
  baseShippingFee: "",
  freeShippingThreshold: "",
  minOrderAmount: "0",
};
export const proposalDraftStorageKey = (scope: string) =>
  `neture:supply-proposals:v1:${scope}`;
const fields = Object.keys(EMPTY_PROPOSAL_TERMS) as Array<
  keyof ProposalDraftFields
>;
const validFields = (value: unknown): value is ProposalDraftFields & Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  fields.every(
    (key) =>
      typeof (value as ProposalDraftFields)[key] === "string" &&
      (value as ProposalDraftFields)[key].length <= 1000,
  );
export function readProposalDrafts(scope?: string): {
  terms: ProposalDraftFields;
  drafts: ProposalDraft[];
} {
  const empty = {
    terms: { ...EMPTY_PROPOSAL_TERMS },
    drafts: [] as ProposalDraft[],
  };
  if (!scope) return empty;
  try {
    const raw = sessionStorage.getItem(proposalDraftStorageKey(scope));
    if (!raw || raw.length > 200000) return empty;
    const value = JSON.parse(raw);
    if (
      value.version !== 1 ||
      typeof value.savedAt !== "number" ||
      Date.now() - value.savedAt > 86400000 ||
      !validFields(value.terms) ||
      !Array.isArray(value.drafts) ||
      value.drafts.length > 100
    )
      return empty;
    const keys = new Set<string>();
    for (const d of value.drafts) {
      if (
        !validFields(d) ||
        typeof d.key !== "string" ||
        typeof d.name !== "string" ||
        typeof d.targetOrganizationId !== "string" ||
        typeof d.requestId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.requestId) ||
        typeof d.status !== "string" ||
        !["draft", "sending", "submitted", "error"].includes(d.status) ||
        (d.error !== undefined && typeof d.error !== "string") ||
        keys.has(d.key)
      )
        return empty;
      keys.add(d.key);
    }
    return {
      terms: value.terms,
      drafts: value.drafts.map((d: ProposalDraft) =>
        d.status === "sending"
          ? {
              ...d,
              status: "error",
              error:
                "이전 요청의 응답을 확인하지 못했습니다. 같은 내용으로 접수 결과를 확인하세요.",
            }
          : d,
      ),
    };
  } catch {
    return empty;
  }
}
export function writeProposalDrafts(
  scope: string,
  terms: ProposalDraftFields,
  drafts: ProposalDraft[],
): boolean {
  try {
    const key = proposalDraftStorageKey(scope);
    if (
      !drafts.length &&
      fields.every((field) => terms[field] === EMPTY_PROPOSAL_TERMS[field])
    )
      sessionStorage.removeItem(key);
    else
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 1, savedAt: Date.now(), terms, drafts }),
      );
    return true;
  } catch {
    return false;
  }
}
