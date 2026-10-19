import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import Page from "./AdminSemiFranchisePage";

const api = vi.hoisted(() => ({
  listSemiFranchises: vi.fn(),
  listServiceFeatures: vi.fn(),
  createSemiFranchise: vi.fn(),
  updateSemiFranchise: vi.fn(),
  assignOperator: vi.fn(),
  revokeOperator: vi.fn(),
}));
vi.mock("./api", () => ({
  neturePharmacyAdminApi: api,
  formatDateTime: () => "",
  STATUS_CLASS: {},
  STATUS_LABEL: {},
}));
const business = {
  id: "a",
  key: "a",
  name: "합성 사업",
  status: "active",
  service_features: ["tablet"],
  operators: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  api.listSemiFranchises.mockResolvedValue([business]);
  api.listServiceFeatures.mockResolvedValue([
    { key: "tablet", label: "태블릿" },
    { key: "multilingual-content", label: "다국어 상품 콘텐츠" },
  ]);
  api.updateSemiFranchise.mockResolvedValue({});
  api.createSemiFranchise.mockResolvedValue({});
});
afterEach(cleanup);

it("starts with an explicit service choice and no internal identifier field", async () => {
  render(<Page />);
  await screen.findByRole("button", { name: "수정" });
  expect(
    (screen.getByRole("combobox", { name: "대상 서비스" }) as HTMLSelectElement)
      .value,
  ).toBe("");
  expect(screen.queryByLabelText("새 사업 식별자")).toBeNull();
  expect(screen.queryByRole("option", { name: /협동조합/ })).toBeNull();
  expect(
    (screen.getByRole("button", { name: "만들기" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(api.createSemiFranchise).not.toHaveBeenCalled();
});

it.each([
  ["carepharm", "CarePharm · 만성질환관리"],
  ["megapharm", "MegaPharm · 창고형약국"],
])(
  "registers %s by choosing its name and checking features without typing a key",
  async (key, name) => {
    render(<Page />);
    await screen.findByRole("button", { name: "수정" });
    fireEvent.change(screen.getByRole("combobox", { name: "대상 서비스" }), {
      target: { value: key },
    });
    expect(
      (screen.getByLabelText("새 사업 이름") as HTMLInputElement).value,
    ).toBe(name);
    expect(screen.queryByLabelText("새 사업 식별자")).toBeNull();
    expect(api.createSemiFranchise).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("태블릿"));
    fireEvent.click(screen.getByRole("button", { name: "만들기" }));
    await waitFor(() =>
      expect(api.createSemiFranchise).toHaveBeenCalledWith({
        key,
        name,
        communityKey: undefined,
        registrationConditions: "",
        serviceFeatures: ["tablet"],
      }),
    );
  },
);

it("disables existing active and closed services and prevents a duplicate preset submission", async () => {
  api.listSemiFranchises.mockResolvedValue([
    { ...business, key: "pharmacy" },
    { ...business, key: "carepharm", status: "closed" },
  ]);
  window.history.replaceState(null, "", "/?register=carepharm");
  try {
    render(<Page />);
    await screen.findByText(/사업은 이미 등록되어 있습니다/);
    const menu = screen.getByRole("combobox", { name: "대상 서비스" });
    expect(
      (
        within(menu).getByRole("option", {
          name: /약국 협력사업.*이미 등록됨/,
        }) as HTMLOptionElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        within(menu).getByRole("option", {
          name: /CarePharm.*마감/,
        }) as HTMLOptionElement
      ).disabled,
    ).toBe(true);
    const button = screen.getByRole("button", {
      name: "만들기",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(api.createSemiFranchise).not.toHaveBeenCalled();
  } finally {
    window.history.replaceState(null, "", "/");
  }
});

it("updates the chosen service and keeps custom business registration available explicitly", async () => {
  render(<Page />);
  await screen.findByRole("button", { name: "수정" });
  const menu = screen.getByRole("combobox", { name: "대상 서비스" });
  fireEvent.change(menu, { target: { value: "carepharm" } });
  fireEvent.change(menu, { target: { value: "megapharm" } });
  expect(
    (screen.getByLabelText("새 사업 이름") as HTMLInputElement).value,
  ).toBe("MegaPharm · 창고형약국");
  expect(screen.queryByText(/CarePharm.*등록 양식/)).toBeNull();
  fireEvent.change(menu, { target: { value: "custom" } });
  fireEvent.change(screen.getByLabelText("새 사업 식별자"), {
    target: { value: "synthetic-other" },
  });
  fireEvent.change(screen.getByLabelText("새 사업 이름"), {
    target: { value: "합성 기타 사업" },
  });
  fireEvent.click(screen.getByRole("button", { name: "만들기" }));
  await waitFor(() =>
    expect(api.createSemiFranchise).toHaveBeenCalledWith(
      expect.objectContaining({ key: "synthetic-other" }),
    ),
  );
});

it("sends selected features on creation without inventing a paid or professional entitlement", async () => {
  render(<Page />);
  await screen.findByRole("button", { name: "수정" });
  fireEvent.change(screen.getByRole("combobox", { name: "대상 서비스" }), {
    target: { value: "carepharm" },
  });
  fireEvent.change(screen.getByPlaceholderText("이름"), {
    target: { value: "새 합성 사업" },
  });
  fireEvent.click(screen.getByLabelText("태블릿"));
  fireEvent.click(screen.getByRole("button", { name: "만들기" }));
  await waitFor(() =>
    expect(api.createSemiFranchise).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "carepharm",
        serviceFeatures: ["tablet"],
      }),
    ),
  );
});

it("loads persisted selections, preserves a failed edit, and permits explicit clearing on retry", async () => {
  api.updateSemiFranchise.mockRejectedValueOnce(new Error("저장 실패"));
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "수정" }));
  const fieldset = screen.getAllByRole("group", { name: "제공 기능" })[1];
  const tablet = within(fieldset).getByLabelText("태블릿") as HTMLInputElement;
  expect(tablet.checked).toBe(true);
  fireEvent.click(tablet);
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("저장 실패");
  expect(tablet.checked).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() =>
    expect(api.updateSemiFranchise).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({ serviceFeatures: [] }),
    ),
  );
  await screen.findByRole("button", { name: "수정" });
});

it("does not replace unknown configuration with empty grants after a failed load; supports retry", async () => {
  api.listServiceFeatures.mockRejectedValueOnce(new Error("조회 실패"));
  render(<Page />);
  await screen.findByText("조회 실패");
  expect(
    (screen.getByRole("button", { name: "만들기" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.queryByRole("button", { name: "수정" })).toBeNull();
  expect(screen.queryByText("약국 협력사업이 없습니다.")).toBeNull();
  expect(screen.getByText(/미등록 상태를 의미하지 않습니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "설정 다시 불러오기" }));
  await screen.findByRole("button", { name: "수정" });
});

it("locks feature edits, cancellation and other business selection during a save", async () => {
  let finish!: () => void;
  api.updateSemiFranchise.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "수정" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  expect(
    (screen.getByRole("button", { name: "취소" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (
      screen.getAllByRole("group", {
        name: "제공 기능",
      })[1] as HTMLFieldSetElement
    ).disabled,
  ).toBe(true);
  finish();
  await screen.findByRole("button", { name: "수정" });
});

it("shows saved feature labels, closed-state effect and operator readiness independently per business", async () => {
  api.listSemiFranchises.mockResolvedValue([
    business,
    {
      ...business,
      key: "closed-business",
      name: "마감 합성 사업",
      status: "closed",
      service_features: ["multilingual-content"],
    },
    {
      ...business,
      key: "empty-business",
      name: "미선택 합성 사업",
      service_features: [],
    },
  ]);
  render(<Page />);
  const active = await screen.findByRole("region", { name: "합성 사업 설정" });
  expect(
    within(active).getByRole("list", { name: "설정된 제공 기능" }).textContent,
  ).toBe("태블릿");
  const closed = screen.getByRole("region", { name: "마감 합성 사업 설정" });
  expect(within(closed).getByText("다국어 상품 콘텐츠")).toBeTruthy();
  expect(within(closed).getByText(/마감된 사업의 기능은/)).toBeTruthy();
  expect(within(active).getByText(/가입 승인·자료 운영을 맡을/)).toBeTruthy();
  expect(
    within(
      screen.getByRole("region", { name: "미선택 합성 사업 설정" }),
    ).getByText(/추가 제공하는 기능이 없습니다/),
  ).toBeTruthy();
});

it("does not show an empty register or discard successful save feedback if the refresh fails", async () => {
  api.listSemiFranchises
    .mockResolvedValueOnce([business])
    .mockRejectedValueOnce(new Error("최신 현황 조회 실패"))
    .mockResolvedValue([business]);
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "수정" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("최신 현황 조회 실패");
  expect(screen.getByText("저장했습니다.")).toBeTruthy();
  expect(screen.queryByText("약국 협력사업이 없습니다.")).toBeNull();
  expect(screen.queryByRole("button", { name: "수정" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "설정 다시 불러오기" }));
  await screen.findByRole("button", { name: "수정" });
  expect(api.updateSemiFranchise).toHaveBeenCalledTimes(1);
});

it("preserves a duplicate registration draft and never updates an existing business automatically", async () => {
  api.createSemiFranchise.mockRejectedValueOnce(
    new Error("이미 있는 key 입니다."),
  );
  render(<Page />);
  await screen.findByRole("button", { name: "수정" });
  fireEvent.change(screen.getByRole("combobox", { name: "대상 서비스" }), {
    target: { value: "carepharm" },
  });
  fireEvent.change(screen.getByLabelText("새 사업 이름"), {
    target: { value: "새 합성 사업" },
  });
  fireEvent.click(screen.getByRole("button", { name: "만들기" }));
  await screen.findByText("이미 있는 key 입니다.");
  expect(
    (screen.getByRole("combobox", { name: "대상 서비스" }) as HTMLInputElement)
      .value,
  ).toBe("carepharm");
  expect(api.updateSemiFranchise).not.toHaveBeenCalled();
});

it("locks registration fields and operator input while creating without preselecting any grants", async () => {
  let finish!: () => void;
  api.createSemiFranchise.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(<Page />);
  await screen.findByRole("button", { name: "수정" });
  fireEvent.change(screen.getByRole("combobox", { name: "대상 서비스" }), {
    target: { value: "carepharm" },
  });
  fireEvent.change(screen.getByLabelText("새 사업 이름"), {
    target: { value: "새 합성 사업" },
  });
  fireEvent.click(screen.getByRole("button", { name: "만들기" }));
  expect(api.createSemiFranchise).toHaveBeenCalledWith(
    expect.objectContaining({ serviceFeatures: [] }),
  );
  expect(
    (screen.getByRole("group", { name: "새 사업 등록" }) as HTMLFieldSetElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText("합성 사업 담당 운영자 ID") as HTMLInputElement)
      .disabled,
  ).toBe(true);
  finish();
  await waitFor(() =>
    expect(
      (
        screen.getByRole("combobox", {
          name: "대상 서비스",
        }) as HTMLInputElement
      ).value,
    ).toBe(""),
  );
});

it("prefills the CarePharm registration form from the operators link without saving it", async () => {
  window.history.replaceState(
    null,
    "",
    "/admin/semi-franchises?register=carepharm",
  );
  try {
    render(<Page />);
    await screen.findByRole("button", { name: "수정" });
    expect(
      (
        screen.getByRole("combobox", {
          name: "대상 서비스",
        }) as HTMLInputElement
      ).value,
    ).toBe("carepharm");
    expect(
      (screen.getByLabelText("새 사업 이름") as HTMLInputElement).value,
    ).toBe("CarePharm · 만성질환관리");
    expect(screen.getByText(/"만들기"를 눌러야 등록됩니다/)).toBeTruthy();
    expect(api.createSemiFranchise).not.toHaveBeenCalled();
  } finally {
    window.history.replaceState(null, "", "/");
  }
});

it("ignores presets outside CarePharm and MegaPharm and reports an already registered business", async () => {
  window.history.replaceState(
    null,
    "",
    "/admin/semi-franchises?register=pharmcoop",
  );
  try {
    render(<Page />);
    await screen.findByRole("button", { name: "수정" });
    expect(
      (
        screen.getByRole("combobox", {
          name: "대상 서비스",
        }) as HTMLInputElement
      ).value,
    ).toBe("");
  } finally {
    cleanup();
  }
  api.listSemiFranchises.mockResolvedValue([
    { ...business, key: "megapharm", name: "MegaPharm · 창고형약국" },
  ]);
  window.history.replaceState(
    null,
    "",
    "/admin/semi-franchises?register=megapharm",
  );
  try {
    render(<Page />);
    await screen.findByText(/이미 등록되어 있습니다/);
    expect(api.createSemiFranchise).not.toHaveBeenCalled();
  } finally {
    window.history.replaceState(null, "", "/");
  }
});

it("lists centrally assigned business roles separately from revocable individual operators", async () => {
  api.listSemiFranchises.mockResolvedValue([
    {
      ...business,
      operators: [{ userId: "individual-user", assignedAt: "" }],
      roleOperators: [
        {
          userId: "role-user",
          role: "neture:a_admin",
          name: null,
          email: "role@example.invalid",
          membershipStatus: "active",
        },
        {
          userId: "named-user",
          role: "neture:a_operator",
          name: "합성 담당",
          email: "named@example.invalid",
          membershipStatus: "active",
        },
      ],
    },
  ]);
  api.revokeOperator.mockResolvedValue({});
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<Page />);
  const roles = await screen.findByLabelText("합성 사업 지정 역할 보유자");
  expect(within(roles).getByText("role@example.invalid")).toBeTruthy();
  expect(within(roles).getByText("합성 담당")).toBeTruthy();
  expect(within(roles).queryByRole("button")).toBeNull();
  const revokeButtons = screen.getAllByRole("button", { name: "해제" });
  expect(revokeButtons).toHaveLength(1);
  fireEvent.click(revokeButtons[0]);
  await waitFor(() =>
    expect(api.revokeOperator).toHaveBeenCalledWith("a", "individual-user"),
  );
  expect(api.revokeOperator).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/가입 승인·자료 운영을 맡을/)).toBeNull();
});

it("keeps the operator prompt when the only role holder cannot use business routes", async () => {
  api.listSemiFranchises.mockResolvedValue([
    {
      ...business,
      roleOperators: [
        {
          userId: "suspended-user",
          role: "neture:a_operator",
          name: "정지 담당",
          email: null,
          membershipStatus: "suspended",
        },
      ],
    },
  ]);
  render(<Page />);
  const roles = await screen.findByLabelText("합성 사업 지정 역할 보유자");
  expect(within(roles).getByText(/Neture 이용 자격 없음/)).toBeTruthy();
  expect(screen.getByText(/가입 승인·자료 운영을 맡을/)).toBeTruthy();
});
