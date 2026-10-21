import type { ReactNode } from "react";

/** Public descriptions only. This catalog never grants access or fetches private workspace data. */
export const PUBLIC_SERVICE_ENTRIES = {
  supplier: {
    name: "공급자",
    description:
      "제품과 자료를 등록하고, 참여 매장에 공급하는 서비스를 알아보세요.",
    features: [
      "공급 제품과 자료 관리",
      "참여 매장과의 공급 업무",
      "신청부터 승인까지 이용 안내",
    ],
  },
  funding: {
    name: "유통참여형 펀딩",
    description:
      "제품과 유통참여형 펀딩 소식을 확인하고 참여 방법을 알아보세요.",
    features: [
      "제품과 사업 소식",
      "참여 조건과 이용 안내",
      "본인의 참여 현황 확인",
    ],
  },
  pharmacy: {
    name: "O4O 약국 경영지원",
    description: "약국 운영에 필요한 소식과 자료, 협력사업을 만나보세요.",
    features: [
      "약국 운영 자료",
      "협력약국 소식과 커뮤니티",
      "사업별 참여 신청과 이용 안내",
    ],
  },
  megapharm: {
    name: "메가팜 · 창고형 약국",
    description: "창고형 약국 협력사업의 참여 방법과 제공 기능을 알아보세요.",
    features: [
      "협력사업 참여 안내",
      "회원 약국의 소식",
      "승인된 약국을 위한 자료와 도구",
    ],
  },
  carepharm: {
    name: "CarePharm · 만성질환관리",
    description: "만성질환관리 협력사업과 약국의 참여 방법을 알아보세요.",
    features: [
      "협력사업 소개",
      "회원 활동과 소식",
      "참여 약국을 위한 자료와 도구",
    ],
  },
  pharmcoop: {
    name: "약국·약사 협동조합",
    description: "협동조합을 둘러보고 조합별 참여 조건과 활동을 확인하세요.",
    features: ["협동조합 탐색", "조합별 참여 안내", "회원 활동과 소식"],
  },
  community: {
    name: "커뮤니티",
    description: "공개 콘텐츠를 둘러보고 정보와 경험을 나누세요.",
    features: ["공개 콘텐츠와 소식", "회원 커뮤니티", "가입과 이용 안내"],
  },
  lecture: {
    name: "O4O 강의",
    description: "공개 강의를 둘러보고 필요한 교육을 찾아보세요.",
    features: ["강의 탐색", "수강과 학습", "강의 개설과 협업 문의"],
  },
  "kpa-branch": {
    name: "약사회 분회",
    description: "소속 분회를 찾고 가입과 회원 활동을 알아보세요.",
    features: ["분회 찾기", "분회별 가입 안내", "회원 활동과 소식"],
  },
  store: {
    name: "내 매장",
    description: "소속 매장의 제품·콘텐츠와 운영 업무를 관리하는 공간입니다.",
    features: ["매장 제품과 콘텐츠", "소속과 직원 업무", "매장 시작하기 안내"],
  },
  hospital: {
    name: "원내 약품 파일 도구",
    description: "이 PC에서 선택한 원내 약품 파일을 사용하는 공용 도구입니다.",
    features: ["원내 약품 파일 연결", "병동 약품 검색", "로컬 파일 사용 안내"],
  },
} as const;
export type PublicServiceKey = keyof typeof PUBLIC_SERVICE_ENTRIES;
export function isPublicServiceKey(value: string): value is PublicServiceKey {
  return Object.prototype.hasOwnProperty.call(PUBLIC_SERVICE_ENTRIES, value);
}
export function serviceContactUrl(serviceKey: string) {
  return `https://neture.co.kr/contact?service=${encodeURIComponent(serviceKey)}`;
}

export function PublicServiceEntry({
  serviceKey,
  loginHref,
  actionHref,
  actionLabel = "신청 · 이용 상태 확인",
  contactHref,
  children,
}: {
  serviceKey: PublicServiceKey;
  loginHref?: string;
  actionHref?: string;
  actionLabel?: string;
  contactHref?: string;
  children?: ReactNode;
}) {
  const service = PUBLIC_SERVICE_ENTRIES[serviceKey];
  const section = {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: "clamp(20px, 4vw, 36px)",
    background: "#fff",
  };
  const button = {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    textDecoration: "none",
    color: "#0f172a",
    background: "#fff",
  };
  return (
    <article
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "32px 16px",
        color: "#0f172a",
        overflowWrap: "anywhere",
      }}
    >
      <header style={section}>
        <h1
          style={{
            fontSize: "clamp(26px, 4vw, 38px)",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          {service.name}
        </h1>
        <p style={{ lineHeight: 1.8 }}>{service.description}</p>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}
        >
          {(actionHref || loginHref) && (
            <a style={button} href={actionHref || loginHref}>
              {loginHref && !actionHref ? "로그인하고 이용하기" : actionLabel}
            </a>
          )}
          {loginHref && (
            <a style={button} href="https://neture.co.kr/signup">
              O4O 회원가입
            </a>
          )}
          <a style={button} href={contactHref || serviceContactUrl(serviceKey)}>
            Contact Us
          </a>
        </div>
      </header>
      <section aria-label="주요 기능" style={{ ...section, marginTop: 20 }}>
        <h2 style={{ fontSize: 21, fontWeight: 600 }}>
          이런 기능을 제공합니다
        </h2>
        <ul style={{ paddingLeft: 24, lineHeight: 2.2 }}>
          {service.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>
      <section aria-label="이용 절차" style={{ ...section, marginTop: 20 }}>
        <h2 style={{ fontSize: 21, fontWeight: 600 }}>이용 방법</h2>
        <p style={{ lineHeight: 1.8 }}>
          소개와 문의는 로그인 없이 이용할 수 있습니다. 회원 전용 기능은 로그인
          후 서비스별 가입·승인 또는 소속 확인을 거쳐 이용합니다.
        </p>
        <details style={{ marginTop: 14 }}>
          <summary>이미 O4O 계정이 있나요?</summary>
          <p>
            기존 계정으로 로그인하세요. 서비스별 가입 상태와 이용 가능한 업무는
            로그인 후 확인할 수 있습니다.
          </p>
        </details>
        <details style={{ marginTop: 14 }}>
          <summary>가입 전에도 문의할 수 있나요?</summary>
          <p>
            Contact Us에서 문의를 남겨 주세요. 해당 서비스 담당자가 확인합니다.
          </p>
        </details>
      </section>
      {children && (
        <section
          aria-label="나의 이용 상태"
          style={{ ...section, marginTop: 20 }}
        >
          {children}
        </section>
      )}
    </article>
  );
}
