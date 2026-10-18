import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { previewCooperatives } from "./catalog";
import { anonymousSession, type SessionSnapshot } from "./domain";

afterEach(cleanup);
vi.spyOn(window, "scrollTo").mockImplementation(() => {});
function open(path: string, session: SessionSnapshot = anonymousSession) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App cooperatives={previewCooperatives} session={session} preview />
    </MemoryRouter>,
  );
}

describe("federation and cooperative route boundaries", () => {
  it('does not mount the authenticated backend for another cooperative operator, including direct editor URLs', () => {
    const client = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() };
    render(<MemoryRouter initialEntries={['/sample-coop-b/operator/contents/new']}><App
      cooperatives={previewCooperatives.map(row => ({ ...row, businessKey: `business-${row.id}` }))}
      session={{ ...anonymousSession, userId: 'person', cooperativeOperators: [{ userId: 'person', cooperativeId: 'preview-a' }] }} businessClient={client}
    /></MemoryRouter>);
    expect(screen.getByText('이 조합의 운영 권한이 필요합니다.')).toBeTruthy();
    expect(client.get).not.toHaveBeenCalled(); expect(client.post).not.toHaveBeenCalled();
  });
  it("renders the federation as an organization of cooperatives", () => {
    open("/");
    expect(screen.getByRole("link", { name: "회원가입" }).getAttribute("href")).toBe("https://neture.co.kr/signup");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "조합의 힘",
    );
    expect(
      screen
        .getByRole("link", { name: "소속 협동조합 찾기" })
        .getAttribute("href"),
    ).toBe("/cooperatives?preview=1");
  });

  it("renders the pharmacy-style member space under each cooperative slug", () => {
    open("/sample-coop-a");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "예시 협동조합 A",
    );
    const nav = screen.getByRole("navigation", { name: "협동조합 메뉴" });
    const links = [...nav.querySelectorAll("a")];
    expect(links).toHaveLength(6);
    expect(
      links.every((link) =>
        link.getAttribute("href")?.startsWith("/sample-coop-a"),
      ),
    ).toBe(true);
  });

  it("rejects an unknown cooperative instead of falling back to another tenant", () => {
    open("/unknown/materials");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "페이지를 찾을 수 없습니다.",
    );
    expect(
      screen.queryByRole("navigation", { name: "협동조합 메뉴" }),
    ).toBeNull();
  });

  it("does not grant member content in B from active membership in A", () => {
    open("/sample-coop-b/materials", {
      ...anonymousSession,
      userId: "person",
      memberships: [
        { userId: "person", cooperativeId: "preview-a", status: "active" },
      ],
    });
    expect(
      screen.getByText("이 조합의 참여 자격을 확인해야 합니다."),
    ).toBeTruthy();
  });

  it("keeps federation management separate from cooperative management", () => {
    open("/sample-coop-a/operator", {
      ...anonymousSession,
      userId: "person",
      federationOperators: [{ userId: "person" }],
    });
    expect(screen.getByText("이 조합의 운영 권한이 필요합니다.")).toBeTruthy();
  });

  it("shows a separate personal membership state for each cooperative", () => {
    open("/sample-coop-a/membership", {
      ...anonymousSession,
      userId: "person",
      memberships: [
        { userId: "person", cooperativeId: "preview-a", status: "pending" },
      ],
    });
    expect(screen.getByText("심사 대기")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /신청|승인/ })).toBeNull();
  });

  it("does not seed example cooperatives into the production directory", () => {
    render(
      <MemoryRouter initialEntries={["/cooperatives"]}>
        <App cooperatives={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("등록된 협동조합이 없습니다.")).toBeTruthy();
    expect(screen.queryByText("예시 협동조합 A")).toBeNull();
  });

  it("links to the existing store without minting access or a handoff token", () => {
    open("/sample-coop-a/services");
    expect(
      screen
        .getByRole("link", { name: "내 매장으로 이동 ↗" })
        .getAttribute("href"),
    ).toBe("https://store.neture.co.kr");
    expect(
      screen.getByText(/조합 가입만으로 매장 권한을 부여하지 않습니다/),
    ).toBeTruthy();
  });
});
