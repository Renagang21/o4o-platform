# CHECK-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1

- **WO**: `WO-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1`
- **선행 조사**: [`CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1`](CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1.md) — D-3 주소 키 비대칭 · D-4 `pharmacy_phone` 키 이중화
- **일자**: 2026-08-12
- **판정**: **PASS** (read 정렬만 수행 · 신규 테스트 34건 · typecheck 2개 프로젝트 통과 · read-only smoke 수행 · DB migration 0 · 운영 DB write 0)

> 개인정보 보호: 아래 실측·smoke 결과는 **키 존재 여부와 선택 결과**만 기록한다. 주소·전화·이름의 실제 값은 남기지 않는다.

---

## 1. canonical · legacy 키 실측

### 1-1. write 경로가 쓰는 키

| 축 | 키 | write 경로 |
|---|---|---|
| 주소 | `address` / `address2` / `zipCode` | KPA 운영자 `PATCH /api/v1/kpa/members/:id/info` · 공통 운영자 `MembershipConsoleController` · 본인 `PATCH /auth/me/profile` (legacy 호환 허용 목록) |
| 주소 | `businessAddress` / `businessAddressDetail` | 가입 `auth-register.controller` · 본인 `PATCH /auth/me/profile` (naming standard canonical) |
| 주소 | `storeAddress { zipCode, baseAddress, detailAddress }` | 본인 `PATCH /auth/me/profile` · 공통 운영자 콘솔 |
| 약국 전화 | `metadata.pharmacy_phone` | KPA 운영자 `PATCH /kpa/members/:id/info` |
| 약국 전화 | `pharmacyPhone` | 공통 운영자 콘솔 |

- migration [`20261030000000-CanonicalBusinessFieldAlignment`](../../apps/api-server/src/database/migrations/20261030000000-CanonicalBusinessFieldAlignment.ts) 은 `address → businessAddress` 를 **대상이 비어 있을 때만** 채웠다. 따라서 두 키는 **공존하며 값이 다를 수 있다.**
- 프로덕션 read-only smoke 로 **동일 사용자에게 `address` 와 `businessAddress` 가 동시에 존재**함을 확인했다 (§5-3).

### 1-2. 읽기 경로가 참조하던 키

| 읽기 경로 | 주소 | 약국 전화 |
|---|---|---|
| `GET /api/v1/kpa/members` (`member.controller.ts`) | `address` / `address2` / `zipCode` **단독** | `metadata.pharmacy_phone` **단독** |
| `MypageService.getProfile` | 없음 (raw `businessInfo` passthrough — 해소 책임을 프런트에 전가) | 없음 |
| `MyProfilePage.tsx` | `storeAddress.*` → `address`/`address2` | `businessInfo.phone` (**대표 전화**, 약국 전화 키를 전혀 읽지 않음) |
| `MemberManagementPage.tsx` | 백엔드 `business_info` DTO 소비 | 백엔드 DTO 소비 |

---

## 2. 불일치가 발생한 읽기 경로 (확정 결함)

| # | 경로 | 증상 |
|---|---|---|
| R-1 | `GET /api/v1/kpa/members` → 운영자 **목록 · 상세 Drawer · 수정 폼 초기값** | 가입 시 `businessAddress` 로만 저장된 회원의 주소가 **빈칸**. 운영자가 수정 폼을 열면 빈 주소가 prefill 된다. |
| R-2 | `GET /api/v1/kpa/members` | 공통 운영자 콘솔이 `pharmacyPhone` 으로 저장한 약국 전화가 KPA 화면에서 **보이지 않음**. |
| R-3 | `MypageService.getProfile` + `MyProfilePage.tsx` | 회원 본인 프로필에서 동일한 주소 누락. 약국 전화는 두 write 키 어느 쪽도 읽지 않아 **항상 대표 전화로 대체**되었다. |

`UserDetailPage.tsx` 는 주소·전화 키를 읽지 않아 대상 아님. `MemberManagementPage.tsx` 는 백엔드 DTO만 소비하므로 프런트 수정이 필요 없다.

---

## 3. 적용한 우선순위와 fallback 규칙

단일 규칙 모듈: [`apps/api-server/src/routes/kpa/shared/businessInfoRead.ts`](../../apps/api-server/src/routes/kpa/shared/businessInfoRead.ts) — `resolveKpaBusinessContact(businessInfo)`

| 결과 필드 | 우선순위 |
|---|---|
| `zipCode` | `zipCode` → `storeAddress.zipCode` |
| `address` | `address` → `businessAddress` → `storeAddress.baseAddress` |
| `address2` | `address2` → `businessAddressDetail` → `storeAddress.detailAddress` |
| `pharmacyPhone` | `metadata.pharmacy_phone` → `pharmacyPhone` |

- **빈 문자열·공백은 "값 부재"로 취급**한다. canonical 이 `''` 이면 유효한 legacy 값을 가리지 않는다.
- **canonical(`address`) 우선 근거**: `businessAddress` 는 가입 시점 1회 write 이고, 이후 수정은 KPA/공통 운영자·본인이 모두 `address` 로 저장한다. legacy 우선으로 두면 **운영자가 방금 수정한 주소가 가입 시점 값으로 가려진다.**
- 이 모듈은 read-only 다. 원본 `businessInfo` 객체를 변경하지 않으며(테스트로 고정), **주소·약국 전화 4개 필드 외에는 어떤 필드도 다루지 않는다.**

---

## 4. 화면 · API 별 변경 결과

| 대상 | 변경 |
|---|---|
| `GET /api/v1/kpa/members` — `business_info.address / address2 / zipCode / pharmacy_phone` | resolver 결과로 교체. **응답 키·shape 불변**, 값만 fallback 으로 채워짐 |
| `GET /api/v1/kpa/members` — `storeAddress` · `businessNumber` 등 나머지 필드 | **변경 없음** |
| `MypageService.getProfile` | `businessContact { zipCode, address, address2, pharmacyPhone }` **additive 추가**. raw `businessInfo` 는 그대로 유지(기존 소비 지점 무영향) |
| `MyProfilePage.tsx` — 약국 정보 표시 | 주소 fallback 사슬 맨 앞에 `businessContact.address` 추가. 약국 전화를 `businessContact.pharmacyPhone → businessInfo.phone` 순으로 정렬 (R-3) |
| `MyProfilePage.tsx` — 수정 폼 초기값 | `businessContact` 우선 + 기존 `storeAddress`/`businessInfo` fallback 유지 (구버전 응답 호환) |
| `mypage.ts` 타입 | `businessContact?` optional 추가 |
| `MemberManagementPage.tsx` · `UserDetailPage.tsx` | **미변경** |
| 다른 서비스(Neture / K-Cosmetics / GlycoPharm / Pharmacy-Hub)의 `businessInfo` 계약 | **미변경** — resolver 는 `routes/kpa/shared` 에 두어 KPA 읽기 경로에서만 소비 |

**범위 밖으로 남긴 것** (WO 제외 조건 준수): write 키 변경 없음, JSONB concat 전환 없음, 데이터 소유권 재설계 없음, 주소·약국 전화 외 필드 확장 없음.
승인 시 `organizations` 동기화 블록(`member.controller.ts` pharmacy_owner 자동 활성화)도 `storeAddress`/`address` 를 읽지만 **read 화면이 아닌 write 경로**여서 이번 범위에서 제외했다 (별도 WO 제안, §7).

---

## 5. 테스트 · typecheck · read-only smoke

### 5-1. 테스트

| 파일 | 건수 | 대응 |
|---|---|---|
| [`businessInfoRead.test.ts`](../../apps/api-server/src/routes/kpa/shared/__tests__/businessInfoRead.test.ts) | 14 | 검증 1~5 + 구조화 fallback · read-only 보장 · 범위 확장 금지 |
| [`member.controller.businessInfoRead.test.ts`](../../apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.businessInfoRead.test.ts) | 20 | 목록 DTO · 프로필 응답 각각 1~5 + **두 경로 결과 일치**(검증 6) + D-3 / D-4 회귀 + 기존 계약 불변 |

| 검증 항목 | 결과 |
|---|---|
| 1 canonical 만 | PASS |
| 2 legacy 만 | PASS |
| 3 양쪽 모두 → canonical 우선 | PASS |
| 4 canonical `''` + legacy 유효 → legacy 채택 | PASS |
| 5 둘 다 없음 → `null` | PASS |
| 6 목록 · 상세 · 수정 초기값 · 프로필 조회 일치 | PASS (세 화면이 같은 `business_info` DTO 를 소비 + 프로필은 동일 resolver) |
| 7 다른 서비스 영향 | 코드 경로 격리(§4) + 영향 범위 테스트 전량 통과 |
| 8 typecheck · 영향 범위 테스트 | PASS |

### 5-2. typecheck · 회귀

| 검증 | 결과 |
|---|---|
| `npx tsc --noEmit` (`apps/api-server`) | **PASS** (오류 0) |
| `npx tsc --noEmit` (`services/web-kpa-society`) | **PASS** (오류 0) |
| 영향 범위 테스트 (`src/routes/kpa`, `src/services/approval`, `src/controllers/operator/__tests__`) | **10 suites / 159 tests PASS** |

### 5-3. read-only API runtime smoke (배포 전 = 결함 재현)

프로덕션 `api.neture.co.kr` 에 KPA 운영자 계정으로 로그인해 **GET 만** 호출했다. 값은 기록하지 않고 존재 여부만 집계한다.

| 호출 | 결과 |
|---|---|
| `GET /api/v1/kpa/members?limit=100` | 4건 조회. `address` 존재 4/4 · `storeAddress.baseAddress` 존재 4/4 · `pharmacy_phone` 존재 **2/4** |
| `GET /api/v1/kpa/mypage/profile` | `businessInfo` 키 집합에 `address`·`businessAddress`·`storeAddress`·`metadata` 가 **모두 존재**. `address` 와 `businessAddress` **동시 보유 확인**(=검증 3 실데이터). `pharmacyPhone` 없음. `businessContact` 없음(배포 전 코드이므로 예상대로) |

- 이 smoke 는 **배포 전 코드**를 대상으로 하므로 §2 의 결함 상태를 재현한 것이다. 변경 후 동작은 §5-1 테스트로 고정했다.
- write API 는 호출하지 않았다. 개인정보 값은 스크립트 출력·본 문서 어디에도 남기지 않았다.
- 프로덕션 DB 직접 조회는 **시도했으나 미수행** — 로컬 Cloud SQL Auth Proxy 포트가 다른 세션 소유로 응답하지 않았고, 이번 WO 에 DB 접근이 필수가 아니어서 별도 proxy 를 띄우지 않았다.

---

## 6. migration · 운영 DB write · 배포

- DB migration: **없음**
- backfill · 일괄 변환 · `businessInfo` 삭제: **없음**
- 운영 DB write: **0건** (smoke 는 GET 전용)
- 배포: **수행하지 않음** (main push 이후 CI/CD 판단은 별도)
- 계약 미변경: `business_info` DTO 키·shape, `businessInfo` raw 응답, 서비스 경계, 권한

---

## 7. CHECK · commit · 작업트리

- 변경 파일: **코드 7개(소스 5 · 테스트 2) · 문서 1개, 총 8개**
  - 신규 `apps/api-server/src/routes/kpa/shared/businessInfoRead.ts`
  - 수정 `apps/api-server/src/routes/kpa/controllers/member.controller.ts`
  - 수정 `apps/api-server/src/routes/kpa/services/mypage.service.ts`
  - 수정 `services/web-kpa-society/src/api/mypage.ts`
  - 수정 `services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx`
  - 신규 `apps/api-server/src/routes/kpa/shared/__tests__/businessInfoRead.test.ts`
  - 신규 `apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.businessInfoRead.test.ts`
  - 신규 `docs/checks/CHECK-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1.md`
- 경로 한정 stage 만 사용. 다른 세션 소유의 dirty·미추적 파일 **접촉 0건**
- commit / push 결과는 완료 보고에 기재

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
1. `PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE` — write 키 수렴(이번 WO 는 read 만 정렬했고 이중 키는 그대로 남아 있다)
2. 승인 시 `organizations` 동기화 블록의 주소·전화 키 정렬 (write 경로여서 이번 범위 제외)
