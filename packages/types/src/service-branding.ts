/**
 * Service Branding — O4O 플랫폼 서비스별 브랜딩 SSOT
 *
 * WO-KPA-BRANDING-UNIFICATION-V1
 *
 * 모든 서비스의 표시 이름·설명은 이 파일에서 정의한다.
 * 하드코딩 금지 — 반드시 이 config를 참조할 것.
 */

export interface ServiceBrandingInfo {
  /** 서비스 표시 이름 (UI에 노출) */
  displayName: string;
  /** 짧은 설명 (선택) */
  subtitle?: string;
}

/**
 * 서비스 키 → 브랜딩 정보 매핑.
 * Header, RegisterPage, ServiceSwitcher 등에서 공통 사용.
 */
export const SERVICE_BRANDING: Record<string, ServiceBrandingInfo> = {
  'kpa-society': { displayName: 'KPA-Society', subtitle: '약사 전문 플랫폼' },
  glycopharm:    { displayName: 'GlycoPharm',  subtitle: '혈당 관리 플랫폼' },
  glucoseview:   { displayName: 'GlucoseView' },
  neture:        { displayName: 'Neture',      subtitle: 'B2B 유통 플랫폼' },
  'k-cosmetics': { displayName: 'K-Cosmetics', subtitle: 'K-Beauty 전문 플랫폼' },
  platform:      { displayName: 'O4O 플랫폼' },
};

/**
 * 서비스 키로 표시 이름을 가져온다.
 * 매핑에 없으면 키 자체를 반환.
 */
export function getServiceDisplayName(serviceKey: string): string {
  return SERVICE_BRANDING[serviceKey]?.displayName ?? serviceKey;
}
