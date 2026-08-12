# WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1

> **선행**: [`CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1`](../checks/CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1.md) (자체 storefront 철거 완료 · `843dce7ad`)
> **트랙**: KPA 자체몰 폐기 → 외부 판매 채널 대체 (네이버 → 쿠팡 → 공통 Online Sales 모듈 추출)
> **성격**: 조사 + 파일럿 구현 (한 작업으로 묶는다. 조사 IR 을 별도로 분리하지 않는다)

---

## 1. 목표 · 배경

KPA 자체 운영 B2C storefront 는 은퇴했고, `온라인 판매` 메뉴는 껍데기만 남아 있다.
이 WO 는 그 메뉴의 실제 내용을 **네이버 스마트스토어(커머스 API)** 연동으로 채우는 첫 단계다.

**핵심 원칙 — 별도 판매상품 원장을 만들지 않는다.**

```text
O4O B2C 상품 (기존 원장)
   ↓  assertExternalSalesEligible()
   ↓  Naver mapping / sync state   ← 이번에 신설하는 유일한 저장소
   ↓
네이버
```

신설 저장 항목은 상품 자체가 아니라 **연동 상태**뿐이다.

| 항목 | 의미 |
|---|---|
| `organization` | 매장 |
| `product` | O4O 기존 상품 참조 |
| `channel` | `NAVER` |
| `externalProductId` | 네이버 측 상품 ID |
| category / attribute mapping | 네이버 카테고리·속성 매핑 |
| `syncStatus` | 등록/수정/실패 상태 |
| `lastSyncedAt` · `lastError` | 마지막 동기화 시각 · 실패 사유 |

네이버를 먼저 하는 이유: O4O B2C 상품 구조에서 **실제로 빠진 필드가 무엇인지** 드러나야
쿠팡을 훨씬 짧게 붙일 수 있다.

---

## 2. 승인 범위

### 2-1. 최신 네이버 공식 API 조사

문서 기준 시점이 오래되었을 수 있으므로 **구현 직전 재조사**한다.

- 판매자 계정 · 애플리케이션 등록 절차
- 인증 방식 (client id/secret, 토큰 발급·갱신·만료)
- 상품 **등록 · 수정 · 상태 조회**
- 주문 **조회 · 발송 · 취소 · 반품**
- 필수 상품 필드, 카테고리 / 속성 규칙
- rate limit · 샌드박스 유무 · 오류 코드 체계

### 2-2. O4O B2C 상품 ↔ 네이버 필드 매핑

- 기존 데이터로 **채울 수 있는 필드** 목록
- 네이버 등록 시 **추가 입력이 필요한 필드** 목록 (이것이 후속 UI 범위를 결정한다)
- 공통 가드 `assertExternalSalesEligible(product)` 구현
  - 판정 기준은 **`product_masters.regulatory_type` 하나뿐** — 상품이 의약품인가 아닌가만 본다
  - 서비스별 조건 · 매장별 예외 · 역할별 분기 **금지**
  - **등록 시점과 동기화 시점 양쪽**에 적용한다 (등록만 막으면 사후 변경으로 샌다)
  - 모든 외부 채널 adapter 앞단 공통 위치에 둔다 (쿠팡이 재사용할 지점)

### 2-3. 상품 1건 실제 E2E

- 네이버 판매자 계정 연결 (자격정보는 `docs/local/TEST-ACCOUNTS.local.md` SSOT · 코드/문서/커밋에 하드코딩 금지)
- O4O B2C 상품 **1건** 선택 → eligibility 통과 확인
- 네이버 등록 → `externalProductId` 저장
- 상태 조회 1회
- 수정 1회 (가격 또는 재고)
- 등록 해제 / 판매중지까지 확인 (되돌릴 수 있어야 파일럿이 안전하다)
- 의약품 상품 1건으로 **차단 동작** 반대 검증

---

## 3. 실행 순서

1. 네이버 공식 API 재조사 → 조사 결과를 CHECK 문서 §1 에 정리 (별도 IR 만들지 않는다)
2. 필드 매핑표 작성 → 채울 수 있는 필드 / 추가 입력 필요 필드 확정
3. `assertExternalSalesEligible(product)` 구현 + 단위 테스트 (의약품 / 비의약품 / regulatory_type 결측)
4. 연동 상태 저장소 설계 → **migration 은 사용자 승인 후에만** 작성·적용
5. 네이버 adapter 구현 (인증 · 상품 등록 · 수정 · 상태 조회)
6. 상품 1건 E2E 수행 · 의약품 차단 반대 검증
7. typecheck · build · 테스트
8. CHECK 작성 → path-specific commit → push

---

## 4. 제외 범위

- **쿠팡 연동** — 네이버 1건 E2E 종료 후 별도 WO
- **공통 Online Sales 모듈 추출** — 두 채널이 붙은 뒤에 수행 (지금 추상화하면 네이버 형태로 굳는다)
- **주문 동기화 구현** — 이번엔 API 조사까지만. 실제 주문 수신·발송 처리는 후속
- **GlycoPharm 잔존 storefront 정리**(`/cart` · `/orders` · `/orders/:id/cancel`) — 주경로가 아니므로 뒤로 미룬다
- **`StoreChannelsPage`(1,563L) 분할** — 외부 채널 UI 가 들어올 때 함께
- 자체몰 관련 데이터 삭제 — 기존 B2C row 는 계속 역사 데이터로 보존
- 신규 메뉴 · 신규 도메인 · 신규 상품 원장 생성

---

## 5. 중지 조건

- **DB migration · schema 변경이 필요할 때** — 설계안을 보고하고 승인 후 진행
- 운영 DB write (UPDATE/DELETE/seed) 가 필요할 때
- `package.json` · lockfile · dependency 추가가 필요할 때 (네이버 SDK 도입 포함)
- 네이버 판매자 계정 · 실제 자격정보 발급이 필요할 때
- 결제 · 정산 · 수수료 · 법률 판단이 필요할 때
- 공통 계약(`organization_channels` · `checkout_orders` · Boundary Policy) 변경이 필요할 때
- 네이버 API 가 의약품 판매를 별도 자격으로 허용하더라도, **`assertExternalSalesEligible` 완화는 금지** — 보고만 한다
- 조사 결과 O4O 상품 구조에 필수 필드가 대량 결손이면, 파일럿을 강행하지 말고 결손 목록을 보고한다

---

## 6. 검증 · Git

**검증**

| 항목 | 기준 |
|---|---|
| `assertExternalSalesEligible` 단위 테스트 | 의약품 차단 / 비의약품 통과 / `regulatory_type` 결측 시 **보수적 차단** |
| 등록 · 동기화 양 경로 가드 | 각각 테스트로 고정 |
| `tsc --noEmit` (api-server + 영향 프런트) | 오류 0 |
| build | 영향 프로젝트 PASS |
| E2E | 상품 1건 등록 → 조회 → 수정 → 해제 전 구간 성공 · `externalProductId` 저장 확인 |
| 반대 검증 | 의약품 1건이 등록 단계에서 차단됨 |

**Git**

- `main` 직접 작업 · path-specific stage (`git add .` 금지)
- 다른 세션의 dirty · 미추적 파일 불가침
- 완료 조건: 이번 WO 범위 미커밋 0건 + `HEAD == origin/main`

---

## 7. 완료 보고

한국어로 작성하고 다음을 포함한다.

- WO 제목
- 네이버 API 조사 요약 (인증 방식 · 상품/주문 endpoint · 필수 필드)
- 필드 매핑표 — 채울 수 있는 필드 / 추가 입력 필요 필드
- `assertExternalSalesEligible` 구현 위치 · 판정 기준 · 적용 지점 2곳
- 신설한 연동 상태 저장 항목 (migration 여부 · 승인 이력)
- E2E 결과 (등록 → 조회 → 수정 → 해제, 의약품 차단 반대 검증)
- 미수행 · 실패 항목 은폐 없이 명시
- CHECK 문서 링크 · commit hash · push 결과
- `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`
