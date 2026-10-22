import { resolveSessionServiceKey } from "../utils/session-origin.js";

describe("cooperative session boundary", () => {
  it("uses the common Neture account session across pharmacy businesses", () => {
    expect(resolveSessionServiceKey("https://pharmcoop.neture.co.kr")).toBe("neture");
    expect(resolveSessionServiceKey("https://pharmacy.neture.co.kr")).toBe(
      "neture",
    );
    for (const key of ["megapharm", "carepharm"]) expect(resolveSessionServiceKey(`https://${key}.neture.co.kr`)).toBe("neture");
    expect(resolveSessionServiceKey("https://neture.co.kr")).toBe("neture");
  });
  it.each([
    "https://pharmcoop.neture.co.kr.example.invalid",
    "https://www.pharmcoop.neture.co.kr",
    // Mistakenly announced earlier and never served; it must not resolve to the cooperative scope.
    "https://coop.neture.co.kr",
  ])("rejects an unconfigured host %s", (origin) => {
    expect(resolveSessionServiceKey(origin)).toBeNull();
  });
});
