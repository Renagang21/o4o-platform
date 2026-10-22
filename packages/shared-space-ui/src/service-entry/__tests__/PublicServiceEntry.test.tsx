import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  PublicServiceEntry,
  PUBLIC_SERVICE_ENTRIES,
  isPublicServiceKey,
} from "../PublicServiceEntry";
afterEach(cleanup);
describe("공개 서비스 진입", () => {
  for (const serviceKey of Object.keys(
    PUBLIC_SERVICE_ENTRIES,
  ) as (keyof typeof PUBLIC_SERVICE_ENTRIES)[]) {
    it(`${serviceKey}: 로그인 없이 소개·기능·이용 절차·문의 제공`, () => {
      render(
        <PublicServiceEntry
          serviceKey={serviceKey}
          loginHref="/login?returnTo=%2F"
        />,
      );
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        PUBLIC_SERVICE_ENTRIES[serviceKey].name,
      );
      expect(
        screen.getByRole("link", { name: "Contact Us" }).getAttribute("href"),
      ).toContain(`service=${serviceKey}`);
      expect(
        screen
          .getByRole("link", { name: "로그인하고 이용하기" })
          .getAttribute("href"),
      ).toBe("/login?returnTo=%2F");
      expect(screen.queryByText(/매출|고객 연락처/)).toBeNull();
    });
  }
  it("unknown/prototype keys cannot select a public service", () => {
    expect(isPublicServiceKey("supplier")).toBe(true);
    expect(isPublicServiceKey("constructor")).toBe(false);
    expect(isPublicServiceKey("other")).toBe(false);
  });
});
