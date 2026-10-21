import { PublicServiceContact } from "@o4o/shared-space-ui";
import { api } from "../lib/apiClient";
export default function ContactPage() {
  return (
    <main className="page">
      <PublicServiceContact
        serviceKey="lecture"
        client={api}
        privacyHref="/privacy"
        introText="이용 신청, 강의 개설과 운영 협업에 관한 문의를 강의 서비스 운영자가 확인합니다."
        inquiryTypes={[
          { value: "account_permission", label: "서비스 이용 신청" },
          { value: "partnership", label: "강의 개설 · 협업" },
          { value: "technical_issue", label: "이용 중 오류" },
          { value: "other", label: "기타" },
        ]}
      />
    </main>
  );
}
