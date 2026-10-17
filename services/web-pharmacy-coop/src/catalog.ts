import type { Cooperative } from "./domain";

// Until a server-backed directory is connected, production contains no invented cooperatives.
export const cooperatives: readonly Cooperative[] = [];

// Explicit opt-in, development-only structural preview. No real memberships or identities.
export const previewCooperatives: readonly Cooperative[] = [
  {
    id: "preview-a",
    slug: "sample-coop-a",
    name: "예시 협동조합 A",
    introduction:
      "조합원과 함께 약국 경영의 경험과 자료를 나누는 조합 공간입니다.",
    eligibilityDescription:
      "조합이 정한 자격을 갖춘 개인. 비약사도 조합의 가입 기준에 따라 참여할 수 있습니다.",
  },
  {
    id: "preview-b",
    slug: "sample-coop-b",
    name: "예시 협동조합 B",
    introduction:
      "독립된 회원관리와 서비스를 운영하는 두 번째 조합 공간입니다.",
    eligibilityDescription:
      "이 조합의 가입 자격은 별도로 정합니다. 다른 조합에도 함께 가입할 수 있습니다.",
  },
];
