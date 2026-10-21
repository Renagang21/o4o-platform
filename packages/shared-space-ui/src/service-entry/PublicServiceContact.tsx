import { useEffect, useState } from "react";
import {
  PublicContactForm,
  type PublicContactFormProps,
} from "../legal/PublicContactForm";
import {
  PUBLIC_SERVICE_ENTRIES,
  isPublicServiceKey,
} from "./PublicServiceEntry";

export function PublicServiceContact({
  serviceKey,
  client,
  privacyHref = "https://neture.co.kr/privacy",
  inquiryTypes,
  introText,
}: {
  serviceKey: string;
  client: ContactClient;
  privacyHref?: string;
  inquiryTypes?: PublicContactFormProps["inquiryTypes"];
  introText?: string;
}) {
  const name =
    serviceKey === "neture"
      ? "O4O"
      : serviceKey === "kpa-branch"
        ? "약사회 분회 서비스 안내"
        : serviceKey === "kpa-society"
          ? PUBLIC_SERVICE_ENTRIES.pharmacy.name
          : isPublicServiceKey(serviceKey)
            ? PUBLIC_SERVICE_ENTRIES[serviceKey].name
            : null;
  if (!name) return <p role="alert">문의할 서비스를 확인해 주세요.</p>;
  return (
    <section style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        {name} 문의
      </h1>
      <p style={{ lineHeight: 1.8, marginBottom: 20 }}>
        로그인이나 서비스 가입 없이 문의할 수 있습니다. 담당자가 확인 후
        입력하신 이메일로 답변합니다.
      </p>
      <ConfiguredContactForm
        key={serviceKey}
        serviceKey={serviceKey}
        client={client}
        privacyHref={privacyHref}
        inquiryTypes={inquiryTypes}
        introText={introText}
      />
    </section>
  );
}

interface ContactClient {
  get(path: string): Promise<unknown>;
  post(path: string, body: unknown): Promise<unknown>;
}
interface PublicPolicy {
  serviceKey: string;
  inquiryTypesConfigured: boolean;
  inquiryTypes: { value: string; label: string }[];
  privacyNotice: string | null;
  completionNotice: string | null;
}
function ConfiguredContactForm({
  serviceKey,
  client,
  privacyHref,
  inquiryTypes,
  introText,
}: {
  serviceKey: string;
  client: ContactClient;
  privacyHref: string;
  inquiryTypes?: PublicContactFormProps["inquiryTypes"];
  introText?: string;
}) {
  const [policy, setPolicy] = useState<PublicPolicy | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setPolicy(null);
    setLoadError(false);
    void client
      .get(
        `/public/services/${encodeURIComponent(serviceKey)}/contact-settings`,
      )
      .then((response) => {
        const data = (response as { data?: { data?: PublicPolicy } })?.data
          ?.data;
        if (
          !data ||
          data.serviceKey !== serviceKey ||
          typeof data.inquiryTypesConfigured !== "boolean" ||
          (data.privacyNotice !== null && typeof data.privacyNotice !== "string") ||
          (data.completionNotice !== null && typeof data.completionNotice !== "string") ||
          !Array.isArray(data.inquiryTypes) ||
          data.inquiryTypes.some(
            (type) =>
              typeof type.value !== "string" || typeof type.label !== "string",
          )
        )
          throw Error("Invalid public contact policy");
        if (active) setPolicy(data);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [client, serviceKey, attempt]);
  if (loadError)
    return (
      <div role="alert">
        문의 설정을 불러오지 못했습니다.{" "}
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          다시 불러오기
        </button>
      </div>
    );
  if (!policy) return <p role="status">문의 설정을 불러오는 중입니다.</p>;
  const types = policy.inquiryTypesConfigured
    ? policy.inquiryTypes
    : inquiryTypes || policy.inquiryTypes;
  if (!types.length)
    return (
      <p role="status">
        현재 선택할 수 있는 문의 유형이 없습니다. 잠시 후 다시 확인해 주세요.
      </p>
    );
  return (
    <PublicContactForm
      serviceKey={serviceKey}
      privacyHref={privacyHref}
      inquiryTypes={types}
      introText={introText}
      privacyNotice={policy.privacyNotice || undefined}
      completionNotice={policy.completionNotice || undefined}
      submitInquiry={async (payload) => {
        try {
          const response = (await client.post(
            `/public/services/${encodeURIComponent(serviceKey)}/contact-inquiries`,
            payload,
          )) as { data?: { data?: { id?: string } } };
          return { id: response.data?.data?.id };
        } catch (error) {
          const e = error as {
            response?: { data?: { error?: { message?: string } } };
          };
          throw Error(
            e.response?.data?.error?.message ||
              "문의를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
        }
      }}
    />
  );
}
