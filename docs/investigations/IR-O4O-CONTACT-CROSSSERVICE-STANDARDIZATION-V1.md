# IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1

> **유형:** Read-only 조사 (코드/DB/route 변경 없음, 문서 1개만 생성)
> **목적:** O4O 4개 서비스(GlycoPharm / K-Cosmetics / KPA Society / Neture)의 Contact Us / 문의 접수 구조를 비교 조사하고, Neture/KPA를 신규 `ContactInquiry` 공통 구조로 표준화할지 여부를 결정하기 위한 기준선과 권고안을 제시한다.
> **작성일:** 2026-06-13
> **선행 WO:** `WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1`, `WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1`, `WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1`, `WO-O4O-CONTACT-EMAIL-NOTIFICATION-V1`, `WO-O4O-CONTACT-AUTO-REPLY-V1`, `WO-O4O-PUBLIC-INFO-LEGAL-CONTACT-STRUCTURE-MILESTONE-V1`

---

## 0. 핵심 결론 (Executive Summary)

| 질문 | 답 |
|------|-----|
| Neture/KPA 문의는 어디로 저장되는가? | **둘 다 DB에 저장됨** (email-only 아님). Neture=`neture_contact_messages`, KPA=`contact_requests` |
| 알림 방식은? | **둘 다 in-app 알림만** 사용 (`notificationService`, type `contact.new`). 운영자 email·자동회신 **없음** |
| 운영자가 조회 가능한가? | **둘 다 가능**. Neture=admin `/admin/contact-messages` + operator `/operator/contact-messages`, KPA=operator `/operator/collaboration-requests` |
| 신규 `ContactInquiry`와의 거리는? | **중간(moderate)**. 저장·in-app 알림·운영 UI는 이미 동등 수준. 차이는 ① 별도 테이블/route ② email 알림 없음 ③ 자동회신 없음 ④ 설정 Admin 없음 ⑤ 개인정보 동의 없음 ⑥ status/type enum 상이 ⑦ 공통 UI 미사용 |
| 최종 권고 | **§13 — Option D 우선(설정/알림 표준화) → 이후 Option B(단계적 이관) 검토.** 전면통합(E)·현행동결(A 단독)은 비권장 |

가장 중요한 발견: **Neture/KPA는 "깨지기 쉬운 레거시 email 폼"이 아니다.** 이미 DB 저장 + in-app 알림 + 운영자 관리 UI를 갖춘 정상 작동 구조다. 통합의 실익은 "조회 기능을 새로 만드는 것"이 아니라, **운영자 email 알림 / 문의자 자동회신 / Admin 설정(수신자·문구)** 의 부재를 메우는 데 있다 — 셋 다 `ServiceContactSettings`(Option D)로 확보된다.

---

## 1. GP/KCos 신규 구조 기준선 (Baseline Reference)

GlycoPharm·K-Cosmetics가 사용하는 신규 공통 Contact 구조. 모든 비교의 기준선이다.

### 1.1 저장 — `ContactInquiry` / `contact_inquiries`

- **Entity:** [apps/api-server/src/modules/contact-inquiry/entities/ContactInquiry.entity.ts](../../apps/api-server/src/modules/contact-inquiry/entities/ContactInquiry.entity.ts)
- **주요 컬럼:** `service_key`(glycopharm|k-cosmetics), `inquiry_type`(5종), `name`/`email`/`phone`/`organization_name`/`subject`/`message`, `privacy_consent`(필수 true), `status`(received|in_review|answered|closed|spam), `source_path`, `user_agent`, **`ip_hash`(SHA256, 원문 미저장)**, **`notification_status`**(`inapp:<x>;email:<y>;autoreply:<z>`), `handled_at`/`handled_by`/`internal_note`
- **Migration:** `20261105000000-CreateContactInquiries.ts`

### 1.2 설정 — `ServiceContactSettings` / `service_contact_settings`

- **Entity:** [apps/api-server/src/modules/contact-inquiry/entities/ServiceContactSettings.entity.ts](../../apps/api-server/src/modules/contact-inquiry/entities/ServiceContactSettings.entity.ts)
- **주요 컬럼:** `service_key`(UNIQUE), `in_app_notification_enabled`, `email_notification_enabled`, **`recipient_emails`(JSONB, Admin UI에서만 설정, 하드코딩 금지)**, `inquiry_types`(JSONB), `privacy_notice`, `completion_notice`, **`auto_reply_enabled`/`auto_reply_subject`/`auto_reply_message`/`auto_reply_include_original`**, `is_active`, `updated_by`
- **Migration:** `20261106000000-CreateServiceContactSettings.ts`, `20261107000000-AddContactAutoReply.ts`

### 1.3 공개 submit — `POST /api/v1/public/services/:serviceKey/contact-inquiries`

- **Controller:** [public-contact-inquiry.controller.ts](../../apps/api-server/src/modules/contact-inquiry/public-contact-inquiry.controller.ts)
- **방어:** honeypot(`company_website`) / `privacyConsent===true` 강제 / email regex / message 10~5000자 / IP SHA256 hash / HTML escape(`esc()`) / serviceKey 화이트리스트(glycopharm·k-cosmetics) → 미일치 404
- **알림(접수와 분리, best-effort):** ① in-app(`role_assignments`의 `{prefix}:operator`+`{prefix}:admin`, type `contact.new`) ② operator email(`recipient_emails`) ③ 문의자 자동회신 — 결과를 `notification_status = inapp:<x>;email:<y>;autoreply:<z>`로 기록. **알림 실패해도 접수(201) 성공**

### 1.4 Admin 관리 API

- **Controller:** [admin-contact-inquiry.controller.ts](../../apps/api-server/src/modules/contact-inquiry/admin-contact-inquiry.controller.ts)
- `GET /api/v1/admin/services/:serviceKey/contact-inquiries` (목록) · `GET .../:id` · `PATCH .../:id/status` · `PATCH .../:id/note`
- **Guard:** `authenticate` → `requireServiceLegalScope('admin')` + serviceKey 화이트리스트
- **설정 API:** [admin-service-contact-settings.controller.ts](../../apps/api-server/src/modules/contact-inquiry/admin-service-contact-settings.controller.ts) — `GET/PUT /api/v1/admin/services/:serviceKey/contact-settings`

### 1.5 Frontend (공통 컴포넌트)

- **공개 폼:** `PublicContactForm` @ [packages/shared-space-ui/src/legal/PublicContactForm.tsx](../../packages/shared-space-ui/src/legal/PublicContactForm.tsx) — GP/KCos 공유
- **Admin 문의 관리:** `ContactInquiryAdminPage` @ `@o4o/operator-core-ui/modules/contact-inquiry` → `/admin/contact-inquiries`
- **Admin 설정:** `ServiceContactSettingsPage` @ `@o4o/operator-core-ui/modules/service-contact-settings` → `/admin/settings/contact`
- GP/KCos는 얇은 wrapper(API adapter + serviceKey)만 보유, 본체는 전부 공통 패키지

---

## 2. Neture 현행 구조 (Existing)

> **저장 유형: DATABASE + in-app NOTIFICATION** (email-only 아님). 별도 `NetureContactMessage` 구조 — `ContactInquiry` 미사용.

### 2.1 Frontend
- **Route:** `/contact` → [services/web-neture/src/pages/ContactPage.tsx](../../services/web-neture/src/pages/ContactPage.tsx) (**커스텀**, 공통 폼 미사용)
- **필드:** `contactType`(supplier|partner|service|other), name, email, phone(opt), subject, message
- **submit:** `contactApi.submitContactMessage()` → `POST /neture/contact` (authClient, auto-refresh). [lib/api/contact.ts](../../services/web-neture/src/lib/api/contact.ts)
- **개인정보 동의:** **없음**(묵시적 동의) · **자동회신:** **없음** · 성공문구 "문의가 접수되었습니다. 운영팀이 확인 후 답변드립니다."

### 2.2 Backend
- **Entity:** [NetureContactMessage.entity.ts](../../apps/api-server/src/modules/neture/entities/NetureContactMessage.entity.ts) → table `neture_contact_messages`
- **컬럼:** id, contactType, name, email, phone, subject, message, `status`(new|in_progress|resolved), **`ipAddress`(원문 저장)**, `userAgent`, `adminNotes`, createdAt/updatedAt, resolvedAt — **`notification_status` 없음, `privacy_consent` 없음, `ip_hash` 없음(IP 원문 저장)**
- **공개 submit:** `POST /neture/contact` ([contact.controller.ts](../../apps/api-server/src/modules/neture/controllers/contact.controller.ts)) — 검증 후 저장, status `new`
- **알림:** in-app만 (`notificationService`, type `contact.new`, 대상 `neture:operator`+`neture:admin`, targetUrl `/operator/contact-messages?status=new`). **email·자동회신 없음**
- **Admin API:** `GET/GET :id/PATCH /neture/admin/contact-messages` (`requireNetureScope('neture:admin')`)
- **Operator API:** `GET /neture/operator/contact-messages` (`requireNetureScope('neture:operator')`, PII 제외 + message 160자 preview)
- **Migration:** `20260311000001-CreateNetureContactMessages.ts`

### 2.3 운영 UI
- **Admin:** `/admin/contact-messages` ([AdminContactMessagesPage.tsx](../../services/web-neture/src/pages/admin/AdminContactMessagesPage.tsx)) — 목록·상세·status·adminNotes (**커스텀**)
- **Operator:** `/operator/contact-messages` ([OperatorContactMessagesPage.tsx](../../services/web-neture/src/pages/operator/OperatorContactMessagesPage.tsx)) — 읽기 + supplier/partner 일괄확인, 개별 status 변경 불가
- **설정 Admin:** **없음**

---

## 3. KPA Society 현행 구조 (Existing)

> **저장 유형: DATABASE + in-app NOTIFICATION** (email-only 아님). 별도 `ContactRequest` 구조 — `ContactInquiry` 미사용.

### 3.1 Frontend
- **Route:** `/contact` → [ContactPage.tsx](../../services/web-kpa-society/src/pages/contact/ContactPage.tsx) + **모달** [ContactModal.tsx](../../services/web-kpa-society/src/pages/contact/ContactModal.tsx) (**커스텀**)
- **type:** `partner`(운영자/단체 협력) | `education`(강의 개설/협업) — **2종만** (협업 문의 성격)
- **필드:** type, name, email, phone(opt), organization_name(partner 필수), subject(education opt), message
- **submit:** `contactRequestApi.submit()` → `POST /api/v1/kpa/contact-requests`
- **개인정보 동의:** **없음** · **자동회신:** **없음** · 성공문구 "문의가 등록되었습니다. 빠른 시일 내에 담당자가 연락드리겠습니다." · Footer "협업 문의" → `/contact`

### 3.2 Backend
- **Entity:** [apps/api-server/src/entities/ContactRequest.ts](../../apps/api-server/src/entities/ContactRequest.ts) → table `contact_requests`
- **컬럼:** id, **`service_key`(default `kpa-society`)**, type(partner|education), organization_name, name, email, phone, subject, message, `status`(pending|reviewing|done), `created_by`, created_at/updated_at — **`notification_status`·`privacy_consent` 없음, IP/userAgent 미저장**
- **공개 submit:** `POST /api/v1/kpa/contact-requests` ([contact-request.controller.ts](../../apps/api-server/src/routes/kpa/controllers/contact-request.controller.ts)) — name≥2, email regex, message≥10, partner면 org 필수, status `pending`
- **알림:** in-app만 (`notificationService`, type `contact.new`, 대상 `kpa:operator`+`kpa:admin`). **email·자동회신 없음**
- **Operator API:** `GET /api/v1/kpa/operator/contact-requests` + `PATCH .../:id/status` (`requireKpaScope('kpa:operator')`)
- **Admin API:** **없음** (operator 스코프만) · **Migration:** `20260922000000-CreateContactRequests.ts`

### 3.3 운영 UI
- **Operator:** `/operator/collaboration-requests` ([CollaborationRequestsPage.tsx](../../services/web-kpa-society/src/pages/operator/CollaborationRequestsPage.tsx)) — 목록·상세 drawer·status 변경. 사이드바 "협업 문의" (**커스텀**)
- **Admin 화면:** **없음** · **설정 Admin:** **없음**

---

## 4. 4서비스 비교표

| 항목 | GlycoPharm | K-Cosmetics | KPA Society | Neture |
|------|:---:|:---:|:---:|:---:|
| Public Contact route | `/contact` | `/contact` | `/contact`(모달) | `/contact` |
| 공개 폼 컴포넌트 | 공통 `PublicContactForm` | 공통 동일 | 커스텀 모달 | 커스텀 페이지 |
| Submit API | `/public/services/glycopharm/contact-inquiries` | `.../k-cosmetics/...` | `/api/v1/kpa/contact-requests` | `/neture/contact` |
| 저장 entity/table | `ContactInquiry`/`contact_inquiries` | 동일 | `ContactRequest`/`contact_requests` | `NetureContactMessage`/`neture_contact_messages` |
| serviceKey 보유 | ✅ `service_key` | ✅ | ✅ `service_key` | ⚠️ 컬럼 없음(전용 테이블) |
| 데이터 저장 | ✅ DB | ✅ DB | ✅ DB | ✅ DB |
| status enum | received/in_review/answered/closed/spam | 동일 | pending/reviewing/done | new/in_progress/resolved |
| inquiry type | 5종 | 5종 | partner/education(2) | supplier/partner/service/other(4) |
| in-app 알림 | ✅ `contact.new` | ✅ | ✅ `contact.new` | ✅ `contact.new` |
| 운영자 email 알림 | ✅ (설정) | ✅ | ❌ | ❌ |
| 문의자 자동회신 | ✅ (설정) | ✅ | ❌ | ❌ |
| Admin 문의 관리 | ✅ `/admin/contact-inquiries`(공통) | ✅ (공통) | ❌ (operator만) | ✅ `/admin/contact-messages`(커스텀) |
| Operator 문의 관리 | — | — | ✅ `/operator/collaboration-requests` | ✅ `/operator/contact-messages` |
| Contact 설정 Admin | ✅ `/admin/settings/contact`(공통) | ✅ (공통) | ❌ | ❌ |
| 개인정보 동의 | ✅ `privacy_consent` 필수 | ✅ | ❌ | ❌ |
| IP 처리 | SHA256 hash | 동일 | 미저장 | ⚠️ **원문 저장** |
| spam/honeypot | honeypot+consent+길이 | 동일 | 길이/형식 | 형식 |
| 권한 guard | `requireServiceLegalScope('admin')` | 동일 | `requireKpaScope('operator')` | `requireNetureScope('admin'\|'operator')` |
| `notification_status` 기록 | ✅ | ✅ | ❌ | ❌ |
| 통합 위험 | (기준선) | (기준선) | 중 (route/enum/UI 재정렬) | 중 (route/enum/UI + IP 정책) |

---

## 5. 이관 시 깨지는 지점 (Break-points)

Neture/KPA를 `ContactInquiry`로 옮길 경우 회귀가 발생할 수 있는 구체 지점.

| # | 깨지는 지점 | Neture | KPA |
|---|------------|:---:|:---:|
| B1 | 공개 submit route 변경 (`/neture/contact`, `/api/v1/kpa/contact-requests` → `/public/services/:key/contact-inquiries`) | ✅ | ✅ |
| B2 | status enum 매핑 (new/in_progress/resolved, pending/reviewing/done → received/in_review/answered/closed/spam) | ✅ | ✅ |
| B3 | inquiry type 매핑 (supplier/partner/service/other, partner/education → 5종 표준) | ✅ | ✅ |
| B4 | 커스텀 공개 폼 → 공통 `PublicContactForm` 교체 (필드·UX 차이, KPA는 모달 2종 분기) | ✅ | ✅ (구조 차이 큼) |
| B5 | 운영 UI 교체 (Neture admin+operator, KPA operator inbox → 공통 `ContactInquiryAdminPage`) | ✅ | ✅ |
| B6 | in-app 알림 targetUrl 변경 (`/operator/contact-messages` → `/admin/contact-inquiries`) | ✅ | ✅ |
| B7 | IP 정책 변경 — Neture는 IP 원문 저장 중 → 표준은 SHA256 hash. 기존 row의 ipAddress 처리 정책 필요 | ✅ | — |
| B8 | KPA `kpa:operator` 스코프 ↔ 표준 `requireServiceLegalScope('admin')` 권한 모델 정렬 (KPA는 admin 스코프 부재) | — | ✅ |
| B9 | 기존 데이터 이관 — `neture_contact_messages`, `contact_requests` → `contact_inquiries` (단, **§12 disposable 정책상 재시드 가능**) | ✅ | ✅ |
| B10 | serviceKey 화이트리스트 확장 (`['glycopharm','k-cosmetics']`에 `neture`,`kpa-society` 추가) — 신규 운영자 email 대상 role prefix 정렬 | ✅ | ✅ |

> **완화 요인:** 메모리 기준 O4O 운영 DB 데이터는 현재 disposable(서비스 전 단계)이므로 **B9(데이터 이관)의 비용은 낮다** — backfill 대신 재시드로 처리 가능. 가장 비싼 항목은 B4/B5(프론트 폼·운영 UI 교체)다.

---

## 6. 권한 / IA 조사 결과

| 서비스 | 문의 관리 위치 | 권한 guard | 비고 |
|--------|------|------|------|
| GP/KCos | **Admin** (`/admin/contact-inquiries`, `/admin/settings/contact`) | `requireServiceLegalScope('admin')` | 표준. 설정은 Admin, 처리도 Admin |
| Neture | **Admin + Operator 병존** (`/admin/contact-messages` 처리, `/operator/contact-messages` 읽기) | `requireNetureScope('admin'\|'operator')` | operator는 PII 제외·preview만. **이중 IA** |
| KPA | **Operator 전용** (`/operator/collaboration-requests`) | `requireKpaScope('operator')` | admin 스코프 부재. "협업 문의"는 운영자 업무 흐름 |

**원칙 대비:**
- (1) 설정은 Admin 영역 — GP/KCos만 충족. Neture/KPA는 설정 화면 자체가 없음
- (2) 조회/처리는 권한자만 — 4서비스 모두 충족(공개 submit 외 전부 scope guard)
- (3) 일반 사용자 접근 불가 — 충족
- (4) 개인정보 경계 — Neture operator는 PII 마스킹·preview로 분리, **KPA는 operator가 전체 필드 열람**(분리 약함)
- (5) 통합 시 메뉴 변경 리스크: **KPA operator inbox → admin 이동 시 운영자 워크플로 단절 위험**. Neture는 admin/operator 이중 구조라 표준(admin 단일)과 정렬 시 operator 화면 폐기/축소 결정 필요

---

## 7. 개인정보 / 보안 조사 결과

| 항목 | GP/KCos | Neture | KPA |
|------|:---:|:---:|:---:|
| 개인정보 동의 문구/체크박스 | ✅ `privacy_consent` 필수 | ❌ | ❌ |
| 이름/이메일/전화 저장 | ✅ | ✅ | ✅ |
| IP 저장 | hash만 | ⚠️ **원문 저장** | 미저장 |
| IP hash 처리 | ✅ SHA256 | ❌ | N/A |
| userAgent 저장 | ✅ | ✅ | ❌ |
| HTML/script 방어 | ✅ `esc()` + plain text | submit 시 텍스트 저장 | 텍스트 저장 |
| email header injection 방어 | ✅ (escape 후 메일) | N/A (메일 미발송) | N/A (메일 미발송) |
| 권한 없는 조회 차단 | ✅ | ✅ | ✅ |

**주의 신호:** ① Neture/KPA는 **개인정보 수집 동의 절차 부재** — 공개 문의 폼에 동의 체크박스가 없다(법적·UX 리스크). ② Neture는 **IP 원문 저장** — 표준(hash)과 상충하며 개인정보 최소수집 원칙에 어긋남. 통합 여부와 무관하게 ①②는 단독으로도 개선 가치가 있다.

---

## 8. 통합 옵션 비교 (A ~ E)

| 옵션 | 내용 | 회귀 위험 | 표준화 수준 | DB 변경 | 데이터 이관 |
|:---:|------|:---:|:---:|:---:|:---:|
| **A** | 현행 유지 (GP/KCos만 신규) | 없음 | 낮음 | 없음 | 없음 |
| **B** | Neture/KPA를 `ContactInquiry`로 단계적 이관 | 중 | 최고 | 큼 | 필요(재시드 가능) |
| **C** | 기존 저장 유지 + 공통 Admin UI를 adapter로 연결 | 낮음 | 중 | 작음 | 없음 |
| **D** | 기존 저장 유지 + `ServiceContactSettings` 기반 설정/알림(email·자동회신)만 표준화 | 낮음 | 중상 | 작음(설정 테이블 재사용/확장) | 없음 |
| **E** | 기존 구조 폐기 후 전면 통합 | 높음 | 최고 | 큼 | 필요 |

### Option A — 현행 유지
- **장점:** 회귀 0, 작동 구조 보호, 작업 없음
- **단점:** 4서비스 분산 지속, Admin UX 파편화, 설정/알림 정책 서비스별 상이, **개인정보 동의·email 알림·자동회신 부재가 영구 고착**

### Option B — ContactInquiry 단계적 이관
- **장점:** 저장/설정/알림/Admin 완전 표준화, 유지보수 단순화, "clean & simple" 원칙 부합
- **단점:** §5 B1~B10 전부 발생(프론트 폼·운영 UI 교체가 최대 비용). 단 disposable 정책으로 데이터 이관 비용은 낮음

### Option C — Adapter (Admin UI만)
- **장점:** 기존 submit/저장 보호, 운영 화면 일부 표준화, 점진적
- **단점:** 내부 구조 계속 분리, adapter 유지비, email/자동회신/동의 부재는 그대로 — **§0 핵심 갭(설정/알림)을 못 메움**

### Option D — 설정/알림만 표준화 ⭐
- **장점:** 저장소 이관 없이 **운영자 email 알림 + 문의자 자동회신 + Admin 수신자/문구 설정**을 Neture/KPA에 부여 → §0에서 식별한 실질 갭을 정확히 메움. 회귀 위험 낮음(공개 submit·운영 UI 불변, 알림 경로만 보강)
- **단점:** 문의 데이터 Admin 통합(단일 화면)은 미완, 저장 스키마는 여전히 3종. submit handler에 settings 조회·메일 발송 로직 추가 필요

### Option E — 전면 통합
- **장점:** 최종 구조 단일
- **단점:** 가장 위험, 운영 화면·알림 회귀 가능성 큼. **현 단계 비권장**

---

## 13. 권고안 (Recommendation)

### 13.1 최종 권고: **Option D 우선 → 이후 Option B 검토 (Phased D-then-B)**

**Phase 1 (권고, 지금) — Option D: 설정/알림 표준화.**
Neture/KPA의 기존 저장(`neture_contact_messages`, `contact_requests`)·공개 submit·운영 UI는 **그대로 두고**, `ServiceContactSettings`를 두 서비스로 확장하여 **운영자 email 알림 + 문의자 자동회신 + Admin 수신자/문구 설정**을 추가한다. submit handler에 settings 조회 → email/autoreply 발송 → `notification_status` 기록을 보강한다.

- **왜 안전한가:** 공개 route·폼·운영 UI를 건드리지 않으므로 §5 break-point 중 B1~B6 회피. 추가되는 것은 "알림 경로"뿐이며 기존 in-app 알림과 동일하게 best-effort(실패해도 접수 성공)로 격리 가능. 회귀면이 작다.
- **왜 가치 있는가:** §0에서 식별한 Neture/KPA의 **실질 갭(email·자동회신·설정)을 정확히** 메운다. Adapter(C)는 이 갭을 못 메우고, 현행유지(A)는 갭을 고착시킨다.

**Phase 2 (조건부, 이후) — Option B: ContactInquiry 단계적 이관.**
"4서비스 단일 저장/단일 Admin"이 사업적으로 필요해지는 시점에, **Neture부터**(이미 admin+operator UI가 가장 성숙) `ContactInquiry`로 이관하고, 이어 KPA를 이관한다. disposable 데이터 정책 덕에 이관은 재시드로 처리한다.

- B를 Phase 1로 당기지 않는 이유: 최대 비용이 프론트 폼·운영 UI 교체(B4/B5)인데, 이는 **사용자 가치(email·자동회신)와 직접 연결되지 않는 내부 리팩토링**이다. 가치가 큰 D를 먼저 확보하고, 구조 통합은 필요 시점에 분리 진행하는 것이 "clean & simple"·"decide don't overask" 원칙에 부합.

### 13.2 통합과 무관하게 즉시 가치 있는 2건 (Option 선택과 독립)
- **P-1:** Neture/KPA 공개 폼에 **개인정보 수집 동의** 추가 (§7 주의신호 ①)
- **P-2:** Neture **IP 원문 저장 → SHA256 hash** 전환 (§7 주의신호 ②, 최소수집 원칙)

### 13.3 비권고
- **A 단독:** 갭 고착 → 비권고(단, Phase 1 착수 전까지의 잠정 상태로는 허용)
- **C:** §0 핵심 갭 미해결 → D 대비 열위
- **E:** 회귀 위험 최대 → 현 단계 비권고

### 13.4 권고 요약 답변 (§13 기준 형식)
> **"D 설정/알림 표준화 우선 권고"** — 이후 필요 시 B 단계적 이관. E 전면 통합은 권고하지 않음.

- **후속 대상 파일/서비스:** (Phase 1) `apps/api-server` 의 neture `contact.controller.ts`·kpa `contact-request.controller.ts` 에 settings 조회+메일 발송 보강, `service_contact_settings` 를 neture/kpa-society로 확장, 두 서비스 Admin에 설정 화면(`ServiceContactSettingsPage` 재사용) 추가
- **DB migration 필요?:** Option D는 `service_contact_settings` 의 serviceKey 화이트리스트/시드만 확장(스키마 변경 최소). Option B는 `contact_inquiries` 로의 본격 이관 migration 필요
- **데이터 이관 필요?:** D=불필요. B=필요하나 disposable 정책상 재시드로 대체 가능
- **운영자 메뉴 변경?:** D=불변(설정 화면 신설만). B=Neture/KPA 기존 문의 메뉴를 `/admin/contact-inquiries` 로 정렬(메뉴 이동)
- **public route 변경?:** D=불변. B=공개 submit route 변경(B1)
- **회귀 위험 큰 지점:** B4/B5(프론트 폼·운영 UI 교체), B7(Neture IP 정책), B8(KPA 권한 모델)

---

## 14. 후속 WO 후보

| 우선 | WO 후보 | 매핑 옵션 | 내용 |
|:---:|--------|:---:|------|
| **1** | `WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1` | **D** | Neture/KPA 기존 Contact에 `ServiceContactSettings` 기반 운영자 email 알림 + 자동회신 + 수신자/문구 설정 추가 (저장·route 불변) |
| 2 | `WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1` | P-1/P-2 | 공개 폼 개인정보 동의 추가 + Neture IP hash 전환 (통합과 독립, 단독 가치) |
| 3 | `WO-O4O-CONTACT-NETURE-KPA-ADMIN-ADAPTER-V1` | C | 기존 저장소를 공통 Admin 문의 관리 UI에서 조회하도록 adapter (D 이후 보조 수단) |
| 4 | `WO-O4O-CONTACT-NETURE-MIGRATION-TO-CONTACT-INQUIRY-V1` | B | Neture를 `ContactInquiry` 로 단계적 이관 (Phase 2 선행, Neture 우선) |
| 5 | `WO-O4O-CONTACT-KPA-MIGRATION-TO-CONTACT-INQUIRY-V1` | B | KPA를 `ContactInquiry` 로 단계적 이관 (Phase 2 후행) |
| 6 | `WO-O4O-CONTACT-CROSSSERVICE-SETTINGS-STANDARDIZATION-V1` | D | 4서비스 Contact 설정 구조를 serviceKey 기반으로 통일 (1번의 일반화) |

> **권고 착수 순서:** 후보 1(D) → 후보 2(개인정보) → (필요 시) 후보 4·5(B). 후보 3(C)·6은 상황에 따라 선택.

---

## 15. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1.md`)
- [x] 코드/DB/migration/route/frontend 변경 없음 (read-only)
- [x] Neture Contact 구조 조사 (§2) — DB 저장 + in-app 알림, `NetureContactMessage`
- [x] KPA Contact 구조 조사 (§3) — DB 저장 + in-app 알림, `ContactRequest`
- [x] GP/KCos 신규 구조 기준선 정리 (§1)
- [x] 4서비스 비교표 (§4)
- [x] 저장소/API/Admin/알림/설정 차이 정리 (§4~§7)
- [x] 통합 옵션 A~E 비교 (§8)
- [x] 권고안 명확화 (§13 — D 우선 → B)
- [x] 후속 WO 후보 제시 (§14)

---

*End of IR-O4O-CONTACT-CROSSSERVICE-STANDARDIZATION-V1*
