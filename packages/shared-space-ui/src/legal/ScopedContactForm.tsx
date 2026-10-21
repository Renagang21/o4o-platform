import { PublicContactForm } from "./PublicContactForm.js";
/** The API resolves service/business/cooperative scope; no organization or role comes from the form. */
export function ScopedContactForm({
  client,
  endpoint,
  title = "문의하기",
  privacyHref = "/privacy",
}: {
  client: { post: (url: string, body: unknown) => Promise<unknown> };
  endpoint: string;
  title?: string;
  privacyHref?: string;
}) {
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
            await client.post(`${endpoint}/contact`, payload);
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
