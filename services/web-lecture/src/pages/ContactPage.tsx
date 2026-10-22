import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PublicServiceContact } from "@o4o/shared-space-ui";
import { api } from "../lib/apiClient";
export default function ContactPage() {
  const [search] = useSearchParams();
  const courseId = search.get('courseId')?.slice(0, 100);
  const lessonId = search.get('lessonId')?.slice(0, 100);
  const context = courseId ? `강의: ${courseId}${lessonId ? ` / 레슨: ${lessonId}` : ''}` : '';
  const client = useMemo(() => ({
    get: (path: string) => api.get(path),
    post: (path: string, body: unknown) => {
      const form = body as Record<string, unknown>;
      return api.post(path, context && typeof form?.message === 'string'
        ? { ...form, message: `${form.message}\n\n[문의 대상] ${context}` } : body);
    },
  }), [context]);
  return (
    <main className="page">
      {context && <p className="notice">{context} — 접수 내용에 이 강의·레슨 정보가 함께 전달됩니다.</p>}
      <PublicServiceContact
        serviceKey="lecture"
        client={client}
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
