import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ServiceContactSettingsPage } from "../ServiceContactSettingsPage";
import type { ContactSettingsDto, ContactSettingsInput } from "../types";
afterEach(cleanup);
const dto: ContactSettingsDto = {
  serviceKey: "lecture",
  inAppNotificationEnabled: true,
  emailNotificationEnabled: false,
  recipientEmails: [],
  inquiryTypes: [
    { value: "account_permission", label: "가입/권한 문의", enabled: true },
    { value: "partnership", label: "공급·제휴 문의", enabled: true },
  ],
  privacyNotice: null,
  completionNotice: null,
  autoReplyEnabled: false,
  autoReplySubject: null,
  autoReplyMessage: null,
  autoReplyIncludeOriginal: false,
  isActive: true,
  configured: false,
};
function adapter() {
  return {
    getSettings: vi.fn(async () => dto),
    updateSettings: vi.fn(
      async (_key: string, input: ContactSettingsInput) => ({
        ...dto,
        ...input,
        inquiryTypes: input.inquiryTypes || dto.inquiryTypes,
      }),
    ),
  };
}
it("preserves caller-specific inquiry types when saving only notification recipients", async () => {
  const api = adapter();
  render(<ServiceContactSettingsPage serviceKey="lecture" api={api} />);
  await screen.findByRole("button", { name: "저장" });
  fireEvent.change(screen.getByPlaceholderText("operator@example.com"), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("저장되었습니다.");
  expect(api.updateSettings.mock.calls[0][1]).not.toHaveProperty(
    "inquiryTypes",
  );
  expect(api.updateSettings.mock.calls[0][1].recipientEmails).toEqual([
    "synthetic@example.invalid",
  ]);
});
it("persists explicit type changes, then omits them from a later unrelated save", async () => {
  const api = adapter();
  render(<ServiceContactSettingsPage serviceKey="lecture" api={api} />);
  await screen.findByRole("button", { name: "저장" });
  fireEvent.click(screen.getByRole("checkbox", { name: /공급·제휴 문의/ }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("저장되었습니다.");
  expect(api.updateSettings.mock.calls[0][1].inquiryTypes).toContainEqual({
    value: "partnership",
    label: "공급·제휴 문의",
    enabled: false,
  });
  fireEvent.click(
    screen.getByRole("checkbox", { name: /in-app 운영자 알림 사용/ }),
  );
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("저장되었습니다.");
  expect(api.updateSettings.mock.calls[1][1]).not.toHaveProperty(
    "inquiryTypes",
  );
});
it("keeps explicit type changes retryable after a failed save", async () => {
  const api = adapter();
  api.updateSettings.mockRejectedValueOnce(Error("설정 저장 실패"));
  render(<ServiceContactSettingsPage serviceKey="lecture" api={api} />);
  await screen.findByRole("button", { name: "저장" });
  fireEvent.click(screen.getByRole("checkbox", { name: /공급·제휴 문의/ }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("설정 저장 실패");
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("저장되었습니다.");
  expect(api.updateSettings.mock.calls[1][1].inquiryTypes).toContainEqual({
    value: "partnership",
    label: "공급·제휴 문의",
    enabled: false,
  });
});
