# IR-O4O-OPERATOR-ASSIGNMENT-TARGET-DOMAINS-9-V1

> 작성일: 2026-09-27 · 상태: **조사 완료 / 방향 결정 대기**
> **코드 변경 0 · migration 0 · production write 0**

---

## 0. 무엇을 요청받았나

운영자 지정 대상을 **도메인 9개**로 확정하고, Admin 운영자 지정 화면에 **동일한 방식**으로
표시하며, 지정 결과가 **해당 도메인의 Google 로그인 후 운영자 권한 검사에 연결**되게 한다.

```text
neture.co.kr
supplier · funding · community · pharmacy · retail · kpa · store · study  .neture.co.kr
```

부가 조건: 폐지 예정인 **KPA Society · K-Cosmetics · Pharmacy-Hub 는 신규 지정 선택지에서 제외**
(기존 권한 데이터는 삭제하지 않는다). 서비스 기능 · Hub 이전 · 도메인 전환은 범위 밖.
운영자를 자동 지정하지 않는다 — 계정 지정은 사용자가 화면에서 직접 한다.

## 1. 실측 — 9개 도메인이 지금 무엇인가

각 호스트를 직접 조회해 **무엇이 서빙되는지** 확인했다(전부 `200`).

| 도메인 | `<title>` 로 식별한 서빙 앱 | 현재 canonical service_key |
|---|---|---|
| `neture.co.kr` | neture-web | **`neture`** |
| `supplier.neture.co.kr` | neture-web (같은 앱) | 없음 |
| `funding.neture.co.kr` | neture-web (같은 앱) | 없음 |
| `community.neture.co.kr` | neture-web (같은 앱) | 없음 |
| `pharmacy.neture.co.kr` | **kpa-society-web** | `kpa-society` |
| `retail.neture.co.kr` | **k-cosmetics-web** | `k-cosmetics` |
| `kpa.neture.co.kr` | kpa-branch-web | `kpa-branch` |
| `store.neture.co.kr` | store-web | 없음(매장 소유·조직 축) |
| `study.neture.co.kr` | lecture-web | **`lecture`** |

> **9개는 새 서비스가 아니라 기존 앱을 가리키는 새 호스트다.**

## 2. 코드에서의 존재 상태

`apps/api-server/src` 안에서 7개 서브도메인(`supplier`·`funding`·`community`·`pharmacy`·`retail`·
`kpa`·`store` 중 신규 6개)이 나타나는 곳은 **`bootstrap/setup-middlewares.ts`(CORS allowlist) 한 곳뿐**이다.

| 축 | 상태 |
|---|---|
| `config/service-catalog.ts` | 신규 6개 **없음** (있는 키: `neture` · `kpa-society` · `k-cosmetics` · `pharmacy-hub` · `lecture` · `kpa-branch` · `cafe24-b2b`) |
| `config/operator-role-catalog.ts` allowlist | 신규 6개 **없음** (있는 역할 11개 = 6개 서비스) |
| `roles` 카탈로그 · `{key}:operator` | 신규 6개 **없음** |
| 각 도메인의 운영자 화면 권한 검사 | 신규 6개 **없음** |

즉 **지정 대상으로 만들려면 서비스 키 · 역할 · 카탈로그 · 화면 권한 검사를 신설해야 한다.**

## 3. ⚠️ 요청 안의 충돌 2건 — 임의 판단하지 않는다

### 3-1. 제외 지시와 대상 지시가 같은 것을 가리킨다

`pharmacy.neture.co.kr` 은 **KPA Society 앱**이, `retail.neture.co.kr` 은 **K-Cosmetics 앱**이
서빙한다(§1 실측). 그런데 같은 요청이 **KPA Society · K-Cosmetics 를 신규 지정 선택지에서 제외**하라고
한다. 두 도메인을 대상에 넣으면서 그 서비스를 빼는 것은 **같은 대상을 넣고 빼는 것**이 된다.

### 3-2. 다른 트랙의 확정 결정과 부딪친다

`CHECK-O4O-URL-FIRST-CENSUS-V1` 의 **CONFIRMED_DECISIONS** 에 다음이 있다.

> **서비스 키 · role prefix 일괄 변경 금지**

9개를 각각 독립 지정 대상으로 만들려면 신규 서비스 키와 `{key}:operator` 역할을 만들어야 하고,
이는 위 결정을 뒤집는다. RBAC SSOT 는 **F9 동결** 대상이기도 하다(구조 변경은 명시적 WO 필요).

## 4. 선택지

| # | 내용 | 코드 영향 | 충돌 |
|---|---|---|---|
| **A** | 호스트 → **기존 서비스 매핑**. 화면엔 도메인 9개로 보이되 뒤에서는 기존 키 사용 (`pharmacy→kpa-society` · `retail→k-cosmetics` · `kpa→kpa-branch` · `supplier/funding/community→neture` · `study→lecture`) | 작음 · 새 키 0 | §3-1 제외 지시와 어긋남 |
| **B** | **새 서비스 키 6개 신설** + 역할 + 카탈로그 + 각 도메인 권한 검사 | 큼 · RBAC 구조 변경 | §3-2 URL 트랙 결정·F9 동결 |
| **C** | **지금 가능한 것만** — 기존 키가 있는 `neture` · `lecture` · `kpa-branch` 3개는 이미 지정 가능. 나머지 6개는 URL 재구성이 서비스 키를 확정한 뒤 붙인다 | 0 | 없음 |

**권고: C.** URL 재구성이 아직 진행 중이고 그 배포조차 대기 상태다(Google 승인 원본 7개 미등록).
지금 새 키를 만들면 그 트랙이 확정할 구조와 충돌할 가능성이 크다.

## 5. 이번 조사에서 하지 않은 것

- 기존 권한 데이터 삭제·변경 **0** (지시대로)
- 서비스 기능 · Hub 이전 · 도메인 전환 **0** (범위 밖)
- 운영자 자동 지정 **0** (지시대로 — 계정 지정은 사용자가 화면에서)
- 새 서비스 키 · 역할 신설 **0** (방향 결정 전)

## 6. 9개별 현재 상태표 (요청받은 보고 형식)

| # | 도메인 | 지정 가능 여부(현재) | Google 로그인 검증 상태 |
|---|---|---|---|
| 1 | `neture.co.kr` | **가능** (`neture:admin` · `neture:operator`) | T5-4 **PASS** |
| 2 | `study.neture.co.kr` | **가능** (`lecture:admin` · `lecture:operator`) | T5-10 PASS(화면 동작 · 자체 로그인 없음) |
| 3 | `kpa.neture.co.kr` | **가능** (`kpa-branch:operator`) | 미검증 |
| 4 | `store.neture.co.kr` | **불가** — 서비스 키 없음(소유권 축) | T5-9 **FAIL**(`origin_mismatch` · 원본 미등록) |
| 5 | `supplier.neture.co.kr` | **불가** — 키·역할 없음 | 미검증 · 원본 미등록 |
| 6 | `funding.neture.co.kr` | **불가** — 키·역할 없음 | 미검증 · 원본 미등록 |
| 7 | `community.neture.co.kr` | **불가** — 키·역할 없음 | 미검증 · 원본 미등록 |
| 8 | `pharmacy.neture.co.kr` | **불가** — 현재 KPA Society 앱(§3-1 충돌) | 미검증 · 원본 미등록 |
| 9 | `retail.neture.co.kr` | **불가** — 현재 K-Cosmetics 앱(§3-1 충돌) | 미검증 · 원본 미등록 |

> 원본 미등록 상태는 `CHECK-O4O-URL-FIRST-CENSUS-V1` §21 의 실측 기록을 인용한 것이다
> (내 `checkOrigin` 재현은 403 으로 차단됨). **Console 저장 후 재확인이 필요하다.**
