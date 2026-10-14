import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MyHomeButton,
  __resetMyHomeForTest,
  getMyHomePath,
  MY_HOME_SOURCES,
} from "./MyHomeButton";
afterEach(() => {
  cleanup();
  __resetMyHomeForTest();
});
const handoff = (path = "/mypage", origin = "https://neture.co.kr") => ({
  data: {
    data: {
      targetUrl: `${origin}/handoff?token=fixture&returnTo=${encodeURIComponent(path)}`,
    },
  },
});
describe("My Home entry", () => {
  it("preserves only a known service context, never source queries or arbitrary hosts", () => {
    for (const [key, source] of Object.entries(MY_HOME_SOURCES))
      expect(getMyHomePath(source.origin)).toBe(`/mypage?from=${key}`);
    expect(getMyHomePath("https://evil.test")).toBe("/mypage");
    expect(getMyHomePath("https://store.neture.co.kr.evil.test")).toBe(
      "/mypage",
    );
  });
  it("does not offer personal entry before authentication bootstrap completes", () => {
    const { rerender } = render(
      <MyHomeButton api={{ post: vi.fn() }} isAuthenticated={false} />,
    );
    expect(screen.queryByText("My Home")).toBeNull();
    rerender(
      <MyHomeButton api={{ post: vi.fn() }} isAuthenticated authLoading />,
    );
    expect(screen.queryByText("My Home")).toBeNull();
  });
  it("requests one handoff and arrives at the personal home", async () => {
    const api = { post: vi.fn().mockResolvedValue(handoff()) };
    const navigate = vi.fn();
    render(<MyHomeButton api={api} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/auth/handoff", {
      targetServiceKey: "neture",
      returnPath: "/mypage",
    });
  });
  it("deduplicates header and mobile entries on the same page", async () => {
    let resolve!: (result: ReturnType<typeof handoff>) => void;
    const api = {
      post: vi.fn(
        () =>
          new Promise<ReturnType<typeof handoff>>((r) => {
            resolve = r;
          }),
      ),
    };
    const navigate = vi.fn();
    render(
      <>
        <MyHomeButton api={api} isAuthenticated navigate={navigate} />
        <MyHomeButton api={api} isAuthenticated navigate={navigate} />
      </>,
    );
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(api.post).toHaveBeenCalledTimes(1);
    resolve(handoff());
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  });
  it.each([
    handoff("/admin"),
    handoff("/mypage", "https://evil.test"),
    { data: {} },
  ])("refuses an unexpected target and allows retry", async (response) => {
    const api = {
      post: vi
        .fn()
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce(handoff()),
    };
    const navigate = vi.fn();
    render(<MyHomeButton api={api} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  });
  it('ignores a late response when the authenticated account changes', async () => {
    let resolve!: (result: ReturnType<typeof handoff>) => void;
    const api = { post: vi.fn(() => new Promise<ReturnType<typeof handoff>>(r => { resolve = r; })) }; const navigate = vi.fn();
    const { rerender } = render(<MyHomeButton api={api} isAuthenticated accountId="first" navigate={navigate} />);
    fireEvent.click(screen.getByRole('button'));
    rerender(<MyHomeButton api={api} isAuthenticated accountId="second" navigate={navigate} />);
    resolve(handoff()); await Promise.resolve(); expect(navigate).not.toHaveBeenCalled();
  });
  it("ignores a late response after logout", async () => {
    let resolve!: (response: ReturnType<typeof handoff>) => void;
    const api = {
      post: vi.fn(
        () =>
          new Promise<ReturnType<typeof handoff>>((r) => {
            resolve = r;
          }),
      ),
    };
    const navigate = vi.fn();
    const { rerender } = render(
      <MyHomeButton api={api} isAuthenticated navigate={navigate} />,
    );
    fireEvent.click(screen.getByRole("button"));
    rerender(
      <MyHomeButton api={api} isAuthenticated={false} navigate={navigate} />,
    );
    resolve(handoff());
    await Promise.resolve();
    expect(navigate).not.toHaveBeenCalled();
  });
  it("ignores pre-restoration handoff replies and permits a fresh request", async () => {
    let resolve!: (response: ReturnType<typeof handoff>) => void;
    const api = {
      post: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((r) => {
              resolve = r;
            }),
        )
        .mockResolvedValueOnce(handoff()),
    };
    const navigate = vi.fn();
    render(<MyHomeButton api={api} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
    resolve(handoff());
    await Promise.resolve();
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  });
});
