import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_PROPOSAL_TERMS as terms,
  proposalDraftStorageKey,
  readProposalDrafts,
  writeProposalDrafts,
  type ProposalDraft,
} from "../proposalDraftStorage";
const scope = "fixture-account:fixture-supplier";
const draft: ProposalDraft = {
  ...terms,
  key: "business-a",
  name: "협업체 A",
  targetOrganizationId: "",
  status: "sending",
  requestId: "a9b60d08-a311-461d-918a-f54139ff9176",
};
afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
describe("tab working copy recovery", () => {
  it("marks interrupted sending as unresolved and keeps the exact payload/key", () => {
    expect(writeProposalDrafts(scope, terms, [draft])).toBe(true);
    expect(readProposalDrafts(scope).drafts[0]).toMatchObject({
      ...draft,
      status: "error",
    });
    expect(readProposalDrafts("another:scope").drafts).toEqual([]);
  });
  it("expires a working copy after 24 hours and ignores corrupt or foreign-version data", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    writeProposalDrafts(scope, terms, [draft]);
    vi.spyOn(Date, "now").mockReturnValue(86401001);
    expect(readProposalDrafts(scope).drafts).toEqual([]);
    for (const raw of [
      "bad",
      '{"version":2}',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        terms,
        drafts: [{ ...draft, requestId: null }],
      }),
    ]) {
      sessionStorage.setItem(proposalDraftStorageKey(scope), raw);
      expect(readProposalDrafts(scope).drafts).toEqual([]);
    }
  });
  it("removes explicitly cleared drafts and reports unavailable storage", () => {
    writeProposalDrafts(scope, terms, [draft]);
    writeProposalDrafts(scope, terms, []);
    expect(sessionStorage.getItem(proposalDraftStorageKey(scope))).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    expect(writeProposalDrafts(scope, terms, [draft])).toBe(false);
  });
});
