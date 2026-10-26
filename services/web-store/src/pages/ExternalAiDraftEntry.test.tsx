import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  select: vi.fn(),
  value: {} as Record<string, unknown>,
}));
vi.mock("../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({ ...m.value, selectStore: m.select }),
}));
vi.mock("../components/StoreGate", () => ({
  StoreGate: () => <p>기존 로그인·매장 안내</p>,
}));
import ExternalAiDraftEntry from "./ExternalAiDraftEntry";
function ProductLocation() {
  const location = useLocation();
  return (
    <p role="status">
      {location.pathname}
      {location.search}
    </p>
  );
}
function showProduct(targetKind = "local") {
  return render(
    <MemoryRouter
      initialEntries={[
        `/external-ai/product-contents/${targetKind}/product-a/group-a?organizationId=store-a&locale=vi`,
      ]}
    >
      <Routes>
        <Route
          path="/external-ai/product-contents/:targetKind/:targetId/:id"
          element={<ExternalAiDraftEntry productContent />}
        />
        <Route
          path="/store/products/multilingual/:targetKind/:targetId"
          element={<ProductLocation />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const show = () =>
  render(
    <MemoryRouter
      initialEntries={["/external-ai/drafts/content?organizationId=store-a"]}
    >
      <Routes>
        <Route
          path="/external-ai/drafts/:id"
          element={<ExternalAiDraftEntry />}
        />
        <Route
          path="/store/library/production-materials/:id/edit"
          element={<p>기존 제작 자료 편집기</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
it("opens the existing editor only for the requested authorized store after scope resolution", async () => {
  m.value = {
    status: "ready",
    organizationId: "store-a",
    stores: [{ organizationId: "store-a" }, { organizationId: "store-b" }],
  };
  show();
  expect(await screen.findByText("기존 제작 자료 편집기")).toBeTruthy();
});
it("selects the explicitly requested store instead of opening a draft in the previously selected store", async () => {
  m.value = {
    status: "ready",
    organizationId: "store-b",
    stores: [{ organizationId: "store-a" }, { organizationId: "store-b" }],
  };
  show();
  await waitFor(() => expect(m.select).toHaveBeenCalledWith("store-a"));
  expect(screen.queryByText("기존 제작 자료 편집기")).toBeNull();
});
it("never selects an arbitrary id outside the server-authorized store list", () => {
  m.value = {
    status: "ready",
    organizationId: "store-b",
    stores: [{ organizationId: "store-b" }],
  };
  show();
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(m.select).not.toHaveBeenCalled();
});
it("retains the existing login entry for an anonymous visit", () => {
  m.value = { status: "idle", stores: [] };
  show();
  expect(screen.getByText("기존 로그인·매장 안내")).toBeTruthy();
});
it("opens the product's existing group editor and exact language after resolving the authorized store", async () => {
  m.value = {
    status: "ready",
    organizationId: "store-a",
    stores: [{ organizationId: "store-a" }],
  };
  showProduct();
  expect((await screen.findByRole("status")).textContent).toBe(
    "/store/products/multilingual/local/product-a?groupId=group-a&locale=vi",
  );
});
it("does not open product content in another selected or unauthorized store", () => {
  m.value = {
    status: "ready",
    organizationId: "store-b",
    stores: [{ organizationId: "store-b" }],
  };
  showProduct();
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(m.select).not.toHaveBeenCalled();
});
it("rejects unrecognized product kinds before navigating to the editor", () => {
  m.value = {
    status: "ready",
    organizationId: "store-a",
    stores: [{ organizationId: "store-a" }],
  };
  showProduct("supplier");
  expect(screen.getByRole("alert")).toBeTruthy();
});
