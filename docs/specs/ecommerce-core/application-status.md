# E-commerce Core 적용 현황

**Version**: 1.0
**Status**: Operational (운영 규칙 고정 완료)
**Last Updated**: 2025-12-13

---

## 1. 개요

이 문서는 플랫폼 전체 서비스의 E-commerce Core 적용 현황을 추적합니다.

---

## 2. 적용 완료 서비스

### 2.1 Dropshipping Core 연계 서비스

| 패키지 | OrderType | 적용 Phase | 상태 |
|--------|-----------|------------|------|
| dropshipping-core | dropshipping | Phase 4 | ✅ 완료 |
| dropshipping-cosmetics | dropshipping | Phase 4 | ✅ 완료 |
| sellerops | dropshipping | Phase 4 | ✅ 완료 |
| supplierops | dropshipping | Phase 4 | ✅ 완료 |

**연결 구조:**
```
EcommerceOrder ← OrderRelay ← OrderRelayItem
```

### 2.2 약사회 서비스

| 패키지 | OrderType | 적용 Phase | 상태 |
|--------|-----------|------------|------|
| pharmaceutical-core | b2b | Phase 5 | ✅ 완료 |
| annualfee-yaksa | subscription/retail | Phase 5/Y | ✅ 완료 |

**연결 구조:**
```
EcommerceOrder ← PharmaOrder
EcommerceOrder ← FeePayment
```

---

## 3. 적용 제외 서비스

### 3.1 커뮤니티/컨텐츠 서비스 (유형 A)

| 패키지 | 사유 | 문서화 |
|--------|------|--------|
| forum-yaksa | 커뮤니티 (결제 없음) | ✅ |
| forum-cosmetics | 커뮤니티 (결제 없음) | ✅ |
| lms-yaksa | 교육/학점 (결제 없음) | ✅ |

### 3.2 전환/추적 서비스 (유형 B)

| 패키지 | 사유 | 문서화 |
|--------|------|--------|
| partnerops | 전환 추적 (주문 생성 없음) | ✅ |
| reporting-yaksa | 보고서 생성 (참조만) | ✅ |

### 3.3 인프라/UI 패키지 (유형 C)

| 패키지 | 사유 |
|--------|------|
| auth-client, auth-context | 인증 인프라 |
| ui, types, utils | 공통 UI/유틸 |
| cms-core, block-core, block-renderer | CMS 인프라 |
| appearance-system | 테마/스타일 |
| shortcodes | 숏코드 시스템 |
| slide-app | 슬라이드 시스템 |
| cpt-registry | CPT 레지스트리 |

### 3.4 회원/조직 관리 (유형 D)

| 패키지 | 사유 | 문서화 |
|--------|------|--------|
| membership-yaksa | 회원 정보 관리 (결제 없음) | ✅ |
| organization-core | 조직 구조 관리 | ✅ |
| organization-forum | 조직 포럼 | ✅ |

---

## 4. 미개발 서비스 (향후 적용 예정)

| 패키지 | 예상 OrderType | 비고 |
|--------|---------------|------|
| tourism-core | 미정 | 개발 시 E-commerce Core 적용 필수 |

---

## 5. Audit 이력

| Phase | 날짜 | 내용 | 결과 |
|-------|------|------|------|
| Phase 4 | 2025-12-12 | 화장품 서비스 적용 | 완료 |
| Phase 5 | 2025-12-12 | 약사회 서비스 적용 | 완료 |
| Phase 6 | 2025-12-12 | EcommerceOrderQueryService 생성 | 완료 |
| Phase X | 2025-12-13 | 전 서비스 구조 Audit | 완료 (1건 발견) |
| Phase Y | 2025-12-13 | annualfee-yaksa 보완 | 완료 |
| Governance | 2025-12-13 | 운영 규칙 고정 | 완료 |

---

## 6. 운영 규칙 문서

| 문서 | 위치 |
|------|------|
| 개발 에이전트 가이드라인 | `docs/guides/ecommerce-core/agent-guidelines.md` |
| 신규 서비스 체크리스트 | `docs/guides/ecommerce-core/new-service-order-checklist.md` |
| 미적용 예외 규칙 | `docs/guides/ecommerce-core/exemption-policy.md` |
| CLAUDE.md Section 9 | `CLAUDE.md` |

---

## 7. 다음 Audit 예정

- **주기**: 분기별 또는 신규 서비스 개발 시
- **담당**: 개발팀
- **기준**: 이 문서 + `agent-guidelines.md`

---

*이 문서는 E-commerce Core 운영 규칙의 일부입니다.*
*변경 시 별도 RFC 또는 Phase 승인 절차가 필요합니다.*
