# CHECK-O4O-BUSINESS-REGISTRATION-CROSSSERVICE-E2E-V1

**상태**: 검증 시나리오 준비 완료 (Not Yet Executed)
**작성 일자**: 2026-05-30
**검증 환경 (예정)**: production
  - `https://kpa-society.co.kr`
  - `https://glycopharm.co.kr`
  - `https://k-cosmetics.site`
  - `https://neture.co.kr`
**검증 도구 (예정)**: Playwright (chromium 1.57.0, headless 기본) + 필요 시 curl / API 직접 호출
**자격증명 SSOT**: [`docs/local/TEST-ACCOUNTS.local.md`](../local/TEST-ACCOUNTS.local.md) — env vars 로 주입, 평문 하드코딩 금지

> CLAUDE.md 의 앱 개발 시 작업 규칙(§1 / §8 / §15)에 따라 작성된 **통합 브라우저 검증 CHECK 준비 요청서**.

---

## 목적

O4O 4개 서비스의 사업자 등록 공통화 흐름을 브라우저 기준으로 통합 검증한다.

선행 작업으로 다음이 완료되었다.

```text
P1. BusinessRegistrationInfo canonical type 추가
P2. 4서비스 가입 폼에 업태/종목/사업자유형/개업일 입력·저장 정렬
P4. operator/admin 화면에 사업자등록증 4개 필드 표시 정합
P3. BusinessRegistrationFields 공통 UI 컴포넌트 추출 및 4서비스 가입 폼 적용
```

이번 CHECK의 목적은 실제 브라우저에서 다음 흐름이 정상인지 확인하는 것이다.

```text
가입 신청 입력
→ payload 전송
→ users.businessInfo 저장
→ operator/admin 신청 상세 또는 회원 상세 표시
→ 계좌 정보 미노출
```

## 작업 성격

이번 작업은 read-only 또는 테스트 계정 기반 검증 작업이다.

코드 수정, DB schema 수정, migration 작성, UI 수정은 하지 않는다.

문제가 발견되면 즉시 수정하지 말고, 어떤 서비스/단계에서 문제가 발생했는지 보고한다. 단, 명백한 오타 수준의 초소형 수정이 필요하더라도 사용자 승인 없이 수정하지 않는다.

## 검증 대상 서비스

```text
KPA-Society
GlycoPharm
K-Cosmetics
Neture
```

## 검증 대상 공통 필드

```text
businessType        업태
businessItem        종목
businessEntityType  사업자 유형
businessStartDate   개업일
```

## 계좌 정보 정책 확인

O4O는 당분간 계좌 정보를 저장하지 않는다.

따라서 다음 정보가 가입 폼, payload, operator 화면에 새로 노출되지 않는지 확인한다.

```text
은행명
계좌번호
예금주
통장사본
계좌 인증
정산 계좌 정보
```

## 사전 확인

작업 시작 전 다음을 확인한다.

```text
1. origin/main 최신 상태 확인
2. 최근 관련 commit이 배포되었는지 확인
3. 테스트 계정 사용 가능 여부 확인
4. serviceKey가 필요한 로그인은 반드시 serviceKey 포함
5. 운영 데이터에 영향을 주지 않도록 테스트 계정만 사용
```

관련 commit:

```text
BusinessRegistrationInfo type:
cb8c4f03f 포함

4서비스 가입 폼 정렬:
1c64b2047
8dc5a135d

operator/admin 표시 정합:
d2a503cde
c34e77314

공통 UI 컴포넌트:
47b952889
a079a971f
```

## 검증 방식

가능하면 Playwright MCP 또는 브라우저 자동화 도구로 확인한다.

불가능한 항목은 코드/네트워크/API 응답으로 보완한다.

각 서비스별로 다음 4단계를 확인한다.

```text
1. 가입 신청 화면에서 4개 필드가 보이는가
2. 입력 후 제출 payload에 4개 필드가 포함되는가
3. backend 저장 후 users.businessInfo 또는 해당 response에서 4개 필드가 확인되는가
4. operator/admin 화면에서 4개 필드가 표시되는가
```

## 공통 테스트 값

가능하면 다음 테스트 값을 사용한다.

```text
업태:
소매업

종목:
화장품, 건강관리용품

사업자 유형:
개인사업자

개업일:
2024-01-15
```

service별 특성상 종목이 다르면 아래처럼 바꿔도 된다.

```text
KPA:
업태 = 보건업
종목 = 약국

GlycoPharm:
업태 = 보건업
종목 = 약국

K-Cosmetics:
업태 = 소매업
종목 = 화장품

Neture:
업태 = 도매 및 상품중개업
종목 = 건강기능식품
```

## 1. KPA-Society 검증

### 대상 흐름

```text
약국 경영자 / 약국 개설자 가입 신청
```

### 확인 항목

```text
1. KPA 가입 화면에서 약국 경영자 유형 선택
2. 사업자 정보 입력 영역에 다음 필드 표시 확인
   - 업태
   - 종목
   - 사업자 유형
   - 개업일
3. 각 필드 입력 가능 여부 확인
4. 제출 payload에 4개 필드 포함 확인
5. users.businessInfo에 저장되는지 확인
6. KPA operator 회원관리 또는 신청 상세에서 4개 필드 표시 확인
7. 계좌 정보가 표시되지 않는지 확인
```

### 주의

```text
면허번호 중복, 기존 가입 계정 문제를 피하기 위해 테스트 계정/테스트 면허번호 사용
```

## 2. GlycoPharm 검증

### 대상 흐름

```text
약국 경영자 가입 신청
```

### 확인 항목

```text
1. GlycoPharm 가입 화면에서 약국 경영자 유형 선택
2. BusinessRegistrationFields 공통 UI가 적용되어 있는지 확인
3. 업태/종목/사업자유형/개업일 입력 가능 여부 확인
4. 기존 businessCategory ↔ businessItem mapping이 깨지지 않았는지 확인
5. 제출 payload에 4개 필드 포함 확인
6. operator/admin 신청 상세에서 4개 필드 표시 확인
7. 계좌 정보가 노출되지 않는지 확인
```

### 주의

```text
삭제된 StoreApplyPage 경로가 복구되었는지 확인하지 않는다.
실제 canonical 가입 경로만 검증한다.
```

## 3. K-Cosmetics 검증

### 대상 흐름

```text
매장 경영자 / seller 가입 신청
```

### 확인 항목

```text
1. K-Cosmetics 가입 화면에서 매장 경영자 또는 seller 성격의 유형 선택
2. 업태/종목/사업자유형/개업일 필드 표시 확인
3. 매장 근무자 등 사업자 정보가 필요 없는 유형에는 억지로 표시되지 않는지 확인
4. 제출 payload에 4개 필드 포함 확인
5. operator/admin 신청 상세 또는 회원 상세에서 4개 필드 표시 확인
6. 계좌 정보가 노출되지 않는지 확인
```

## 4. Neture 검증

### 대상 흐름

```text
공급자 가입 신청
필요 시 파트너 신청도 확인
```

### 확인 항목

```text
1. Neture supplier 가입 화면에서 사업자 정보 영역 확인
2. businessItem / businessEntityType / businessStartDate 필드 표시 확인
3. 기존 businessType select가 그대로 유지되는지 확인
4. Neture의 기존 businessType 값이 canonical 업태와 의미가 다른지 확인
5. 제출 payload에 추가 필드가 포함되는지 확인
6. operator/admin registration detail에서 4개 필드 표시 확인
7. 계좌 정보가 노출되지 않는지 확인
```

### 별도 관찰 포인트

Neture의 기존 `businessType`은 canonical 업태가 아니라 supplier category 성격일 수 있다.

예상 값:

```text
cosmetics
health
medical
food
other
```

확인 결과가 맞다면 후속 IR 후보로 보고한다.

```text
IR-O4O-NETURE-BUSINESS-TYPE-SEMANTICS-AUDIT-V1
```

## API / DB 확인

가능하면 각 서비스별 테스트 신청 후 다음을 확인한다.

```text
1. users.businessInfo JSONB에 4개 필드 저장 여부
2. operator/admin API response에 4개 필드 포함 여부
3. businessEntityType이 canonical 값으로 저장되는지 여부
4. businessStartDate가 YYYY-MM-DD 형식인지 여부
```

확인할 필드:

```text
businessInfo.businessType
businessInfo.businessItem
businessInfo.businessEntityType
businessInfo.businessStartDate
```

## 화면 표시 확인

operator/admin 화면에서 다음 라벨이 보이는지 확인한다.

```text
업태
종목
사업자 유형
개업일
```

사업자 유형은 한글 라벨로 표시되는지 확인한다.

예:

```text
individual → 개인사업자
corporation → 법인사업자
simple_taxpayer → 간이과세자
general_taxpayer → 일반과세자
tax_exempt → 면세사업자
non_profit → 비영리/단체
other → 기타
```

값이 없는 기존 데이터는 화면이 깨지지 않고 `-` 또는 기존 fallback으로 표시되어야 한다.

## 검증 제외 범위

이번 CHECK에서는 다음을 하지 않는다.

```text
코드 수정
DB schema 수정
migration 작성
사업자등록증 파일 업로드 검증
계좌 정보 저장 검증
PG 연동 검증
내 매장 설정 전체 검증
공급자 프로필 전체 검증
프로필 수정 화면 공통화 검증
```

## 문제 발견 시 분류

문제가 발견되면 다음 기준으로 분류한다.

```text
A. UI 표시 누락
B. 입력은 되지만 payload 누락
C. payload는 있으나 저장 누락
D. 저장은 됐지만 operator/admin response 누락
E. response는 있으나 화면 표시 누락
F. businessEntityType 라벨 변환 문제
G. Neture businessType 의미 충돌
H. 계좌 정보가 잘못 노출됨
I. 기존 가입 흐름 회귀
```

각 문제는 서비스명, 화면, 재현 단계, 예상/실제 결과를 함께 보고한다.

## 완료 보고 형식

완료 후 다음 형식으로 보고한다.

```text
CHECK-O4O-BUSINESS-REGISTRATION-CROSSSERVICE-E2E-V1 결과 보고

1. 전체 판정
   - PASS / CONDITIONAL PASS / FAIL

2. 검증 환경
   - production / staging / local
   - 사용 계정
   - 사용 도구

3. 서비스별 결과
   - KPA-Society
   - GlycoPharm
   - K-Cosmetics
   - Neture

4. 공통 4필드 검증 결과
   - businessType
   - businessItem
   - businessEntityType
   - businessStartDate

5. 저장 확인 결과
   - users.businessInfo
   - operator/admin API response

6. operator/admin 화면 표시 결과

7. 계좌 정보 미노출 확인

8. 발견된 문제
   - 서비스
   - 화면
   - 단계
   - 원인 추정
   - 우선순위

9. Neture businessType semantics 확인 결과

10. 후속 WO/IR 제안

11. 최종 판정
```

## 최종 판정 기준

### PASS

```text
4서비스 모두:
- 가입 화면에 필요한 필드 표시
- payload 포함
- 저장 확인
- operator/admin 표시 확인
- 계좌 정보 미노출
```

### CONDITIONAL PASS

```text
대부분 정상이나,
테스트 계정/운영 데이터 제약으로 일부 저장 또는 승인 화면 확인이 제한된 경우
```

### FAIL

```text
하나 이상의 서비스에서 가입 흐름이 막히거나,
공통 4필드가 저장되지 않거나,
operator/admin 화면에서 확인 불가능한 경우
```

---

## 실행 시 사전 점검 결과 (2026-05-30 기준)

본 CHECK 실행 시점에 다음 환경이 준비되어 있음을 확인하였다.

| 항목 | 상태 |
|------|------|
| `@playwright/test` v1.57.0 | ✅ 설치됨 ([apps/admin-dashboard/package.json](../../apps/admin-dashboard/package.json)) |
| Chromium 143 | ✅ 설치됨 (`C:\Users\sohae\AppData\Local\ms-playwright\chromium-1200`) |
| Firefox / WebKit | ⚠️ 미설치 — auth-runtime config(chromium-only)에는 무관, 필요 시 `npx playwright install firefox webkit` |
| `docs/local/TEST-ACCOUNTS.local.md` | ✅ 존재 (67줄) |
| 4서비스 도달성 (HTTP 200) | ✅ neture.co.kr / glycopharm.co.kr / kpa-society.co.kr / k-cosmetics.site |
| `gcloud` CLI (DB read-only 검증용) | ✅ 사용 가능 — CLAUDE.md §0 |

## 실행 시 참고할 기존 자산

| 자산 | 경로 | 용도 |
|------|------|------|
| Auth Runtime Playwright config | [`e2e/auth-runtime/playwright.config.ts`](../../e2e/auth-runtime/playwright.config.ts) | chromium-only, 배포 환경 대상 — 본 CHECK 의 spec 추가 시 재사용 가능 |
| 가입→승인→로그인 raw script | [`e2e/registration-approval-login.spec.ts`](../../e2e/registration-approval-login.spec.ts) | 5개 서비스 가입/operator 승인 흐름 + 스크린샷 저장 — 본 CHECK 의 baseline 스크립트로 활용 가능 |
| 디버그 SSR 페이지 가이드 | [`docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md`](../platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md) | payload / response JSON 검증 시 참고 (단, 본 CHECK 는 read-only — 새 페이지 작성 비권장) |

## 상태

> **검증 시나리오 준비 완료. 실제 실행은 별도 트리거 시.**

실행 시 본 문서를 그대로 SSOT 로 사용하며, 결과는 본 문서 하단에 「## 실행 결과 (YYYY-MM-DD)」 섹션으로 추가 기록한다.
