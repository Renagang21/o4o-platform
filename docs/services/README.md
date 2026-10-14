# O4O 서비스 색인

> **상태**: ACTIVE
> **작성일**: 2025-12 · **최종 갱신**: 2026-10-11 (PH 완전 폐기 정책 반영)
> **근거 WO/IR**: WO-O4O-DOCS-ONBOARDING-ENTRY-V1

O4O 의 서비스 목록과 서비스별 기준 문서를 찾는 색인이다. 서비스 정의를 여기 복제하지 않는다.

- **서비스 목록 · 도메인 · 가입 허용 여부의 정본은 코드다** — [`apps/api-server/src/config/service-catalog.ts`](../../apps/api-server/src/config/service-catalog.ts) (`O4O_SERVICES`). 각 항목의 주석에 서비스의 성격과 근거 WO 가 적혀 있다.
- 서비스 데이터는 `serviceKey` 로 격리되고, forum · lms · signage 등은 플랫폼 공통 구조를 쓴다 ([o4o-common-structure](../o4o-common-structure.md)).
- **주소(`*.neture.co.kr`)별 사업 의미**는 [SUBDOMAIN-SERVICE-SEMANTICS](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) 가 정한다 — serviceKey · role prefix 이름에서 의미를 추론하지 않는다(예: `kpa-society` = 약국 사업자 서비스 `pharmacy.neture.co.kr`, 분회는 `kpa-branch` = `kpa.neture.co.kr`).
- 역할 경계 · 업무공간은 서비스보다 상위 기준이다 ([ROLE-WORKSPACE-ARCHITECTURE](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)).

---

## 1. 서비스 (service-catalog 등재)

> **PH 전용 판정 부분 대체:** catalog의 잔여 등록은 서비스 운영·복구 근거가 아니다. 사용자 승인된 PH 완전 폐기 정책이 이 색인의 PH 전용 유지·확장 계약을 대체한다. 다른 서비스·공통 계약은 유지한다.

| serviceKey | 웹 앱 | 기준 문서 |
|---|---|---|
| `neture` | `services/web-neture` | [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md) · [SUPPLIER-DOMAIN-BOUNDARY](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) · [NETURE-DISTRIBUTION-ENGINE-FREEZE](../baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) |
| `community` · `supplier` · `funding` | `services/web-neture` (호스트별 프로필 — `src/lib/hostProfile.ts`) | 각 키는 **해당 영역의 운영자 범위**다. 근거: [WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1](../work-orders/WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.md). 공급자 사업자 본인의 인가는 SUPPLIER-DOMAIN-BOUNDARY 가 정한다 |
| `kpa-society` | `services/web-kpa-society` | [KPA-SOCIETY-SERVICE-STRUCTURE](../baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md) · [KPA-UX-BASELINE](../baseline/KPA-UX-BASELINE-V1.md) · [KPA-ROLE-MATRIX](../baseline/KPA-ROLE-MATRIX-V1.md) · [KPA-SIGNAGE-STRUCTURE](../baseline/KPA-SIGNAGE-STRUCTURE-V1.md) |
| `kpa-branch` | `services/web-kpa-branch` | 약사회 분회 홈페이지 — 주소 의미는 [SUBDOMAIN-SERVICE-SEMANTICS](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) §2. 역할 · 접근 정본은 [KPA-BRANCH-ROLE-MATRIX](../baseline/KPA-BRANCH-ROLE-MATRIX-V1.md)(2026-10-06). 그 밖의 구조 정본 없음 — catalog 주석과 [SERVICE-IDENTITY CHECK](../checks/CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.md) |
| `k-cosmetics` | 없음 — 독립 웹 앱은 퇴역 1차-A, web-store 기능 화면 · `/api/v1/cosmetics` 는 1차-B(PR #339)로 삭제(`/work/k-cosmetics/*` 는 종료 안내만) | **퇴역 결정(2026-10-05) · 운영 runtime 제거 완료** — [DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §14. 퇴역 잔여 계약 [K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1](../architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md) (2026-10-07 · 구 COSMETICS-DOMAIN-RULES 는 SUPERSEDED). `cosmetics/service-definition.md` 는 퇴역 이전 기록(stale — "운영중" · 제거된 기능 열거)이라 기준 문서가 아니다 |
| `pharmacy-hub` | 없음 — 독립 웹 앱·서비스 API 제거 완료(PR #375); 공용 코드 등록·운영 자원은 후속 폐기 대상 | **완전 폐기 결정(2026-10-11)** — [PHARMACY-HUB-SERVICE-MODEL-BASELINE](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md). 기존 도메인·DNS·인증서는 인쇄 QR 연결용으로 유지하며 운영 전환·자원/데이터 삭제 완료는 [실행 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md)를 따른다. |
| `lecture` | `services/web-lecture` | O4O 강의 — neture 에서 분리된 독립 서비스. 정본 없음 — [WO](../work-orders/WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1.md) · [CHECK](../checks/CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1.md) |
| `cafe24-b2b` | 별도 웹 앱 없음 | Cafe24 회원 로그인 기반 매장 판매지원 파일럿. 정본 없음 — catalog 주석 |

"정본 없음" 은 결과가 아직 WO · CHECK 에만 있다는 뜻이다. 정본 흡수 단계에서 서비스별 문서로 옮긴다.

## 2. 공통 · 보조 웹 앱 (catalog 미등재)

| 앱 | 역할 | 참고 |
|---|---|---|
| `services/web-store` | 통합 내 매장 — 매장 하나가 여러 서비스를 쓰는 공통 업무공간 (`/store` · `/work/:serviceKey` · `/hub`) | [STORE-LAYER-ARCHITECTURE](../architecture/STORE-LAYER-ARCHITECTURE.md) · [STORE-MENU-CANONICAL-TREE](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) |
| `services/web-account` | 각 서비스에서 진입하는 계정센터 | — |
| `services/web-hospital-pharmacy` | 병원약국 — 원내 약품 파일 기반 조회 | [WO](../work-orders/WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1.md) · [CHECK](../checks/CHECK-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1.md) |
| ~~`services/signage-player-web`~~ | 디지털 사이니지 재생기 — **은퇴 완료(2026-10-05)**: 배포 · Cloud Run · 이미지 · CORS origin · 앱 소스 모두 제거. 정본 재생은 Tablet ScreenSet | [SIGNAGE-CANONICAL-PLAYBACK-PATH](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md) · [CHECK(배포)](../checks/CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1.md) · [CHECK(잔재)](../checks/CHECK-O4O-RETIRED-WEB-RESIDUAL-CLEANUP-V1.md) |
| `apps/admin-dashboard` | 플랫폼 관리자 화면 | [OPERATOR-DASHBOARD-STANDARD](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) |
| `apps/api-server` | 전 서비스 공통 API (`o4o-core-api`) | [BOUNDARY-POLICY](../architecture/O4O-BOUNDARY-POLICY-V1.md) |

배포 대상의 정본은 `.github/workflows/deploy-*.yml` 이다.

## 3. 이 폴더의 다른 문서

| 경로 | 상태 |
|---|---|
| `_core/apps/*/app-definition.md` | 2025-12 작성된 Core APP 정의. **현행과 다를 수 있다.** 8개 중 `dropshipping-core` · `ecommerce-core` · `pharmaceutical-core` 는 대응 패키지가 없다. 공통 구조의 현행 기준은 [CANONICAL-INDEX §6](../CANONICAL-INDEX.md) |
| `cosmetics/service-definition.md` · `cosmetics/openapi.yaml` | K-Cosmetics 서비스 정의 · OpenAPI 계약 (`scripts/generators/openapi-types-generator.ts` 가 읽는다) |

## 4. 새 서비스를 추가할 때

1. `service-catalog.ts` 에 등재한다 (도메인 · 가입 허용 · 업무공간 capability).
2. 서비스의 기준 문서를 만들고 [CANONICAL-INDEX](../CANONICAL-INDEX.md) 에 등재한다 (별도 WO).
3. 이 색인의 §1 표에 한 행을 추가한다.
