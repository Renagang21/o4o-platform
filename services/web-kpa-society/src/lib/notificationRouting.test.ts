import { expect, it, vi } from "vitest";
import type { NotificationItem } from "@o4o/account-ui";
import { openNotificationTarget } from "./notificationRouting";
const notice = (
  targetUrl?: string,
  type = "contact.new",
): NotificationItem => ({
  id: "notification",
  type,
  title: "합성 알림",
  isRead: false,
  createdAt: "2026-10-21T00:00:00Z",
  metadata: targetUrl ? { targetUrl } : {},
});
it.each(["kpa-society", "megapharm"])(
  "opens the real shared inquiry inbox for %s",
  (key) => {
    const navigate = vi.fn(),
      assign = vi.fn();
    expect(
      openNotificationTarget(
        notice(`/operator/service-contact/${key}`),
        navigate,
        assign,
      ),
    ).toBe(true);
    expect(assign).toHaveBeenCalledExactlyOnceWith(
      `https://neture.co.kr/operator/service-contact/${key}`,
    );
    expect(navigate).not.toHaveBeenCalled();
  },
);
it.each([
  "https://external.example.invalid/inbox",
  "//external.example.invalid/inbox",
  "javascript:alert(1)",
])("rejects untrusted external metadata %s", (path) => {
  const navigate = vi.fn(),
    assign = vi.fn();
  expect(openNotificationTarget(notice(path), navigate, assign)).toBe(false);
  expect(navigate).not.toHaveBeenCalled();
  expect(assign).not.toHaveBeenCalled();
});
it("does not open an unsupported service-contact path", () => {
  const navigate = vi.fn(),
    assign = vi.fn();
  expect(
    openNotificationTarget(
      notice("/operator/service-contact/unknown"),
      navigate,
      assign,
    ),
  ).toBe(false);
  expect(navigate).not.toHaveBeenCalled();
  expect(assign).not.toHaveBeenCalled();
});
it("retains existing KPA internal store navigation", () => {
  const navigate = vi.fn(),
    assign = vi.fn();
  expect(
    openNotificationTarget(
      notice(undefined, "store.consultation_requested"),
      navigate,
      assign,
    ),
  ).toBe(true);
  expect(navigate).toHaveBeenCalledExactlyOnceWith(
    "/store/commerce/tablet-displays",
  );
  expect(assign).not.toHaveBeenCalled();
});
it("leaves the caller fallback available when a notification has no target", () => {
  expect(openNotificationTarget(notice(), vi.fn(), vi.fn())).toBe(false);
});
