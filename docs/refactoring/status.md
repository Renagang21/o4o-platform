# 리팩토링 현황

> **상태**: ACTIVE — 리팩토링 기간 동안만 유지하는 **임시 문서**
> **작성일**: 2026-10-03 · **최종 갱신**: 2026-10-03
> **근거 WO/IR**: WO-O4O-DOCS-ONBOARDING-ENTRY-V1

O4O 는 전체 리팩토링 중이다. 이 문서는 **"지금 무엇이 정리되었고, 무엇이 진행 중이며, 무엇이 아직 legacy 인가"** 만 요약한다. 규칙 원문은 각 정본에 있고, 이 문서는 정본을 대체하지 않는다. 현행 판단은 [CANONICAL-INDEX](../CANONICAL-INDEX.md) 가 우선한다.

---

## 1. 먼저 알아둘 것

- **코드가 있다고 그 기능이 현행 업무인 것은 아니다.** 예: cart · checkout · payment 코드가 있어도 소비자→매장 commerce 는 현행 사업 기능이 아니다 ([STORE-COMMERCE-BOUNDARY](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)).
- **"현재 하지 않는다"는 "앞으로도 하지 않는다"가 아니다.** 사업 모델 변경은 정본의 변경 절차를 따른다.
- 은퇴한 영역을 되살리거나 확장하는 작업은 명시적 작업요청서(WO) 없이 하지 않는다.

---

## 2. 정리 완료 — 현행 구조로 읽어도 된다

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PH 서비스·가입/역할·공급/결제·공통화/parity·호환 보존 계약은 [완전 폐기 정책](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항을 따른다. PH 표기는 폐기 전 구조·구현 이력이며 새 기능/가입/발급/복구의 근거가 아니다. 다른 서비스와 공통 계약·Neture 약국 기능·인쇄 QR 연결·법정 보유 판단은 유지한다.


| 영역 | 결과 | 정본 · 근거 |
|---|---|---|
| 역할별 업무공간 | Community · Store · Supplier · Service Operator 4 업무공간으로 재편. `ROLE_WORKSPACE_REFACTOR = CLOSED` (2026-09-17) | [ROLE-WORKSPACE-ARCHITECTURE](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · [CHECK](../checks/CHECK-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1.md) |
| Legacy Partner | runtime · 물리 스키마 · dead package 전면 은퇴 (2026-09-15 ~ 16) | 위 정본 §7 · [CHECK runtime](../checks/CHECK-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1.md) · [CHECK physical](../checks/CHECK-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1.md) |
| Identity | Identity Architecture V3 채택 (2026-09-17). V1 · V2 는 SUPERSEDED | [IDENTITY-ARCHITECTURE-V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) · [USER-DOMAIN-SSOT](../baseline/USER-DOMAIN-SSOT-V1.md) |
| 레거시 비밀번호 인증 | 서비스별 password 축(`service_credentials` · `users.password`) 런타임 · 스키마 제거 (2026-09-24) | [CHECK](../checks/CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md) |
| PharmacyHub | supplier 역할 제거 · 공급 설정 Neture 이전 (2026-08-21) | [PHARMACY-HUB-SERVICE-MODEL](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) · [CHECK](../checks/CHECK-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1.md) |
| 관리자 | 관리자 화면 플랫폼 전용 진입 (2026-09-10) | [CHECK](../checks/WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS-AND-POST-REFACTOR-FINAL-CLOSURE-V1-CHECK.md) |
| CMS | 동작한 적 없는 CPT/ACF 사슬 · dead entity 은퇴 (2026-09-13) | [CHECK](../checks/CHECK-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1.md) |
| WordPress block editor | 도메인 은퇴 (2026-09-04) | [CHECK](../checks/WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1-CHECK.md) |
| Multi-Site Builder | `sites` 도메인 은퇴 (2026-08-21) | [CHECK](../checks/WO-O4O-MULTI-SITE-BUILDER-SITES-DOMAIN-CENSUS-AND-RETIREMENT-V1-CHECK.md) |
| 모바일 앱 | `apps/mobile-app` · `services/mobile-app` 및 전용 백엔드 제거 (2026-09-26) | 커밋 `7595e6d27` |

---

## 3. 진행 중

세부 상태는 이 문서에 복제하지 않는다. 각 CHECK 문서 상단의 상태 줄이 최신이다.

| 트랙 | 내용 | 근거 |
|---|---|---|
| 서비스 Identity · 운영자 범위 | 서비스별 Identity 와 운영자 권한 경계 정리 (community · kpa-branch 등) | [WO](../work-orders/WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.md) · [CHECK](../checks/CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.md) |
| 이메일 · 비밀번호 로그인 | Google 과 병행하는 새 인증 수단. 레거시 password 의 부활이 아니다 | [WO](../work-orders/WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md) · [CHECK](../checks/CHECK-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md) |
| Google 전용 인증 잔재 정리 | 인증 경로 정리 | [CHECK](../checks/CHECK-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1.md) |
| O4O 강의(lecture) 독립 | neture 에서 분리된 독립 서비스 (`services/web-lecture`) | [WO](../work-orders/WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1.md) · [CHECK](../checks/CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1.md) |
| 매장 내부 AI 은퇴 | 매장 편집기 내부 AI 제거. 브라우저 smoke 잔여 | [CHECK](../checks/CHECK-O4O-STORE-INTERNAL-AI-RETIREMENT-V1.md) |
| Personal Work Assistant | 자동화 구조 정본 V2 전환 (2026-10-03). 개발 순서는 정본 §18 | [PERSONAL-ASSISTANT-ARCHITECTURE-V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) |
| 문서 정비 | 진입 문서 → 유입 규칙 → 보안 분리 → 데이터 분리 → 정본 흡수 | [docs/README §4](../README.md) · [census IR](../investigations/IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1.md) |

---

## 4. 판정 대기 — 근거로 쓰지 않는다

[CANONICAL-INDEX §9](../CANONICAL-INDEX.md) 가 정본이다. 요지만 옮긴다.

| 문서 | 상황 |
|---|---|
| [O4O-3-ROLE-FLOW-BASELINE-V1](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) | §2 · §6 · §3 일부 SUPERSEDED. §4 · §5 는 참고만 |

2026-10-07 판정 확정으로 §9 에서 빠진 문서(근거로 쓰지 않는다): [O4O-RETAIL-STABLE-V1](../platform/architecture/O4O-RETAIL-STABLE-V1.md) SUPERSEDED · [E-COMMERCE-ORDER-CONTRACT](../baseline/E-COMMERCE-ORDER-CONTRACT.md) SUPERSEDED(주문 생성 규칙은 [CHECKOUT-STABLE-V2](../baseline/CHECKOUT-STABLE-DECLARATION-V2.md) §2). [COSMETICS-DOMAIN-RULES](../architecture/COSMETICS-DOMAIN-RULES.md) 도 SUPERSEDED — K-Cosmetics 잔여 규칙은 [K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1](../architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md).

---

## 5. 알려진 legacy · 주의 지점

| 위치 | 주의 |
|---|---|
| `kpa_store_contents` 테이블 | legacy 물리명. KPA · Cosmetics 공용이며 성급한 rename 대상이 아니다 ([STORE-PRODUCTION-MATERIAL](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md)) |
| `apps/api-server/src/scripts/**` | 과거 데이터 구축 스크립트가 대량. 상태는 [SCRIPTS-INVENTORY](../baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md) |
| commerce 코드 (cart · checkout · payments) | 현행 내부 주문 경로는 공급자→매장 B2B 뿐 ([B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)) |
| `docs/services/_core/apps/*` | 2025-12 작성된 Core APP 정의. 8개 중 3개(dropshipping · ecommerce · pharmaceutical)는 대응 패키지가 없다 — [services 색인](../services/README.md) 참조 |
| `docs/` 의 작업 기록 | 과거 시점의 기록. 현재 정책을 이기지 않는다 |

---

## 6. 이 문서의 갱신 규칙

- 리팩토링 WO 가 끝나면 해당 행을 §3 → §2 로 옮기고 정본 링크를 단다.
- §2 항목은 정본 문서에 충분히 반영되면 이 문서에서 지워도 된다 (git history 에 남는다).
- 리팩토링이 끝나면 이 문서와 `refactoring/` 폴더는 은퇴한다.
