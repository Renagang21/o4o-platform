import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { ServiceContactInboxLink } from "../ServiceContactInboxLink";
afterEach(cleanup);
it("loads received-inquiry counts for the current service and never queries for guests", async () => {
  const client = {
    get: vi.fn(async () => ({ data: { data: { newCount: 2 } } })),
  };
  const view = render(
    <ServiceContactInboxLink
      client={client}
      serviceKey="supplier"
      enabled={false}
    />,
  );
  expect(client.get).not.toHaveBeenCalled();
  view.rerender(
    <ServiceContactInboxLink
      client={client}
      serviceKey="supplier"
      accountId="operator"
      enabled
    />,
  );
  expect(
    await screen.findByRole("link", { name: "문의 관리 · 새 문의 2" }),
  ).toBeTruthy();
  expect(client.get).toHaveBeenCalledWith(
    "/admin/services/supplier/contact-inquiries/summary",
  );
});
it("hides a previous account count and discards its delayed response after switching service", async () => {
  let finish: (v: unknown) => void = () => {};
  const client = {
    get: vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
  };
  const view = render(
    <ServiceContactInboxLink
      client={client}
      serviceKey="supplier"
      accountId="first"
      enabled
    />,
  );
  const old = finish;
  view.rerender(
    <ServiceContactInboxLink
      client={client}
      serviceKey="funding"
      accountId="second"
      enabled
    />,
  );
  old({ data: { data: { newCount: 99 } } });
  await waitFor(() => expect(screen.queryByText(/99/)).toBeNull());
  finish({ data: { data: { newCount: 3 } } });
  expect(
    await screen.findByRole("link", { name: "문의 관리 · 새 문의 3" }),
  ).toHaveProperty("href", expect.stringContaining("/funding"));
});
it("does not show a link until server access is confirmed, including zero new inquiries", async () => {
  let finish: (v: unknown) => void = () => {};
  const client = {
    get: vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
  };
  render(
    <ServiceContactInboxLink
      client={client}
      serviceKey="carepharm"
      accountId="legacy-operator"
      enabled
    />,
  );
  expect(screen.queryByRole("link", { name: "문의 관리" })).toBeNull();
  finish({ data: { data: { newCount: 0 } } });
  expect(await screen.findByRole("link", { name: "문의 관리" })).toBeTruthy();
});
it("removes the link and count when the server revokes access", async () => {
  const client = {
    get: vi.fn(async () => ({ data: { data: { newCount: 2 } } })),
  };
  render(
    <ServiceContactInboxLink
      client={client}
      serviceKey="megapharm"
      accountId="legacy-operator"
      enabled
    />,
  );
  await screen.findByRole("link", { name: "문의 관리 · 새 문의 2" });
  client.get.mockRejectedValueOnce({ response: { status: 403 } });
  window.dispatchEvent(new Event("focus"));
  await waitFor(() => expect(screen.queryByRole("link")).toBeNull());
});
it("does not restore an older successful response after a newer denial", async () => {
  let finish: (v: unknown) => void = () => {};
  const client = {
    get: vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
  };
  render(
    <ServiceContactInboxLink
      client={client}
      serviceKey="supplier"
      accountId="operator"
      enabled
    />,
  );
  const old = finish;
  client.get.mockRejectedValueOnce({ response: { status: 403 } });
  window.dispatchEvent(new Event("focus"));
  await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
  await act(async () => { old({ data: { data: { newCount: 99 } } }); });
  expect(screen.queryByRole("link")).toBeNull();
});
