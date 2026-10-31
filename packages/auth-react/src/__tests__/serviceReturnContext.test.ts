import { describe, expect, it } from "vitest";
import {
  getMyHomePath,
  isRepresentativeReturnPath,
  safeServiceReturnPath,
} from "@o4o/auth-utils";

describe("service return boundaries", () => {
  it("carries an internal deep link including its filters and tab through the personal home", () => {
    const path = getMyHomePath(
      "https://pharmcoop.neture.co.kr",
      "/one/community?page=2#replies",
    );
    expect(
      new URL(path, "https://neture.co.kr").searchParams.get("returnPath"),
    ).toBe("/one/community?page=2#replies");
    expect(isRepresentativeReturnPath(path)).toBe(true);
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/login",
    "/handoff?token=private",
    "/workspace#join=private",
    "/#access_token=private",
    "/forum?api_key=private",
    "/forum?code=private",
    "/a/../login",
    "/\n/evil.test",
  ])("rejects external, normalized or sensitive context %s", (path) => {
    expect(safeServiceReturnPath(path)).toBeNull();
  });
  it.each([
    "/mypage?from=constructor",
    "/mypage?from=store&from=study",
    "/mypage?from=store&next=https://evil.test",
    "/mypage?from=store&returnPath=%2F%2Fevil.test",
    "/admin",
  ])("refuses an invalid representative destination %s", (path) => {
    expect(isRepresentativeReturnPath(path)).toBe(false);
  });
  it("keeps the transport bounded and never accepts an arbitrary source origin", () => {
    expect(
      getMyHomePath("https://partner.neture.co.kr", "/workspace#assets"),
    ).toContain("from=partner");
    expect(
      getMyHomePath("https://partner.neture.co.kr.evil.test", "/workspace"),
    ).toBe("/mypage");
    expect(
      getMyHomePath(
        "https://partner.neture.co.kr",
        `/workspace?query=${"x".repeat(500)}`,
      ),
    ).toBe("/mypage?from=partner");
  });
});
