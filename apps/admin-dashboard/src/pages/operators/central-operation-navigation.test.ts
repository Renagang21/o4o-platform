import { expect, it } from "vitest";
import { centralTaskHref } from "./central-operation-navigation";
it.each([
  "/operator/market-trial?tab=exceptions&type=payment_unconfirmed",
  "/operator/market-trial?tab=exceptions&type=refund_remaining",
  "/operator/market-trial?tab=forum-failures",
  "/operator/market-trial/synthetic-project/offline-operations",
])(
  "preserves the existing funding specialist workflow and its selection: %s",
  (path) => {
    expect(centralTaskHref("funding", path)).toBe(
      `https://funding.neture.co.kr${path}`,
    );
  },
);
it.each([
  ["funding", "/operator/market-trial", "/operations/funding/funding"],
  ["supplier", "/operator/suppliers", "/operations/supplier/suppliers"],
  ["lecture", "/operator/courses", "/operations/lecture/courses"],
  ["neture", "/operator/pharmacy-memberships", "/operations/neture/pharmacies"],
  ["community", "/operator/community/home", "/operations/community/editorial"],
])("maps only the implemented %s list workflow", (service, path, target) =>
  expect(centralTaskHref(service, path)).toBe(target),
);
it.each([
  [
    "/operator/courses/synthetic-course",
    "https://study.neture.co.kr/operator/courses/synthetic-course",
  ],
  [
    "/operator/courses?status=submitted#review",
    "https://study.neture.co.kr/operator/courses?status=submitted#review",
  ],
])(
  "does not silently replace a specialist target with a list: %s",
  (path, target) => expect(centralTaskHref("lecture", path)).toBe(target),
);
it.each([
  "https://elsewhere.invalid/path",
  "javascript:alert(1)",
  "//elsewhere.invalid/path",
])("never forwards a foreign origin or unsafe scheme: %s", (path) => {
  expect(centralTaskHref("funding", path)).toBe("/operations/funding/members");
});
