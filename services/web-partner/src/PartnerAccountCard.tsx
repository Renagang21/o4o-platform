import type { ReactNode } from "react";
import { EmailLoginOption, LoginCard } from "@o4o/auth-react";

/** 기존 cookie 세션 확인 흐름을 유지한다. 새 창을 사용해 원래 탭의 초대·작성 상태를 보존한다. */
export function PartnerAccountCard({
  children,
  onCheck,
  busy,
  heading = "h1",
}: {
  children: ReactNode;
  onCheck: () => void;
  busy: boolean;
  heading?: "h1" | "h2";
}) {
  return (
    <LoginCard
      brand="O4O Partner"
      title="O4O 계정 로그인"
      heading={heading}
      description="로그인 후 파트너 커뮤니티와 공동공간을 이용하시기 바랍니다."
    >
      <a
        className="o4o-login-primary-link"
        href="https://neture.co.kr/service-entry/partner-support?returnPath=%2Fcommunity"
        target="_blank"
        rel="noopener noreferrer"
      >
        Google·카카오로 로그인 ↗
      </a>
      <p className="o4o-login-description">
        새 창에서 로그인하고 파트너 화면이 열리면 아래에서 로그인 상태를 확인해 주시기 바랍니다.
      </p>
      <button
        type="button"
        className="o4o-auth-choice"
        disabled={busy}
        onClick={onCheck}
      >
        로그인 상태 확인
      </button>
      <div className="my-5" aria-hidden="true">
        또는
      </div>
      <EmailLoginOption>{children}</EmailLoginOption>
    </LoginCard>
  );
}
