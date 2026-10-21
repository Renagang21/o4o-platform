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
  client: { post(path: string, body: unknown): Promise<unknown> };
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
      <PublicContactForm
        key={serviceKey}
        serviceKey={serviceKey}
        privacyHref={privacyHref}
        inquiryTypes={inquiryTypes}
        introText={introText}
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
            throw new Error(
              e.response?.data?.error?.message ||
                "문의를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            );
          }
        }}
      />
    </section>
  );
}
