import { useAuth } from "../../contexts";
import { HomePresentationEditor } from "@o4o/shared-space-ui";
import { api } from "../../lib/apiClient";

export default function HomePresentationPage({
  surface,
}: {
  surface: "neture" | "supplier" | "funding" | "community" | "carepharm";
}) {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl bg-white">
      {surface === "neture" && (
        <p className="px-5 pt-6 text-sm text-slate-600">CarePharm 홈은 해당 사업의 운영 공간에서 관리합니다. <a className="text-teal-800 underline" href="https://carepharm.neture.co.kr/operator/home-presentation/carepharm">CarePharm 홈·공지 관리</a></p>
      )}
      {surface === "carepharm" && <div className="px-5 pt-6 text-sm leading-6 text-slate-600">
        <p>이곳에서 공개한 공지·안내는 홈의 목록과 개별 상세에 표시됩니다. 최대 3개, 설명은 400자까지 입력하며 긴 자료와 강의는 연결 버튼으로 안내하세요.</p>
        <p>회원 전용 소식은 회원 커뮤니티, 매장에 배포할 자료는 콘텐츠 제작·심사에서 관리하세요.</p>
      </div>}
      <HomePresentationEditor
        key={`${user?.id ?? "anonymous"}:${surface}`}
        surface={surface}
        client={api}
      />
    </div>
  );
}
