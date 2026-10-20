import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SupplierOrdersListPage from "../../account/SupplierOrdersListPage";
import SupplierOrderDetailPage from "../../account/SupplierOrderDetailPage";
import SupplierStoreMaterialsStatusPage from "../SupplierStoreMaterialsStatusPage";
import SupplierStoreDescriptionsPage from "../SupplierStoreDescriptionsPage";
import SupplierTabletScreenSetsPage from "../SupplierTabletScreenSetsPage";
import SupplierSignagePage from "../SupplierSignagePage";
import SupplierSupplyProposalsPage from "../SupplierSupplyProposalsPage";
import SupplierSemiFranchiseEventsPage from "../SupplierSemiFranchiseEventsPage";
import SupplierSemiFranchiseRecruitmentsPage from "../SupplierSemiFranchiseRecruitmentsPage";

const api = vi.hoisted(() => ({
  orders: vi.fn(),
  order: vi.fn(),
  products: vi.fn(),
  profile: vi.fn(),
  descriptions: vi.fn(),
  saveDescription: vi.fn(),
  sets: vi.fn(),
  set: vi.fn(),
  signage: vi.fn(),
}));
vi.mock("../../../lib/api", () => ({
  supplierApi: {
    getOrders: api.orders,
    getOrderById: api.order,
    getShipment: async () => null,
    getProducts: api.products,
  },
  supplierProfileApi: { getProfile: api.profile },
  supplierStoreDescriptionApi: {
    listMine: api.descriptions,
    save: api.saveDescription,
  },
  productApi: {},
  PROFILE_FIELD_LABELS: {},
}));
vi.mock("../../../lib/api/supplierScreenSets", () => ({
  fetchSupplierScreenSets: api.sets,
  fetchSupplierScreenSet: api.set,
  supplierScreenSetBuilderApi: {},
}));
vi.mock("../../../lib/api/supplierSignage", () => ({
  fetchSupplierSignageList: api.signage,
}));
vi.mock("../../../lib/api/supplier", () => ({ supplierApi: { getProducts: api.products } }));
vi.mock("../../../lib/api/media", () => ({ mediaApi: {} }));
vi.mock("../../../lib/api/neturePharmacy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/api/neturePharmacy")>()),
  neturePharmacySupplierApi: {
    listSemiFranchises: async () => [{ key: "fixture", name: "Fixture group" }],
    listProposals: async () => [],
    listEvents: async () => [],
    listRecruitments: async () => [],
  },
}));
vi.mock("../../../contexts", () => ({
  useAuth: () => ({ user: { roles: ["neture:supplier"] } }),
}));
vi.mock("../../../hooks/useContentTemplates", () => ({
  useContentTemplates: () => ({ templates: [] }),
}));
vi.mock("../../../components/common/MediaPickerModal", () => ({
  default: () => null,
}));
vi.mock("@o4o/error-handling", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@o4o/content-editor", () => ({
  RichTextEditor: ({ value, editable, onChange }: { value: string; editable: boolean; onChange: (value: { html: string }) => void }) => (
    <textarea aria-label="자료 본문" value={value} readOnly={!editable} onChange={(event) => onChange({ html: event.target.value })} />
  ),
}));
vi.mock("@o4o/tablet-screen-set-editor", () => ({
  templateLabel: () => "화면",
  TabletContentStepBuilder: ({
    initialDetail,
    onCancel,
  }: {
    initialDetail: { name: string };
    onCancel: () => void;
  }) => (
    <div>
      <p>{initialDetail.name} 편집</p>
      <button onClick={onCancel}>목록으로</button>
    </div>
  ),
}));

function Location() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  );
}
function mount(path: string, nextPath?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Location />
      {nextPath && <Link to={nextPath}>검증 대상 변경</Link>}
      <Routes>
        <Route
          path="/supplier/orders/manage"
          element={<SupplierOrdersListPage />}
        />
        <Route
          path="/supplier/orders/:id"
          element={<SupplierOrderDetailPage />}
        />
        <Route
          path="/supplier/store-materials-status"
          element={<SupplierStoreMaterialsStatusPage />}
        />
        <Route
          path="/supplier/store-descriptions"
          element={<SupplierStoreDescriptionsPage />}
        />
        <Route
          path="/supplier/tablet-screen-sets"
          element={<SupplierTabletScreenSetsPage />}
        />
        <Route path="/supplier/signage" element={<SupplierSignagePage />} />
        <Route
          path="/supplier/supply-proposals"
          element={<SupplierSupplyProposalsPage />}
        />
        <Route
          path="/supplier/semi-franchise-events"
          element={<SupplierSemiFranchiseEventsPage />}
        />
        <Route
          path="/supplier/semi-franchise-recruitments"
          element={<SupplierSemiFranchiseRecruitmentsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  api.orders.mockResolvedValue({
    data: [
      {
        id: "order-a",
        order_number: "ORDER-A",
        orderer_name: "Fixture store",
        status: "preparing",
        total_amount: 1000,
        final_amount: 1000,
        item_count: 1,
      },
    ],
    meta: { total: 21, totalPages: 2 },
  });
  api.order.mockResolvedValue(null);
  api.products.mockResolvedValue([
    {
      id: "offer-a",
      masterId: "master-a",
      name: "Fixture product",
      approvalStatus: "APPROVED",
    },
  ]);
  api.profile.mockResolvedValue({ status: "ACTIVE", profileComplete: true });
  api.descriptions.mockResolvedValue([
    {
      id: "desc-ko",
      masterId: "master-a",
      language: "ko",
      status: "canonical",
      content: "<p>한국어 본문</p>",
      updatedAt: "2026-10-14",
    },
    {
      id: "desc-en",
      masterId: "master-a",
      language: "en",
      status: "revision_requested",
      content: "<p>English fixture</p>",
      updatedAt: "2026-10-15",
    },
  ]);
  api.sets.mockResolvedValue([]);
  api.signage.mockResolvedValue([]);
  api.set.mockResolvedValue({ id: "set-a", name: "Fixture screen" });
});
afterEach(cleanup);

describe("supplier task navigation", () => {
  it('shows retirement guidance for old recruitment links without a creation form', async () => {
    mount('/supplier/semi-franchise-recruitments?masterId=master-a');
    await screen.findByRole('heading', { name: '세미프랜차이즈 모집 종료' });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: '모집 만들기' })).toBeNull();
    expect(api.products).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: '공급 제안으로 이동' }).getAttribute('href')).toBe('/supplier/supply-proposals');
  });

  it.each([
    ["/supplier/supply-proposals?offer=offer-a", "offer-a"],
    ["/supplier/semi-franchise-events?offer=offer-a", "offer-a"],
  ])(
    "keeps the selected approved product when creating an activity at %s",
    async (path, expected) => {
      mount(path + "&returnTo=%2Fsupplier%2Fproducts%3Fpage%3D2");
      await waitFor(() =>
        expect(
          (screen.getAllByRole("combobox")[0] as HTMLSelectElement).value,
        ).toBe(expected),
      );
      expect(
        screen
          .getByRole("link", { name: "상품 업무로 돌아가기" })
          .getAttribute("href"),
      ).toBe("/supplier/products?page=2");
    },
  );

  it.each([
    "/supplier/supply-proposals?offer=missing",
    "/supplier/semi-franchise-events?offer=missing",
  ])(
    "leaves selection empty rather than substituting another activity product at %s",
    async (path) => {
      mount(path);
      await screen.findByRole("alert");
      expect(
        (screen.getAllByRole("combobox")[0] as HTMLSelectElement).value,
      ).toBe("");
    },
  );

  it.each([
    ['/supplier/supply-proposals', 'offer', 'offer-a'],
    ['/supplier/semi-franchise-events', 'offer', 'offer-a'],
  ])('clears the previous selection when the requested product changes to missing at %s', async (path, key, value) => {
    mount(`${path}?${key}=${value}`, `${path}?${key}=missing`);
    await waitFor(() => expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe(value));
    fireEvent.click(screen.getByRole('link', { name: '검증 대상 변경' }));
    await screen.findByRole('alert');
    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('');
  });

  it('closes the previous signage creation form when the requested product becomes missing', async () => {
    mount('/supplier/signage?product=offer-a', '/supplier/signage?product=missing');
    await screen.findByRole('button', { name: '취소', exact: true });
    fireEvent.click(screen.getByRole('link', { name: '검증 대상 변경' }));
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: '취소', exact: true })).toBeNull();
  });

  it("restores the order status, search and page when returning from a detail", async () => {
    mount("/supplier/orders/manage?status=preparing&page=2&q=Fixture");
    await waitFor(() =>
      expect(api.orders).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        status: "preparing",
      }),
    );
    const links = await screen.findAllByRole("link", { name: "ORDER-A" });
    fireEvent.click(links[0]);
    await screen.findByText("주문을 찾을 수 없습니다");
    fireEvent.click(screen.getByRole("link", { name: /주문 목록/ }));
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe(
        "/supplier/orders/manage?status=preparing&page=2&q=Fixture",
      ),
    );
    expect(
      (screen.getByLabelText("주문 매장명 검색") as HTMLInputElement).value,
    ).toBe("Fixture");
    fireEvent.change(screen.getByLabelText("주문 상태"), {
      target: { value: "paid" },
    });
    await waitFor(() =>
      expect(api.orders).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        status: "paid",
      }),
    );
  });

  it("rejects an external return path in the actual order detail", async () => {
    mount("/supplier/orders/order-a?returnTo=https%3A%2F%2Fexample.invalid");
    const back = await screen.findByRole("link", { name: /주문 목록/ });
    expect(back.getAttribute("href")).toBe("/supplier/orders/manage");
  });

  it("opens the requested description ID when the same language has historical rows", async () => {
    api.descriptions.mockResolvedValue([
      { id: 'historical', masterId: 'master-a', language: 'en', status: 'hidden', content: '<p>Historical content</p>', updatedAt: '2026-10-14' },
      { id: 'current', masterId: 'master-a', language: 'en', status: 'revision_requested', content: '<p>Current content</p>', updatedAt: '2026-10-15' },
    ]);
    mount('/supplier/store-descriptions?masterId=master-a&language=en&descriptionId=current');
    await waitFor(() => expect((screen.getByLabelText('자료 본문') as HTMLTextAreaElement).value).toBe('<p>Current content</p>'));
  });

  it.each(['hidden', 'canonical'])('keeps a %s row read-only and opens the current draft before saving', async (status) => {
    api.descriptions.mockResolvedValue([
      { id: 'historical', masterId: 'master-a', language: 'en', status, content: '<p>Historical content</p>' },
      { id: 'current', masterId: 'master-a', language: 'en', status: 'draft', content: '<p>Current content</p>' },
    ]);
    api.saveDescription.mockResolvedValue({ id: 'current', masterId: 'master-a', descriptionType: 'STORE', language: 'en', status: 'draft' });
    mount('/supplier/store-descriptions?masterId=master-a&language=en&descriptionId=historical');
    const body = await screen.findByLabelText('자료 본문') as HTMLTextAreaElement;
    expect(body.value).toBe('<p>Historical content</p>');
    expect(body.readOnly).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));
    fireEvent.click(screen.getByRole('button', { name: '검수요청', exact: true }));
    expect(api.saveDescription).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '현재 작업본 열기' }));
    expect(body.value).toBe('<p>Current content</p>');
    expect(body.readOnly).toBe(false);
    fireEvent.change(body, { target: { value: '<p>Edited current draft</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));
    await waitFor(() => expect(api.saveDescription).toHaveBeenCalledWith({ offerId: 'offer-a', language: 'en', content: '<p>Edited current draft</p>', submit: false }));
  });

  it('prefers the active working row when opening a product without a description ID', async () => {
    api.descriptions.mockResolvedValue([
      { id: 'historical', masterId: 'master-a', language: 'en', status: 'hidden', content: '<p>Historical content</p>' },
      { id: 'current', masterId: 'master-a', language: 'en', status: 'draft', content: '<p>Current content</p>' },
    ]);
    mount('/supplier/store-descriptions?masterId=master-a&language=en');
    const body = await screen.findByLabelText('자료 본문') as HTMLTextAreaElement;
    expect(body.value).toBe('<p>Current content</p>');
    expect(body.readOnly).toBe(false);
  });

  it('starts a new draft explicitly from published content when no working row exists', async () => {
    api.descriptions.mockResolvedValue([{ id: 'published', masterId: 'master-a', language: 'en', status: 'canonical', content: '<p>Published content</p>' }]);
    mount('/supplier/store-descriptions?masterId=master-a&language=en&descriptionId=published');
    const body = await screen.findByLabelText('자료 본문') as HTMLTextAreaElement;
    expect(body.readOnly).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '새 작업본 작성' }));
    expect(body.readOnly).toBe(false);
    expect(body.value).toBe('<p>Published content</p>');
    expect(api.saveDescription).not.toHaveBeenCalled();
  });

  it('keeps unsaved content after a failed save and cancelled close, then retries the same draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    api.saveDescription.mockRejectedValueOnce(new Error('Fixture save failure')).mockResolvedValueOnce({ id: 'current', masterId: 'master-a', descriptionType: 'STORE', language: 'en', status: 'draft' });
    mount('/supplier/store-descriptions?masterId=master-a&language=en');
    const body = await screen.findByLabelText('자료 본문') as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: '<p>Unsaved content</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));
    await waitFor(() => expect((screen.getByRole('button', { name: '임시저장' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(body.value).toBe('<p>Unsaved content</p>');
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));
    await waitFor(() => expect(api.saveDescription).toHaveBeenCalledTimes(2));
    expect(api.saveDescription.mock.calls[0]).toEqual(api.saveDescription.mock.calls[1]);
    confirm.mockRestore();
  });

  it("opens the requested description language and returns to the filtered material list", async () => {
    mount("/supplier/store-materials-status?state=action");
    const english = await screen.findByText("Fixture product · EN");
    expect(screen.queryByText("Fixture product · KO")).toBeNull();
    fireEvent.click(
      within(english.closest("tr")!).getByRole("link", { name: "관리" }),
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText("자료 본문") as HTMLTextAreaElement).value,
      ).toBe("<p>English fixture</p>"),
    );
    expect(api.descriptions).toHaveBeenCalledWith("master-a");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    fireEvent.click(screen.getByRole("link", { name: "이전 업무로 돌아가기" }));
    await screen.findByText("Fixture product · EN");
    expect(screen.queryByText("Fixture product · KO")).toBeNull();
  });

  it.each([
    "masterId=missing&language=en",
      "masterId=master-a&language=en&descriptionId=missing",
    "masterId=master-a&language=unsupported",
  ])("does not substitute a different description for %s", async (query) => {
    mount("/supplier/store-descriptions?" + query);
    await screen.findByRole("alert");
    expect(screen.queryByLabelText("자료 본문")).toBeNull();
  });

  it("opens a tablet screen by ID and leaves its editor before returning to status", async () => {
    mount(
      "/supplier/tablet-screen-sets?edit=set-a&returnTo=%2Fsupplier%2Fstore-materials-status%3Fstate%3Dworking",
    );
    await screen.findByText("Fixture screen 편집");
    expect(api.set).toHaveBeenCalledWith("set-a");
    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    expect(screen.queryByText("Fixture screen 편집")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "이전 업무로 돌아가기" })
        .getAttribute("href"),
    ).toBe("/supplier/store-materials-status?state=working");
  });

  it("does not silently open another tablet screen when lookup fails", async () => {
    api.set.mockRejectedValue(new Error("not found"));
    mount("/supplier/tablet-screen-sets?edit=missing");
    await screen.findByRole("alert");
    expect(screen.queryByText(/편집$/)).toBeNull();
  });

  it("opens the requested signage and reports a missing ID without opening another item", async () => {
    api.signage.mockResolvedValue([
      {
        id: "sig-a",
        name: "Fixture video",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        status: "draft",
      },
    ]);
    const view = mount("/supplier/signage?edit=sig-a");
    await waitFor(() =>
      expect(
        view.container.querySelector('input[value="Fixture video"]'),
      ).toBeTruthy(),
    );
    cleanup();
    mount("/supplier/signage?edit=missing");
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "취소" })).toBeNull();
  });
});
