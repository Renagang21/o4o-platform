import {
  OperatorNotificationLink,
  OperatorNotifications,
} from "@o4o/operator-core-ui";
import type { PharmacyManagementClient as Client } from "@o4o/operator-core-ui/modules/pharmacy-management";
/** Only routes owned here, plus the existing fixed federation service inbox on O4O. */
export function cooperativeNotificationTarget(value: unknown): string | null {
  if (value === "/operator/service-contact/pharmcoop")
    return "https://neture.co.kr/operator/service-contact/pharmcoop";
  if (
    typeof value !== "string" ||
    !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?operator\/inbox$/.test(value)
  )
    return null;
  return value;
}
export function CooperativeNotificationLink({ client }: { client: Client }) {
  return (
    <OperatorNotificationLink
      client={client}
      serviceKey="pharmcoop"
      href="/notifications"
      title="문의 알림"
    />
  );
}
export function CooperativeNotifications({ client }: { client: Client }) {
  return (
    <OperatorNotifications
      client={client}
      serviceKey="pharmcoop"
      title="문의 알림"
      resolveTarget={cooperativeNotificationTarget}
    />
  );
}
