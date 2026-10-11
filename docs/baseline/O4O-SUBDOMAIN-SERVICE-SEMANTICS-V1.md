# O4O 서브도메인 · 서비스 의미 정본

> **본문 전체 PH 부분 폐기 우선순위 (2026-10-11 · #427):** [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md)은 이 문서의 모든 절·표·코드 예시·불변식·후속 계획·최종 판정에 있는 PharmacyHub/PH 전용 유지·확장 계약을 대체한다. 개별 절의 표기는 이를 다시 명시한 것이며 표기가 없는 다른 PH 지시도 현행 운영/구현 의무가 아니다. 다른 서비스·공통 Core/Freeze·인쇄 QR 연결과 법정 보유 판단은 그대로다.


> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


> **2026-10-10 용어 정비**: 현행 사업 명칭은 **약국 협력사업**이다. 내부 식별자·가입/승인·주문 계약과 과거 실행 결과는 유지한다. 대표 홈의 탐색 분류·준비 중 노출은 [서비스 탐색 정본](O4O-HOME-SERVICE-DISCOVERY-V1.md)을 따른다. 이 갱신은 화면 구현·배포 완료를 뜻하지 않는다.

> **2026-10-09 실행 갱신:** PharmacyHub 전용 앱·API·배포 경로 제거는 [WO-O4O-PHARMACYHUB-RETIREMENT-V1](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-V1.md)이 현재 실행 범위다. 기존 식별자와 운영 데이터는 보존하며 운영 인프라 정리는 아직 미실행이다.

> **2026-10-07 정책 갱신**: [O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)이 메인 이메일 확인, 공통 모바일·커뮤니티 닉네임, Store 약국 전용 신규 가입, 사업자등록증 제출, 서비스별 가입과 로그인 분리의 현행 정본이다. 아래의 다업종 Store 신규 가입·최소 User 필수 정보 없음·메인 수동 승인·미가입 로그인 거부 서술은 해당 범위에서 대체됐다. 기존 역할·관계·인증 수단 경계는 유지한다.

> **상태**: ACTIVE
> **작성일**: 2026-10-03 · **최종 갱신**: 2026-10-11 (My Home 명칭·공통 개인 공간 진입 — `WO-O4O-MY-HOME-DOCUMENT-ALIGNMENT-V1`) · 2026-10-08 (§1 · §2 · §3 현재 내 매장·사업별 개발·커뮤니티·HUB 재배치 정렬) · 2026-10-07 (§4 kpa-branch catalog canonical `kpa.neture.co.kr` 이전 반영)
> **근거 WO/IR**: WO-O4O-SUBDOMAIN-SERVICE-SEMANTICS-DOCUMENT-ALIGNMENT-V1 · 주소 결정은 [`CHECK-O4O-URL-FIRST-CENSUS-V1`](../checks/CHECK-O4O-URL-FIRST-CENSUS-V1.md) CONFIRMED_DECISIONS · §9 · §12 · §21-17

**`*.neture.co.kr` 각 주소가 사업적으로 무엇이고 누구를 위한 것인가**를 정한다. 주소 · 내부 키 · role prefix 가 서로 다른 시기에 만들어져 이름만으로는 의미가 어긋나므로, 이름에서 의미를 추론하지 말고 이 표를 기준으로 읽는다.

- 이 문서는 **의미**만 정한다. serviceKey · role 문자열 · DB · route · 인증 로직은 바꾸지 않았다.
- 서비스 목록 · 도메인 · 가입 허용 여부의 기술 정본은 코드다 — [`service-catalog.ts`](../../apps/api-server/src/config/service-catalog.ts) (`O4O_SERVICES`). 이 문서와 코드가 다르면 **코드가 현재 동작**, 이 문서가 **의도한 사업 의미**다. 차이는 §4 에 적는다.
- 전환(배포 · 옛 주소 이전)의 진행 상태는 이 문서가 아니라 CHECK-O4O-URL-FIRST-CENSUS-V1 §21 이 기록한다.

---

## 1. 핵심 원칙

**2026-10-11 개인 공간 결정**: 개인 통합 공간의 이름은 **My Home**이다. 대표 홈과 독립 서비스의 로그인 후 공통 헤더에 직접 진입을 제공하고, 매장 업무 권한이 있는 사용자는 My Home과 내 매장을 구분해 이용한다. 참여·커뮤니티 활동·경영 통계·계정 설정은 [My Home 정본](O4O-MY-HOME-CANONICAL-V1.md)을 따른다. My Home은 사용자용 공간 명칭이며 새 서브도메인·serviceKey·role을 만드는 결정이 아니다. 현재 기술 경로의 연결과 화면 구현·배포는 별도 검증한다.

**2026-10-08 현재 재배치 기준** ([코드·문서 대조 후 전체 작업안](../work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)): Store는 약국 경영자 한 명·약국 하나·내 매장 하나를 기준으로 하며, 같은 약국이 가입한 여러 약국 협력사업 기능을 한 내 매장에서 구획하여 이용한다. 각 약국 협력사업은 독립된 약국 지원 사업자로 업무가 다르며, 추가 사업은 해당 사업에 맞춰 개발한다. 주소나 공통 가입 식별을 공유한다고 표준 사업 기능을 강제하지 않는다. `study`와 `funding`은 내 매장과 무관한 독립 서비스로 메인에서 접근한다. 강좌는 커뮤니티에서 완전히 제거하고 `study`의 업무로 이전한다. `community`는 독립 커뮤니티와 사업 참여 회원 전용 커뮤니티의 공통 공간이다. 기존 약사 커뮤니티는 독립 가입으로 유지하고 pharmacy 사업 포럼은 별개로 둔다. 매장 HUB의 필요한 기능은 내 매장과 커뮤니티로 재배치하며 중간 HUB 화면은 제거한다. 아래 다업종·retail·HUB 표의 과거 설명은 이 기준 및 기존 퇴역 계약과 함께 읽는다. 신규 사업의 실제 기능이나 새 호스트 운영 완료를 주소 계획만으로 주장하지 않는다. 작업안은 초안 작성·대조·논의·수정 후 다시 대조하여 확정한다.

1. **`kpa.neture.co.kr` 은 KPA 분회 서비스이며 약사 개인이 주 대상이다.** 약국(사업자) 서비스가 아니다.
2. **`pharmacy.neture.co.kr`은 전체 약국을 지원하는 약국 협력사업 사업의 공간이다.** 추가 약국 협력사업도 각각 독립된 약국 지원 사업자이며, 사업 특성에 맞게 개발한다. `retail.neture.co.kr`·K-Cosmetics는 기존 식별과 퇴역 계약을 대조할 대상이다.
3. **`store.neture.co.kr`은 약국 경영자의 내 매장 공간이며 신규 가입은 약국 전용이다.** 한 약국이 가입한 여러 약국 협력사업의 기능을 같은 내 매장에서 이용한다.
4. **`store.neture.co.kr` 은 serviceKey 를 가진 독립 서비스가 아니지만** 사업자 가입, Store Owner, 사업자가 허가한 Store Member 의 접근 모델을 가진다(§3).
5. **`kpa:store_owner` 같은 legacy · internal role prefix 를 `kpa.neture.co.kr` 의 현재 서비스 의미와 동일시하지 않는다.** `kpa:*` 는 serviceKey `kpa-society`(= `pharmacy.neture.co.kr`)의 role prefix 다. 분회의 role prefix 는 `kpa-branch:*` 다.
6. **role · serviceKey 이름과 현재 canonical URL 의미는 별개일 수 있다.** 이름을 바꾸는 일(rename)은 하지 않으며, 필요하면 별도 WO 로 다룬다.

---

## 2. 주소별 의미

| 주소 | 주 대상 | 성격 | serviceKey (catalog) | role prefix | Store 연계 | 옛 주소 (보존) |
|---|---|---|---|---|---|---|
| `neture.co.kr` | 전체 | O4O 대표 진입 · 공통 계정 · My Home 개인 공간 진입(소스·로컬 검증 완료, 운영 배포 대기) · 강좌·펀딩 등 서비스 진입 · 공개 가이드. `/hospital`(병원약국 공개 화면) · `/cafe24` 유지 | `neture` (대표 진입) · `cafe24-b2b` | `neture:*` | 「내 매장」 업무는 Store 공간에서 이용 | — |
| `kpa.neture.co.kr/{분회}` | **약사 개인** | KPA 분회 서비스 — 분회 가입 · 회원 · 분회 운영 | `kpa-branch` | `kpa-branch:*` | **없음** (분회 tenant 축은 `kpa_organizations` · `branch_memberships`) | `kpa-society.co.kr/kpa/{분회}` |
| `pharmacy.neture.co.kr` | **약국 사업자 · 해당 사업 운영자** | 전체 약국 지원 약국 협력사업 사업 · 사업자 운영 공간 | `kpa-society` | `kpa:*` | 가입 서비스 기능을 내 매장에서 이용 | `kpa-society.co.kr` |
| `retail.neture.co.kr` | 기존 화장품 · 소매 사업자 영역 | K-Cosmetics 퇴역 계약과 현재 소비처 대조 대상 | `k-cosmetics` | `cosmetics:*` | 과거 연계의 정리 여부 확인 | `k-cosmetics.site` |
| `store.neture.co.kr` | **약국 경영자 · 허가된 매장 사용자** | 약국 하나의 내 매장 · 가입한 복수 서비스 이용, 중간 HUB 없음 | **없음** (`store-workspace.ts`: catalog 서비스 아님) | 약국 신규 원장과 기존 서비스 역할은 §3에서 구분 | 자기 자신 | 각 서비스 앱의 `/store` · `/store-hub` |
| `supplier.neture.co.kr` | 공급자 | 공급자 서비스 | `supplier` | `supplier:admin` · `supplier:operator` (운영자 범위) | 이용 가능한 공급·자료를 내 매장에 제공 | `neture.co.kr/supplier` |
| `study.neture.co.kr` | 강좌 이용자 · 운영자 | 강좌 · Neture 메인에서 접근 | `lecture` | catalog·해당 서비스 계약 참조 | 내 매장과 독립 | 기존 강좌 진입 |
| `funding.neture.co.kr` | 펀딩 참여자 · 제품개발자 · 운영자 | 유통참여형 펀딩 (내부 `market-trial`) · Neture 메인에서 접근 | `funding` | `funding:admin` · `funding:operator` (운영자 범위) | 내 매장과 독립 | `neture.co.kr/market-trial` |
| `community.neture.co.kr` | 일반 커뮤니티 회원 · 사업 참여 회원 | 독립 가입 커뮤니티와 약국 협력사업 회원 전용 공간을 함께 배치 | `community` | `community:admin` · 사업별 운영 권한은 해당 계약 참조 | 회원 전용 공간은 해당 사업 가입 자격 확인 | 각 서비스의 `/forum` |
| `admin.neture.co.kr` | 전체관리자 | 플랫폼 전체 관리 전용. 각 서비스의 관리자(운영자)는 해당 서브도메인에 배치. Demo 대상 아님 | — | `platform:super_admin` | 없음 | — |

**약국 협력사업 식별 (2026-10-05, WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1)**: 위 표의 serviceKey 는 도메인 · 앱의 **서비스 식별**이다. 약국 대상 약국 협력사업(`pharmacy` 포함)의 식별 · 가입 · 운영 담당은 serviceKey 가 아니라 데이터 행(`semi_franchises` · `semi_franchise_memberships` · `semi_franchise_operators`)이 정한다. `kpa-society` service membership 은 내 매장(약국) 신청이나 `pharmacy` 약국 협력사업 가입의 근거가 아니며, 약국 협력사업을 추가할 때 serviceKey 를 만들지 않는다 — [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §1 · §3.

Partner는 대표 홈에 **준비 중**으로 노출하고 서비스 설명 페이지로 연결한다. `partner.neture.co.kr`은 예약 주소이며 실제 운영 연결 완료로 간주하지 않는다. 설명 페이지는 대표 홈의 `/services/partner`를 우선 진입 경로로 계획한다. 공급자 기능·Legacy Partner 역할/API를 되살리지 않는다. 추가 약국 협력사업의 주소와 업무는 각 사업 기획에 따라 정하며, 공통 개설 템플릿으로 간주하지 않는다.

### 2-1. 사업자 실체와 운영자 범위는 다른 축이다

- 공급자 **사업자 본인**의 접근은 serviceKey `supplier` 가 아니라 `organization_members(role=owner) → organizations(type='supplier') → neture_suppliers` 가 판정한다(FROZEN, [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) §7). `supplier:*` · `funding:*` · `community:admin` · `kpa-branch:admin` 은 그 영역을 **운영하는 쪽**의 범위다.
- **2026-10-08 사용자 결정**: 각 서브도메인의 관리자(=운영자)는 해당 서비스 호스트에서 일한다. 공급자·펀딩·커뮤니티 관리도 각각 `supplier`·`funding`·`community`에 배치한다. **전체관리자는 `admin.neture.co.kr`에만** 둔다. 과거 URL-FIRST §9의 공통 운영 배치 설명은 이 결정으로 대체한다. 화면의 /admin 이름과 전체관리자 권한은 별개이며 기존 role 문자열·서비스별 업무 권한을 일괄 합치거나 개명하지 않는다. 재배치 branch에서 해당 호스트로 연결하고, 매장 심사는 store, pharmacy 사업 운영은 pharmacy, 사업 등록·담당 지정과 플랫폼 계정 관리는 admin에 배치했다. 소유 게이트와 심사 운영 게이트를 구분하며 새 store serviceKey나 가입 원장을 만들지 않는다. 운영 적용 상태는 전체 재배치 CHECK를 따른다.
- **일반 서비스 operator 와 `platform:super_admin` 을 혼동하지 않는다.** O4O 운영자에게 `platform:super_admin` 을 부여하지 않는다(URL-FIRST CONFIRMED_DECISIONS · §15).

### 2-2. PharmacyHub

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


`pharmacyhub.co.kr` 에 새 독립 서비스를 만들지 않는다. 기능은 약국 서비스(`pharmacy.neture.co.kr`)로 흡수하는 방향이며(URL-FIRST §9 · §6-1 B안 수정), `pharmacy-hub` 키 · `pharmacy-hub:*` role 은 기존 QR · 오퍼 · 주문을 읽는 **호환 식별자로 보존**한다. 옛 호스트의 QR · 결제 복귀 경로는 안전한 목적지가 검증될 때까지 유지한다.

---

## 3. Store — 공통 Store Workspace 와 접근 모델

### 3-1. HUB 제거와 직접 이용

사업자의 운영 공간과 약국 이용 공간은 구분한다. 약국은 내 매장에서 이용 가능한 공급·이벤트·모집을 직접 확인하고 주문하며, 자료는 출처별 자료함에서 활용한다. 별도 HUB 선택·취급 등록을 거치지 않는다. 업계 전체 교류는 공통 community에서, 사업 가입자의 자료·게시판·업무는 해당 약국 협력사업 서비스의 참여자 공간에서 이용한다. 사업 게시판 원장과 승인 조건은 그대로 유지한다.

`store`의 `/hub/*`·`/store-hub/*`와 pharmacy의 옛 HUB 주소는 기능별 새 주소에 연결하는 adapter다. 사업 콘텐츠는 `/store/pharmacy/contents`, 일반 자료는 `/store/library/*`, 공급은 `/store/pharmacy/supply`를 사용한다. 중간 HUB 홈과 중복 화면은 제거했다. 공통 콘텐츠 API와 기존 출처·Copy 권한은 보존한다.

이 내용은 현재 재배치 branch의 구현이다. 통합·배포·운영 검증 상태는 [CHECK](../checks/CHECK-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)에 기록한다.

### 3-2. 하위 운영 영역

현재 신규 약국의 내 매장은 하나이며, 가입한 서비스별 기능을 탭 등으로 구획한다. 한 매장이 여러 서비스에 참여하는 구조다(1 Store : N Services — [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3). 기존 `/work/:serviceKey/*` 경로(예: `/work/kpa-society/store/*`, `/work/k-cosmetics/store/*`)는 기존 서비스 앱 연결의 구현 기록이며, 여러 약국을 한 내 매장으로 합치는 근거가 아니다.

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

**현재 약국 신청·승인**: 별도 `neture_pharmacy_memberships`와 약국 조직의 관계를 사용한다. KPA 서비스 가입·역할을 신규 약국 자격으로 치환하지 않는다. 승인 이후에도 pharmacy 등 약국 협력사업은 각각 가입한다 — [인증·가입 정본](O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md), [약국 commerce 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §3.

**기존 서비스 앱 runtime (과거 접근 모델의 참고)**: Store Owner 판정 = `role_assignments` 의 `{prefix}:store_owner` ([`O4O-STORE-OWNER-RBAC-STANDARD-V1`](../architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md)) + 해당 서비스 active membership. 매장(조직) 해석 = `organization_members` 활성 역할 `owner` · `admin` · `manager` (`store-organization.resolver.ts` `STORE_MEMBER_ROLES`). Store Member 초대·허가 흐름은 별도 조사 대상이다. 이 모델을 새 약국 신청 원장이나 약국 협력사업 가입 대신 사용하지 않는다.

---

## 4. 이름과 의미가 어긋나는 곳 (현재 코드 · 알려진 차이)

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


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

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


- [`CHECK-O4O-URL-FIRST-CENSUS-V1`](../checks/CHECK-O4O-URL-FIRST-CENSUS-V1.md) — 주소 결정 · 전환 진행 기록 (단일 TODO)
- [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) — Store · Service · Supplier 업무공간 상위 기준
- [`KPA-SOCIETY-SERVICE-STRUCTURE`](KPA-SOCIETY-SERVICE-STRUCTURE.md) — `kpa-society` 앱 내부 화면 영역
- [`O4O-STORE-OWNER-RBAC-STANDARD-V1`](../architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md) — store_owner 권한 판정
- [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) — `pharmacy-hub` 역할 모델
