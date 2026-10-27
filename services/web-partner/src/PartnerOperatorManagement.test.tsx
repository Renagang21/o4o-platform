import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import PartnerOperatorManagement from "./PartnerOperatorManagement";
const h = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("./api", () => ({ request: h.request }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  h.request.mockReset();
});
const snapshot = {
  operators: [{ userId: "op", name: "Operator", email: "op@example.test" }],
  candidates: [
    { userId: "target", name: "Candidate", email: "candidate@example.test" },
  ],
  invitations: [
    {
      id: "invite",
      invited_email: "pending@example.test",
      expires_at: "2026-11-01",
    },
  ],
};
describe("Partner Admin delegation", () => {
  it("uses scoped invitation and resend/cancel APIs without arbitrary-role payloads", async () => {
    h.request.mockImplementation(async (_path, method) =>
      method ? {} : snapshot,
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PartnerOperatorManagement userId="admin" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "확인 메일 보내기" }),
    );
    await waitFor(() =>
      expect(h.request).toHaveBeenCalledWith(
        "/api/v1/service-operator-management/partner-support/operators/target",
        "POST",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "재발송" }).hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "재발송" }));
    await waitFor(() =>
      expect(h.request).toHaveBeenCalledWith(
        "/api/v1/service-operator-invitations/manage/invite/resend",
        "POST",
      ),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "초대 취소" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "초대 취소" }));
    await waitFor(() =>
      expect(h.request).toHaveBeenCalledWith(
        "/api/v1/service-operator-invitations/manage/invite/cancel",
        "POST",
      ),
    );
  });
  it("reports failed loads and supports retry", async () => {
    h.request
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(snapshot);
    render(<PartnerOperatorManagement userId="admin" />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "목록 새로고침" }));
    await screen.findByText(/pending@example.test/);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("keeps permission errors visible without claiming mail success", async () => {
    h.request.mockImplementation(async (_path, method) => {
      if (method) throw new Error("Admin 권한이 필요합니다");
      return snapshot;
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PartnerOperatorManagement userId="admin" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "확인 메일 보내기" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Admin 권한이 필요합니다",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});
