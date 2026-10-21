import { ServiceContactInboxLink } from "@o4o/shared-space-ui";
import { useNotifications } from "@o4o/account-ui";
import { notificationsApi } from "../../lib/api/notifications";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ContactInquiryAdminPage,
  type ContactInquiryApi,
} from "@o4o/operator-core-ui/modules/contact-inquiry";
import { api } from "../../lib/apiClient";
import { useAuth } from "../../contexts";

/** Authenticated shell only; the API checks each service's live operator membership and role. */
export default function ServiceContactPage() {
  const { serviceKey = "neture" } = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <p>계정을 확인하고 있습니다…</p>;
  if (!isAuthenticated || !user)
    return (
      <section className="p-6">
        <p>문의 관리는 담당 운영자의 로그인이 필요합니다.</p>
        <Link
          to={`/login?returnUrl=${encodeURIComponent(`/operator/service-contact/${serviceKey}`)}`}
        >
          로그인
        </Link>
      </section>
    );
  return (
    <ContactWorkspace
      key={`${user.id}:${serviceKey}`}
      serviceKey={serviceKey}
      user={user}
    />
  );
}
function ContactWorkspace({
  serviceKey,
  user,
}: {
  serviceKey: string;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  const alerts = useNotifications(notificationsApi, {
    enabled: true,
    serviceKey: ["store", "hospital"].includes(serviceKey)
      ? "neture"
      : serviceKey,
    pollIntervalMs: 30000,
  });
  const client = useMemo<ContactInquiryApi>(() => {
    const base = `/admin/services/${encodeURIComponent(serviceKey)}/contact-inquiries`;
    return {
      getReplies: async (_key, id) =>
        (await api.get(`${base}/${id}/replies`)).data.data,
      sendReply: async (_key, id, input) =>
        (await api.post(`${base}/${id}/replies`, input)).data.data,
      retryNotifications: async (_key, id) =>
        (await api.post(`${base}/${id}/retry-notifications`, {})).data.data,
      list: async (_key, params) => (await api.get(base, { params })).data.data,
      getDetail: async (_key, id) => (await api.get(`${base}/${id}`)).data.data,
      setStatus: async (_key, id, status) =>
        (await api.patch(`${base}/${id}/status`, { status })).data.data,
      setNote: async (_key, id, internalNote) =>
        (await api.patch(`${base}/${id}/note`, { internalNote })).data.data,
    };
  }, [serviceKey, user?.id]);
  const canConfigure = useContactSettingsAccess(serviceKey, user.id);
  return (
    <>
      <nav className="flex flex-wrap gap-4 p-4">
        <Link to="/">서비스로 돌아가기</Link>
        {["neture", "store", "hospital"].includes(serviceKey) &&
          ["neture", "store", "hospital"].map((key) => (
            <ServiceContactInboxLink
              key={key}
              client={api}
              serviceKey={key}
              accountId={user.id}
              enabled
              label={
                key === "neture"
                  ? "O4O 문의"
                  : key === "store"
                    ? "내 매장 문의"
                    : "원내 약품 문의"
              }
              href={`/operator/service-contact/${key}`}
            />
          ))}
        {canConfigure && (
          <Link to={`/operator/service-contact/${serviceKey}/settings`}>
            문의 알림 설정
          </Link>
        )}
        {serviceKey === "neture" && (
          <Link to="/operator/contact-messages">이전 문의 보기</Link>
        )}
        {serviceKey === "kpa-society" &&
          user.roles.some((role) =>
            ["kpa:operator", "kpa:admin"].includes(role),
          ) &&
          user.memberships?.some(
            (m) => m.serviceKey === "kpa-society" && m.status === "active",
          ) && (
            <a href="https://pharmacy.neture.co.kr/operator/collaboration-requests">
              이전 문의 보기
            </a>
          )}
      </nav>
      <section className="px-4" aria-label="서비스 알림">
        <button
          type="button"
          onClick={() => {
            void alerts.refetchCount();
            void alerts.refetchList();
          }}
        >
          서비스 새 알림 {alerts.unreadCount}
        </button>
        <ul>
          {alerts.notifications.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void alerts.markAsRead(item.id)}
              >
                {item.title}
                {!item.isRead ? " · 읽지 않음" : ""}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <ContactInquiryAdminPage
        key={`${user?.id}:${serviceKey}`}
        serviceKey={serviceKey}
        api={client}
        title="서비스 문의 관리"
      />
    </>
  );
}

/** Reuse the protected settings GET; only the confirmed capability enters state. */
function useContactSettingsAccess(serviceKey: string, accountId: string) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true,
      sequence = 0;
    setAllowed(false);
    const read = async () => {
      const request = ++sequence;
      try {
        const response = await api.get(
          `/admin/services/${encodeURIComponent(serviceKey)}/contact-settings`,
        );
        if (active && request === sequence)
          setAllowed(
            response.data?.success === true &&
              response.data?.data?.serviceKey === serviceKey,
          );
      } catch {
        if (active && request === sequence) setAllowed(false);
      }
    };
    void read();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") void read();
    }, 30000);
    window.addEventListener("focus", read);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", read);
    };
  }, [serviceKey, accountId]);
  return allowed;
}
