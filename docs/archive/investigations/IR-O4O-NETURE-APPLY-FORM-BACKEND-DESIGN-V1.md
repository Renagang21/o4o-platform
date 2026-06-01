# IR-O4O-NETURE-APPLY-FORM-BACKEND-DESIGN-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·UI·DB 변경 없음.**
>
> `/o4o/apply` 페이지에 실제 문의·상담 form 을 구현하기 전, 어떤 데이터를 받을지 / backend endpoint 구조 / 이메일·DB 처리 흐름을 사전 설계.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-NETURE-INTRO-PAGE-CONSOLIDATION-DESIGN-V1](IR-O4O-NETURE-INTRO-PAGE-CONSOLIDATION-DESIGN-V1.md) — Option A 채택
  - [CHECK-O4O-NETURE-INTRO-CONSOLIDATION-FINAL-CHECK-V1](CHECK-O4O-NETURE-INTRO-CONSOLIDATION-FINAL-CHECK-V1.md) — Baseline 고정 (8 active + 13 redirect)
  - `WO-O4O-NETURE-APPLY-PAGE-CONSOLIDATION-V1` (commit `c3bf8fbf7`) — `/o4o/apply` 신설
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 권고 — 한 줄 요약

> **기존 `POST /api/v1/platform/inquiries` 재사용. Backend 0 변경, frontend form 만 신설. MVP scope = 1 form 1 endpoint.**

`PlatformInquiry` entity / `submitInquiry` controller / `sendAdminNotification` email 알림이 **이미 완전 구현되어 production live**. 본 IR 의 결정은 "재사용 + frontend 만"으로 압축.

### 핵심 발견

| 항목 | 상태 |
|---|---|
| `POST /api/v1/platform/inquiries` (public, no auth) | ✅ 이미 구현 + 운영 중 |
| `PlatformInquiry` entity (16 컬럼 — name/email/phone/company/subject/message/type/source/IP/UA/referrer/status/adminNotes/...) | ✅ 이미 production live |
| Email notification (`sendAdminNotification`) | ✅ @o4o/mail-core 기반, ENV `PLATFORM_ADMIN_EMAIL` 활용 |
| Admin routes (목록/상세/상태 변경) | ✅ `GET /admin/platform/inquiries/*` (platform:admin 권한) |
| 입력 검증 (name/email/subject/message required, email regex) | ✅ |
| metadata 자동 캡처 (IP/UA/referrer) | ✅ |
| 기존 frontend 사용처 | KPA `JoinInquiryForm.tsx`, SiteGuide `ContactFormModal.tsx`, Neture admin-vault `VaultInquiriesPage.tsx` (admin 측) |
| **InquiryType union** | `'siteguide' \| 'platform' \| 'partnership' \| 'other'` — **`'platform'` 이 본 form 의 자연스러운 type** |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 방법 | inquiry/contact/email 인프라 전수 grep + entity / controller / route 정적 분석 + frontend 사용처 매핑 |

---

## 2. 기존 문의/이메일 관련 코드 조사 결과

### 2.1 PlatformInquiry — 본 form 의 직접 대상

**Entity** ([apps/api-server/src/entities/PlatformInquiry.ts](apps/api-server/src/entities/PlatformInquiry.ts)):

```typescript
@Entity('platform_inquiries')
@Index(['type', 'status'])
@Index(['status', 'createdAt'])
@Index(['email'])
export class PlatformInquiry {
  id: string;                                // uuid PK
  type: InquiryType;                         // 'siteguide' | 'platform' | 'partnership' | 'other'
  name: string;                              // 필수 (varchar 255)
  email: string;                             // 필수 (varchar 255, regex 검증)
  phone: string | null;                      // 선택 (varchar 50)
  company: string | null;                    // 선택 (varchar 255)
  subject: string;                           // 필수 (varchar 500)
  message: string;                           // 필수 (text)
  status: InquiryStatus;                     // 'new' | 'in_progress' | 'resolved' | 'closed' (default 'new')
  source: string | null;                     // 'siteguide.co.kr', 'neture.co.kr' 등
  ipAddress: string | null;                  // req.ip 자동 캡처
  userAgent: string | null;                  // req.headers['user-agent']
  referrer: string | null;                   // req.headers.referer
  adminNotes: string | null;                 // 관리자 메모
  notificationSent: boolean;                 // email 발송 성공 여부
  createdAt / updatedAt / resolvedAt;
}
```

**Controller** ([apps/api-server/src/controllers/platformInquiryController.ts](apps/api-server/src/controllers/platformInquiryController.ts) — 308 lines):
- `submitInquiry` (public) — 검증 → save → email 알림 → 201 응답
- `listInquiries` (admin) — type/status filter + pagination
- `getInquiry` (admin) — id 상세
- `updateInquiry` (admin) — status / adminNotes 변경
- `sendAdminNotification` — HTML + text dual format email

**Routes** ([apps/api-server/src/routes/v1/platformInquiry.routes.ts](apps/api-server/src/routes/v1/platformInquiry.routes.ts)):
- `POST /api/v1/platform/inquiries` (no auth)
- `GET / PATCH /api/v1/admin/platform/inquiries/*` (platform:admin)

### 2.2 EmailService — 이미 추상화 완료

[apps/api-server/src/services/email.service.ts](apps/api-server/src/services/email.service.ts):
```typescript
// @o4o/mail-core 의 MailService 를 AppDataSource + logger 와 함께 singleton 으로 노출
export const emailService = new MailService({ dataSource: AppDataSource, logger });
```

→ `emailService.sendEmail({ to, subject, html, text })` 호출만 하면 됨. 별도 설정 없음.
환경변수: `PLATFORM_ADMIN_EMAIL` (수신자), `ADMIN_URL` (관리자 페이지 base URL).

### 2.3 기존 frontend 사용처 (재사용 참고)

| Service | 파일 | 용도 | 사용 type |
|---|---|---|---|
| web-siteguide | `components/ContactFormModal.tsx` | SiteGuide 도입 문의 modal | `'siteguide'` |
| web-kpa-society | `components/platform/JoinInquiryForm.tsx` | KPA 가입 문의 form | `'platform'` 또는 `'other'` |
| web-neture (admin) | `pages/admin-vault/VaultInquiriesPage.tsx` | 관리자 측 목록/상세 화면 | (조회 only) |

→ **Neture 본 service 의 사업자 진입용 frontend form 은 아직 없음.** 본 IR 의 신설 대상.

### 2.4 다른 inquiry 시스템 (참고 — 본 form 과 분리 권고)

| 시스템 | 위치 | 용도 | 본 form 와의 관계 |
|---|---|---|---|
| `kpa-join-inquiry` | `routes/kpa/entities/kpa-join-inquiry.entity.ts` | KPA Society 가입 신청 (별 도메인, kpa_members 흐름) | 무관 — 별 도메인 |
| `kpa-contact-request` | `routes/kpa/controllers/contact-request.controller.ts` | KPA 약사회 연락처 요청 | 무관 |
| `glycopharm-customer-request` | `routes/glycopharm/controllers/customer-request.controller.ts` | GP 고객 상담 요청 | 무관 |

→ **PlatformInquiry 가 가장 정확한 fit.** 다른 시스템 재사용 시 도메인 mismatch 발생.

---

## 3. `/o4o/apply` Form 필드 최종안

### 3.1 기존 entity 와 1:1 매핑

| Form 필드 | PlatformInquiry 컬럼 | 필수 | 비고 |
|---|---|:---:|---|
| 이름 | `name` | ✅ | varchar 255 |
| 이메일 | `email` | ✅ | varchar 255, regex 검증 |
| 연락처 (전화) | `phone` | ⬜ 선택 | varchar 50 |
| 회사 / 소속 | `company` | ⬜ 선택 | varchar 255 |
| 제목 | `subject` | ✅ | varchar 500 (form 에서는 미입력 시 "내용 첫 50 자" 또는 "O4O 적용 검토 — {업종}" auto-generate) |
| 문의 내용 | `message` | ✅ | text |
| 사업자 유형 | (subject 또는 message 안에 prefix) | △ | "[제조/유통]" 같은 형태로 message 머리에 자동 prepend 권고 |
| 관심 업종 | (Query param `?industry=` 우선) + dropdown | △ | URL `/o4o/apply?industry={pharmacy\|clinic\|salon\|optical\|dental\|other}` 자동 prefill |
| 문의 목적 | (form dropdown) | △ | 사업자 유형 + 관심 업종 + 목적 모두 message 머리에 구조화 prepend |
| 개인정보 동의 | (frontend only check) | ✅ | 미동의 시 제출 차단. 백엔드 저장 X |

### 3.2 새 컬럼 신설 vs message prepend

**옵션 A — 기존 컬럼만 사용 (권장)**:
- `subject` = "[O4O 적용 검토] {업종}" (auto-generate)
- `message` 머리에 메타 구조화:
  ```
  [사업자 유형] 제조/유통
  [관심 업종] 약국
  [문의 목적] O4O 적용 가능성 검토

  --- 본문 ---
  (사용자 입력)
  ```
- 장점: backend 0 변경, MVP 즉시 가능
- 단점: 구조화 데이터로 검색/필터 어려움

**옵션 B — PlatformInquiry 컬럼 신설**:
- `inquirerType` (사업자 유형) / `industry` (관심 업종) / `purpose` (문의 목적) 3 컬럼 신설
- 장점: 관리자 화면 필터 가능
- 단점: migration + entity 수정 + 다른 사용처 (siteguide/KPA) 영향

→ **권장 옵션 A**. 향후 inquiry volume 가 증가하면 옵션 B 로 마이그레이션.

### 3.3 source 자동 캡처

`source` 컬럼에 `'neture.co.kr/o4o/apply'` 또는 `'neture.co.kr/o4o/apply?industry=pharmacy'` 자동 저장 권고. frontend 가 `window.location.href` 또는 `pathname + search` 로 전달.

---

## 4. Frontend 처리 흐름

### 4.1 `/o4o/apply` 페이지 변경

현재 (commit `c3bf8fbf7`): 7 섹션 + mailto link only.

**변경 계획:**
- Hero / 대상 / 검토 범위 / 진행 방식 / 상담 정보 / 안내사항 6 섹션 유지
- CTA 섹션 (mailto 영역) → **`<ApplyForm />` 컴포넌트로 교체**

### 4.2 ApplyForm 컴포넌트 구조

```tsx
function ApplyForm() {
  const [searchParams] = useSearchParams();
  const industryFromUrl = searchParams.get('industry'); // pharmacy / clinic / ... / other / null
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state: name / email / phone / company / inquirerType /
  //             industry (initial = industryFromUrl) / purpose / message / agreement

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreement) { setError('개인정보 수집·이용 동의 필요'); return; }
    setSubmitting(true);
    try {
      const subject = `[O4O 적용 검토] ${INDUSTRY_LABELS[industry] ?? '기타'}`;
      const messageWithMeta = [
        `[사업자 유형] ${INQUIRER_TYPE_LABELS[inquirerType]}`,
        `[관심 업종] ${INDUSTRY_LABELS[industry] ?? '기타'}`,
        `[문의 목적] ${PURPOSE_LABELS[purpose]}`,
        '',
        '--- 본문 ---',
        message,
      ].join('\n');
      const res = await fetch('/api/v1/platform/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'platform',
          name, email, phone: phone || undefined, company: company || undefined,
          subject,
          message: messageWithMeta,
          source: `neture.co.kr${window.location.pathname}${window.location.search}`,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? '제출 실패');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <SubmissionConfirmedView />;
  return ( /* form 렌더 */ );
}
```

### 4.3 제출 후 UX

- 성공 시: form 영역 → 확인 메시지로 교체
  ```
  ✅ 문의가 접수되었습니다
  영업일 기준 2~3일 내 회신드립니다.
  추가 자료가 필요하면 contact@neture.co.kr 로 보내주세요.
  ```
- 실패 시: form 상단 빨간 알림 (error.message 표시) — form 데이터 유지
- 중복 제출 방지: `submitting` state 로 button disabled

---

## 5. Backend Endpoint 설계안

### 5.1 권고 — **신규 endpoint 신설 안 함**

기존 `POST /api/v1/platform/inquiries` 그대로 사용. 다음 조건 모두 충족:

- 인증 불요 (public)
- name / email / subject / message 필수 (form 에서 보장)
- email regex 검증 (controller 가 자동)
- `type='platform'` 으로 본 form 분류 (또는 `'other'` — 사용자 결정)
- `source` 로 출처 추적

### 5.2 (선택적) Subtype 분리 검토

`type='platform'` 이 본 form 외 KPA join form 등에서도 사용된다면 관리자 측 filter 가 모호. **향후 별건 IR 에서** 검토:
- 옵션 A: `type='neture_apply'` 신설 (InquiryType union 확장)
- 옵션 B: `source` 로만 구분 (`source LIKE 'neture.co.kr/o4o/apply%'`)

→ MVP 는 옵션 B (source 기반). 옵션 A 는 운영 부담이 명확해진 후.

### 5.3 API contract

**Request:**
```http
POST /api/v1/platform/inquiries
Content-Type: application/json

{
  "type": "platform",
  "name": "string (required)",
  "email": "string (required, regex)",
  "phone": "string (optional)",
  "company": "string (optional)",
  "subject": "string (required, max 500)",
  "message": "string (required)",
  "source": "neture.co.kr/o4o/apply?industry=pharmacy"
}
```

**Response (성공):**
```http
201 Created
{ "success": true, "data": { "id": "uuid", "message": "문의가 접수되었습니다..." } }
```

**Response (실패):**
```http
400 Bad Request
{ "success": false, "error": "...", "code": "MISSING_REQUIRED_FIELDS" | "INVALID_EMAIL" }

500 Internal Server Error
{ "success": false, "error": "...", "code": "INTERNAL_ERROR" }
```

---

## 6. 이메일 발송 설계안

### 6.1 기존 sendAdminNotification 재사용

[platformInquiryController.ts:239-307](apps/api-server/src/controllers/platformInquiryController.ts#L239-L307) 이 이미 구현:
- 수신: `process.env.PLATFORM_ADMIN_EMAIL || 'admin@neture.co.kr'`
- 제목: `${INQUIRY_TYPE_LABELS[type]} ${subject}` — 본 form 시 `[o4o 플랫폼 문의] [O4O 적용 검토] {업종}`
- HTML: 8 row table (유형/이름/이메일/연락처/회사/제목/내용/출처)
- text fallback: 같은 정보 plain text
- 관리자 페이지 link: `${ADMIN_URL}/platform/inquiries/${id}`
- 실패해도 inquiry 접수는 성공 (try/catch + notificationSent flag)

### 6.2 사용자 확인 이메일 (선택)

현재 sendAdminNotification 은 관리자에게만 발송. 사용자 측 "접수 확인" 자동 응답 메일은 미구현.

**MVP 결정:** 미구현 (form 의 "✅ 문의가 접수되었습니다" 화면으로 충분). 향후 별건.

---

## 7. DB 저장 여부 판단

✅ **저장. 기존 PlatformInquiry entity 그대로 사용.**

이유:
- 운영자가 관리자 화면에서 조회·status 변경 필요 (이미 admin routes 구현)
- email 만으로는 분실/유실 위험
- entity 가 이미 적합 (16 컬럼, 인덱스 3 개)

신규 테이블 미신설.

---

## 8. 개인정보 / 보안 고려사항

### 8.1 개인정보 동의 (필수)

form 제출 전 체크박스 동의 필수. 동의 문구 예:

```
○ 개인정보 수집·이용에 동의합니다.

수집 항목: 이름, 이메일, 연락처(선택), 회사명(선택), 문의 내용
이용 목적: O4O 플랫폼 적용 검토 / 상담 / 문의 응대
보유 기간: 응대 완료 후 1년 (운영 정책)
```

→ 동의 미체크 시 제출 차단 (frontend validation). 백엔드 추가 저장 X (frontend-only check).

### 8.2 Rate limit / Captcha

**MVP — 미적용**. 이유:
- 본 form 의 예상 traffic 매우 낮음 (사업자 진입 — 일 수 건)
- 기존 PlatformInquiry endpoint 가 production live 인데 captcha 부재 (인프라 정책상 미적용 상태)
- 추가 신설 비용 큼

**향후 (별건):** 만약 spam 유입 시 다음 도입 검토:
- IP 기반 rate limit (express-rate-limit, 분당 5 회 등)
- 클라이언트 honeypot 필드 (사용자 미노출 hidden field — 봇만 채움 시 차단)
- captcha (cloudflare turnstile, reCAPTCHA v3)

### 8.3 민감정보 금지

- 사업계획서 파일 업로드 ❌ (form scope 외)
- 주민등록번호 / 사업자등록증 등 민감자료 수집 ❌ (안내문에서도 명시 제외)
- 비밀번호 / 인증번호 등 절대 수집 X

### 8.4 IP / UA 로깅

이미 controller 가 자동 캡처 (`req.ip`, `req.headers['user-agent']`, `req.headers.referer`). 운영 audit 용도. 별도 user disclosure 불요 (공개 표준 logging).

### 8.5 정합 정책 (체크리스트)

| 항목 | 정합 |
|------|:----:|
| HTTPS 강제 | ✅ Cloud Run 기본 |
| CORS | ✅ public endpoint, neture.co.kr origin 허용 가정 |
| SQL injection | ✅ TypeORM parameterized |
| XSS — message 표시 | ⚠️ admin 화면이 raw message 를 sanitize 해야 — 별건 관리자 화면 검토 |
| email regex | ✅ controller 검증 완료 |

---

## 9. MVP scope 정리

| 항목 | MVP | 후속 |
|---|:---:|:---:|
| Frontend `<ApplyForm />` 컴포넌트 신설 | ✅ | — |
| /o4o/apply 페이지의 CTA 영역을 form 으로 교체 | ✅ | — |
| `POST /api/v1/platform/inquiries` 재사용 | ✅ | — |
| 기존 sendAdminNotification 활용 | ✅ | — |
| URL `?industry=` query param prefill | ✅ | — |
| 개인정보 동의 frontend 검증 | ✅ | — |
| 제출 성공/실패 UX | ✅ | — |
| backend 신규 endpoint | ❌ | 향후 type=neture_apply 분리 시 |
| backend 신규 entity / 컬럼 | ❌ | 향후 inquirerType/industry/purpose 구조화 시 |
| 사용자 측 자동 응답 메일 | ❌ | 별건 |
| Captcha / rate limit | ❌ | spam 유입 시 별건 |
| 파일 업로드 | ❌ | scope 외 |

### MVP 작업 규모

- Frontend: 1 신규 컴포넌트 (~200 lines) + O4OApplyPage.tsx 1 섹션 교체 (~20 lines)
- Backend: 0 변경
- DB: 0 변경

→ **단일 commit 가능 (1 file modify + 1 file new = 2 files).**

---

## 10. 후속 WO 범위

### 10.1 즉시 (MVP)

**`WO-O4O-NETURE-APPLY-FORM-MVP-V1`** (제안):
- frontend `<ApplyForm />` 컴포넌트 신설
- O4OApplyPage 의 CtaSection (mailto only) → form 으로 교체
- query param `?industry=` prefill
- POST `/api/v1/platform/inquiries` 호출
- 제출 성공 후 확인 메시지 UX
- 회귀 위험: 매우 낮음 (frontend only, backend/DB 0)
- 검증: 실제 form 제출 → admin 화면에서 inquiry 확인

### 10.2 후속 (별건)

| 후속 IR / WO | 우선순위 | 비고 |
|---|:---:|---|
| `IR-O4O-PLATFORM-INQUIRY-TYPE-NETURE-APPLY-SUBTYPE-V1` | 中 | inquirerType/industry/purpose 컬럼 신설 + InquiryType 확장 ('neture_apply') 검토 — 운영 부담 명확해진 후 |
| `IR-O4O-PLATFORM-INQUIRY-USER-AUTOREPLY-V1` | 中 | 사용자 측 자동 응답 메일 신설 |
| `WO-O4O-PLATFORM-INQUIRY-RATE-LIMIT-V1` | 低 | spam 유입 발생 시 IP rate limit + honeypot |
| `IR-O4O-PLATFORM-INQUIRY-XSS-SANITIZATION-V1` | 中 | 관리자 화면에서 raw message 의 sanitize 처리 (별 도메인) |

---

## 11. 본 IR 이 결정하지 않는 것

- 실제 form UI 디자인 (색상 / 레이아웃 / 입력 component) — WO 시 결정
- `inquirerType` / `industry` / `purpose` 가 entity 컬럼이 되어야 하는지 — MVP 후 데이터 보고 별건
- 사용자 측 자동 응답 메일의 정확한 본문 — 별건
- 관리자 화면 (`VaultInquiriesPage`) 의 필터 / 검색 / 일괄 처리 강화 — 별 도메인
- `/o4o/apply` 외 신규 inquiry 진입 경로 (예: KPA-only inquiry) — 별 도메인
- 다국어 (영문 form) — scope 외

---

## 12. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 새 즉시 WO 후보 | **1 건** (`WO-O4O-NETURE-APPLY-FORM-MVP-V1`) |
| 핵심 발견 | **PlatformInquiry 인프라 완비** — backend / entity / email / admin routes 모두 production live. 재사용으로 MVP 가능 |
| 후속 IR / WO 후보 | **4 건** (subtype 분리 / 자동 응답 메일 / rate limit / XSS sanitization) |
| 사이클 정리 | "/o4o/apply form 구현 = frontend only" 확정 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. inquiry/contact endpoint 전수
grep -rn "platform/inquiries\|inquiry\|consultation" \
  apps/api-server/src/routes apps/api-server/src/controllers

# 2. PlatformInquiry entity / controller
cat apps/api-server/src/entities/PlatformInquiry.ts
cat apps/api-server/src/controllers/platformInquiryController.ts

# 3. EmailService
cat apps/api-server/src/services/email.service.ts

# 4. frontend 기존 사용처
grep -rn "platform/inquiries\|InquiryType\|submitInquiry" services/

# 5. 다른 inquiry 도메인 (KPA / GP 등 — 본 form 와 분리 확인용)
ls apps/api-server/src/routes/kpa/controllers/contact-request.controller.ts \
   apps/api-server/src/routes/kpa/controllers/join-inquiry.controller.ts \
   apps/api-server/src/routes/glycopharm/controllers/customer-request.controller.ts
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — PlatformInquiry 재사용으로 MVP frontend only 확정.*
*Decision Required: `WO-O4O-NETURE-APPLY-FORM-MVP-V1` 진입 (frontend form 신설 + POST /api/v1/platform/inquiries 호출).*
