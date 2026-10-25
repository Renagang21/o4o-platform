import {
  workInput,
  assertApplicationTransition,
  assertWorkTransition,
  educationUrl,
} from "./model.js";
const input = {
  kind: "notice",
  title: "합성 안내",
  body: "공지 본문",
  category: "운영",
  priority: "important",
  required: true,
  dueAt: null,
  startsAt: null,
  endsAt: null,
  state: "draft",
  targetIds: [],
};
describe("cooperation workflow contracts", () => {
  it("keeps notice and activity transitions independent of supply/order contracts", () => {
    expect(() => assertWorkTransition("draft", "active", "activity")).toThrow();
    expect(() =>
      assertWorkTransition("recruiting", "active", "activity"),
    ).not.toThrow();
    expect(() =>
      assertWorkTransition("ended", "recruiting", "activity"),
    ).toThrow();
    expect(() =>
      assertWorkTransition("draft", "published", "notice"),
    ).not.toThrow();
    expect(() => assertWorkTransition("draft", "approved", "notice")).toThrow();
  });
  it("does not approve a withdrawn/completed application or complete an unapproved one", () => {
    for (const value of ["withdrawn", "completed", "rejected"])
      expect(() => assertApplicationTransition(value, "approved")).toThrow();
    expect(() =>
      assertApplicationTransition("submitted", "completed"),
    ).toThrow();
    expect(() =>
      assertApplicationTransition("approved", "completed"),
    ).not.toThrow();
  });
  it.each([
    "javascript:alert(1)",
    "http://example.invalid",
    "https://name:secret@example.invalid",
  ])("rejects an unsafe education link (%s)", (value) =>
    expect(() => educationUrl(value)).toThrow(),
  );
  it("normalizes HTTPS education links without granting membership", () =>
    expect(educationUrl("https://example.invalid/course")).toBe(
      "https://example.invalid/course",
    ));
  it("validates times, required body and target identifiers", () => {
    expect(workInput(input)).toMatchObject(input);
    expect(() => workInput({ ...input, body: "" })).toThrow();
    expect(() => workInput({ ...input, targetIds: ["not-a-uuid"] })).toThrow();
    expect(() =>
      workInput({
        ...input,
        startsAt: "2026-10-28T00:00:00Z",
        endsAt: "2026-10-27T00:00:00Z",
      }),
    ).toThrow();
  });
});
