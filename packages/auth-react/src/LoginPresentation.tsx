import { useId, type ReactNode } from "react";
import "./login-presentation.css";

type Tone = "green" | "blue" | "indigo" | "slate";

/** 실제 도형으로 구성한 SVG 원본. 협업체는 logoSrc를 지정해 독자 로고로 교체한다. */
export const O4O_LOGO_SRC = new URL('./assets/o4o-logo.svg', import.meta.url).href;
export const NETURE_LOGO_SRC = new URL('./assets/neture-logo.svg', import.meta.url).href;

function AccountMark({ src = O4O_LOGO_SRC }: { src?: string }) {
  return <img src={src} alt="" aria-hidden="true" />;
}

/** Presentation only: each service retains its own authentication and return navigation. */
export function LoginCard({
  brand,
  title,
  description,
  tone = "green",
  onClose,
  heading = "h1",
  logoSrc,
  children,
}: {
  brand: string;
  title: string;
  description?: string;
  tone?: Tone;
  onClose?: () => void;
  heading?: "h1" | "h2";
  logoSrc?: string;
  children: ReactNode;
}) {
  const id = useId();
  const Heading = heading;
  return (
    <section
      className="o4o-login-card o4o-login-surface"
      data-tone={tone}
      aria-labelledby={id}
    >
      {onClose && (
        <button
          type="button"
          className="o4o-login-close"
          onClick={onClose}
          aria-label="로그인 창 닫기"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      )}
      <header className="o4o-login-header">
        <div className="o4o-login-brand">
          <span className="o4o-login-mark">
            <AccountMark src={logoSrc} />
          </span>
          <span>
            {brand}
            <small>O4O ACCOUNT</small>
          </span>
        </div>
        <Heading id={id} className="o4o-login-title">
          {title}
        </Heading>
        {description && <p className="o4o-login-description">{description}</p>}
      </header>
      <div className="o4o-login-body">{children}</div>
    </section>
  );
}

export function LoginLayout({
  brand,
  headline,
  description,
  tone = "green",
  logoSrc,
  children,
}: {
  brand: string;
  headline: ReactNode;
  description: string;
  tone?: Tone;
  logoSrc?: string;
  children: ReactNode;
}) {
  return (
    <main className="o4o-login-page" data-tone={tone}>
      <div className="o4o-login-layout">
        <aside className="o4o-login-story">
          <div className="o4o-login-story-brand">
            <AccountMark src={logoSrc} />
            {brand}
          </div>
          <p className="o4o-login-story-label">오늘의 연결, 더 나은 내일</p>
          <h2 className="o4o-login-headline">{headline}</h2>
          <p className="o4o-login-story-description">{description}</p>
          <div className="o4o-login-art" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>o4o</span>
          </div>
          <p className="o4o-login-signature">
            하나의 계정으로 이어지는 O4O 서비스
          </p>
        </aside>
        <div className="o4o-login-page-card">{children}</div>
      </div>
    </main>
  );
}
