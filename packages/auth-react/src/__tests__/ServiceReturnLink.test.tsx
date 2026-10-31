import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceReturnLink } from "../ServiceReturnLink";
afterEach(cleanup);
const href =
  "https://pharmcoop.neture.co.kr/handoff?token=fixture&returnTo=%2Fone%2Fcommunity%3Fpage%3D2";
describe("authenticated deep return", () => {
  it("requests one session handoff and restores the selected cooperative page", async () => {
    const api = {
      post: vi.fn().mockResolvedValue({ data: { data: { targetUrl: href } } }),
    };
    const navigate = vi.fn();
    render(
      <MemoryRouter>
        <ServiceReturnLink
          sourceKey="cooperative"
          returnPath="/one/community?page=2"
          accountId="one"
          api={api}
          navigate={navigate}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(href));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/auth/handoff", {
      targetServiceKey: "pharmcoop",
      returnPath: "/one/community?page=2",
    });
  });
  it("ignores a late handoff result after the account changes", async () => {
    let resolve!: (value: unknown) => void;
    const api = {
      post: vi.fn(
        () =>
          new Promise<any>((r) => {
            resolve = r;
          }),
      ),
    };
    const navigate = vi.fn();
    const renderLink = (accountId: string) => (
      <MemoryRouter>
        <ServiceReturnLink
          sourceKey="cooperative"
          returnPath="/one/community?page=2"
          accountId={accountId}
          api={api}
          navigate={navigate}
        />
      </MemoryRouter>
    );
    const view = render(renderLink("first"));
    fireEvent.click(screen.getByRole("button"));
    view.rerender(renderLink("second"));
    resolve({ data: { data: { targetUrl: href } } });
    await waitFor(() =>
      expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
  it("shows failure and supports explicit retry without changing the destination", async () => {
    const api = {
      post: vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce({ data: { data: { targetUrl: href } } }),
    };
    const navigate = vi.fn();
    render(
      <MemoryRouter>
        <ServiceReturnLink
          sourceKey="cooperative"
          returnPath="/one/community?page=2"
          accountId="one"
          api={api}
          navigate={navigate}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(href));
  });
});
