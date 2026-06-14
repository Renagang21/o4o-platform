/**
 * AI Provider Guardrail — 편집 AI provider×surface 안전장치 정책 (SSOT)
 *
 * WO-O4O-AI-PROVIDER-GUARDRAIL-CONFIG-V1
 *
 * 목적: 비-Gemini provider 도입(provider abstraction) **전에** "문을 좁히는" 정책을 코드로 고정한다.
 * - 본 파일은 **정책/설정만** 정의한다. 실제 provider 호출·abstraction·UI 는 후속 WO 가 소비한다.
 * - 거버넌스 근거: `IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`.
 *
 * 경계:
 * - 본 `AiProviderKey`(gemini/qwen/deepseek)는 **O4O 편집 AI 의 provider 정책 축**이며,
 *   backend `AIProvider`(openai/gemini/claude, transport enum)와는 다른 축이다(혼동 금지).
 * - surface 는 `EditingSurface`(editing-preset.ts)를 재사용한다(중복 타입 금지).
 */

import type { EditingSurface } from './editing-preset.js';

/** O4O 편집 AI provider 정책 키. */
export type AiProviderKey = 'gemini' | 'qwen' | 'deepseek';

/** surface 위험도. */
export type AiSurfaceRisk = 'low' | 'medium' | 'high';

/**
 * 편집 surface 위험도 매핑 (IR-DATA-GOVERNANCE §7 기준, 보수적).
 * - low: 비식별 일반 문구 — no-train provider 조건부 가능
 * - medium: 공급사 원문/강의자료 등 준-독점 섞일 수 있음 — admin opt-in
 * - high: 편집 AI surface 에는 없음(고위험은 데이터 등급 — HIGH_RISK_DATA_TYPES)
 */
export const SURFACE_RISK: Record<EditingSurface, AiSurfaceRisk> = {
  pop: 'low',
  qr: 'low',
  blog: 'low',
  'product-description': 'medium',
  'library-entry': 'medium',
  resource: 'medium',
  'lms-lesson': 'medium',
};

/** provider별 guardrail. */
export interface AiProviderGuardrail {
  /** 기본 provider 로 선택 가능한가(Gemini 만 true). */
  defaultAllowed: boolean;
  /** admin 이 명시 선택해야 사용 가능한가. */
  requiresAdminOptIn: boolean;
  /** 이 provider 가 처리 허용되는 surface 화이트리스트. */
  allowedSurfaces: EditingSurface[];
  /** 민감 도메인 기본 provider 인가(Gemini). */
  sensitiveDefault?: boolean;
  /** 데이터 레지던시(있을 때). */
  region?: 'singapore' | 'china' | 'global';
  /** admin 선택 시 경고 노출 필요 여부. */
  warningRequired?: boolean;
  /** 차단/제한 사유(문서·UI copy 용). */
  note?: string;
}

/**
 * provider×surface guardrail registry.
 * - **gemini**: 기본값·민감 도메인 default, 전 편집 surface 허용.
 * - **qwen**(Alibaba Model Studio International/Singapore, no-train): admin opt-in + **저위험 surface(pop/qr/blog)만** 1차 허용.
 * - **deepseek**(1st-party api.deepseek.com): 데이터 거버넌스 위험 → **기본 금지(allowedSurfaces 비움)**.
 */
export const AI_PROVIDER_GUARDRAILS: Record<AiProviderKey, AiProviderGuardrail> = {
  gemini: {
    defaultAllowed: true,
    requiresAdminOptIn: false,
    allowedSurfaces: ['pop', 'qr', 'blog', 'product-description', 'library-entry', 'resource', 'lms-lesson'],
    sensitiveDefault: true,
    region: 'global',
    note: 'O4O 편집 AI 기본 provider. 민감 도메인 default 유지.',
  },
  qwen: {
    defaultAllowed: false,
    requiresAdminOptIn: true,
    allowedSurfaces: ['pop', 'qr', 'blog'], // 1차 저위험 surface 한정 (medium 은 surface risk matrix 후 확장)
    region: 'singapore',
    warningRequired: true,
    note: 'Alibaba Model Studio International(Singapore, no-train). admin opt-in + 저위험 surface 실험만. 기본값 아님.',
  },
  deepseek: {
    defaultAllowed: false,
    requiresAdminOptIn: true,
    allowedSurfaces: [], // 기본 금지
    region: 'china',
    warningRequired: true,
    note: 'first-party API(api.deepseek.com)는 데이터 중국 저장·학습 사용 가능·no-train 불명확 → O4O 편집 AI 미승인. open-weight 서방 no-train 호스트 경로는 별도 재평가.',
  },
};

/**
 * 모든 외부 provider(Gemini 포함) 전송 **금지** 데이터 유형.
 * - 편집 AI(마케팅/교육 콘텐츠 작성) 입력에 애초 투입 대상이 아니며, 진입 자체를 차단해야 한다.
 * - 본 WO 는 DLP 를 구현하지 않으나, 원칙을 SSOT 로 고정한다(후속 enforcement 가 참조).
 */
export const HIGH_RISK_DATA_TYPES: readonly string[] = [
  '환자 정보',
  '처방/조제 데이터',
  '개인 식별 정보(PII)',
  '약국 내부 매출/거래 정보',
  '비공개 계약/가격/정산 정보',
  '민감한 협회/단체 내부 문서',
];

/** admin provider 선택 화면용 경고 copy(후속 UI 가 소비). */
export const PROVIDER_WARNINGS: Partial<Record<AiProviderKey, string>> = {
  qwen: 'Qwen(Alibaba Model Studio, Singapore)은 관리자 명시 선택 시 저위험 surface(POP/QR/블로그) 실험용으로만 사용됩니다. 환자/처방/개인정보/계약정보는 AI 입력 금지입니다.',
  deepseek: 'DeepSeek 1st-party API는 데이터 거버넌스 위험으로 현재 O4O 편집 AI에 사용하지 않습니다.',
};

/** provider 가 해당 surface 를 처리 허용하는지. */
export function isProviderAllowedForSurface(provider: AiProviderKey, surface: EditingSurface): boolean {
  return AI_PROVIDER_GUARDRAILS[provider]?.allowedSurfaces.includes(surface) ?? false;
}

/** provider guardrail 조회. */
export function getProviderGuardrail(provider: AiProviderKey): AiProviderGuardrail | undefined {
  return AI_PROVIDER_GUARDRAILS[provider];
}
