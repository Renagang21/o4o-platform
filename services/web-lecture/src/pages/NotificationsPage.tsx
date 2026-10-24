import { OperatorNotifications } from "@o4o/operator-core-ui";
import { useAuth } from "../contexts/AuthContext";
import { authClient } from "../lib/apiClient";
/** Legacy cross-host notices resolve to the same owned local route. No auth bypass. */
export function lectureNotificationTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let target = value;
  if (target.startsWith("/service-entry/lecture?"))
    target =
      new URL(target, "https://neture.co.kr").searchParams.get("returnPath") ||
      "";
  if (["/my/enrollments", "/my/certificates"].includes(target)) return target;
  return /^\/(?:operator\/courses\/[a-z0-9-]+\/review|instructor\/courses\/[a-z0-9-]+\/edit|courses\/[a-z0-9-]+)$/i.test(
    target,
  )
    ? target
    : null;
}
export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuth();
  if (!user || !isAuthenticated) {
    return <p>로그인 후 알림을 확인해 주세요.</p>;
  }
  return (
    <OperatorNotifications
      key={user.id}
      client={authClient.api}
      serviceKey="lecture"
      title="강의 알림"
      resolveTarget={lectureNotificationTarget}
    />
  );
}
