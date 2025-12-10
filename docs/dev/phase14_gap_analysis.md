# Phase 14 – GAP Analysis (Design ↔ Implementation)

> 설계(Architecture/Specs)와 실제 구현 사이의 GAP을 정리하여
> 개발 착수 이전에 반드시 해결해야 할 문제를 문서화한다.

**작성일**: 2025-12-10
**작성자**: Claude Code Agent
**기반 데이터**: Phase 13 Design Validity Audit Report
**최종 업데이트**: 2025-12-10 (Phase 17 완료)

---

> **Phase 17 완료에 따라 주요 GAP 3개가 해소되었으며, Phase 18 개발 착수 가능 상태임.**

---

## Resolved in Phase 17

| GAP ID | 제목 | 해결 내용 | 해결일 |
|--------|------|-----------|--------|
| HP-001 | ViewSystem 미구현 | ViewRegistry, NavigationRegistry, DynamicRouter 구현 완료 | 2025-12-10 |
| HP-002 | PartnerOps 서비스 파일 누락 | 6개 서비스 완전 구현 (DataSource 주입 패턴) | 2025-12-10 |
| HP-003 | SellerOps Entity 필드 불일치 | 필드명 동기화, ListingStatus enum 전환 완료 | 2025-12-10 |

---

## 1. 목적 (Purpose)

이 문서는 O4O Platform의 설계 문서(아키텍처, 스펙)와 실제 구현 코드 사이의 GAP을 분석하고,
개발팀 및 AI 에이전트에게 **"무엇부터 해결해야 하는가"**를 알려주는 **기준 문서**입니다.

Phase 15(개발 시작) 전에 반드시 참조해야 하며, 각 GAP 항목은 개발 채팅방으로 Work Order 형태로 전달됩니다.

---

## 2. 요약 (Summary)

| 구분 | 결과 |
|------|------|
| **설계 타당성** | VALID (B+, 87.2점) |
| **Modern CMS 점수** | 85.6점 (B+) |
| **Node.js 호환성** | 91.3점 (A-) |
| **아키텍처 일관성** | 88.5점 (B+) |
| **스펙 정합성** | 83.5점 (B) |
| **High Priority GAP** | 3개 |
| **Medium Priority GAP** | 3개 |
| **Low Priority GAP** | 3개 |

### 결론
> 설계는 **타당**하나, 일부 구현 누락 및 필드 불일치로 인해
> **즉시 조치가 필요한 GAP 3개**가 존재합니다.

---

## 3. High Priority GAP (Phase 17에서 모두 해결됨)

> **Note**: 아래 3개 GAP은 Phase 17에서 모두 해결되었습니다.

### 3.1 HP-001: View System 미구현 ✅ RESOLVED

| 항목 | 내용 |
|------|------|
| **ID** | HP-001 |
| **카테고리** | Implementation Gap |
| **상태** | ✅ **RESOLVED** (2025-12-10) |

**해결 내용:**
- `view-registry.ts` 완전 구현 (registerView, getView, listViews, getViewsByCPT, getViewsByApp)
- `navigation-registry.ts` 완전 구현 (registerNav, getNavTree, getNavTreeFiltered)
- `dynamic-router.ts` 완전 구현 (registerFromManifest, matchRoute, resolveView)
- Manifest ↔ ViewSystem 연결 완료
- activate/deactivate 시 자동 등록/해제 구현

---

### 3.2 HP-002: PartnerOps 서비스 파일 누락 ✅ RESOLVED

| 항목 | 내용 |
|------|------|
| **ID** | HP-002 |
| **카테고리** | Build Error |
| **상태** | ✅ **RESOLVED** (2025-12-10) |

**해결 내용:**
- DashboardService.ts 구현 완료 (DataSource 주입 패턴)
- ProfileService.ts 구현 완료 (파트너 프로필 CRUD)
- RoutineService.ts 구현 완료 (루틴 CRUD)
- LinkService.ts 구현 완료 (제휴 링크 관리, 클릭 기록)
- ConversionService.ts 구현 완료 (전환 추적, 퍼널 분석)
- SettlementService.ts 구현 완료 (정산 요약/배치/트랜잭션)
- Controller-Service 시그니처 정합성 완료
- Event handlers 연결 완료

---

### 3.3 HP-003: SellerOps Entity 필드 불일치 ✅ RESOLVED

| 항목 | 내용 |
|------|------|
| **ID** | HP-003 |
| **카테고리** | Type Mismatch |
| **상태** | ✅ **RESOLVED** (2025-12-10) |

**해결 내용:**
- `supplyPrice` → `supplierPrice` 필드명 동기화
- `stock` → `stockQuantity` 필드명 동기화
- `isActive: boolean` → `status: ListingStatus` enum 변환
- SettlementBatch entity 업데이트 (sellerId, netAmount 추가)
- SettlementBatchStatus enum 추가
- 모든 관련 서비스/컨트롤러/DTO/Frontend 수정 완료

---

## 4. Medium Priority GAP (단기 해결 필요)

### 4.1 MP-001: cms-core CPT 스펙 문서 부족

| 항목 | 내용 |
|------|------|
| **ID** | MP-001 |
| **카테고리** | Documentation |
| **현재 상태** | cms-core의 CPT(page, post, media) 상세 스펙 문서 없음 |
| **영향** | 개발자가 Core CPT 확장 시 참조 문서 부재 |
| **조치 필요** | `docs/specs/cms/` 디렉토리에 스펙 문서 작성 |
| **담당** | 문서 관리 채팅방 |

---

### 4.2 MP-002: ModuleLoader vs AppManager 역할 중복

| 항목 | 내용 |
|------|------|
| **ID** | MP-002 |
| **카테고리** | Architecture |
| **현재 상태** | 두 컴포넌트의 역할 경계가 명확하지 않음 |
| **영향** | 유지보수 시 혼란 |
| **조치 필요** | 역할 분리 문서화 및 리팩토링 검토 |
| **담당** | 아키텍처 문서 채팅방 |

**역할 정의 (권장):**
- **ModuleLoader**: 앱 코드 로딩 (ESM import, manifest 파싱)
- **AppManager**: 앱 상태 관리 (활성화/비활성화, lifecycle 실행)

---

### 4.3 MP-003: Multi-tenancy 미완성

| 항목 | 내용 |
|------|------|
| **ID** | MP-003 |
| **카테고리** | Implementation |
| **현재 상태** | 테넌트별 앱 인스턴스 및 데이터 격리 미구현 |
| **영향** | SaaS 확장 시 제약 |
| **조치 필요** | 테넌트 격리 레이어 설계 및 구현 |
| **담당** | 아키텍처 설계 채팅방 |

---

## 5. Low Priority GAP (장기 개선 필요)

### 5.1 LP-001: GraphQL 미지원

| 항목 | 내용 |
|------|------|
| **ID** | LP-001 |
| **카테고리** | Feature Gap |
| **현재 상태** | REST API만 지원 |
| **영향** | 복잡한 쿼리 시 다중 API 호출 필요 |
| **조치 필요** | 장기적으로 GraphQL 레이어 추가 검토 |

---

### 5.2 LP-002: API 버저닝 전략 부재

| 항목 | 내용 |
|------|------|
| **ID** | LP-002 |
| **카테고리** | Feature Gap |
| **현재 상태** | API 버전 관리 전략 명시 안됨 |
| **영향** | Breaking change 시 기존 클라이언트 영향 |
| **조치 필요** | API Gateway 또는 버전 prefix 전략 수립 |

---

### 5.3 LP-003: lms-core 스펙 상세 부족

| 항목 | 내용 |
|------|------|
| **ID** | LP-003 |
| **카테고리** | Documentation |
| **현재 상태** | LMS 관련 스펙 문서가 부족함 |
| **영향** | LMS 기반 앱 개발 시 참조 문서 부재 |
| **조치 필요** | `docs/specs/lms/` 스펙 보완 |

---

## 6. 설계 강점 (참고)

Phase 13 검증에서 확인된 설계 강점:

1. **WordPress-style 플러그인 아키텍처** 현대적 재해석 성공
2. **Manifest 기반 선언적 앱 정의** 체계 완성 (17/17 앱 준수)
3. **Lifecycle Hooks** (install/activate/deactivate/uninstall) 완성도 높음
4. **CPT/ACF Registry 패턴** 일관성 우수
5. **ESM/TypeScript 호환성** 우수 (91.3점)
6. **의존성 관리 및 순환 참조 감지** 구현

---

## 7. 문서 Work Order로 넘겨야 할 항목

다음 항목은 문서 작업으로 처리됩니다:

| 항목 | 담당 채팅방 | 상태 |
|------|-------------|------|
| cms-core CPT 스펙 문서 작성 | 문서 관리 | 미착수 |
| ModuleLoader/AppManager 역할 정의 문서 보완 | 아키텍처 문서 | 미착수 |
| Multi-tenancy 설계 문서 추가 | 아키텍처 설계 | 미착수 |
| lms-core 스펙 보완 | 문서 관리 | 미착수 |

---

## 8. 개발 채팅방 Work Order 요약

다음 항목은 개발 채팅방으로 Work Order 형태로 전달됩니다:

| GAP ID | 제목 | 대상 채팅방 | 노력 수준 |
|--------|------|-------------|----------|
| HP-001 | View System 실제 구현 | cms-core 개발 | HIGH |
| HP-002 | PartnerOps 서비스 로직 구현 | partnerops 개발 | MEDIUM |
| HP-003 | SellerOps Entity 필드 동기화 | sellerops 개발 | LOW |

---

## 9. 결론

Phase 14 GAP 분석 문서는 개발팀 및 AI 에이전트에게
**"무엇부터 해결해야 하는가"**를 알려주는 **기준 문서**입니다.

### 즉시 조치 (Phase 15 착수 전 필수)
1. **HP-003**: SellerOps Entity 필드 동기화 (LOW effort, 빠른 해결 가능)
2. **HP-002**: PartnerOps 서비스 로직 구현 (스켈레톤 완료, 로직만 추가)
3. **HP-001**: View System 실제 구현 (스켈레톤 완료, 핵심 로직 구현 필요)

### 권장 해결 순서
```
HP-003 (LOW) → HP-002 (MEDIUM) → HP-001 (HIGH)
```

빌드 복구가 급하므로 LOW/MEDIUM 먼저 해결 후, HIGH(View System)는 별도 프로젝트로 진행 권장.

---

## 10. 참조 문서

| 문서 | 경로 |
|------|------|
| Phase 13 Final Report | `docs/_analysis/design_validity_report.json` |
| CMS Validity Check | `docs/_analysis/cms_validity.json` |
| Node.js Runtime Check | `docs/_analysis/node_runtime_validity.json` |
| Architecture Consistency | `docs/_analysis/architecture_consistency.json` |
| Specs Alignment Check | `docs/_analysis/specs_design_alignment.json` |

---

**문서 버전**: 1.0.0
**최종 수정**: 2025-12-10
**다음 Phase**: Phase 15 – 개발 착수
