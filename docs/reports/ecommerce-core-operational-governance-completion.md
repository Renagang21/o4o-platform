# E-commerce Core 운영 규칙 고정 Phase 완료 보고서

**Date**: 2025-12-13
**Branch**: `feature/ecommerce-core-operational-governance`
**Status**: Completed

---

## 1. 개요

E-commerce Core 운영 규칙을 공식 문서화하여,
개발 인력/에이전트 변경과 무관하게 플랫폼 원칙이 유지되도록 고정했습니다.

---

## 2. 작업 목표

| # | 목표 | 결과 |
|---|------|------|
| 1 | 신규 서비스 주문 생성 체크리스트 작성 | ✅ 완료 |
| 2 | 미적용 예외 승인 규칙 문서화 | ✅ 완료 |
| 3 | 개발 에이전트용 고정 지침 정리 | ✅ 완료 |
| 4 | CLAUDE.md 반영 | ✅ 완료 |
| 5 | 인덱스 및 연결 문서 업데이트 | ✅ 완료 |

---

## 3. 생성/수정된 문서

### 3.1 신규 생성

| 파일 | 용도 |
|------|------|
| `docs/guides/ecommerce-core/new-service-order-checklist.md` | 신규 서비스 개발 체크리스트 |
| `docs/guides/ecommerce-core/exemption-policy.md` | 미적용 예외 규칙 |
| `docs/guides/ecommerce-core/agent-guidelines.md` | 개발 에이전트 가이드라인 |
| `docs/guides/ecommerce-core/INDEX.md` | 가이드 문서 인덱스 |
| `docs/specs/ecommerce-core/application-status.md` | E-commerce Core 적용 현황 |

### 3.2 수정

| 파일 | 변경 내용 |
|------|----------|
| `CLAUDE.md` | Section 9: E-commerce Core 운영 규칙 추가 |

---

## 4. 핵심 규칙 요약

### 4.1 절대 원칙 (DO)

1. **주문 생성 = E-commerce Core 사용**
   - 모든 주문은 `EcommerceOrderService.create()` 호출 필수
   - ecommerceOrderId를 서비스 Entity에 저장

2. **OrderType 불변성**
   - OrderType은 생성 시점에 결정
   - 이후 변경 절대 금지

3. **통합 조회**
   - 통계/조회는 `EcommerceOrderQueryService` 사용
   - 서비스별 `findByEcommerceOrderId()` 구현 필수

### 4.2 금지 사항 (DON'T)

| 금지 | 사유 |
|------|------|
| E-commerce Core 우회 주문 생성 | 판매 원장 무결성 훼손 |
| OrderType 변경 | 통계/분기 로직 파괴 |
| ecommerceOrderId 없이 서비스 주문만 생성 | 통합 조회 불가 |
| dropshipping 외 OrderType에서 Relay 사용 | 구조 오용 |

### 4.3 예외 허용 조건

E-commerce Core 미적용이 허용되는 경우:

| 유형 | 설명 | 예시 |
|------|------|------|
| A | 순수 컨텐츠/커뮤니티 | forum-yaksa, forum-cosmetics |
| B | 전환/추적 전용 | partnerops, reporting-yaksa |
| C | 인프라/UI 전용 | auth-*, ui, cms-core |
| D | 회원/조직 관리 | membership-yaksa, organization-core |

**미적용 시 필수**: `exemption-policy.md`에 따라 문서화

---

## 5. 문서 구조

```
CLAUDE.md (Section 9)
    │
    ↓
docs/guides/ecommerce-core/
    ├── INDEX.md
    ├── agent-guidelines.md
    ├── new-service-order-checklist.md
    └── exemption-policy.md
    │
docs/specs/ecommerce-core/
    └── application-status.md
```

---

## 6. 선행 Phase 참조

이 문서는 다음 Phase의 결과물입니다:

| Phase | 내용 | 보고서 |
|-------|------|--------|
| Phase 4 | 화장품 서비스 적용 | - |
| Phase 5 | 약사회 서비스 적용 | - |
| Phase 6 | EcommerceOrderQueryService | - |
| Phase X | 전 서비스 Audit | `ecommerce-core-phasex-audit-report.md` |
| Phase Y | annualfee-yaksa 보완 | `ecommerce-core-phasey-followup-completion.md` |

---

## 7. 향후 운영 계획

### 7.1 정기 Audit

- **주기**: 분기별 또는 신규 서비스 개발 시
- **기준**: `application-status.md` 기반

### 7.2 신규 서비스 개발 시

1. `new-service-order-checklist.md` 확인
2. E-commerce Core 적용 여부 판단
3. 미적용 시 `exemption-policy.md`에 따라 문서화

### 7.3 개발 에이전트 (Claude Code)

- `CLAUDE.md` Section 9 자동 참조
- `agent-guidelines.md` 준수

---

## 8. 결론

E-commerce Core 운영 규칙이 공식 문서화되어 고정되었습니다.

**핵심 성과:**

1. **일관성 보장**: 개발자/에이전트 변경과 무관하게 원칙 유지
2. **명확한 기준**: DO/DON'T 명시로 판단 혼란 제거
3. **추적 가능성**: 적용 현황 문서로 상태 추적
4. **유연한 예외**: 합리적 예외 허용 + 필수 문서화

---

*E-commerce Core 운영 규칙 고정 Phase 완료*
*2025-12-13*
