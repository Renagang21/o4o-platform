# CHECK-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1

> **작업명:** WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
> **유형:** GP/KCos Contact Us 문의 수신·알림 설정 Admin 관리 + submit 알림 정책 연동(이메일 발송 포함)
> **결과: PASS** (api-server tsc 0 / GP·KCos tsc 0 / 배포 success / GP·KCos 브라우저 smoke PASS / submit→notification_status 실증 `inapp:sent;email:off`). — 2026-06-12
> 선행: `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1` · `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1` · `WO-O4O-PUBLIC-INFO-LEGAL-CONTACT-STRUCTURE-MILESTONE-V1`

---

## 1. 작업 목적
GP/KCos 문의 접수 시 알림 채널(in-app/email)·이메일 수신자·문의 유형·안내 문구를 **Admin에서 설정**하도록 한다.
수신 이메일을 코드에 하드코딩하지 않고, 설정 미비로 접수가 실패하지 않으며, 알림 결과를 `notification_status`에 기록한다.

## 2. 선행 반영
- 공개 submit(`POST /public/services/:serviceKey/contact-inquiries`) + `ContactInquiry` 저장 + in-app `contact.new` 알림 + Admin `/admin/contact-inquiries` 위에,
  본 WO에서 **수신·알림 설정 레이어**를 추가하고 submit 알림 로직을 설정 기반으로 전환.

## 3. ServiceContactSettings 구조
- entity `service_contact_settings`(serviceKey unique): `in_app_notification_enabled`(default true) · `email_notification_enabled`(default false) ·
  `recipient_emails`(jsonb, default `[]`) · `inquiry_types`(jsonb nullable) · `privacy_notice`/`completion_notice`(text) · `is_active` · `updated_by` · timestamps.
- migration `20261106000000-CreateServiceContactSettings.ts`(additive, idempotent, **seed 없음** — 수신 이메일 하드코딩 금지). connection.ts 등록.
- helper `contact-settings.helper.ts` — row 없으면 **in-app=on / email=off / 수신자 없음 / 공통 기본 유형** 으로 effective 병합(admin·public 공유).

## 4. Admin API
- `admin-service-contact-settings.controller.ts`: `GET/PUT /:serviceKey/contact-settings`. mount `/api/v1/admin/services`.
- 권한: `requireServiceLegalScope('admin')` 재사용(`{prefix}:admin`) + 화이트리스트 **glycopharm/k-cosmetics**(Neture/KPA 404). operator 기본 접근 없음.
- PUT 검증: 이메일 형식·중복 제거·최대 20개, 이메일 알림 ON인데 수신자 0 → 400. 안내 문구 plain text(길이 제한). 수신 이메일은 **admin 응답에만** 포함.

## 5·6·7. GP/KCos Admin UI / 메뉴·route
- 공통 `ServiceContactSettingsPage`(`@o4o/operator-core-ui/modules/service-contact-settings`): 알림 설정 / 이메일 수신자(추가·삭제·형식검증) / 문의 유형 토글 / 안내 문구. inline style, HTML 렌더 안 함.
- GP/KCos thin wrapper(serviceKey + authClient 어댑터) + route `/admin/settings/contact` + DashboardLayout System 그룹 **"문의 설정"**.

## 8. in-app 알림 설정 처리
- submit 시 `loadContactSettings` 로 effective 조회 → `inAppNotificationEnabled`가 true일 때만 `{prefix}:operator|admin` 대상 `contact.new` 생성.
  꺼져 있으면 in-app 생성 안 함(상태 `inapp:off`).

## 9·10. 이메일 알림 설정 / 실제 발송 구현 여부
- **실제 발송 구현됨** — 기존 `emailService`(@o4o/mail-core)가 미설정 시 throw 없이 `{success:false, error:'...disabled'}` 반환(안전)이라 submit 흐름에 연동.
- `emailNotificationEnabled` true + 수신자 있을 때만 `emailService.sendEmail({to:recipients, subject:[서비스명] 새 문의…, html})` 시도. 본문은 **HTML escape** 후 구성(유형/제목/이름/이메일/소속/연락처/시각/문의내용/Admin 경로).
- 결과 기록(복합, varchar(40) 이내): `notification_status = "inapp:<sent|none|off|fail>;email:<sent|none|off|fail|noprovider>"`.
  - SMTP provider 미설정 환경 → `email:noprovider`(접수·in-app 정상). 발송 실패 → `email:fail`. 접수 성공은 어떤 경우에도 불변.

## 11. 수신 이메일 validation
- 프론트(추가 시 형식 검증·중복 방지) + 백엔드(형식/중복/최대 개수/소문자 정규화). 공개 API는 수신 이메일 미노출. 로그에 이메일 목록/문의 전문 미기록.

## 12. Contact submit 연동
- 공개 form **무변경**(V1). submit API가 설정을 조회해 알림 정책 적용. 문의 유형 동적 로드는 후속.

## 13. Neture/KPA 미수정
- `services/web-neture`·`services/web-kpa-society` **0건**. 화이트리스트로 backend도 해당 serviceKey 거부.

## 14. 개인정보/보안
- 본문/이메일 HTML escape, 안내 문구 plain text(dangerouslySetInnerHTML 미사용), 수신 이메일 admin-only, 로그 최소화.

## 15. 테스트 설정 저장 여부
- GP: 검증 중 `test-operator@example.com`(RFC reserved 비실 주소) 임시 저장 + email ON → **검증 후 수신자 삭제 + email OFF 로 정리**(최종 in-app ON/email OFF/수신자 0).
- KCos: 개인정보 안내 문구만 저장(email OFF 유지). 실 운영 이메일 미사용·실발송 미수행.
- 테스트 문의 1건(GP `[SMOKE] settings notification_status…`) → **spam 처리 완료**(hard delete 없음).

## 16. 검증 결과
- tsc: api-server 0 / web-glycopharm `tsc --noEmit` 0 / web-k-cosmetics `tsc --noEmit` 0 / contact-settings 파일 0 ✅
- migration: additive 1건(seed 없음). CI/CD 자동 적용.
- 참고: 로컬 `npm run build`(`tsc -b`)에서 `services/web-*/src/pages/forum/ForumPage.tsx` viewCount 관련 phantom 오류 — **타 세션 forum 패키지 dist 불일치**에 따른 로컬 아티팩트(본 WO 무관). CI Web 배포는 clean 빌드로 success 지속 확인.

## 17. 브라우저 smoke 결과 (2026-06-12, 배포 51c8c392b · api/web deploy success)
> web 배포 주의: push tip(ee6c6cf6f, docs-only)만 diff 하는 detect-changes 로 자동 web 배포가 전 서비스 skip → GP/KCos 는 `workflow_dispatch`(service=glycopharm / k-cosmetics)로 수동 재배포하여 신규 번들 게시 확인(`settings/contact` 포함).
- **GP** `glycopharm.co.kr/admin/settings/contact`: System 그룹 "문의 설정" 메뉴 노출 → 페이지 렌더 → GET effective 기본값(in-app on/email off/기본 유형 5개) → 수신자 추가 + email ON + 저장 "저장되었습니다" → 새로고침 영속 확인 → 수신자 삭제 + email OFF + 저장(정리) ✅
- **KCos** `www.k-cosmetics.site/admin/settings/contact`: 메뉴 노출 → 렌더 → 안내 문구 저장 + 영속 ✅ → email ON + 수신자 0 저장 시 **검증 차단**("수신 이메일 1개 이상") ✅ → 정리 ✅
- **submit→notification_status 실증**: GP(in-app ON/email OFF) 공개 API 제출 → 문의 관리 상세 **알림 상태 `inapp:sent;email:off`**(설정 정확 반영) ✅ → 테스트 문의 spam 정리 ✅
- 결과: **PASS** (설정 조회/저장/영속/검증 + submit 알림 정책 반영, 서비스별 격리).

## 18. commit hash
- 구현/문서: `51c8c392b` (feat(contact): service contact notification settings admin for GP/KCos)
- smoke 반영: 본 갱신 커밋(아래)

---

## 후속
1. `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1` — SMTP provider 구성·발송 운영화(템플릿/from/로그). 본 WO는 발송 경로까지 연결, provider 미설정 시 `email:noprovider`.
2. `WO-O4O-CONTACT-AUTO-REPLY-V1` — 문의자 접수 확인 자동 회신.
3. `WO-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1` — Neture/KPA ↔ ContactInquiry 통합.
- 공개 form 문의 유형 동적 로드 / 안내 문구 공개 표시는 후속 확장.

*Date: 2026-06-12 · WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1 · GP/KCos 문의 수신·알림 설정 Admin + submit 알림 정책(이메일 발송 포함). migration 1, Neture/KPA·공개폼 무변경.*
