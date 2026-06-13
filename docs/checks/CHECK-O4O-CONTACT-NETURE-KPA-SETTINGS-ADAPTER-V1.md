# CHECK-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1

> **WO:** [WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1](../work-orders/WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1.md)
> **선행 IR:** [IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1](../investigations/IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1.md)
> **작성일:** 2026-06-13
> **상태:** 구현·정적 검증 완료. 배포 + 브라우저 smoke는 push 후 CI/CD 단계에서 수행(아래 §12~§14 pending).

---

## 1. 작업 목적
Neture/KPA 기존 Contact 구조(저장소·공개 route·운영 UI)를 유지한 채, GP/KCos의 `ServiceContactSettings` 기반 **운영자 이메일 알림 + 문의자 자동 회신 + Admin 수신자·문구 설정**을 adapter 방식으로 추가 (IR 권고 Option D).

## 2. 선행 IR 반영
IR 결과 Neture/KPA는 이미 DB 저장 + in-app `contact.new` 알림 + 운영자 관리 UI 보유. 실제 갭은 email 알림 / 자동 회신 / 설정 Admin 3가지뿐 → 이번 작업이 정확히 그 3가지만 보강.

## 3. Option D 적용 확인 (구조 불변)
- ✅ `ContactInquiry` 이관 **안 함**
- ✅ Neture `neture_contact_messages` / KPA `contact_requests` 저장소 **유지** (additive 컬럼만)
- ✅ Neture `/neture/contact` · KPA `/api/v1/kpa/contact-requests` 공개 submit route **유지**
- ✅ Neture `/admin/contact-messages`·`/operator/contact-messages` · KPA `/operator/collaboration-requests` 운영 UI **유지**
- ✅ 기존 in-app 알림 **제거하지 않음** (status 추적만 추가)

## 4. Neture 기존 저장소/route/UI 유지 확인
- 저장소: `NetureContactMessage`/`neture_contact_messages` 유지 + `notificationStatus` 컬럼 additive 추가
- 공개 submit: `POST /neture/contact` 그대로. in-app 알림 동작 보존(설정과 무관하게 운영자 알림)
- 운영 UI: admin/operator 화면 미수정

## 5. KPA 기존 저장소/route/UI 유지 확인
- 저장소: `ContactRequest`/`contact_requests` 유지 + `notification_status` 컬럼 additive 추가
- 공개 submit: `POST /api/v1/kpa/contact-requests` 그대로. in-app 알림 동작 보존
- 운영 UI: `/operator/collaboration-requests` 미수정
- KPA Admin 영역: 기존 `AdminRoutes`/`AdminLayout`/`AdminSidebar` **존재** → WO §12.2 blocker 아님. 설정 화면만 추가

## 6. ServiceContactSettings 확장
- `admin-service-contact-settings.controller.ts` 의 `CONTACT_SETTINGS_SERVICE_KEYS` 에 `neture`, `kpa-society` 추가 (기존 `glycopharm`, `k-cosmetics` 유지).
- 권한 guard `requireServiceLegalScope('admin')` 는 이미 4서비스(`SUPPORTED_LEGAL_SERVICE_KEYS`) 지원 → KPA `platformBypass=false` 격리 자동 준수.
- 설정 테이블(`service_contact_settings`)·helper(`toEffective`/`loadContactSettings`)는 serviceKey 중립적 → row 없으면 in-app=on / email=off / 자동회신=off / 수신자 empty 기본값. **seed 없음, 하드코딩 없음.**

## 7. Admin 설정 화면 추가
| 서비스 | wrapper 페이지 | route | 메뉴 | API client |
|--------|------|------|------|------|
| Neture | `services/web-neture/src/pages/admin/ServiceContactSettingsPage.tsx` | `/admin/settings/contact` | `getAdminMenu()` system 그룹 "문의 설정" | `api`(axios, `/api/v1`) |
| KPA | `services/web-kpa-society/src/pages/admin/ServiceContactSettingsPage.tsx` | `/admin/settings/contact` | `AdminSidebar` "설정 > 문의 설정" | `coreApiClient`(`/api/v1`, no `/kpa` prefix) |
- 공통 컴포넌트 `@o4o/operator-core-ui/modules/service-contact-settings` 재사용 (GP/KCos와 동일).
- KPA 기본 `apiClient` 는 `/api/v1/kpa` prefix 라 공통 admin 엔드포인트에 닿지 못함 → `coreApiClient`(prefix 없음) 사용으로 해결.
- 두 화면 모두 Admin 전용. Operator 메뉴에 신규 설정 화면 미노출.

## 8. 운영자 이메일 알림 연결 결과
- 공통 helper `apps/api-server/src/modules/contact-inquiry/contact-notification.helper.ts` 신설 (`sendContactEmails`) — GP/KCos public controller 로직을 service-neutral 추출.
- Neture/KPA submit handler에서 `loadContactSettings(serviceKey)` → `sendContactEmails()` 호출.
- 원칙 준수: 수신자는 `recipientEmails`에서만 / `emailNotificationEnabled=false` 또는 수신자 0이면 미발송 / SMTP 실패가 접수 실패 안 됨(best-effort) / HTML escape.

## 9. 문의자 자동 회신 연결 결과
- 동일 helper에서 처리. `autoReplyEnabled=true` + subject/message 있을 때만 문의자(`input.email`)에게 발송.
- 운영자 수신자와 문의자 이메일 분리. 기본 문구 seed 없음(row 없으면 OFF). best-effort.

## 10. notification_status 처리 (WO §8 옵션 1 채택)
- Neture: `neture_contact_messages."notificationStatus"` VARCHAR(100) additive (camelCase 컨벤션).
- KPA: `contact_requests.notification_status` VARCHAR(100) additive (snake_case 컨벤션).
- 형식 `inapp:<x>;email:<y>;autoreply:<z>`. 접수 성공과 무관한 best-effort 기록(기록 실패해도 접수 성공 불변).

## 11. Migration 여부
- 신규 additive migration 1건: `apps/api-server/src/database/migrations/20261108000000-AddContactNotificationStatusNetureKpa.ts`
- `hasColumn` 가드로 idempotent. 기존 데이터 무영향. down 은 컬럼 drop.
- 적용: main push → CI/CD 자동 실행. 배포 후 `migration:show AddContactNotificationStatusNetureKpa20261108000000` 로 확인 예정.

## 12. 정적 검증 결과 (완료)
| 대상 | 명령 | 결과 |
|------|------|------|
| api-server | `tsc --noEmit` | ✅ **0 errors** |
| web-neture | `tsc --noEmit` | ✅ **0 errors** |
| web-kpa-society | `tsc --noEmit` | ⚠️ 12 errors — 전부 `packages/store-ui-core/.../SupplyCatalogHub.tsx` (별도 세션의 진행 중 리팩토링, 본 작업과 무관). 본 작업 파일은 **신규 에러 0**. |

## 13. Neture smoke (배포 후 수행 — PENDING)
URL: `https://neture.co.kr/admin/settings/contact`, `/contact`, `/admin/contact-messages`
절차(WO §14.1): 설정 렌더 → 이메일 ON+수신자 → 자동회신 ON → `/contact` 제출 → admin 목록 확인 → 이메일 도착 → 자동회신 도착 → notificationStatus 확인 → 상태 처리 → 설정 복구

## 14. KPA smoke (배포 후 수행 — PENDING)
URL: `https://kpa-society.co.kr/admin/settings/contact`, `/contact`, `/operator/collaboration-requests`
절차: Neture와 동일.

## 15. 테스트 설정 복구 / 16. 테스트 문의 처리
- smoke 단계에서 수행 예정 (이메일 OFF·수신자 제거로 원복, 테스트 문의 done 처리).

## 17. GP/KCos 미수정 확인
- ✅ `services/web-glycopharm/**`, `services/web-k-cosmetics/**` 변경 없음.
- ✅ GP/KCos public-contact-inquiry.controller 인라인 구현 유지(helper 미적용 — WO 범위 경계).

## 18. 개인정보 동의 / IP hash 후속 분리 확인
- 본 작업 범위 외. 후속 `WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1` 에서 처리:
  - Neture/KPA 공개 폼 개인정보 수집 동의 추가
  - Neture IP 원문 저장 → SHA256 hash 전환

## 19. 배포 결과 (PENDING)
- API Server(backend 변경) + web-neture + web-kpa-society 각각 배포 예정.
- ⚠️ Cloud Run detect-changes skip 가능 → 배포 후 라이브 번들/엔드포인트 브라우저 확인, 필요 시 `workflow_dispatch` 재배포.

## 20. Commit
- 코드 + 본 CHECK: path-specific commit (GP/KCos 및 타 세션 파일 제외). hash: (commit 후 기입)

---
*End of CHECK-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1*
