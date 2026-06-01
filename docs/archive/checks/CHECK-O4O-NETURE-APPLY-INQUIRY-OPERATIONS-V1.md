# CHECK-O4O-NETURE-APPLY-INQUIRY-OPERATIONS-V1

> **운영 접수 흐름 점검 보고서**
>
> 코드 수정·UI 수정·migration 없음. `/o4o/apply` 로 접수된 문의가 실제 운영자가 확인·대응할 수 있는 상태인지 정적·동적 검증.
>
> 선행: `WO-O4O-NETURE-APPLY-FORM-MVP-V1`, `CHECK-O4O-NETURE-APPLY-FORM-MVP-SMOKE-V1`

---

## 0. 핵심 결론 (Executive Summary)

| 질문 | 답 |
|------|----|
| 운영자가 접수된 문의를 볼 수 있는가? | ✅ **이미 가능** — `/admin-vault/inquiries` (VaultInquiriesPage) 가 production 에 live |
| message metadata prepend 가 가독성 있는가? | ✅ **충분** — `whitespace: pre-wrap` 으로 4줄 metadata + 본문 그대로 렌더 |
| 관리자 이메일이 발송되는가? | 코드 흐름은 정상. 실제 수신은 사용자 확인 필요 |
| 추가 admin console 신설 IR 필요한가? | ❌ **불필요** — 이미 존재 |
| metadata 컬럼 분리 IR 필요한가? | ❌ **현 시점 불필요** — 트리거 발생 시에만 |

→ **추가 IR/WO 없이 현 인프라로 운영 가능**. Apply Form MVP 사이클은 종료 가능.

---

## 1. 사실 확인 (정적 + 동적)

### 1.1 row 저장 흐름 (코드 정적)

`apps/api-server/src/controllers/platformInquiryController.ts:32-108`

1. POST `/api/v1/platform/inquiries` 수신 → 필수 필드 검증 (name/email/subject/message) + email regex
2. `inquiryRepo().create({ type, name, email, phone, company, subject, message, source, ipAddress, userAgent, referrer, status:'new' })`
3. `await inquiryRepo().save(inquiry)` — `platform_inquiries` row 생성
4. `await sendAdminNotification(inquiry)` 시도 → 성공 시 `notificationSent=true` 업데이트, 실패해도 문의 접수는 성공으로 처리
5. 응답: `201 { success: true, data: { id, message } }`

### 1.2 동적 검증 (smoke 결과)

`CHECK-O4O-NETURE-APPLY-FORM-MVP-SMOKE-V1` (DO_SUBMIT=1, 2026-05-24)

| 검증 | 결과 |
|------|------|
| POST 응답 상태 | 201 ✅ |
| 응답에 inquiry.id 포함 | `7c706a5a-…` ✅ |
| payload.type | `platform` ✅ |
| payload.source | `neture_o4o_apply:pharmacy` ✅ |
| payload.subject | `[O4O 적용 문의] O4O 적용 가능성 검토` ✅ |
| payload.message metadata | `[O4O 적용 문의 정보] / 관심 업종: 약국 / …` 포함 ✅ |
| payload.message body | `배포 검증용 테스트 문의입니다.…` 포함 ✅ |

→ row 저장은 정상. 별도 DB 직접 확인 없이도 "POST 201 + id 반환" 으로 트랜잭션 commit 완료가 입증됨.

### 1.3 관리자 이메일 발송 흐름

`platformInquiryController.ts:239-307` (`sendAdminNotification`)

- **수신처**: `process.env.PLATFORM_ADMIN_EMAIL || 'admin@neture.co.kr'`
- **제목**: `${INQUIRY_TYPE_LABELS[type]} ${subject}` → `'[o4o 플랫폼 문의] [O4O 적용 문의] O4O 적용 가능성 검토'` (이중 prefix 형태)
- **본문**: HTML 표 + plain text 모두 포함. 본문 (`message`) 부분이 `white-space: pre-wrap` 으로 렌더되어 metadata prepend 4줄이 줄바꿈 보존 표시.
- 실패해도 row 는 저장됨 (`notificationSent=false` 만 유지). 추후 재발송 로직 없음 — 명시적 manual 처리 필요.

**자동 확인 불가 영역**:
- `PLATFORM_ADMIN_EMAIL` env 값은 Cloud Run 환경에 주입 (저장소에 default `admin@neture.co.kr` 만 명시). 본 작업자 권한으로 Cloud Run env 직접 조회 불가 (gcloud run API 비활성 + project ID 미확인).
- 실제 메일 수신 여부는 수신함 (`admin@neture.co.kr` 또는 override 된 주소) 에서 사용자 직접 확인 필요.

### 1.4 admin console (운영자 화면) — **이미 존재**

| 항목 | 값 |
|------|----|
| 경로 | `/admin-vault/inquiries` (Neture web) |
| 컴포넌트 | `services/web-neture/src/pages/admin-vault/VaultInquiriesPage.tsx` (352 줄) |
| App.tsx 등록 | `Route path="/admin-vault/inquiries"` |
| API endpoint | `GET /admin/platform/inquiries` (list, `platform:admin` guard), `PATCH .../:id` (status 변경) |

**기능**:
- 목록 조회 (type/status 필터, 페이지네이션)
- 카드 펼침: 이름·이메일·연락처·회사·**message 전문 (whitespace pre-wrap)**·source·접수일·해결일·알림 발송 여부
- 상태 변경 4단계: 신규 → 처리중 → 해결됨 → 종료 (DELETE 엔드포인트 없음 → 종료 처리 = soft close)
- dark theme (Vault — 별도 admin shell)

→ **운영자가 별도 ad-hoc 시스템/스크립트 없이 web UI 에서 접수 → 처리 → 종료 전 흐름 수행 가능**.

### 1.5 message metadata 가독성

ApplyForm 의 `buildPayload()` 가 만드는 message (smoke 확인됨):

```text
[O4O 적용 문의 정보]
사업자 유형: 협동조합·협회
관심 업종: 약국
문의 목적: O4O 적용 가능성 검토

[문의 내용]
배포 검증용 테스트 문의입니다. 실제 상담 요청이 아닙니다.
```

VaultInquiriesPage 라인 307-309:
```tsx
<p className="text-slate-200 whitespace-pre-wrap bg-slate-700/50 p-4 rounded-lg">
  {inquiry.message}
</p>
```

→ 4줄 metadata + 빈 줄 + 본문이 줄바꿈 보존되어 가독성 충분. 별도 parser/section split 없이 운영자가 바로 읽음. 관리자 이메일 본문도 동일하게 `white-space: pre-wrap` 으로 렌더 (controller HTML 템플릿).

---

## 2. 사용자 확인 항목별 결과 (CHECK 요청 7항목)

### 2.1 platform_inquiries row 정상 저장

**결과**: ✅ 정상.
**근거**:
- smoke POST 201 + id 반환 → 트랜잭션 commit 완료
- VaultInquiriesPage 로 직접 조회 가능 (사용자 platform:admin 토큰 보유 시)
- 운영 확인 절차: 사용자가 `/admin-vault/inquiries` 진입 → 필터 type=platform / status=신규 → `7c706a5a-…` row 확인

### 2.2 관리자 이메일 수신 정상 여부

**결과**: 자동 확인 불가 (사용자 수신함 확인 필요).
**확인 절차**:
1. `PLATFORM_ADMIN_EMAIL` 환경변수 실제 값 확인 (Cloud Run console → o4o-core-api 서비스 → Variables) — 미설정 시 `admin@neture.co.kr` 사용
2. 해당 수신함에서 제목 `[o4o 플랫폼 문의] [O4O 적용 문의] O4O 적용 가능성 검토` 확인
3. 또는 VaultInquiriesPage 에서 해당 row 의 `notificationSent` 값이 `true` 인지 확인 (true면 발송 시도 성공)

### 2.3 message metadata 가 운영자가 읽기에 충분한지

**결과**: ✅ 충분.
**근거**: §1.5. 4줄 metadata 한국어 라벨 그대로 + `whitespace: pre-wrap` 렌더. parser/UI split 없이 바로 읽힘.

### 2.4 테스트 row 삭제 또는 무시 처리 기준

**결과**: VaultInquiriesPage 에 DELETE 엔드포인트 없음 → **상태 종료 처리** 가 표준.
**권장 처리** (smoke 로 생성된 `7c706a5a-…` row):
- `/admin-vault/inquiries` 진입 → 해당 row 펼침 → 상태 변경: `종료`
- message 본문에 이미 "**배포 검증용 테스트 문의입니다. 실제 상담 요청이 아닙니다.**" 명시되어 있어 운영 식별 가능
- DB 직접 DELETE 가 필요한 경우 (e.g. PII 등) → 별도 WO. 현재는 종료 처리로 충분.

향후 정책 옵션:
- **A. 현재 정책**: smoke / 테스트 row 도 일반 row 와 동일하게 종료 처리 (감사 이력 보존)
- **B. 분리 정책**: source 값에 `:test` suffix 추가 (e.g. `neture_o4o_apply:pharmacy:test`) → 운영 검색에서 제외. WO 필요.

→ **A 권장** (Clean and simple — 별도 분기 도입 비용 > 현재 한 줄 식별의 부담).

### 2.5 현재 mail/admin 운영만으로 충분한지

**결과**: ✅ **충분**.
**근거**:
- VaultInquiriesPage = admin console (list + detail + status 4단계 + 필터 + 페이지네이션) 모두 갖춤
- sendAdminNotification = 이메일 알림 (실패 시 row 만 저장) 갖춤
- 트래픽이 적은 초기 단계 (apply form MVP 직후) 에서 일별 < 10건 수준이면 현재 인프라로 무리 없이 처리 가능

### 2.6 admin console 이 필요한 시점

**결과**: ❌ 이미 존재. 별도 신설 IR/WO 불필요.
**잠재 보강 영역** (필요 트리거 발생 시):
- inquiry 상세 페이지 (현재는 카드 펼침으로 처리 — 일별 처리량 증가 시 별도 detail 페이지 검토)
- adminNotes 편집 UI (현재 entity 에 컬럼 있으나 VaultInquiriesPage 에 입력란 없음)
- 검색 (현재 type/status 필터만)
- 일별/주별 통계 위젯

위 모두 **트리거 없으면 작업 없음** (premature 보강 금지).

### 2.7 metadata 컬럼 분리가 필요한 시점

**결과**: 현재 불필요. 다음 중 1개 이상 트리거 발생 시 IR 착수:

| 트리거 | 영향 |
|--------|------|
| **filter/검색 요구** — "약국 관심자만 조회" 등 industry/businessType/purpose 기반 필터가 운영 필수가 될 때 | 현재는 message 전문 검색이라 부정확/느림 |
| **집계/리포트** — 월간 industry 분포, businessType 추세 등 | metadata parsing 필요 |
| **CSV/export** — 외부 분석 도구로 데이터 추출 | parsing 필요 |
| **자동화 워크플로우** — purpose=공급자 참여 → 공급자 등록 폼 prefill 등 | structured 필드 필요 |

위 트리거가 명시적으로 발생하기 전까지는 **현 metadata prepend 방식 유지**가 cleaner.

분리 시 IR 후보:
- `IR-O4O-PLATFORM-INQUIRY-METADATA-COLUMN-EXTRACTION-V1`
  - 신규 컬럼: `business_type`, `industry`, `purpose` (모두 nullable, 기존 row 호환)
  - migration: 신규 row 부터 컬럼 채우고 message metadata 도 병행 보존 (이중 기록 → 운영자 dual read 가능)
  - 또는 message parsing backfill (정규식 기반, 후속 cleanup)
  - admin UI: VaultInquiriesPage 의 카드에 컬럼 표시 + 필터 select 추가

---

## 3. 종합 결론

### 3.1 Apply Form MVP 사이클 종료 가능

WO-O4O-NETURE-APPLY-FORM-MVP-V1 → SALON-APPLY-CTA-V1 → SMOKE V1 → 본 OPS CHECK V1.
**다음 큰 개발 없이 현 상태로 운영 진입 가능**. Apply Form MVP 사이클은 본 CHECK 로 종료 처리.

### 3.2 사용자 액션 항목 (선택)

1. **(필수)** `/admin-vault/inquiries` 진입 → `7c706a5a-…` row 확인 → 상태 `종료` 로 변경
2. **(권장)** `PLATFORM_ADMIN_EMAIL` 수신함에서 smoke 로 발송된 알림 메일 수신 확인. 미수신 시 별도 IR `IR-O4O-PLATFORM-INQUIRY-NOTIFICATION-FAILURE-V1` 착수.
3. **(선택)** VaultInquiriesPage 의 message 표시가 가독성 충분한지 직접 검토 (제 평가 = 충분).

### 3.3 후속 IR 보류 (트리거 대기)

- `IR-O4O-PLATFORM-INQUIRY-METADATA-COLUMN-EXTRACTION-V1` — filter/검색/집계 트리거 발생 후
- `IR-O4O-PLATFORM-INQUIRY-NOTIFICATION-FAILURE-V1` — 이메일 미수신 확인된 경우만
- `IR-O4O-VAULT-INQUIRY-CONSOLE-UX-V1` — 일별 처리량 증가 시 detail page / search 추가
