import { PublicServiceContact } from "../service-entry/PublicServiceContact.js";
import { PublicContactForm } from "./PublicContactForm.js";
/** The API resolves service/business/cooperative scope; no organization or role comes from the form. */
export function ScopedContactForm({
  client,
  endpoint,
  title = "문의하기",
  privacyHref = "/privacy",
}: {
  client: { get: (url: string) => Promise<unknown>; post: (url: string, body: unknown) => Promise<unknown> };
  endpoint: string;
  title?: string;
  privacyHref?: string;
}) {
  const service = /^\/operator-inbox\/service\/([a-z][a-z0-9-]*)$/.exec(endpoint)?.[1];
  if (service) return <PublicServiceContact key={service} serviceKey={service} client={client} privacyHref={privacyHref}/>;
  return (
    <section style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>{title}</h1>
      <PublicContactForm
        key={endpoint}
        serviceKey="scoped"
        privacyHref={privacyHref}
        introText="이 공간의 담당 운영자에게 문의를 전달합니다."
        submitInquiry={async (payload) => {
          try {
            const response = await client.post(`${endpoint}/contact`, payload) as {
              data?: { data?: { id?: string }; id?: string }; id?: string;
            };
            const id=response?.data?.data?.id ?? response?.data?.id ?? response?.id;
            return { id: typeof id === "string" ? id : undefined };
          } catch {
            throw new Error(
              "문의를 접수하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.",
            );
          }
        }}
      />
    </section>
  );
}
