import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { configurePharmacyManagementClient } from "./api";
import Page from "./AdminPharmacyServiceSettingsPage";

const get = vi.fn();
const put = vi.fn();
const envelope = (data: unknown) => ({ data: { success: true, data } });
const policy = {
  features: [
    { key: "tablet", label: "태블릿" },
    { key: "store-staff-support", label: "매장 직원 지원" },
  ],
  targets: [
    { key: "default", name: "기본 제공 · 전체 약국", features: [] },
    { key: "paid", name: "유료회원", features: ["tablet"] },
    {
      key: "business:warehouse",
      name: "협력사업 · 합성 사업",
      features: ["store-staff-support"],
      status: "closed",
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue(envelope(policy));
  put.mockResolvedValue(envelope({}));
  configurePharmacyManagementClient({
    get,
    put,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  });
});
afterEach(cleanup);
const renderPage = () =>
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
it("edits the selected audience and retains the saved value when switching audiences", async () => {
  renderPage();
  const targets = await screen.findByRole("combobox", { name: "설정 대상" });
  fireEvent.change(targets, { target: { value: "paid" } });
  expect(
    (screen.getByRole("checkbox", { name: "태블릿" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: "매장 직원 지원" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByRole("status");
  expect(put).toHaveBeenCalledWith(
    "/neture/admin/service-feature-policies/paid",
    { features: ["tablet", "store-staff-support"] },
  );
  fireEvent.change(targets, { target: { value: "default" } });
  expect(
    (screen.getByRole("checkbox", { name: "태블릿" }) as HTMLInputElement)
      .checked,
  ).toBe(false);
  fireEvent.change(targets, { target: { value: "paid" } });
  expect(
    (
      screen.getByRole("checkbox", {
        name: "매장 직원 지원",
      }) as HTMLInputElement
    ).checked,
  ).toBe(true);
});
it("does not show an empty policy on failed load and supports retry", async () => {
  get.mockRejectedValueOnce(new Error("offline"));
  renderPage();
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", { name: "저장" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "설정 다시 불러오기" }));
  await screen.findByRole("combobox");
});
it("retains selections after a save failure and cannot change target while saving", async () => {
  let finish!: (value: unknown) => void;
  put.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  renderPage();
  const targets = await screen.findByRole("combobox");
  fireEvent.click(screen.getByRole("checkbox", { name: "태블릿" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  expect((targets as HTMLSelectElement).disabled).toBe(true);
  finish({ data: { success: false } });
  await screen.findByRole("alert");
  expect(
    (screen.getByRole("checkbox", { name: "태블릿" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(put).toHaveBeenCalledTimes(2));
});
it("shows closed business status and uses its explicit registry key", async () => {
  renderPage();
  fireEvent.change(await screen.findByRole("combobox"), {
    target: { value: "business:warehouse" },
  });
  expect(screen.getByText(/마감된 사업입니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith(
      "/neture/admin/service-feature-policies/business%3Awarehouse",
      { features: ["store-staff-support"] },
    ),
  );
});
it("starts with a single feature editor and loads member management only on its tab", async () => {
  renderPage();
  await screen.findByRole("combobox", { name: "설정 대상" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByLabelText("회원 이메일")).toBeNull();
  expect(screen.queryByText("현장 고객 요구 집계")).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "회원 이용 자격" }));
  expect(screen.getByLabelText("회원 이메일")).toBeTruthy();
  expect(screen.queryByRole("checkbox", { name: "태블릿" })).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "기능 설정" }));
  expect(screen.getByRole("combobox", { name: "설정 대상" })).toBeTruthy();
});
it("supports an explicit empty grant without changing the paid-member policy", async () => {
  renderPage();
  const targets = await screen.findByRole("combobox");
  fireEvent.change(targets, { target: { value: "business:warehouse" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "매장 직원 지원" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith(
      "/neture/admin/service-feature-policies/business%3Awarehouse",
      { features: [] },
    ),
  );
  await screen.findByRole("status");
  fireEvent.change(targets, { target: { value: "paid" } });
  expect(
    (screen.getByRole("checkbox", { name: "태블릿" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
});
it("keeps business metadata collapsed and saves it without overwriting feature grants", async () => {
  const patch = vi.fn().mockResolvedValue(envelope({}));
  configurePharmacyManagementClient({
    get,
    put,
    patch,
    post: vi.fn(),
    delete: vi.fn(),
  });
  const business = {
    id: "b",
    key: "warehouse",
    name: "합성 사업",
    status: "closed" as const,
    service_features: ["store-staff-support"],
    roleOperators: [],
    operators: [],
    community_key: null,
    payment_receiver_key: null,
  };
  get.mockResolvedValue(
    envelope({
      ...policy,
      targets: policy.targets.map((target) =>
        target.key === "business:warehouse" ? { ...target, business } : target,
      ),
    }),
  );
  renderPage();
  fireEvent.change(await screen.findByRole("combobox"), {
    target: { value: "business:warehouse" },
  });
  expect(
    screen.getByText("사업 정보 · 합성 사업").closest("details")?.open,
  ).toBe(false);
  fireEvent.click(screen.getByText("사업 정보 · 합성 사업"));
  fireEvent.change(screen.getByRole("textbox", { name: "사업 이름" }), {
    target: { value: "변경된 사업 이름" },
  });
  fireEvent.click(screen.getByRole("button", { name: "사업 정보 저장" }));
  await screen.findByText("사업 정보를 저장했습니다.");
  expect(patch.mock.calls[0][0]).toBe(
    "/neture/admin/semi-franchises/warehouse",
  );
  expect(patch.mock.calls[0][1]).toMatchObject({
    name: "변경된 사업 이름",
    status: "closed",
  });
  expect(patch.mock.calls[0][1]).not.toHaveProperty("serviceFeatures");
  expect(patch.mock.calls[0][1]).not.toHaveProperty("paymentReceiverKey");
  expect(
    screen.getByRole("link", { name: "운영자 관리" }).getAttribute("href"),
  ).toBe("/operators");
});
it("opens business registration on demand, then selects the created audience without granting features", async () => {
  const post = vi.fn().mockResolvedValue(envelope({}));
  configurePharmacyManagementClient({
    get,
    put,
    post,
    patch: vi.fn(),
    delete: vi.fn(),
  });
  get.mockResolvedValueOnce(envelope(policy)).mockResolvedValue(
    envelope({
      ...policy,
      targets: [
        ...policy.targets,
        { key: "business:carepharm", name: "CarePharm", features: [] },
      ],
    }),
  );
  renderPage();
  await screen.findByRole("combobox");
  fireEvent.click(screen.getByRole("button", { name: "사업 추가" }));
  fireEvent.change(screen.getByRole("combobox", { name: "대상 서비스" }), {
    target: { value: "carepharm" },
  });
  expect(screen.queryByLabelText("새 사업 식별자")).toBeNull();
  expect(
    screen.queryByRole("checkbox", { name: "태블릿", hidden: true }),
  ).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "사업 등록" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(post).toHaveBeenCalledWith(
    "/neture/admin/semi-franchises",
    expect.objectContaining({ key: "carepharm" }),
  );
  expect(post.mock.calls[0][1]).not.toHaveProperty("serviceFeatures");
  expect(put).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("combobox", { name: "설정 대상" }) as HTMLSelectElement)
      .value,
  ).toBe("business:carepharm");
  expect(
    (screen.getByRole("checkbox", { name: "태블릿" }) as HTMLInputElement)
      .checked,
  ).toBe(false);
});
it("opens legacy registration presets only after checking the registry and retains focus on cancel", async () => {
  render(
    <MemoryRouter initialEntries={["/?register=carepharm"]}>
      <Page />
    </MemoryRouter>,
  );
  await screen.findByRole("dialog", { name: "사업 추가" });
  expect(
    (screen.getByRole("combobox", { name: "대상 서비스" }) as HTMLSelectElement)
      .value,
  ).toBe("carepharm");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("retries the registry read without repeating a successful business creation", async () => {
  const post = vi.fn().mockResolvedValue(envelope({}));
  configurePharmacyManagementClient({
    get,
    put,
    post,
    patch: vi.fn(),
    delete: vi.fn(),
  });
  get
    .mockResolvedValueOnce(envelope(policy))
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(
      envelope({
        ...policy,
        targets: [
          ...policy.targets,
          { key: "business:carepharm", name: "CarePharm", features: [] },
        ],
      }),
    );
  renderPage();
  await screen.findByRole("combobox");
  fireEvent.click(screen.getByRole("button", { name: "사업 추가" }));
  fireEvent.change(screen.getByRole("combobox", { name: "대상 서비스" }), {
    target: { value: "carepharm" },
  });
  fireEvent.click(screen.getByRole("button", { name: "사업 등록" }));
  await screen.findByText(
    "사업은 등록됐지만 목록을 확인하지 못했습니다. 다시 조회해 주세요.",
  );
  fireEvent.click(screen.getByRole("button", { name: "등록 목록 다시 조회" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(post).toHaveBeenCalledTimes(1);
});
