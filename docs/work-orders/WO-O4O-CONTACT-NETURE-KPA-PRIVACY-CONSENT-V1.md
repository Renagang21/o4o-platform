# WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1

> **유형:** 구현 (개인정보 동의 + Neture IP hash 전환)
> **선행 IR:** [IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1](../investigations/IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1.md)
> **선행 WO:** [WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1](WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md)
> **작성일:** 2026-06-13
> **CHECK 산출물:** `docs/checks/CHECK-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1.md`

---

## 1. 목적
Neture/KPA 공개 Contact form에 개인정보 수집·이용 동의 절차를 추가하고, Neture 문의 저장 시 IP 원문 → SHA256 hash 전환. IR §7 주의신호 ①(동의 부재)·②(Neture IP 원문 저장) 정렬. `ContactInquiry` 이관 없이 기존 구조 유지.

## 2. 핵심 원칙
1. 기존 저장소·route·운영 UI 유지
2. `ContactInquiry` 이관 안 함
3. 공개 form에 동의 체크 추가, 미동의 시 submit 차단 (frontend)
4. backend도 동의 필드 검증 (미동의 → 400, 저장·알림 없음)
5. Neture 신규 저장부터 IP 원문 대신 hash
6. 기존 데이터 파괴 금지 (legacy `ipAddress` 컬럼 drop 안 함)
7. GP/KCos 미수정

## 3. 작업 대상
`apps/api-server/**`, `services/web-neture/**`, `services/web-kpa-society/**`, CHECK 문서. (공통 유틸 필요 시 `packages/**` 조건부.)

## 4. 제외
ContactInquiry 이관 / 운영 UI 교체 / submit route 변경 / email·자동회신 구조 변경 / Admin 설정 변경 / 법정정보·약관·푸터 / GP·KCos 수정 / **기존 Neture IP 원문 데이터 일괄 삭제·변환**(후속 cleanup WO) / 개인정보처리방침 본문 작성.

## 5. 선행 상태
Neture/KPA = 기존 저장소·운영 UI 유지 + ServiceContactSettings 기반 email·자동회신 연결됨(설정 adapter WO). 동의 체크 없음. Neture IP 원문 저장 잔존.

## 6. Neture 구현 기준
### 6.1 Frontend (`services/web-neture/src/pages/ContactPage.tsx`, `lib/api/contact.ts`)
- 개인정보 수집·이용 동의 체크박스 + 개인정보처리방침 링크(`/privacy`)
- 미동의 시 제출 차단 (validation message)
- payload에 `privacyConsent: true` 포함 (`ContactFormData`에 필드 추가)
- 권장 문구: "문의 접수와 회신을 위해 입력한 개인정보를 수집·이용하는 데 동의합니다."

### 6.2 Backend (`contact.controller.ts`, `NetureContactMessage.entity.ts`)
- `privacyConsent === true` 검증, 누락 시 400 `PRIVACY_CONSENT_REQUIRED` (저장·알림 없음)
- 신규 저장 시 IP 원문 대신 SHA256 hash → `ipHash` 컬럼. 신규 `ipAddress`는 null
- `privacyConsent` 컬럼 추가, 신규 저장 true
- 기존 `ipAddress` 컬럼 drop 금지(legacy 보존). userAgent 정책 유지

## 7. KPA 구현 기준
### 7.1 Frontend (`pages/contact/ContactModal.tsx`, `api/contactRequest.ts`)
- 동의 체크박스 + 개인정보처리방침 링크(`/privacy`), 미동의 시 차단
- payload에 `privacyConsent: true` (`ContactRequestPayload`에 필드 추가)
- "약사·약대생 커뮤니티" 정체성 유지

### 7.2 Backend (`contact-request.controller.ts`, `ContactRequest.ts`)
- `privacyConsent === true` 검증, 누락 시 400 `PRIVACY_CONSENT_REQUIRED`
- `privacy_consent` 컬럼 추가, 신규 저장 true
- KPA는 IP 미저장 → IP hash 추가 불필요. userAgent/IP 신규 추적 추가 금지

## 8. DB/migration
additive only. 후보: `neture_contact_messages."ipHash" VARCHAR(64) NULL`, `neture_contact_messages."privacyConsent" BOOLEAN DEFAULT false`, `contact_requests.privacy_consent BOOLEAN DEFAULT false`. 기존 데이터 무영향(기존 row false/null), 신규부터 true. 기존 IP 원문 컬럼 drop 금지. down 정의. seed 없음.

## 9. API validation
미동의 → 400 `PRIVACY_CONSENT_REQUIRED` (기존 error style). name/email/message 기존 검증 유지. 동의 실패 시 DB 저장·알림 없음. email·자동회신 best-effort 유지.

## 10. 개인정보/보안
frontend+backend 양쪽 검증 · IP 원문 신규 저장 중단 · SHA256 일방향 hash · secret/salt 문서 미기재 · plain text 처리 · 로그 전문 과다 금지 · email/autoreply 실패가 접수 실패 안 됨 · 처리방침 본문 미작성.

## 11. 기존 구조 유지
Neture: `POST /neture/contact`, `/admin/contact-messages`, `/operator/contact-messages`. KPA: `POST /api/v1/kpa/contact-requests`, `/operator/collaboration-requests`. 동의 검증 + IP hash 보강이며 운영 UI 교체 아님.

## 12. Smoke (배포 후)
### Neture (`/contact`, `/admin/contact-messages`)
① 동의 체크박스 노출 ② 미동의 제출 frontend 차단 ③ 동의 누락 API 직접 호출 → 400 ④ 동의 후 201 ⑤ admin 목록 확인 ⑥ notification_status 기존대로 ⑦ email/autoreply 설정 ON 시 기존 동작 ⑧ 신규 row `ipHash` 저장 ⑨ 신규 row IP 원문 미저장 ⑩ 테스트 문의 처리 ⑪ 설정 복구
### KPA (`/contact`, `/operator/collaboration-requests`)
① 동의 체크박스 ② 미동의 차단 ③ 동의 누락 API → 400 ④ 동의 후 201 ⑤ operator 목록 확인 ⑥ notification_status 기존대로 ⑦ email/autoreply 기존 동작 ⑧ 테스트 처리 ⑨ 설정 복구

## 13. 검증 기준
1~2 동의 추가(Neture/KPA) · 3~4 backend 동의 거부 · 5 동의 후 정상 · 6 Neture hash 저장 · 7~8 email/autoreply·in-app 회귀 없음 · 9 운영 UI 유지 · 10 GP/KCos 미수정 · 11 ContactInquiry 미이관 · 12 backend tsc · 13 web tsc · 14 migration additive 적용 · 15 브라우저 smoke.

## 14. 배포
backend 변경 → API Server. Neture/KPA web 변경 → 각각. ⚠️ detect-changes가 push tip 기준 skip 가능 → 라이브 확인 + 필요 시 `workflow_dispatch` 대상 재배포.

## 15. staged 파일 가드
`git diff --cached --name-only` 확인. 허용: `apps/api-server/**`, `services/web-neture/**`, `services/web-kpa-society/**`, CHECK. 조건부 `packages/**`. **금지: `services/web-glycopharm/**`, `services/web-k-cosmetics/**`.** commit은 명시 경로.

## 16. CHECK 문서
완료 후 `docs/checks/CHECK-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1.md` 생성. 기록: 목적·선행 반영·Neture/KPA 동의 추가·backend validation·Neture IP hash 전환·migration·기존 구조 유지·email/autoreply·in-app 회귀·GP/KCos 미수정·ContactInquiry 미사용·Neture smoke·KPA smoke·테스트 처리·검증·배포·commit hash.

## 17. 후속
1. `WO-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1` — 기존 `ipAddress` 원문 보존/삭제/마스킹 정책
2. `WO-O4O-CONTACT-NETURE-MIGRATION-TO-CONTACT-INQUIRY-V1` (필요 시)
3. `WO-O4O-CONTACT-KPA-MIGRATION-TO-CONTACT-INQUIRY-V1` (필요 시)

> **특히 Neture IP 원문 신규 저장 중단**은 통합 여부와 별개로 먼저 정리.

---

*End of WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1*
