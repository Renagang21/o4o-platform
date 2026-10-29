import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
const m = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({
    stores: [
      { organizationId: "a", organizationName: "약국 A", memberRole: "owner" },
      { organizationId: "b", organizationName: "약국 B", memberRole: "owner" },
    ],
    organizationId: "a",
    selectStore: m.select,
  }),
}));
import Page from "./StoreSelectorPage";
function Path() {
  return <output>{useLocation().pathname + useLocation().search}</output>;
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("confirms the requested pharmacy instead of the remembered different pharmacy", () => {
  render(
    <MemoryRouter
      initialEntries={[
        "/select-store?store=b&returnTo=%2Fstore%2Fpharmacy%2Fsupply%3Fproposal%3Dexact",
      ]}
    >
      <Path />
      <Page />
    </MemoryRouter>,
  );
  expect(m.select).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /약국 A/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /약국 B/ }));
  expect(m.select).toHaveBeenCalledWith("b");
  expect(
    screen.getByText("/store/pharmacy/supply?proposal=exact"),
  ).toBeTruthy();
});
it("a foreign pharmacy hint cannot silently select another available pharmacy", () => {
  render(
    <MemoryRouter
      initialEntries={[
        "/select-store?store=foreign&returnTo=%2Fstore%2Fpharmacy%2Fcontents",
      ]}
    >
      <Page />
    </MemoryRouter>,
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "자동 전환하지 않았습니다",
  );
  expect(m.select).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /약국 A/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "직접 다른 약국 선택" }));
  expect(screen.getByRole("button", { name: /약국 A/ })).toBeTruthy();
});
