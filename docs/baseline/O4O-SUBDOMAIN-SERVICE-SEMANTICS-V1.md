# O4O 서브도메인 · 서비스 의미 정본

> **2026-10-07 정책 갱신**: [O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)이 메인 이메일 확인, 공통 모바일·커뮤니티 닉네임, Store 약국 전용 신규 가입, 사업자등록증 제출, 서비스별 가입과 로그인 분리의 현행 정본이다. 아래의 다업종 Store 신규 가입·최소 User 필수 정보 없음·메인 수동 승인·미가입 로그인 거부 서술은 해당 범위에서 대체됐다. 기존 역할·관계·인증 수단 경계는 유지한다.

> **상태**: ACTIVE
> **작성일**: 2026-10-03 · **최종 갱신**: 2026-10-07 (§4 kpa-branch catalog canonical `kpa.neture.co.kr` 이전 반영)
> **근거 WO/IR**: WO-O4O-SUBDOMAIN-SERVICE-SEMANTICS-DOCUMENT-ALIGNMENT-V1 · 주소 결정은 [`CHECK-O4O-URL-FIRST-CENSUS-V1`](../checks/CHECK-O4O-URL-FIRST-CENSUS-V1.md) CONFIRMED_DECISIONS · §9 · §12 · §21-17

**`*.neture.co.kr` 각 주소가 사업적으로 무엇이고 누구를 위한 것인가**를 정한다. 주소 · 내부 키 · role prefix 가 서로 다른 시기에 만들어져 이름만으로는 의미가 어긋나므로, 이름에서 의미를 추론하지 말고 이 표를 기준으로 읽는다.

- 이 문서는 **의미**만 정한다. serviceKey · role 문자열 · DB · route · 인증 로직은 바꾸지 않았다.
- 서비스 목록 · 도메인 · 가입 허용 여부의 기술 정본은 코드다 — [`service-catalog.ts`](../../apps/api-server/src/config/service-catalog.ts) (`O4O_SERVICES`). 이 문서와 코드가 다르면 **코드가 현재 동작**, 이 문서가 **의도한 사업 의미**다. 차이는 §4 에 적는다.
- 전환(배포 · 옛 주소 이전)의 진행 상태는 이 문서가 아니라 CHECK-O4O-URL-FIRST-CENSUS-V1 §21 이 기록한다.

---

## 1. 핵심 원칙

1. **`kpa.neture.co.kr` 은 KPA 분회 서비스이며 약사 개인이 주 대상이다.** 약국(사업자) 서비스가 아니다.
2. **`pharmacy.neture.co.kr` 과 `retail.neture.co.kr` 은 사업자를 대상으로 하는 세미프랜차이즈 운영 서비스다.** 각각 약국 사업자, 화장품 · 일반 소매 사업자가 대상이다.
3. **`store.neture.co.kr` 은 공통 Store Workspace 이며** 약국 · 화장품 · 일반소매 등 하위 운영 영역을 가진다.
4. **`store.neture.co.kr` 은 serviceKey 를 가진 독립 서비스가 아니지만** 사업자 가입, Store Owner, 사업자가 허가한 Store Member 의 접근 모델을 가진다(§3).
5. **`kpa:store_owner` 같은 legacy · internal role prefix 를 `kpa.neture.co.kr` 의 현재 서비스 의미와 동일시하지 않는다.** `kpa:*` 는 serviceKey `kpa-society`(= `pharmacy.neture.co.kr`)의 role prefix 다. 분회의 role prefix 는 `kpa-branch:*` 다.
6. **role · serviceKey 이름과 현재 canonical URL 의미는 별개일 수 있다.** 이름을 바꾸는 일(rename)은 하지 않으며, 필요하면 별도 WO 로 다룬다.

---

## 2. 주소별 의미

| 주소 | 주 대상 | 성격 | serviceKey (catalog) | role prefix | Store 연계 | 옛 주소 (보존) |
|---|---|---|---|---|---|---|
| `neture.co.kr` | 전체 | O4O 대표 진입 · Neture 공통 영역 · 공개 가이드. `/hospital`(병원약국 공개 화면) · `/cafe24` 유지 | `neture` (대표 진입) · `cafe24-b2b` | `neture:*` | 없음 — 「내 매장」은 각 서비스 Store 로 가는 진입 목록일 뿐 | — |
| `kpa.neture.co.kr/{분회}` | **약사 개인** | KPA 분회 서비스 — 분회 가입 · 회원 · 분회 운영 | `kpa-branch` | `kpa-branch:*` | **없음** (분회 tenant 축은 `kpa_organizations` · `branch_memberships`) | `kpa-society.co.kr/kpa/{분회}` |
| `pharmacy.neture.co.kr` | **약국 사업자** | 세미프랜차이즈 운영 서비스 — 서비스 운영자의 서비스 Hub · 사업자 운영 진입 | `kpa-society` | `kpa:*` | 있음 — 약국 운영 영역 | `kpa-society.co.kr` |
| `retail.neture.co.kr` | **화장품 · 일반 소매 사업자** | 세미프랜차이즈 운영 서비스 — 서비스 Hub · 사업자 운영 진입 | `k-cosmetics` | `cosmetics:*` | 있음 — 화장품 · 소매 운영 영역 | `k-cosmetics.site` |
| `store.neture.co.kr` | **사업자 · 사업자가 허가한 사용자** | 공통 Store Workspace — 사업자가 실제 매장을 운영하는 공간 | **없음** (`store-workspace.ts`: 서비스 아님) | 없음 (각 서비스의 `{prefix}:store_owner` 를 소비) | 자기 자신 | 각 서비스 앱의 `/store` · `/store-hub` |
| `supplier.neture.co.kr` | 공급자 | 공급자 서비스 | `supplier` | `supplier:admin` · `supplier:operator` (운영자 범위) | Supplier → Store Hub 제공 경로 | `neture.co.kr/supplier` |
| `funding.neture.co.kr` | 참여 매장 · 제품개발자 · 운영자 | 유통참여형 펀딩 (내부 `market-trial`) | `funding` | `funding:admin` · `funding:operator` (운영자 범위) | 매장이 참여 주체 | `neture.co.kr/market-trial` |
| `community.neture.co.kr` | 커뮤니티 회원 | 독립 커뮤니티 — 서비스 가입과 **별도**인 커뮤니티 단위 가입(승인형). `/pharmacist` · `/retail` | `community` | `community:admin` | 없음 | 각 서비스의 `/forum` |
| `admin.neture.co.kr` | 플랫폼 관리자 | 플랫폼 · 서비스 관리 영역. Demo 대상 아님 | — | `platform:super_admin` | 없음 | — |

**세미프랜차이즈 식별 (2026-10-05, WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1)**: 위 표의 serviceKey 는 도메인 · 앱의 **서비스 식별**이다. 약국 대상 세미프랜차이즈(`pharmacy` 포함)의 식별 · 가입 · 운영 담당은 serviceKey 가 아니라 데이터 행(`semi_franchises` · `semi_franchise_memberships` · `semi_franchise_operators`)이 정한다. `kpa-society` service membership 은 내 매장(약국) 신청이나 `pharmacy` 세미프랜차이즈 가입의 근거가 아니며, 세미프랜차이즈를 추가할 때 serviceKey 를 만들지 않는다 — [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §1 · §3.

보조 주소: `study.neture.co.kr` = O4O 강의(`lecture`). `partner.neture.co.kr` = 주소 예약만(공급자 기능을 파트너로 되돌리지 않는다).

### 2-1. 사업자 실체와 운영자 범위는 다른 축이다

- 공급자 **사업자 본인**의 접근은 serviceKey `supplier` 가 아니라 `organization_members(role=owner) → organizations(type='supplier') → neture_suppliers` 가 판정한다(FROZEN, [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) §7). `supplier:*` · `funding:*` · `community:admin` · `kpa-branch:admin` 은 그 영역을 **운영하는 쪽**의 범위다.
- 약국 · 소매 서비스의 운영자는 각 서비스 호스트(`pharmacy` · `retail`)에서 일한다. 공급자 · 펀딩 · 커뮤니티 등 O4O 공통 운영은 `admin.neture.co.kr` 쪽이다(URL-FIRST §9).
- **일반 서비스 operator 와 `platform:super_admin` 을 혼동하지 않는다.** O4O 운영자에게 `platform:super_admin` 을 부여하지 않는다(URL-FIRST CONFIRMED_DECISIONS · §15).

### 2-2. PharmacyHub

`pharmacyhub.co.kr` 에 새 독립 서비스를 만들지 않는다. 기능은 약국 서비스(`pharmacy.neture.co.kr`)로 흡수하는 방향이며(URL-FIRST §9 · §6-1 B안 수정), `pharmacy-hub` 키 · `pharmacy-hub:*` role 은 기존 QR · 오퍼 · 주문을 읽는 **호환 식별자로 보존**한다. 옛 호스트의 QR · 결제 복귀 경로는 안전한 목적지가 검증될 때까지 유지한다.

---

## 3. Store — 공통 Store Workspace 와 접근 모델

### 3-1. Hub 두 종류 (URL-FIRST §21-17)

| 이름 | 위치 | 누가 관리하나 | 의미 |
|---|---|---|---|
| **서비스 Hub** | `pharmacy.neture.co.kr` · `retail.neture.co.kr` 안 | 그 서비스의 운영자 | 서비스가 매장에 제공하는 운영 기능 |
| **Store Hub** | `store.neture.co.kr/hub` | 사업자(매장) | 사업자가 참여한 서비스들의 Hub 를 모아 자기 매장을 운영하는 공통 공간 |

같은 화면 · 같은 서비스 문맥으로 간주하지 않는다. 옛 주소 전환에서 서비스 Hub 는 Store Hub 로 넘어가지 않는다.

약국 매장 이용자에게는 Store Hub 를 별도 단계로 두지 않는다(2026-10-05) — 내 매장이 이용 권한이 있는 항목을 직접 보여준다. `store.neture.co.kr/hub` 코드는 이 트랙에서 지우지 않았다(K-Cosmetics 퇴역 결정 2026-10-05 — 제거 범위는 퇴역 작업) — [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §6.

### 3-2. 하위 운영 영역

`store.neture.co.kr` 안은 업종 · 서비스 영역으로 나뉜다. 현재 경로는 `/work/:serviceKey/*`(예: `/work/kpa-society/store/*` = 약국, `/work/k-cosmetics/store/*` = 화장품 · 소매)이며, 한 매장이 여러 서비스에 참여할 수 있다(1 Store : N Services — [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3).

### 3-3. 접근 모델 — 서비스가 아니어도 가입 · 소유 · 허가 구조는 있다

Store 는 별도 서비스 membership 으로 다루지 않지만, 접근은 **사업자 연결(organization)** 을 기준으로 한다.

| 개념 | 의미 |
|---|---|
| **Store Owner** | 사업자 대표 · 소유 접근 |
| **Store Member** | 사업자가 허가한 사용자 |
| **Store 접근** | organization(사업자) 연결 기반. 서비스 이름이나 주소에서 유도하지 않는다 |

후속 인증 정비에서는 최소 다음 축을 **서로 구분**한다.

```text
user authentication              — 누구인가
organization/business membership — 어느 사업자에 속하는가
store access                     — 어느 매장에 들어갈 수 있는가
store business/domain scope      — 그 매장의 어느 운영 영역(약국 · 화장품 · 소매)인가
owner/member permission          — 그 안에서 무엇을 할 수 있는가
```

**현재 runtime (참고 · 변경하지 않음)**: Store Owner 판정 = `role_assignments` 의 `{prefix}:store_owner` ([`O4O-STORE-OWNER-RBAC-STANDARD-V1`](../architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md)) + 해당 서비스 active membership. 매장(조직) 해석 = `organization_members` 활성 역할 `owner` · `admin` · `manager` (`store-organization.resolver.ts` `STORE_MEMBER_ROLES`). 사업자가 사용자를 초대 · 허가하는 Store Member 흐름과 Store 단위 사업자 가입은 **아직 없다** — 이 절은 방향만 정하고 구현은 후속 인증 WO 다.

---

## 4. 이름과 의미가 어긋나는 곳 (현재 코드 · 알려진 차이)

| 위치 | 현재 값 | 읽는 법 |
|---|---|---|
| serviceKey `kpa-society` · role prefix `kpa:*` | 이름은 "KPA" | **약국 사업자 서비스**(`pharmacy.neture.co.kr`). 분회(`kpa.neture.co.kr`)와 무관 |
| `kpa:store_owner` · label `KPA Store Owner` | 이름은 "KPA" | 약국 서비스의 매장 경영자. 약사회 · 분회 소속을 뜻하지 않는다 |
| serviceKey `k-cosmetics` · role prefix `cosmetics:*` | 이름은 "화장품" | 화장품 **및 일반 소매** 사업자 서비스(`retail.neture.co.kr`) |
| catalog `kpa-society.description` | `약사 커뮤니티 서비스` | 사용자 노출 문자열(`/check-email` 등). 현재 의미와 다름 — 변경은 별도 WO |
| 옛 분회 공용 경로 `kpa-society.co.kr/kpa/*` | 계속 서빙(인쇄 QR · 북마크) | catalog `kpa-branch.domain` 은 `kpa.neture.co.kr`(basePath 없음)이다. 세션 판정은 host 만 보므로 이 경로의 로그인은 `kpa-society` 로 귀속된다 — 분회 앱이 이 경로 방문을 같은 path 의 `kpa.neture.co.kr` 로 옮긴다(WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1). LB · DNS 정리는 별도 |
| catalog `pharmacy-hub.domain` | `pharmacyhub.co.kr` | 호환 호스트(§2-2) |
| 「KPA Society」 · 「K-Cosmetics」 서비스명 | 문서 · 계약 원문 · 화면 | 내부 서비스 이름. 사업 의미는 §2 의 주소 기준으로 읽는다 |

---

## 5. 관련 문서

- [`CHECK-O4O-URL-FIRST-CENSUS-V1`](../checks/CHECK-O4O-URL-FIRST-CENSUS-V1.md) — 주소 결정 · 전환 진행 기록 (단일 TODO)
- [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) — Store · Service · Supplier 업무공간 상위 기준
- [`KPA-SOCIETY-SERVICE-STRUCTURE`](KPA-SOCIETY-SERVICE-STRUCTURE.md) — `kpa-society` 앱 내부 화면 영역
- [`O4O-STORE-OWNER-RBAC-STANDARD-V1`](../architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md) — store_owner 권한 판정
- [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) — `pharmacy-hub` 역할 모델
