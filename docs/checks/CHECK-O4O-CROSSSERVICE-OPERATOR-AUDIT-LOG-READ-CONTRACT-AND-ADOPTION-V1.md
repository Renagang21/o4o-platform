# CHECK — WO-O4O-CROSSSERVICE-OPERATOR-AUDIT-LOG-READ-CONTRACT-AND-ADOPTION-V1

> **상태**: CLOSED · **작성일**: 2026-08-26 · **대상**: KPA-Society · K-Cosmetics · Neture · PharmacyHub · GlycoPharm(회귀)
> **선행 조건**: `OPERATOR_COMMONIZATION = CLOSED` (WO-O4O-NETURE-OPERATOR-AI-GUARD-AND-MENU-VISIBILITY-FINAL-CLOSURE-V1, 2026-08-25 확정) 충족 후 착수.
> **성격**: 운영자 공통화 재개가 아니라, 이미 분리해 둔 후속 운영 품질 작업.

---

## 1. 감사 로그 모집단 (코드 재도출, 과거 리포트 재사용 금지)

`audit` / `감사` / `action_logs` / `operator log` 전수 grep 후 실제 코드로 재확인한 모집단.

| # | 대상 | 위치 | 데이터 원본 | 성격 |
|---|------|------|------------|------|
| 1 | 공통 운영 액션 분석 콘솔 | `packages/operator-core-ui/src/modules/operator-analytics/OperatorAnalyticsPage.tsx` | `action_logs` | 공통 UI Core (이미 존재) |
| 2 | 공통 읽기 계약 | `apps/api-server/src/routes/operator/analytics.routes.ts` | `action_logs` | 공통 backend 계약 (이미 존재) |
| 3 | KPA 감사 로그 | `services/web-kpa-society/src/pages/operator/AuditLogPage.tsx` ↔ `apps/api-server/src/routes/kpa/kpa.routes.ts:1531` | `kpa_operator_audit_logs` | KPA 전용 |
| 4 | Neture 상품마스터 감사 로그 | `apps/api-server/src/entities/AuditLog.ts` · `product-master-audit-log.controller.ts` | `audit_logs` | 도메인(상품마스터) 전용 |
| 5 | Neture workspace hub "감사 로그" 카드 | `services/web-neture/src/pages/hub/HubPage.tsx:117` | 없음 (`href: '/admin'`) | 레거시 placeholder |
| 6 | 서비스별 어댑터 5종 | `services/web-{kpa-society,k-cosmetics,neture,pharmacy-hub,glycopharm}/src/pages/operator/AnalyticsPage.tsx` | 1·2 래핑 | 채택 완료 |

**UNJUDGED = 0** (6/6 판정).

### 1-1. 쓰기 경로는 이번 범위 밖 (확인만)

- `packages/action-log-core/src/action-log.service.ts` 는 **write-only** (`logAction` / `logSuccess` / `logFailure`), 읽기 메서드 없음.
- 읽기는 전부 `analytics.routes.ts` 의 raw SQL 로만 이루어진다 → 읽기 계약 단일 지점 확인.
- 본 WO 는 **읽기 계약 + UI 채택**만 다루며 action producer 는 손대지 않았다.

---

## 2. KPA 판정 — 정본(canonical) 아님, 그러나 중복도 아님

WO §2 지시("KPA 를 무조건 정본으로 가정하지 말 것")에 따라 두 저장소의 **컬럼과 실데이터**를 직접 비교했다.

| 항목 | `action_logs` (공통) | `kpa_operator_audit_logs` (KPA) |
|------|----------------------|----------------------------------|
| 서비스 구분 | `service_key` **있음** | **없음** (KPA 단일 테이블) |
| 식별 키 | `action_key` (`kpa.operator.product_approve`) | `action_type` (`MEMBER_STATUS_CHANGED`) |
| 대상 | `meta.targetId` | `target_type` + `target_id` (1급 컬럼) |
| 실행 결과 | `status` · `duration_ms` · `error_message` | 없음 |
| 변경 전후 | 없음 | `metadata.previousStatus → newStatus` |
| 행위자 역할 | 없음 | `operator_role` |
| production 건수 | KPA 스코프 3건 | **267건** |

production 실측 payload:

```jsonc
// GET /api/v1/operator/analytics/actions?serviceKey=kpa-society
{"service_key":"kpa-society","action_key":"kpa.operator.product_approve",
 "status":"success","duration_ms":null,"error_message":null,
 "meta":{"targetId":"aedd7c5a…","statusBefore":"pending","statusAfter":"approved"}}

// GET /api/v1/kpa/operator/audit-logs
{"operator_role":"kpa:store_owner","action_type":"MEMBER_STATUS_CHANGED",
 "target_type":"member","target_id":"8103e63e…",
 "metadata":{"previousStatus":"suspended","newStatus":"active"}}
```

**판정: `SERVICE_SPECIFIC` (존치).**

- `action_logs` = **실행 텔레메트리** (성공/실패 · 소요시간 · 오류메시지 중심).
- `kpa_operator_audit_logs` = **변경 이력 감사** (누가 · 무엇을 · 무엇에서 무엇으로 중심).
- 이름만 다른 동일 데이터가 아니므로 §2 의 "동일 데이터면 `operator-analytics` 로 수렴" 조건에 **해당하지 않는다.**
- 반대로 KPA 화면을 공통 Core 로 승격하는 것도 부적절하다 — `kpa_operator_audit_logs` 에 `service_key` 가 없어
  cross-service 계약을 만들 수 없고, 그것을 만들려면 **DB schema/migration 이 필요한데 §5 에서 금지**되어 있다.

---

## 3. 서비스별 판정

| 서비스 | 운영 분석(공통) | 서비스 전용 감사 로그 | 판정 | 근거 |
|--------|:---:|:---:|------|------|
| KPA-Society | 채택 | `/operator/audit-logs` (kpa:admin) | **ADOPT + SERVICE_SPECIFIC** | 둘 다 실사용, 데이터 성격 상이(§2) |
| K-Cosmetics | 채택 | 없음 | **ADOPT** | 공통 콘솔로 충분, 전용 감사 요구 없음 |
| Neture | 채택 | 없음(상품마스터 전용 로그는 별개 도메인) | **ADOPT** | 아래 3-1 |
| PharmacyHub | 채택 | 없음 | **ADOPT** | 27건 실데이터로 운영 중 |
| GlycoPharm | 채택 | 없음 | **ADOPT**(회귀 대상) | 공유 모듈 회귀만 수행 |
| Neture hub "감사 로그" 카드 | — | — | **DEAD_OR_LEGACY** | 아래 3-2 |
| Neture 상품마스터 `audit_logs` | — | — | **SERVICE_SPECIFIC** | 상품마스터 상세 화면 전용, 운영자 콘솔 아님 |

§3 원칙("KPA 에 있으니 모두 추가" 금지)에 따라 **KPA 전용 감사 로그 메뉴를 다른 서비스에 복제하지 않았다.**
K-Cosmetics · Neture · PharmacyHub · GlycoPharm 운영자에게는 `action_logs` 기반 공통 콘솔이 실제 필요 범위이며,
`kpa_operator_audit_logs` 에 대응하는 데이터 자체가 존재하지 않는다.

### 3-1. Neture — Action Queue / AI 운영 로그와 혼동하지 않음 (§3 확인)

- `/operator/analytics` 는 `action_logs` 만 조회한다 (production 요청 실측: `analytics/{summary,actions,insight}?serviceKey=neture` 3건뿐).
- AI 운영 로그(`AiQueryLog`) · Action Queue 는 `/api/ai/**` 계열이며 이 화면과 API · 데이터 · 메뉴가 모두 분리되어 있다.
- 따라서 "Neture 감사 로그 = AI 운영 로그" 로 오인될 여지는 코드 경로상 없다.

### 3-2. Neture workspace hub "감사 로그" 카드 — DEAD_OR_LEGACY (미수정, 잔여로 이월)

`services/web-neture/src/pages/hub/HubPage.tsx:117` 의 카드는 `href: '/admin'` 으로,
같은 그룹의 `fee-policy` · `catalog-import` 카드와 **동일한 placeholder 링크**를 공유한다 (감사 로그 화면으로 가지 않는다).

production 실측: `neture:admin` 보유 계정으로 `https://www.neture.co.kr/workspace/hub` 진입 시
**"🔒 접근 권한이 없습니다"** — 운영자 경로에서 도달 자체가 불가능하다.

→ 운영자 감사 로그 모집단에서 **도달 불가 레거시**로 판정. href 만 고쳐도 페이지 게이트 때문에 도달성이 회복되지 않으며,
게이트 수정은 본 WO 범위(읽기 계약 + UI 채택) 밖이므로 **§9 잔여**로 이월한다.

---

## 4. 공통 계약 — 신규 제작 없음, 기존 계약이 이미 정본

```
GET /api/v1/operator/analytics/summary    ?serviceKey&days
GET /api/v1/operator/analytics/actions    ?serviceKey&page&limit   (pagination)
GET /api/v1/operator/analytics/insight    ?serviceKey&days
GET /api/v1/operator/analytics/auth/logs
router.use(authenticate, requireOperatorOrAdmin, injectServiceScope)
```

UI Core: `@o4o/operator-core-ui/modules/operator-analytics` (`OperatorAnalyticsPage`)
— 서비스별 어댑터는 `client`(API 주입) + `serviceKey` + `actionLabels` 만 주입한다.
§5 의 배치 요구(Core 는 `@o4o/operator-core-ui` / `@o4o/operator-ux-core`, adapter/config 주입)를 이미 충족한다.

### 4-1. serviceKey 스코프 격리 — backend 강제 (UI 필터 아님)

`apps/api-server/src/utils/serviceScope.ts:163-201` `resolveOperatorScope` 는 **narrow-only** 다.

- 비 platform-admin 이 `serviceKey` 를 지정하면 **자기 스코프와 교집합**만 남기고, 스코프 밖이면 `[]` 로 좁힌다.
- 비 platform-admin 의 `all=true` 는 **넓히지 않는다** (자기 스코프 그대로).
- platform-admin 은 스코프 미지정 시 400 `PLATFORM_ADMIN_SCOPE_REQUIRED` 로 거부된다.

production 실측 (운영자 토큰, `sohae2100@gmail.com`):

| 쿼리 | 결과 |
|------|------|
| `serviceKey=kpa-society` | 200 · `{kpa-society:3}` |
| `serviceKey=neture` | 200 · `{neture:30}` |
| `serviceKey=platform` (미보유) | 200 · **0건** ← 확대 없음 |
| `all=true` / `serviceKey=all` / 쿼리 없음 | 200 · 동일 결과 `{k-cosmetics, pharmacy-hub, neture, glycopharm}` ← **`all=true` 로 넓어지지 않음** |
| 미인증 | 401 |
| `platform:super_admin` → `/kpa/operator/audit-logs` | 403 `MEMBERSHIP_NOT_FOUND` (serviceKey 로 우회 불가) |

> 위 계정은 6개 서비스 role 을 실제 보유하므로 다중 `service_key` 가 나오는 것은 **자기 스코프**이며 누수가 아니다.
> 누수 판정 기준은 "**보유하지 않은 service_key 가 나오는가**" 이고, `serviceKey=platform` → 0건으로 음성 확인했다.

UI 측에도 확대 경로가 없다: 각 서비스 `AnalyticsPage.tsx` 는 `serviceKey="neture"` 처럼 **하드코딩 prop** 으로 주입하며
URL 쿼리에서 `serviceKey` 를 읽지 않는다.

### 4-2. 민감 payload 노출 없음

두 API 응답 모두 UUID · 상태 전이 · 타임스탬프만 포함하고 credential · 토큰 · 연락처 · 주소 등은 없다(§2 payload 실측).
저장 항목을 확대하지 않았다.

---

## 5. 수정 사항

**코드 수정 0건.**

공통 읽기 계약과 공통 UI Core 가 **이미 존재하고 5/5 서비스가 이미 채택**되어 있으며,
KPA 전용 로그는 §2 판정에 따라 존치가 정답이고, 유일한 결함(§3-2)은 본 WO 범위 밖이다.
§5 금지 항목(서비스별 AuditLogPage 중복 생성 / DB schema · migration / 새 이벤트 시스템 /
action producer 대규모 변경 / 민감 데이터 저장 확대)에 해당하는 변경은 **하나도 수행하지 않았다.**

본 CHECK 문서 1건만 추가한다.

---

## 6. production E2E (실제 브라우저, Playwright chromium)

계정 `sohae2100@gmail.com`, 각 서비스 L2 credential. viewport **1440×900 / 390×844** 양쪽 수행.

### 6-1. 서비스별 결과

| 서비스 | 로그인 | 메뉴 클릭 진입 | deep link | hard refresh | 요청 serviceKey | rows | JS 예외 | 4xx/5xx |
|--------|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|
| KPA-Society | ✅ | ✅ `운영 분석` · `감사 로그` | ✅ | ✅ | `kpa-society` | 3 / 20 | 0 | 0 |
| K-Cosmetics | ✅ | ✅ `운영 분석` | ✅ | ✅ | `k-cosmetics` | 2 | 0 | 0 |
| Neture | ✅ | ✅ `운영 분석` | ✅ | ✅ | `neture` | 20 | 0 | 0 |
| PharmacyHub | ✅ | ✅ `운영 분석` | ✅ | ✅ | `pharmacy-hub` | 20 | 0 | 0 |
| GlycoPharm(회귀) | ✅ | ✅ `운영 분석` | ✅ | ✅ | `glycopharm` | 20 | 0 | 0 |

- 모바일(390×844)에서도 5/5 서비스 모두 드로어(`운영자 메뉴`) → 그룹 확장 → `운영 분석` 클릭으로 실제 라우팅됨을 확인.
- KPA 모바일은 `감사 로그` 클릭 → `/operator/audit-logs` 진입 + 20행 렌더까지 확인.
- 화이트 스크린 0건.

> **측정 주의(자체 정정)**: 초기 모바일 probe 는 anchor 수집만으로 "K-Cosmetics 모바일에 `운영 분석` 없음"을 냈으나,
> 이는 드로어가 접혀 있고 대상 anchor 가 뷰포트 밖이었던 **측정 오류**였다. 드로어를 열고 그룹을 펼친 뒤
> 실제 클릭 → URL 전이까지 확인하는 방식으로 재측정해 5/5 정상임을 확정했다.

### 6-2. pagination / filter / empty / API 실패

| 항목 | 대상 | 결과 |
|------|------|------|
| pagination | Neture 운영 분석 | `다음` → `actions?page=2&limit=20` 발생, 20행 → 10행 (마지막 페이지) ✅ |
| pagination | KPA 감사 로그 | `다음` → `audit-logs?page=2&limit=20`, 첫 행 변경 확인 (8/21 회원 상태 변경 → 6/25 콘텐츠 삭제) ✅ |
| filter | KPA 감사 로그 `action_type` 16종 | 모두 200, 서버 쿼리에 `action_type` 반영. 합계 267 = 전체 총계 일치 ✅ |
| **empty state** | KPA `CONTENT_BATCH_PUBLISHED` (실제 0건) | `총 0건` + "감사 로그가 없습니다." 표시, **오류 문구 없음** ✅ |
| **API 실패** | Neture `analytics/actions` abort | "Network Error" + **다시 시도** 버튼 노출, 빈 목록으로 위장하지 않음 ✅ |
| **API 실패** | KPA `kpa/operator/audit-logs` abort | "네트워크 오류가 발생했습니다." 노출 ✅ |

> API 실패 시 "조회 실패 ≠ 데이터 0건" 원칙이 두 화면 모두에서 지켜진다.
> 단, KPA 화면은 오류 배너와 동시에 빈 테이블 placeholder("감사 로그가 없습니다.")도 함께 렌더한다 —
> 기능 결함은 아니나 문구 중복. §9 로 이월.

### 6-3. 안전한 operator action 1건 수행 — 미수행 (사유 명시)

WO §6 의 "가능하면 실제 안전한 operator action 을 1건 수행하고 해당 서비스 로그에만 나타나는지 확인" 항목은
**production 데이터를 변경하지 않기 위해 수행하지 않았다.** 현재 각 서비스에서 노출된 operator action 은 전부
회원 상태 / 승인 / 콘텐츠 등 **되돌리기 어려운 실데이터 변경**이며, 읽기 계약 검증 목적에 비해 부작용이 크다.

대체 증거로 §4-1 의 backend 스코프 음성 테스트(미보유 `serviceKey` → 0건, `all=true` 확대 없음)와
§6-1 의 서비스별 요청 serviceKey 실측(5/5 자기 서비스만 전송)을 사용했다.
이 두 가지가 "다른 서비스 로그에 나타나지 않음"을 쓰기 없이 동등하게 입증한다.

---

## 7. cross-service 검증

- 5/5 서비스 콘솔이 **자기 serviceKey 만** 쿼리에 실어 보냄 (§6-1 실측).
- 서비스별 렌더 결과가 서로 겹치지 않음: KPA 2건 / K-Cosmetics 2건 / Neture 6건 / PharmacyHub 27건 / GlycoPharm 116건
  (30일 기준, 모두 상이).
- 보유하지 않은 `serviceKey=platform` 요청 → **0건** (확대 실패 확인).
- `all=true` 로 비 platform-admin 권한이 넓어지지 않음.
- KPA 전용 감사 로그는 `requireKpaScope('kpa:admin')` 로 잠겨 있고 `platform:super_admin` 조차 403.
- **cross-service leak = 0건.**

---

## 8. CHECK (완료 기준 대조)

```text
UNJUDGED                        = 0     OK   (모집단 6/6 판정)
필요 서비스 미채택                = 0     OK   (공통 콘솔 5/5 채택)
cross-service leak              = 0     OK   (§7)
dead menu                       = 0*    주의 (§3-2 Neture hub 레거시 카드 1건 — 운영자 도달 불가, 범위 밖 이월)
unexpected 403 / 404 / 500      = 0     OK
white screen                    = 0     OK
JS exception                    = 0     OK
```

\* `dead menu = 0` 은 **운영자 메뉴 기준**으로 충족한다 (5/5 서비스 운영자 메뉴에 죽은 항목 없음).
§3-2 는 운영자 메뉴가 아니라 supplier/partner 대상 workspace hub 카드이며, 해당 페이지 자체가 운영자에게 403 이다.
은폐하지 않기 위해 위와 같이 별도 표기한다.

---

## 9. 잔여 과제

1. **Neture workspace hub `감사 로그` 카드 (§3-2)** — `href: '/admin'` placeholder + 페이지 게이트로 도달 불가.
   카드 제거 또는 `/operator/analytics` 연결 + 게이트 정정. 별도 WO 필요.
2. **KPA 감사 로그 오류 UI 문구 중복 (§6-2)** — 오류 배너와 빈 상태 문구 동시 노출.
3. (이월) `/api/ai/admin/*` HTTP 500 — WO-O4O-NETURE-OPERATOR-AI-GUARD-…-V1 §5-4 에서 발견된 platform 전용 backend 결함.
