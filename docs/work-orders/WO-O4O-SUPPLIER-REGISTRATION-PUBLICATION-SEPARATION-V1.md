# WO-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1

> 상태: COMPLETED (개발·검증·push 범위) · 작성일: 2026-10-16 · 최종 갱신: 2026-10-16
> 승인: 사용자 확정안 — 제품 등록·승인 / 서비스 게시·일반 공급 / 기간 한정 이벤트를 분리한다. TODO를 문서·코드와 대조해 보정한 뒤 개발·검증·commit·push까지 수행한다. PR은 만들지 않는다.
> 기준: `origin/main` `04ff6b829cc087c676c663ef688153497895889c`
> 작업 branch: `wo/supplier-registration-publication-separation`

## 1. 목표와 경계

제품 정보는 한 번 등록하고 운영자 검토 후 보관한다. 게시 여부와 대상 서비스·일반 공급가는 별도 업무로 정한다.
이벤트는 승인 제품에 대상·특가·시작/종료일·선택적 수량/구매 한도를 연결한다.
제품 승인만으로 신규 상품이 게시되지 않으며, 이벤트 종료는 일반 게시나 제품 승인을 바꾸지 않는다.
기존 제품·서비스 승인·가격·공급 제안·이벤트 원장을 우선 활용하고 공통 게시 엔진이나 상태머신 프레임워크는 만들지 않는다.

이번 지시는 위 경계에 필요한 Supplier 정본·API·데이터 모델 변경의 개발 범위를 포함한다.
운영 DB write·migration 적용·배포·PR 생성·main 통합은 수행하지 않는다.
기존 게시와 주문 이력은 보존하고 규제·소유권·서비스 자격·payment-first 경계를 유지한다.
운영자 실제 승인 검증은 사용자가 수행한다. 변경 동작은 격리 fixture/로컬 DB로 검증하며 운영 업무 데이터를 생성하지 않는다.

## 2. 최초 TODO — 문서·코드 대조 후 보정

- [x] 정본: Supplier Domain, Neture 약국 commerce, Distribution Freeze, 역할별 업무공간, B2B·소비자 commerce, Event Offer 계약과 교차 소비처 확인.
- [x] 신규 Candidate·기존 Master 연결·대량 입력의 필수 가격/공급 대상 입력을 조사하고 등록 전용 입력으로 단순화.
- [x] 제품 등록 승인과 서비스 승인·활성화·자동 listing의 부작용을 조사하여 승인과 게시를 분리.
- [x] 기존 게시를 유지하면서 신규 승인 상품은 미게시로 남는 최소 저장 계약·호환 경로 확정.
- [x] 상품 하위에서 내 제품 / 서비스 게시 / 이벤트·특가를 독립 진입으로 정렬. 대상 제품·복귀 문맥과 여러 서비스 선택 보존.
- [x] 일반 공급의 대상·가격·게시 중단이 제품 승인이나 다른 서비스·이벤트에 잘못 전파되지 않도록 구현.
- [x] 이벤트 시작/종료·서비스/사업별 자격·가격·수량·만료 주문 재판정의 기존 계약 검증.
- [x] 공급자·운영자·매장 소비처와 공유 모듈의 영향 범위를 대조하고 관련 회귀 보완.
- [x] 변경한 현행 기준 문서를 정합. 과거 WO/CHECK의 당시 결과는 다시 쓰지 않음.
- [x] API·웹 테스트, lint·타입·빌드, desktop/mobile 브라우저 행동 검증과 미실행 범위 기록.
- [x] 명시적 파일 scope 확인 후 commit·작업 branch push. PR 생성 없음.

## 3. 문서·코드 점검 결과와 보정

문서·코드 대조 완료(2026-10-16). 등록 가격 필수, from-master의 유통 동시 설정, OSA→제품 상태 파생, Neture 빈 service_keys 기본 공급이 결합 지점이다.

| 점검 대상 | 확정 구현 |
|---|---|
| Candidate / from-master / bulk | Candidate 가격 단계를 제거하고 기존 Master 연결은 masterId만으로 미게시 Offer를 생성한다. 대량 입력의 기존 선택적 가격 초안은 호환 보존하되 게시 효과 없음 |
| 제품 승인 / OSA | `approval_status`는 제품 등록 승인 SSOT로 독립. 운영자 제품 승인은 OSA를 승인하거나 listing을 만들지 않는다. 서비스 승인/반려·철회는 그 서비스만 처리하며 제품 승인을 바꾸지 않는다 |
| 최소 저장 변경 | SPO에 `default_supply_enabled` boolean(default false)과 독립 제품 반려 사유 `registration_rejection_reason` nullable text를 추가. 기존 기본 공급 선택과 제품 반려 사유를 보존하며 신규 원장은 만들지 않음 |
| 서비스 게시 | 기존 distribution API를 확장해 기본 공급 여부·일반가·서비스별 가격·대상을 단일 transaction으로 저장. 승인 전 게시, 유효하지 않은 가격, 타인 상품, 잘못된 규제 대상은 거부 |
| 이벤트만 진행 | 일반가 0은 미설정값. 양수 일반가가 있을 때만 특가 상한을 검사하며 특가 자체는 양수·기간 필수. 이벤트 종료·취소는 일반 게시 상태에 전파하지 않음 |
| 소비처 | Supplier 단일/대량/소스 입력·목록·Drawer·dashboard·sidebar·API client, Operator 제품 승인/서비스 승인, Admin 동기화, Neture 약국 목록/상세/cart/checkout 공통 supply-access, KPA Event Offer/서비스 listing/2차심사 bridge, KPA 기존 공급자·운영자 이벤트 생성 UI/API |
| 공유 경계 | ProductForm의 운영자 소비처는 유지하고 공급자 등록에서는 판매 필드를 렌더하지 않음. Supplier 전용 새 게시 화면만 추가. 외부 매장 콘텐츠 사본·주문 원장·권한 Core는 변경하지 않음 |

추가 소비처 점검: KPA의 기존 공급자 단건 제안·운영자 직접 등록도 공통 createListing을 사용한다. 가격·기간 없는 새 이벤트가 생기지 않도록 두 UI와 API client/controller를 함께 정렬한다. 기존 메뉴·역할·원장은 유지하고 가격·기간 입력만 공유한다.

수정된 TODO는 위 표의 경계와 함께 수행한다. 새 schema는 개발·격리 DB에서만 검증하며 운영 적용은 실행하지 않는다.
서비스별 게시 중단·이벤트-only·승인 후 미게시·타 서비스 반려 격리를 필수 회귀로 추가한다.

## 4. 검증·인계

실행 결과: [CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1](../checks/CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1.md).
API·Neture·KPA 빌드, 회귀 테스트, 실제 격리 PostgreSQL 업무 흐름, 두 서비스의 desktop/mobile 브라우저 점검을 완료했다.
서비스 승인 알림도 제품 등록 재검토와 구분하고 해당 제품의 서비스 게시 화면으로 연결한다.
문서 정합: Supplier Domain·Distribution Freeze·Event Offer·Neture 약국 commerce의 승인/게시 결합 규칙을 본 구현에 맞게 정렬했다.

`DEPLOYMENT = REQUIRED`, 실행은 이번 사용자 범위에서 제외했다. 운영 반영 담당은 migration → API → Neture/KPA 웹을 함께 적용하고 실제 운영자 계정으로 승인 흐름을 확인해야 한다.
새 API의 KPA 이벤트 생성은 가격·기간을 요구하므로 구형 웹과 장기간 혼용하지 않는다. 운영 rollback은 암묵적 기본 공급 정책으로 돌아가므로 별도 판단한다.
개발 중 이동한 `origin/main`은 `daad0563c`이며 변경은 개발 담당 push 종료에 대한 지침 문서뿐이다. 구현 경로와 충돌하지 않아 자동 통합하지 않았다.
push는 운영 배포 완료를 뜻하지 않는다. PR은 생성하지 않는다.

## 5. 개발 종료

- 구현 commit: `cac451b4e8a5e89bd36590abc10dc6099cca8572`.
- `origin/wo/supplier-registration-publication-separation` push와 원격 SHA 일치를 확인했다.
- PR 생성·main 통합·운영 migration/배포 없음. CI Pipeline은 이 branch push의 실행 대상이 아니며 로컬 검증 결과를 인계한다.
- branch/worktree는 후속 통합 검토를 위해 `KEEP`한다. 이번 작업의 개발 범위는 완료했다.
