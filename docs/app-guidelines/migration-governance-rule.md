# Migration Governance Rule v1.0

## DB / Migration 변경 관리 기준

> **Work Order ID**: WO-DB-MIGRATION-GOVERNANCE-RULE-V1
> **작성일**: 2026-01-06
> **상태**: Active
> **적용 범위**: API Server / Database / Migration / ORM(Entity)
> **근거**: WO-DB-MIGRATION-COMPLEXITY-INVESTIGATION-V2

---

## 1. 목적 (Purpose)

본 문서는 다음을 목적으로 한다.

> **플랫폼 확장 과정에서 누적된
> DB / Migration 구조가 더 이상 무질서하게 복잡해지지 않도록,
> "허용되는 변경"과 "금지되는 변경"의 기준을 명확히 정의한다.**

이 문서는:

* 실행 작업 ❌
* 코드 변경 ❌
* 정책/규칙만 정의 ⭕

---

## 2. 기본 원칙 (Core Principles)

### 원칙 1 — Migration은 **영구 기록**이다

* Migration은 "임시 스크립트"가 아니다
* 한 번 main에 병합된 Migration은 **삭제/수정하지 않는다**

### 원칙 2 — Migration은 **결정적(deterministic)** 이어야 한다

* 동일 timestamp Migration ❌
* timestamp 없는 Migration ❌
* 실행 순서가 파일명에 의해 **명확히 결정**되어야 한다

### 원칙 3 — DB 구조 변경은 **최소 단위로만** 허용된다

* 하나의 Migration = 하나의 목적
* 여러 서비스 테이블을 동시에 변경하는 Migration ❌

---

## 3. 현재 상태 (Baseline)

| 항목 | 수치 |
|------|------|
| 총 Migration 수 | 130 |
| 총 Entity 수 | 51+ |
| Schema 수 | 3 (`public`, `cosmetics`, `neture`) |
| Timestamp 충돌 | 0 (정리 완료) |

**이 상태를 기준선(Baseline)으로 고정한다.**

---

## 4. Migration 생성 규칙 (필수)

### 4.1 파일명 규칙 (강제)

```
<timestamp>-<Action><Target>.ts
```

| 요소 | 설명 | 예시 |
|------|------|------|
| timestamp | 13자리 Unix timestamp (밀리초) | `1830000000001` |
| Action | Create, Add, Drop, Update, Seed | `Create` |
| Target | 테이블/기능 명 (PascalCase) | `PaymentTables` |

**예시**:
```
1734508123456-AddPhoneToUsers.ts
1734509123456-CreateCosmeticsOrderTables.ts
```

#### 금지 사례

* timestamp 중복 ❌
* 의미 없는 이름 (`updateTables.ts`) ❌
* timestamp 없는 파일 ❌

### 4.2 클래스명 규칙

```typescript
export class {Action}{Target}{timestamp} implements MigrationInterface {
```

**예시**: `CreatePaymentTables1830000000001`

### 4.3 Migration 유형 분리

Migration은 반드시 **아래 중 하나**로 분류 가능해야 한다.

| 유형 | 설명 |
|------|------|
| Schema | 테이블/컬럼/인덱스 변경 |
| Seed | 초기 표시용 데이터 삽입 |
| Hotfix | 운영 장애 대응 |

**Seed와 Schema를 같은 Migration에 섞는 것 금지**.

---

## 5. Seed 데이터 규칙 (고정)

* Seed 데이터는 **표시/데모/초기 UX 용도**
* 모든 Seed 데이터 ID는 `seed0000-` UUID prefix 사용
* Seed 데이터는 **언제든 삭제 가능해야 함**
* Seed Migration 파일명: `seed0000-{timestamp}-{Description}.ts`
* Seed Migration에는 반드시 주석으로 명시:

```typescript
// Seed migration: safe to delete after real data is created
```

---

## 6. 허용/금지 규칙

### 6.1 허용 (Green Zone)

| 작업 | 조건 |
|------|------|
| 새 테이블 생성 | 서비스 prefix 필수 (`cosmetics_`, `neture_`, `yaksa_` 등) |
| 컬럼 추가 (nullable) | 기존 데이터 영향 없음 |
| 인덱스 추가 | 성능 개선 목적 |
| Seed 데이터 삽입 | `seed0000-` prefix 사용 |

### 6.2 주의 (Yellow Zone)

| 작업 | 조건 |
|------|------|
| 컬럼 추가 (NOT NULL) | default 값 필수 |
| 기존 테이블 구조 변경 | Work Order 필수 |
| FK 추가 | 같은 Schema 내에서만 |

### 6.3 금지 (Red Zone)

| 작업 | 이유 |
|------|------|
| Core 테이블 직접 수정 | 전체 서비스 영향 |
| Cross-Schema FK | 서비스 간 결합 |
| Timestamp 중복 | 실행 순서 불확정 |
| 비표준 Migration 파일명 | 관리 불가 |
| 기존 Migration 삭제 | 영구 기록 위반 |
| 기존 Migration 내용 수정 | 영구 기록 위반 |

---

## 7. Schema 분리 정책

### 7.1 이미 분리된 Schema (고정)

| Schema | 서비스 | 상태 |
|--------|--------|------|
| `cosmetics` | Cosmetics | ✅ 분리 완료 |
| `neture` | Neture | ✅ 분리 완료 |

**절대 다시 public으로 되돌리지 않는다.**

### 7.2 public Schema 사용 규칙

* public schema는 **Legacy 서비스만 사용**
  * Yaksa
  * Glycopharm
  * GlucoseView
  * Core (users 등)

* **신규 서비스는 반드시 전용 schema 생성**이 원칙

### 7.3 신규 서비스 Schema 규칙

| 조건 | Schema 정책 |
|------|-------------|
| Active 서비스 전환 시 | 전용 Schema 생성 권장 |
| Development 단계 | public Schema 허용 |
| Core 확장 | public Schema 필수 |

---

## 8. Entity(ORM) 설계 규칙

### 8.1 Entity 소속 명시

모든 Entity는 **서비스 prefix**를 가진다.

```
cosmetics_products
yaksa_posts
glycopharm_orders
neture_members
glucoseview_patients
```

### 8.2 Core Entity 변경 규칙 (엄격)

다음 Entity는 **플랫폼 Core**로 간주한다.

* users
* settings
* auth 관련 테이블

변경 시 반드시:
* 영향 서비스 목록 명시
* 별도 Work Order 발행

---

## 9. 변경 프로세스

### 9.1 일반 Migration (Green Zone)

```
1. 파일명/클래스명 규칙 확인
2. 허용/금지 규칙 확인
3. Migration 작성
4. 로컬 테스트
5. PR 제출
```

### 9.2 구조 변경 (Yellow/Red Zone)

```
1. Work Order 작성 필수
2. 영향 범위 분석
3. 롤백 계획 수립
4. 승인 후 실행
5. 검증 및 문서화
```

---

## 10. 예외 처리 원칙

예외는 허용되지만, **조건이 있다**.

### 10.1 예외 허용 조건

1. 별도 Work Order 발행
2. "왜 규칙을 깨야 하는지" 문서화
3. 영향 범위 명시
4. 롤백 계획 존재

**조용한 예외는 금지**.

### 10.2 예외 기록

모든 예외는 `docs/reports/` 에 기록한다.

---

## 11. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| Timestamp 중복 | 즉시 정리 |
| 비표준 파일명 | rename 또는 삭제 |
| 무단 Core 수정 | 롤백 검토 |
| Cross-Schema FK | FK 제거 |

---

## 12. 운영 기준 (실무용 요약)

* Migration이 애매하면 → **만들지 않는다**
* Schema 분리가 고민되면 → **미룬다**
* Core가 건드려질 것 같으면 → **멈춘다**
* 규칙에 없으면 → **조사부터 한다**

---

## 13. 최종 선언

> **이 문서 이후,
> DB / Migration 영역은
> "자유로운 실험 공간"이 아니라
> "통제된 인프라"로 취급한다.**

---

## 14. 참조 문서

- [DB Migration Complexity Investigation](../reports/db-migration-complexity-investigation-v2.md)
- [CLAUDE.md - Schema & Data 규칙](../../CLAUDE.md#4-schema--data-규칙)

---

*이 문서가 Active인 동안, DB/Migration 구조는 사실상 Freeze 상태이다.*
*구조 변경이 필요한 경우, 별도 Work Order를 통해 예외를 승인받아야 한다.*

---

*Version: 1.0*
*Last Updated: 2026-01-06*
