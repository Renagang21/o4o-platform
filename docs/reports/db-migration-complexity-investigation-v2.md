# DB · Migration · Entity 복잡성 조사 리포트

> **Work Order ID**: WO-DB-MIGRATION-COMPLEXITY-INVESTIGATION-V2
> **작성일**: 2026-01-06
> **상태**: Investigation Complete

---

## 1. 정량 지표 수집

### 1.1 Migration 통계

| 항목 | 수량 |
|------|------|
| **총 Migration 수** | 130 |
| Create (테이블 생성) | 76 |
| Add/Extend (컬럼 추가) | 30 |
| Seed (데이터 삽입) | 13 |
| Drop/Remove | 14 |

### 1.2 서비스별 Migration 분포

| 서비스 | Migration 수 |
|--------|-------------|
| Cosmetics | 8 |
| Yaksa (KPA) | 5 |
| Glycopharm | 7 |
| GlucoseView | 6 |
| Neture | 2 |
| KPA Society | 1 |
| Dropshipping | 11 |
| LMS | 3 |
| **Core/공통** | ~77 |

### 1.3 Entity 통계

| 서비스 | Entity 수 | Schema |
|--------|----------|--------|
| Cosmetics | 6 | `cosmetics` (분리됨) |
| GlucoseView | 9 | `public` |
| Glycopharm | 11 | `public` |
| Neture | 5 | `neture` (분리됨) |
| Yaksa | 3 | `public` |
| KPA | 3 | `public` |
| Core (Checkout) | 3 | `public` |
| LMS | 7+ | `@o4o/lms-core` 패키지 |
| CMS | 4+ | 모듈 내장 |
| **총 Entity** | ~51+ | - |

---

## 2. 위험 신호 체크

### 2.1 ⚠️ Migration Timestamp 충돌

**4개의 동일 timestamp Migration 발견:**

```
1830000000000-AddCommissionPolicyFields.ts
1830000000000-AddPhoneToUsers.ts
1830000000000-CreateCosmeticsSampleDisplayTables.ts
1830000000000-CreatePaymentTables.ts
```

**위험**: 실행 순서가 파일명 알파벳순으로 결정되어 의도치 않은 순서로 실행될 수 있음

### 2.2 ⚠️ 비표준 Migration 파일

```
AddCarrierCodeToShipments.ts  (timestamp 없음)
```

**위험**: TypeORM migration history에서 관리되지 않을 수 있음

### 2.3 Schema 분리 현황 (혼재)

| Schema | 서비스 | 상태 |
|--------|--------|------|
| `cosmetics` | Cosmetics | ✅ 분리됨 |
| `neture` | Neture | ✅ 분리됨 |
| `public` | Yaksa, Glycopharm, GlucoseView, Core | ⚠️ 혼재 |

---

## 3. 위험 신호 체크리스트 (Yes/No)

| 질문 | 답변 |
|------|------|
| Migration 이름만 보고 목적을 이해하기 어려운가? | **No** (대부분 명확) |
| 하나의 Migration이 여러 서비스 테이블을 동시에 변경하는가? | **Yes** (일부 Seed) |
| Seed와 Schema Migration이 섞여 있는가? | **Yes** |
| Entity의 "소속 서비스"가 코드만 보고 불명확한가? | **No** (prefix 명확) |
| 한 Entity 변경이 여러 서비스에 영향을 주는가? | **Partial** (Core만) |
| 테스트 DB / 운영 DB 분리가 어려운가? | **Yes** (Schema 혼재) |

---

## 4. 구조 분류 결과

### 4.1 ✅ 안전 구역 (그대로 유지)

| 영역 | 이유 |
|------|------|
| Cosmetics 서비스 | `cosmetics` schema로 완전 분리 |
| Neture 서비스 | `neture` schema로 완전 분리 |
| Seed 데이터 정책 | `seed0000-` prefix로 식별 가능 |
| 서비스별 Entity Prefix | `cosmetics_`, `neture_`, `yaksa_` 등 명확 |

### 4.2 ⚠️ 주의 구역 (정리 후보)

| 영역 | 문제점 |
|------|--------|
| Timestamp 충돌 Migration | 실행 순서 보장 안됨 |
| Core 테이블 (users, posts) | 모든 서비스에서 참조 |
| Glycopharm/GlucoseView | public schema에 혼재 |
| LMS Core 패키지 | Entity 외부 패키지 의존 |

### 4.3 🔴 위험 구역 (분리 후보)

| 영역 | 위험 |
|------|------|
| public schema 공유 | 서비스 제거 시 영향 범위 불명확 |
| Core Entity 변경 | 전체 서비스에 영향 |
| users 테이블 | 모든 서비스의 FK 대상 |

---

## 5. 서비스 제거 시 영향 범위 예측

### 5.1 낮은 영향 (분리 용이)

- **Cosmetics**: `cosmetics` schema만 삭제하면 됨
- **Neture**: `neture` schema만 삭제하면 됨

### 5.2 중간 영향 (주의 필요)

- **Yaksa**: public schema 내 `yaksa_*` 테이블 삭제
- **GlucoseView**: public schema 내 `glucoseview_*` 테이블 삭제
- **Glycopharm**: public schema 내 `glycopharm_*` 테이블 삭제

### 5.3 높은 영향 (분리 어려움)

- **Core (users, posts, settings)**: 제거 불가
- **Checkout/Payment**: 여러 서비스에서 참조 가능

---

## 6. 결론 및 판단

### 6.1 긍정적 평가

1. **서비스별 Entity Prefix 일관성** - 테이블 소속 명확
2. **Cosmetics/Neture Schema 분리** - 모범 사례 존재
3. **Seed 데이터 식별 가능** - `seed0000-` prefix 정책 확립
4. **Migration 네이밍 대체로 명확** - 목적 파악 가능

### 6.2 개선 필요 사항 (당장 수정 아님)

1. **Timestamp 충돌 해결 필요** - 4개 파일 재정렬 권장
2. **public schema 서비스 분리 고려** - Yaksa, Glycopharm, GlucoseView
3. **비표준 Migration 정리** - `AddCarrierCodeToShipments.ts`

### 6.3 최종 판단

| 영역 | 판단 |
|------|------|
| Cosmetics | ✅ 안전 - 그대로 유지 |
| Neture | ✅ 안전 - 그대로 유지 |
| Seed 정책 | ✅ 안전 - 정책 유지 |
| Core (users, auth) | ⚠️ 주의 - 변경 시 전체 영향 |
| Timestamp 충돌 | ⚠️ 주의 - 정리 권장 |
| public schema 서비스 | 🔴 분리 후보 - 장기 계획 |

---

## 7. 권장 사항 (실행 아님, 참고용)

### 단기 (선택적)

- [x] Timestamp 충돌 Migration 정리 (rename) - **완료 (WO-MIGRATION-TIMESTAMP-CLEANUP-V1)**
- [x] 비표준 Migration 파일 처리 - **완료 (WO-MIGRATION-TIMESTAMP-CLEANUP-V1)**

### 중기 (계획 수립 후)

- [ ] Yaksa/Glycopharm/GlucoseView schema 분리 검토
- [ ] Core Entity 변경 영향 분석 프로세스 수립

### 장기 (별도 Work Order)

- [ ] 서비스별 DB 완전 분리 전략
- [ ] Migration History 정리/리셋 전략

---

*이 리포트는 구조 파악용이며, 수정을 전제하지 않습니다.*

*조사 완료일: 2026-01-06*

---

## 8. 후속 조치 이력

### WO-MIGRATION-TIMESTAMP-CLEANUP-V1 (2026-01-06)

**해결된 문제:**
- Timestamp 충돌 Migration 14개 파일 정리
- 비표준 Migration 파일 1개 삭제 (중복 파일)

**변경된 파일:**

| 기존 | 변경 후 |
|------|---------|
| `1738600000000-CreateLoginAttemptsTable.ts` | `1738600000001-CreateLoginAttemptsTable.ts` |
| `1738600000000-CreatePostTagTable.ts` | `1738600000002-CreatePostTagTable.ts` |
| `1780000000000-CreateMenuSystem.ts` | `1780000000001-CreateMenuSystem.ts` |
| `1780000000000-CreatePartnerTables.ts` | `1780000000002-CreatePartnerTables.ts` |
| `1790000000000-CreateOrderTables.ts` | `1790000000001-CreateOrderTables.ts` |
| `1790000000000-CreateShortcodeExecution.ts` | `1790000000002-CreateShortcodeExecution.ts` |
| `1830000000000-CreatePaymentTables.ts` | `1830000000001-CreatePaymentTables.ts` |
| `1830000000000-AddCommissionPolicyFields.ts` | `1830000000002-AddCommissionPolicyFields.ts` |
| `1830000000000-AddPhoneToUsers.ts` | `1830000000003-AddPhoneToUsers.ts` |
| `1830000000000-CreateCosmeticsSampleDisplayTables.ts` | `1830000000004-CreateCosmeticsSampleDisplayTables.ts` |
| `1840000000000-CreateAppSystemTables.ts` | `1840000000001-CreateAppSystemTables.ts` |
| `1840000000000-CreateSellerProductsTable.ts` | `1840000000002-CreateSellerProductsTable.ts` |
| `9990000000000-CreateGlycopharmApplicationsTable.ts` | `9990000000003-CreateGlycopharmApplicationsTable.ts` |
| `9990000000000-CreateKpaTables.ts` | `9990000000002-CreateKpaTables.ts` |

**삭제된 파일:**
- `AddCarrierCodeToShipments.ts` (중복 - timestamp 버전이 이미 2개 존재)

**결과:**
- Timestamp 충돌: **0건**
- 비표준 Migration: **0건**
- API Server 빌드: **성공**
