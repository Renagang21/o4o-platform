# CHECK-O4O-NETURE-APPLY-FORM-MVP-V1

> **조사 실행 보고서 (코드 수정·UI 수정·migration 없음)**
>
> 선행: `IR-O4O-NETURE-APPLY-FORM-BACKEND-DESIGN-V1`
> 목적: `/o4o/apply` form MVP 구현 범위 확정. backend 변경 없이, 기존 production-live endpoint `POST /api/v1/platform/inquiries`를 재사용하여 form 전환 가능하도록 **필드·매핑·UX·범위**를 freeze한다.

---

## 0. 전제 (IR 결론 인계)

```text
POST /api/v1/platform/inquiries 재사용 (이미 production-live)
PlatformInquiry entity 재사용
sendAdminNotification (관리자 이메일) 재사용
backend endpoint 신설 없음
DB migration 없음
frontend-only MVP
```

---

## 1. 사실 확인 (코드 정적 분석)

### 1.1 Backend endpoint 수용 필드

`apps/api-server/src/controllers/platformInquiryController.ts:32-108`

| 필드 | 타입 | 필수 여부 | 비고 |
|------|------|:--------:|------|
| `type` | `'siteguide' \| 'platform' \| 'partnership' \| 'other'` | 선택 (default `'platform'`) | 본 form은 `'platform'` 사용 |
| `name` | string | **필수** | 미존재 시 `MISSING_REQUIRED_FIELDS` 400 |
| `email` | string | **필수** | regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` 검증, 위반 시 `INVALID_EMAIL` 400 |
| `phone` | string | 선택 | |
| `company` | string | 선택 | |
| `subject` | string | **필수** | 관리자 이메일 제목으로 사용 |
| `message` | string | **필수** | metadata + 본문 모두 들어감 |
| `source` | string | 선택 | 출처 식별자 |

자동 캡처: `ipAddress`, `userAgent`, `referrer` — 서버 측에서 자동.

응답:
- 성공 201: `{ success: true, data: { id, message } }`
- 검증 실패 400: `{ success: false, error, code }`
- 서버 오류 500: `{ success: false, error, code: 'INTERNAL_ERROR' }`

관리자 이메일 (`PLATFORM_ADMIN_EMAIL` env, default `admin@neture.co.kr`) 으로 HTML + text 알림 자동 발송. 알림 실패해도 문의 접수는 성공으로 처리(`notificationSent` 만 false 유지).

### 1.2 현재 `/o4o/apply` 상태

`services/web-neture/src/pages/o4o/O4OApplyPage.tsx:204-234` (`CtaSection`)
- 현재 `<a href={mailto:contact@neture.co.kr?subject=...}>` 1개 + 하단 nav 링크 2개.
- form, validation, API 호출 모두 미구현.
- 페이지 자체 sections (Hero/Target/Scope/Process/Info/Notice) 6개는 그대로 유지.

### 1.3 진입 query parameter

`/o4o/targets/{type}` 4종에서 `?industry=` 전달 확인:

| Target page | href | industry 값 |
|-------------|------|-------------|
| `ClinicTargetPage.tsx:179` | `/o4o/apply?industry=clinic` | `clinic` |
| `DentalTargetPage.tsx:181` | `/o4o/apply?industry=dental` | `dental` |
| `OpticalTargetPage.tsx:203` | `/o4o/apply?industry=optical` | `optical` |
| `PharmacyTargetPage.tsx:203` | `/o4o/apply?industry=pharmacy` | `pharmacy` |

**미발견** (CHECK 결과):
- `?industry=salon` — Salon target page는 현재 코드베이스에 미구현 (IR 가정과 차이). 본 MVP는 미존재 값 처리만 정의하고 page 신설은 범위 외.
- `?industry=other` — 명시 호출처 없음. form 내부 select의 기본값으로 사용.

`/o4o` 메인의 CTA(`O4OMainPage.tsx`)는 `industry` 없이 진입.

### 1.4 약관·개인정보 라우트

`services/web-neture/src/App.tsx:625-626`
- `/terms` — `LegalPage slug="terms-of-service"` (CMS 기반)
- `/privacy` — `LegalPage slug="privacy-policy"` (CMS 기반)

→ 동의 문구에 `<Link to="/privacy">개인정보처리방침</Link>` 직접 연결 가능. 별도 페이지 신설 불필요.

---

## 2. Form 필드 최종안 (Freeze)

### 2.1 노출 순서·라벨·입력 타입

| # | 필드 | 라벨 | 입력 타입 | 필수 | placeholder / 예시 |
|---|------|------|----------|:---:|------|
| 1 | name | 이름 | text | ✅ | 홍길동 |
| 2 | company | 회사명 / 소속 | text | ✅ | 협동조합/약국명/매장명 |
| 3 | phone | 연락처 | tel | ✅ | 010-1234-5678 |
| 4 | email | 이메일 | email | ✅ | example@domain.com |
| 5 | businessType | 사업자 유형 | select | ✅ | 제조·유통 / 프랜차이즈·본부 / 협동조합·협회 / 지역 기반 운영자 / 신규 사업 기획자 / 기타 |
| 6 | industry | 관심 업종 | select | 선택 | 약국 / 치과 / 의원 / 안경원 / 미용실 / 기타 |
| 7 | purpose | 문의 목적 | select | ✅ | O4O 적용 가능성 검토 / 공급자 참여 / 운영자 참여 / 매장 도입 / 기타 |
| 8 | message | 문의 내용 | textarea (min 5줄) | ✅ | 사업 개요 / 현재 상황 / 검토하고 싶은 항목 |
| 9 | consent | 개인정보 수집·이용 동의 | checkbox | ✅ | 미동의 시 제출 차단 |

**필수/선택 확정 근거**:
- `company` 필수화 — Notice §6 “문의 시 사업 개요(업종/규모/목적)와 관심 분야를 포함” 정책상 소속 식별이 회신 품질의 핵심. PlatformInquiry 스키마에서는 nullable이지만 form 단계에서 필수로 잠금.
- `phone` 필수화 — “이메일 접수 후 유선 또는 화상 상담”(InfoSection) UX와 정합.
- `industry` 선택 — query prefill만으로 들어오는 경우가 있고, 사업자 유형이 단체/기획자면 특정 업종 지정이 어색하므로 선택으로 유지.

### 2.2 필드별 클라이언트 validation

| 필드 | rule |
|------|------|
| name | trim 후 1자 이상 |
| company | trim 후 1자 이상 |
| phone | 숫자·하이픈·공백·괄호 허용, 9~15자리 |
| email | `^[^\s@]+@[^\s@]+\.[^\s@]+$` (backend와 동일) |
| businessType | 정의된 enum 값 |
| industry | 정의된 enum 값 또는 빈값 |
| purpose | 정의된 enum 값 |
| message | trim 후 10자 이상 |
| consent | true 강제 |

서버 측 검증은 backend 그대로(`name/email/subject/message` 필수 + email regex). 클라이언트는 그 위에 추가 UX 검증만 수행.

---

## 3. PlatformInquiry 매핑 (Freeze)

| Form 필드 | API payload key | 변환 |
|----------|----------------|------|
| name | `name` | 그대로 |
| company | `company` | 그대로 |
| phone | `phone` | 그대로 |
| email | `email` | trim |
| businessType | `message` 앞부분 (metadata) | §4 형식 |
| industry | `message` 앞부분 (metadata) | §4 형식 |
| purpose | `message` 앞부분 (metadata) + `subject` 생성 | §4 형식 |
| message | `message` 본문 부분 | §4 형식 |
| consent | (전송하지 않음) | frontend gate만 |
| — | `type` | 고정 `'platform'` |
| — | `source` | 고정 `'neture_o4o_apply'` (industry 있으면 `'neture_o4o_apply:{industry}'`) |
| — | `subject` | `'[O4O 적용 문의] ' + purpose 라벨` |

**`subject` 자동 생성 정책**: form에서 별도 입력란 두지 않음 (UX 단순화). `purpose` select 값에 따라 frontend 가 prefix 결합. 관리자 알림 이메일 제목은 controller 가 `[o4o 플랫폼 문의] ${subject}` 형태로 추가 prepend.

**`source` 값**: `'neture_o4o_apply'` (기본) 또는 `'neture_o4o_apply:pharmacy'` 처럼 진입 industry 포함. 관리자가 ‘Apply 페이지 진입 후 어떤 industry 카드에서 왔는지’를 단일 컬럼으로 식별 가능. 별도 컬럼/migration 불필요.

---

## 4. `message` Metadata Prepend 형식 (Freeze)

```text
[O4O 적용 문의 정보]
사업자 유형: {businessType 라벨}
관심 업종: {industry 라벨 또는 '미지정'}
문의 목적: {purpose 라벨}

[문의 내용]
{사용자 입력 message 원문}
```

**규칙**:
- 라벨은 한국어 표시 라벨을 그대로 사용 (관리자 가독성 우선).
- `industry` 비어있으면 `미지정`.
- 본문 사이 빈 줄 1개.
- whitespace는 trim하지 않고 원문 보존(줄바꿈 포함). controller 의 관리자 알림 이메일이 `white-space: pre-wrap` 으로 출력하므로 그대로 표시됨.

**왜 별도 컬럼 추가가 아닌 prepend 인가**: IR §opt A 결론 — `businessType / industry / purpose` 추가는 DB migration + admin UI 갱신 + 마이그레이션 backfill 필요. MVP 범위 외이므로 metadata prepend로 backend 0 변경 유지. 추후 admin 화면 정비 시 별도 WO 로 컬럼 분리 가능 (parsing 가능한 구조).

---

## 5. Query Parameter Prefill 규칙 (Freeze)

`useSearchParams()` 로 `industry` 읽기.

| 들어온 값 | 처리 |
|----------|------|
| `pharmacy` / `clinic` / `dental` / `optical` | 해당 select option 선택 |
| `salon` / `other` 등 정의된 enum | 해당 option 선택 |
| 알 수 없는 값 (예: `xxx`, 빈 문자열) | 무시, select 비워둠 |
| 파라미터 자체 없음 | select 비워둠 |

**상호작용**:
- prefill 이후 사용자가 직접 변경 가능 (form state 가 우선).
- URL 은 prefill 1회 이후 변경하지 않음 (history 오염 방지).

---

## 6. 제출 UX (Freeze)

### 6.1 제출 중

- submit 버튼 disabled + 로딩 표시 (`전송 중...` 텍스트).
- form 전체 disabled.

### 6.2 성공 (201 응답)

화면을 form 대신 성공 패널로 교체:

```text
✓ 문의가 접수되었습니다.

영업일 기준 2~3일 내에 입력하신 이메일·연락처로 회신드리겠습니다.

문의 ID: {response.data.id}
```

추가 CTA:
- `O4O 메인으로 돌아가기` → `/o4o`
- `네처 메인으로` → `/`

성공 후 form 재진입 불가 (페이지 새로고침 시 다시 비어있는 form). MVP는 다중 제출 방지 단순화.

### 6.3 실패 (400 / 500 / 네트워크 오류)

form 유지하고 상단에 error 배너 + fallback 안내:

```text
✕ 문의 접수 중 문제가 발생했습니다.

잠시 후 다시 시도하시거나, 아래 이메일로 직접 보내주세요:
contact@neture.co.kr  [mailto 링크]
```

- 400 응답의 `error` 메시지는 그대로 표시.
- 500 / 네트워크 오류는 위 일반 메시지.
- mailto fallback 링크는 항상 표시 (기존 페이지의 mailto UX 보존).

### 6.4 검증 실패 (제출 전)

- 필드별 inline 에러 메시지 (한 줄, 빨간색).
- 제출 버튼 클릭 시 첫 오류 필드로 scroll + focus.

---

## 7. 개인정보 동의 처리 (Freeze)

### 7.1 동의 문구

```text
문의 접수와 답변을 위해 입력한 개인정보(이름, 회사명, 연락처, 이메일)를
수집·이용하는 데 동의합니다. 자세한 내용은 [개인정보처리방침]을 참고해 주세요.
```

`[개인정보처리방침]` 부분은 `<Link to="/privacy" target="_blank">` (신탭 열림).

### 7.2 검증 동작

- checkbox 미체크 시 제출 버튼 disabled (시각적으로 회색).
- 클릭 시 inline 에러 `개인정보 수집·이용에 동의해 주세요.`

### 7.3 저장 정책

- `consent` 자체는 API payload에 포함하지 않음 (frontend gate만).
- 사용자가 form 제출에 성공한 시점 = 동의로 간주 (관행).
- 별도 동의 이력 테이블 신설은 MVP 범위 외 (필요 시 후속 WO).

---

## 8. MVP WO 포함 / 제외 항목 (Freeze)

### 8.1 WO-O4O-NETURE-APPLY-FORM-MVP-V1 에 포함

```text
- ApplyForm 컴포넌트 신규 작성 (services/web-neture/src/pages/o4o/ApplyForm.tsx)
- O4OApplyPage.tsx 의 CtaSection 을 ApplyForm 로 교체
- 9개 필드 + validation + 제출 핸들러
- POST /api/v1/platform/inquiries 호출 (authClient.api.post)
- message metadata prepend (§4)
- subject 자동 생성 (§3)
- source 값 industry 결합 (§3)
- ?industry= prefill (§5)
- 성공 / 실패 / 검증 실패 UX (§6)
- 개인정보 동의 checkbox + /privacy 링크 (§7)
- mailto fallback 유지 (실패 패널 내부)
- 기본 smoke test (Playwright 헤드리스 또는 dev server 수동 검증):
  - /o4o/apply 진입 시 form 표시
  - /o4o/apply?industry=pharmacy 진입 시 select prefill
  - 필수 미입력 제출 시 검증 차단
  - 정상 제출 → 201 success 패널 표시 (실제 메일 발송 검증은 별도)
```

### 8.2 WO-O4O-NETURE-APPLY-FORM-MVP-V1 범위 외

```text
- backend endpoint 신설 / 수정
- DB migration / 새 컬럼 추가
- 관리자 화면 (operator/admin 측 inquiry 목록)
- 첨부파일 업로드
- CAPTCHA
- rate limit (서버 측)
- 이메일 템플릿 수정 (관리자 알림 HTML/text)
- /o4o/targets/salon 등 누락된 target page 신설
- /privacy /terms 콘텐츠 작성
- consent 별도 이력 테이블
- 다국어
- 다중 제출 / 임시 저장 / 진행 상태 조회
```

### 8.3 후속 WO 후보 (참고용, 본 WO 외)

```text
WO-O4O-PLATFORM-INQUIRY-METADATA-COLUMN-EXTRACTION-V1
  → businessType / industry / purpose 를 별도 컬럼으로 분리 (migration + parsing backfill + admin UI)

WO-O4O-NETURE-TARGETS-SALON-OTHER-PAGES-V1
  → 미용실 / 기타 업종 target page 신설

WO-O4O-OPERATOR-PLATFORM-INQUIRY-CONSOLE-V1
  → operator/admin 화면에서 platform_inquiries 검토·상태 관리
```

---

## 9. 다음 WO 작성 시 필수 포함 문구

후속 `WO-O4O-NETURE-APPLY-FORM-MVP-V1` 작성 시 다음 3원칙을 작업 원칙 절에 명시한다 (사용자 directive, 2026-05-24):

```text
- 동시 작업 혼입 방지를 위해 git add 직후 즉시 commit까지 한 트랜잭션으로 처리한다.
- git add . 또는 광범위 staging은 금지한다.
- 예상 밖 staged/modified 파일이 있으면 즉시 중단하고 보고한다.
```

---

## 10. 본 CHECK 결과 요약 (10초 판단용)

| 항목 | 확정 결과 |
|------|----------|
| Backend 변경 | 0 (IR 결론 그대로) |
| Form 필드 | 9개 (이름/회사·소속/연락처/이메일/사업자유형/관심업종/문의목적/문의내용/동의) |
| 필수 필드 | 7개 (industry, consent 제외 모두 + consent 별도 gate) |
| message metadata | prepend 4줄 + 빈 줄 + 본문 |
| subject | `[O4O 적용 문의] {purpose 라벨}` 자동 생성 |
| source | `neture_o4o_apply[:{industry}]` |
| query prefill | `?industry=` 4종 + unknown은 무시 |
| 개인정보 동의 | checkbox 필수 + `/privacy` 링크 |
| 성공 UX | form 교체형 success 패널 + 문의 ID 표시 |
| 실패 UX | 배너 + mailto fallback 항상 표시 |
| 신규 파일 | 1 (ApplyForm.tsx) |
| 수정 파일 | 1 (O4OApplyPage.tsx — CtaSection만 교체) |

→ **WO-O4O-NETURE-APPLY-FORM-MVP-V1 즉시 착수 가능**.

---

## 11. 다음 단계

```text
CHECK-O4O-NETURE-APPLY-FORM-MVP-V1 (본 문서, 완료)
↓
WO-O4O-NETURE-APPLY-FORM-MVP-V1 (구현)
```
