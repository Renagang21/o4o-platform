import { expect, it } from "vitest";
import { resolveBusinessSite } from "../businessSite";
it("reuses the pharmacy application for megapharm without requiring pharmacy business membership", () => {
  expect(resolveBusinessSite("pharmacy.neture.co.kr")).toMatchObject({
    key: "pharmacy",
    authServiceKey: "neture",
  });
  expect(resolveBusinessSite("megapharm.neture.co.kr")).toMatchObject({
    key: "megapharm",
    authServiceKey: "neture",
  });
  expect(resolveBusinessSite('carepharm.neture.co.kr')).toMatchObject({ key: 'carepharm', name: 'CarePharm', authServiceKey: 'neture' });
  expect(
    resolveBusinessSite("another.neture.co.kr", "cooperative", "협동조합"),
  ).toMatchObject({ key: "cooperative", name: "협동조합" });
  expect(() => resolveBusinessSite("host", "../bad")).toThrow();
});
