/**
 * Platform Components - 공개 안내 페이지 공통 부품
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §3·§15:
 *   ServiceCard(지부 'demo' / 분회 'independent' 변형) · PlatformHeader · PlatformFooter 는
 *   지부·분회 시대 잔재라 제거했다. 안내 페이지의 header/footer 는
 *   canonical Layout(KpaGlobalHeader + Footer) 하나만 쓴다 — 중복 chrome 금지.
 */

export { InfoPageLayout } from './InfoPageLayout';
export { JoinInquiryForm, type InquiryType, type JoinInquiryFormProps } from './JoinInquiryForm';
