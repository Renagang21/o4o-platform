import { beforeEach, expect, it } from "vitest";
import {
  consumeWorktablePreselection,
  saveWorktablePreselection,
} from "../../../../utils/worktablePreselection";
beforeEach(() => sessionStorage.clear());
it("store and service handoffs are separate and each is consumed once", () => {
  saveWorktablePreselection("A", "one", { first: 2 });
  saveWorktablePreselection("B", "one", { second: 3 });
  saveWorktablePreselection("A", "two", { third: 4 });
  expect(consumeWorktablePreselection("A", "one")).toEqual({ first: 2 });
  expect(consumeWorktablePreselection("A", "one")).toEqual({});
  expect(consumeWorktablePreselection("B", "one")).toEqual({ second: 3 });
  expect(consumeWorktablePreselection("A", "two")).toEqual({ third: 4 });
});
it("unscoped legacy selection and invalid quantities are never imported", () => {
  sessionStorage.setItem("worktable_preselect", JSON.stringify({ legacy: 2 }));
  saveWorktablePreselection("A", "one", {
    valid: 2,
    zero: 0,
    negative: -1,
    fraction: 1.5,
    unsafe: 1e30,
  });
  expect(consumeWorktablePreselection("A", "one")).toEqual({ valid: 2 });
  expect(sessionStorage.getItem("worktable_preselect")).toBeNull();
});
it("malformed handoff is removed without breaking the worktable", () => {
  sessionStorage.setItem("o4o.worktable.preselect:A:one", "{broken");
  expect(consumeWorktablePreselection("A", "one")).toEqual({});
  expect(sessionStorage.length).toBe(0);
});
it("mismatched handoff metadata fails closed", () => {
  sessionStorage.setItem(
    "o4o.worktable.preselect:A:one",
    JSON.stringify({
      organizationId: "B",
      serviceKey: "one",
      quantities: { one: 2 },
    }),
  );
  expect(consumeWorktablePreselection("A", "one")).toEqual({});
});
