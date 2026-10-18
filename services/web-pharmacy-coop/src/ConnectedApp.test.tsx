import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  auth: {
    user: null as null | { id: string },
    isLoading: false,
    pendingPolicyAcceptances: [],
    logout: vi.fn(),
    loginWithEmail: vi.fn(),
  },
}));
vi.mock("@o4o/auth-client", () => ({
  AuthClient: class {
    api = { get: mocks.get };
  },
  getAccessToken: () => null,
}));
vi.mock("@o4o/auth-react", () => ({
  useServiceAuth: () => mocks.auth,
  O4O_ACCOUNT_LINKS: { signup: "https://neture.co.kr/signup" },
  EmailLoginForm: ({ links }: { links?: { signup?: string } }) => <><p>공통 로그인</p>{links?.signup && <a href={links.signup}>회원가입</a>}</>,
}));
vi.mock("./App", () => ({
  App: ({ session }: { session: { userId: string | null } }) => (
    <p>세션:{session.userId ?? "anonymous"}</p>
  ),
}));
import { ConnectedApp } from "./ConnectedApp";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.auth.user = null;
});
const open = () =>
  render(
    <MemoryRouter>
      <ConnectedApp />
    </MemoryRouter>,
  );
describe("server-backed cooperative session", () => {
  it("provides common account signup from the cooperative login page", async () => {
    mocks.get.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter initialEntries={["/login"]}><ConnectedApp /></MemoryRouter>);
    expect((await screen.findByRole("link", { name: "회원가입" })).getAttribute("href")).toBe("https://neture.co.kr/signup");
  });
  it("loads a public directory without requesting or inventing personal membership", async () => {
    mocks.get.mockResolvedValue({ data: { data: [] } });
    open();
    expect(await screen.findByText("세션:anonymous")).toBeTruthy();
    expect(mocks.get.mock.calls).toEqual([["/neture/cooperatives"]]);
  });
  it("uses the authenticated cooperative session without granting federation authority", async () => {
    mocks.auth.user = { id: "person" };
    mocks.get.mockImplementation((path: string) =>
      Promise.resolve({
        data: {
          data: path.endsWith("/me")
            ? {
                userId: "person",
                memberships: [],
                cooperativeOperators: [],
                federationOperators: [],
              }
            : [],
        },
      }),
    );
    open();
    expect(await screen.findByText("세션:person")).toBeTruthy();
  });
  it("refuses a session belonging to a different authenticated user", async () => {
    mocks.auth.user = { id: "new-person" };
    mocks.get.mockImplementation((path: string) =>
      Promise.resolve({
        data: { data: path.endsWith("/me") ? { userId: "old-person" } : [] },
      }),
    );
    open();
    expect(await screen.findByText("세션:anonymous")).toBeTruthy();
  });
  it("fails closed when either server directory or private session fails", async () => {
    mocks.auth.user = { id: "person" };
    mocks.get.mockRejectedValue(new Error("unavailable"));
    open();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("세션:person")).toBeNull();
  });
  it("clears assignments immediately when the authenticated user changes", async () => {
    mocks.auth.user = { id: "first" };
    mocks.get.mockImplementation((path: string) =>
      Promise.resolve({
        data: { data: path.endsWith("/me") ? { userId: "first" } : [] },
      }),
    );
    const view = open();
    await screen.findByText("세션:first");
    mocks.auth.user = { id: "second" };
    mocks.get.mockImplementation(() => new Promise(() => {}));
    view.rerender(
      <MemoryRouter>
        <ConnectedApp />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText("세션:first")).toBeNull());
  });
});
