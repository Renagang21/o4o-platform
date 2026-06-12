/**
 * PublicLegalFooterInfo — 공개 푸터 법정정보 (공통, 동적)
 *
 * WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1
 *
 * serviceKey 기준 public legal-profile(footer-legal) 을 조회해 **값이 있는 항목만** 표시한다.
 * 실제 HTTP 호출은 service 측 `loadProfile` 로 주입(서비스별 apiClient/base 상이).
 * backend: GET /api/v1/public/services/:serviceKey/footer-legal (또는 /legal-profile)
 *   — is_active 법정정보만 반환, 미설정/비활성 → null.
 *
 * 원칙(WO §5):
 *   - 법정정보 하드코딩 금지 — 전부 API 값. 값 없는 항목은 렌더하지 않음(placeholder 금지).
 *   - data:null(미설정/비활성) → 컴포넌트 자체가 아무것도 렌더하지 않음(null 반환).
 *   - API 오류는 silent(법정정보 영역만 비표시) — 푸터 전체가 깨지지 않게.
 *   - 장문 필드(중개고지/구매안전/추가고지)는 plain text 렌더, dangerouslySetInnerHTML 미사용(XSS 회피).
 *   - 색상은 color: inherit 로 각 푸터(밝은/어두운)에 맞춰 상속.
 */

import { type CSSProperties, useEffect, useState } from 'react';

export interface PublicLegalProfileDto {
  serviceKey?: string;
  companyName: string | null;
  representativeName: string | null;
  businessRegistrationNumber: string | null;
  ecommerceRegistrationNumber: string | null;
  ecommerceRegistrationAgency: string | null;
  businessAddress: string | null;
  customerServicePhone: string | null;
  customerServiceEmail: string | null;
  privacyOfficerName: string | null;
  privacyOfficerEmail: string | null;
  privacyOfficerPhone: string | null;
  hostingProvider: string | null;
  businessInfoVerificationUrl: string | null;
  mailOrderBrokerNotice: string | null;
  purchaseSafetyServiceInfo: string | null;
  additionalLegalNotice: string | null;
}

export interface PublicLegalFooterInfoProps {
  serviceKey: string;
  /** service 측 주입: public 법정정보 조회. 미설정/비활성/오류 → null. */
  loadProfile: (serviceKey: string) => Promise<PublicLegalProfileDto | null>;
  /** 컨테이너 style 보정(여백 등). 색상은 기본 inherit. */
  style?: CSSProperties;
  /** 사업자정보확인 링크 색상(미지정 시 inherit). */
  linkColor?: string;
}

const nonEmpty = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim().length > 0;
const joinParts = (parts: Array<string | null | undefined>): string =>
  parts.filter(nonEmpty).join('  |  ');

export function PublicLegalFooterInfo({ serviceKey, loadProfile, style, linkColor }: PublicLegalFooterInfoProps) {
  const [profile, setProfile] = useState<PublicLegalProfileDto | null>(null);

  useEffect(() => {
    let alive = true;
    loadProfile(serviceKey)
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => { if (alive) setProfile(null); }); // silent — 법정정보 영역만 비표시
    return () => { alive = false; };
  }, [loadProfile, serviceKey]);

  if (!profile) return null;

  const rowStyle: CSSProperties = { margin: '2px 0', fontSize: 12, color: 'inherit', lineHeight: 1.6 };

  // WO §10 표시 순서 — 값 있는 항목만.
  const lines: string[] = [];
  const biz = joinParts([
    profile.companyName,
    nonEmpty(profile.representativeName) ? `대표 ${profile.representativeName}` : null,
    nonEmpty(profile.businessRegistrationNumber) ? `사업자등록번호 ${profile.businessRegistrationNumber}` : null,
  ]);
  if (biz) lines.push(biz);
  if (nonEmpty(profile.businessAddress)) lines.push(profile.businessAddress);
  if (nonEmpty(profile.ecommerceRegistrationNumber)) {
    lines.push(
      `통신판매업신고 ${profile.ecommerceRegistrationNumber}` +
        (nonEmpty(profile.ecommerceRegistrationAgency) ? ` (${profile.ecommerceRegistrationAgency})` : ''),
    );
  }
  const cs = joinParts([
    nonEmpty(profile.customerServicePhone) ? `고객센터 ${profile.customerServicePhone}` : null,
    profile.customerServiceEmail,
  ]);
  if (cs) lines.push(cs);
  const po = joinParts([
    nonEmpty(profile.privacyOfficerName) ? `개인정보보호책임자 ${profile.privacyOfficerName}` : null,
    profile.privacyOfficerEmail,
    profile.privacyOfficerPhone,
  ]);
  if (po) lines.push(po);
  if (nonEmpty(profile.hostingProvider)) lines.push(`호스팅 제공: ${profile.hostingProvider}`);
  if (nonEmpty(profile.purchaseSafetyServiceInfo)) lines.push(profile.purchaseSafetyServiceInfo);
  if (nonEmpty(profile.mailOrderBrokerNotice)) lines.push(profile.mailOrderBrokerNotice);
  if (nonEmpty(profile.additionalLegalNotice)) lines.push(profile.additionalLegalNotice);

  if (lines.length === 0 && !nonEmpty(profile.businessInfoVerificationUrl)) return null;

  return (
    <div style={{ color: 'inherit', ...style }}>
      {lines.map((line, i) => (
        <p key={i} style={rowStyle}>{line}</p>
      ))}
      {nonEmpty(profile.businessInfoVerificationUrl) && (
        <p style={rowStyle}>
          <a
            href={profile.businessInfoVerificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: linkColor || 'inherit', textDecoration: 'underline' }}
          >
            사업자정보확인
          </a>
        </p>
      )}
    </div>
  );
}
