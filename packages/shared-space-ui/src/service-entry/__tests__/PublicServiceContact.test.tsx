import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PublicServiceContact } from "../PublicServiceContact";
afterEach(cleanup);
function policy(serviceKey: string) {
  return {
    serviceKey,
    inquiryTypesConfigured: false,
    inquiryTypes: [{ value: "other", label: "기타 문의" }],
    privacyNotice: null,
    completionNotice: null,
  };
}
function client(
  post = vi.fn(async () => ({ data: { data: { id: "receipt-123" } } })),
) {
  return {
    post,
    get: vi.fn<(path: string) => Promise<unknown>>(async (path: string) => ({
      data: { data: policy(path.split("/")[3]) },
    })),
  };
}
async function fill() {
  await screen.findByLabelText("이름 *");
  for (const [label, value] of [
    ["이름 *", "합성 방문자"],
    ["이메일 *", "sample@example.invalid"],
    ["제목 *", "가입 전 문의"],
    ["문의 내용 *", "서비스 가입 전에 문의합니다."],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "문의 보내기" }));
}
it("submits an anonymous inquiry to the selected service and displays its receipt", async () => {
  const api = client();
  render(<PublicServiceContact serviceKey="supplier" client={api} />);
  await fill();
  expect(await screen.findByText("접수번호: receipt-123")).toBeTruthy();
  expect(api.post).toHaveBeenCalledWith(
    "/public/services/supplier/contact-inquiries",
    expect.objectContaining({
      privacyConsent: true,
      email: "sample@example.invalid",
    }),
  );
});
it("does not claim receipt when submission fails", async () => {
  const api = client(
    vi.fn(async () => {
      throw Error("failed");
    }),
  );
  render(<PublicServiceContact serviceKey="funding" client={api} />);
  await fill();
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("문의가 접수되었습니다.")).toBeNull();
});
it("changing services clears private draft and receipt state", async () => {
  const api = client();
  const view = render(
    <PublicServiceContact serviceKey="supplier" client={api} />,
  );
  await fill();
  await screen.findByText("접수번호: receipt-123");
  view.rerender(<PublicServiceContact serviceKey="funding" client={api} />);
  expect(screen.queryByText("접수번호: receipt-123")).toBeNull();
  expect(
    ((await screen.findByLabelText("이메일 *")) as HTMLInputElement).value,
  ).toBe("");
});
it("uses saved enabled labels and plain-text notices, including the completion notice", async () => {
  const api = client();
  api.get.mockResolvedValue({
    data: {
      data: {
        ...policy("supplier"),
        inquiryTypesConfigured: true,
        inquiryTypes: [{ value: "service_usage", label: "공급 서비스 문의" }],
        privacyNotice: "<b>공개 개인정보 안내</b>",
        completionNotice: "<b>접수 완료 안내</b>",
      },
    },
  });
  render(<PublicServiceContact serviceKey="supplier" client={api} />);
  expect(
    await screen.findByRole("option", { name: "공급 서비스 문의" }),
  ).toBeTruthy();
  expect(screen.queryByRole("option", { name: "공급·제휴 문의" })).toBeNull();
  expect(screen.getByText("<b>공개 개인정보 안내</b>", {exact: false})).toBeTruthy();
  expect(document.querySelector("b")).toBeNull();
  await fill();
  expect(await screen.findByText("<b>접수 완료 안내</b>")).toBeTruthy();
  expect(api.post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ inquiryType: "service_usage" }),
  );
});
it("blocks submission on settings failure and allows an explicit reload", async () => {
  const api = client();
  api.get.mockRejectedValueOnce(Error("settings unavailable"));
  render(<PublicServiceContact serviceKey="supplier" client={api} />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", { name: "문의 보내기" })).toBeNull();
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
  await screen.findByLabelText("이름 *");
  expect(api.get).toHaveBeenCalledTimes(2);
});
it("does not offer a fallback type when all configured types are disabled", async () => {
  const api = client();
  api.get.mockResolvedValue({
    data: {
      data: {
        ...policy("supplier"),
        inquiryTypesConfigured: true,
        inquiryTypes: [],
      },
    },
  });
  render(<PublicServiceContact serviceKey="supplier" client={api} />);
  await screen.findByText(
    "현재 선택할 수 있는 문의 유형이 없습니다. 잠시 후 다시 확인해 주세요.",
  );
  expect(screen.queryByRole("button", { name: "문의 보내기" })).toBeNull();
});
it("ignores a late settings response from the previous service", async () => {
  let resolveOld!: (value: unknown) => void;
  const api = client();
  api.get.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const view = render(
    <PublicServiceContact serviceKey="supplier" client={api} />,
  );
  view.rerender(<PublicServiceContact serviceKey="funding" client={api} />);
  await screen.findByLabelText("이름 *");
  resolveOld({
    data: {
      data: {
        ...policy("supplier"),
        inquiryTypesConfigured: true,
        inquiryTypes: [{ value: "other", label: "이전 서비스 전용" }],
      },
    },
  });
  await fill();
  await screen.findByText("접수번호: receipt-123");
  expect(screen.queryByRole("option", { name: "이전 서비스 전용" })).toBeNull();
  expect(api.post).toHaveBeenCalledWith(
    "/public/services/funding/contact-inquiries",
    expect.any(Object),
  );
});
