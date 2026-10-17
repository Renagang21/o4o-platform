import { resolveSessionServiceKey } from "../utils/session-origin.js";

describe("cooperative session boundary", () => {
  it("uses its own logout/revocation scope independently of pharmacy and Neture", () => {
    expect(resolveSessionServiceKey("https://coop.neture.co.kr")).toBe("coop");
    expect(resolveSessionServiceKey("https://pharmacy.neture.co.kr")).toBe(
      "kpa-society",
    );
    expect(resolveSessionServiceKey("https://neture.co.kr")).toBe("neture");
  });
  it.each([
    "https://coop.neture.co.kr.example.invalid",
    "https://www.coop.neture.co.kr",
  ])("rejects an unconfigured host %s", (origin) => {
    expect(resolveSessionServiceKey(origin)).toBeNull();
  });
});
