# O4O Platform

# **Schema Drift Prevention Guide (v1.0)**

> 코드(Entity)와 데이터베이스(DB) 사이의 불일치를 근본적으로 방지하기 위한 플랫폼 표준 규칙서

---

## 📌 1. 문서 목적

O4O Platform은 AppStore / CMS / Auth / Dropshipping / LMS 등
다수의 "설치형 앱(Installable Apps)"과 확장 모듈을 포함한 복합 구조이다.

이 환경에서는 코드(Entity)와 실제 DB 스키마 간의 불일치(**Schema Drift**)가
치명적인 오류(500 에러, 앱 설치 실패, 업데이트 실패)를 유발할 수 있다.

본 문서는 **Schema Drift를 시스템 차원에서 예방하는 개발 표준 규칙서**이다.
O4O 모노레포에서 엔티티를 다루는 모든 사람(인간/AI 개발자 포함)은 이 규칙을 반드시 준수해야 한다.

---

## 2. 핵심 원칙 (Core Principles)

---

### **원칙 1: Migration-First Rule (100% 필수)**

> "엔티티(Entity) 변경 작업이 있을 때, Migration이 먼저 생성되지 않았다면 작업 자체가 금지된다."

✔ 엔티티 추가
✔ 엔티티 필드 추가/삭제
✔ 필드 타입 변경
✔ 인덱스/관계 변경

➡ **무조건 migration 생성이 선행되어야 한다.**

#### 잘못된 예

- entity.ts 파일을 수정하고 바로 배포
- migration을 작성하지 않고 테스트에서만 통과되는 상태 유지

#### 올바른 예

1. migration 파일 생성
2. 코드(Entity) 수정
3. migration run
4. 배포

---

### **원칙 2: 신규 필드는 기본적으로 select: false**

TypeORM은 엔티티에 정의된 필드를 DB에서 조회하려 한다.
DB에 컬럼이 존재하지 않으면 → 즉시 500 에러.

따라서:

```typescript
@Column({ select: false, nullable: true })
previousVersion?: string;
```

이 규칙은 다음 목적을 가진다:

- 아직 DB migration이 적용되지 않은 상태에서도 서버가 죽지 않음
- backward compatibility 보장
- Remote AppStore(원격 앱) 설치 시 안정성 확보

---

### **원칙 3: SchemaValidator를 통해 AppStore 작업 전 사전 점검**

AppStore는 다음 작업 시 Schema Drift를 일으킬 가능성이 가장 높음:

- install
- update
- rollback

따라서:

✔ install 전에 schema 필수 체크
✔ update 전에 schema mismatch 금지
✔ rollback 전에 target version의 schema 충족 여부 확인

SchemaValidator는 다음을 검증해야 한다:

- 엔티티와 DB 컬럼 불일치
- missing columns
- unexpected columns
- type mismatch

**이 단계 없이 AppStore에서 install/update를 금지해야 한다.**

---

### **원칙 4: Remote App 설치 시 manifest/schema 검증 필수**

Remote AppStore Phase 4 이후 다음이 발생:

- 원격 manifest
- 원격 lifecycle hook
- 원격 CPT/ACF 정의
- 원격 DB 확장 요청

즉, schema drift 위험이 "외부 앱을 통해 유입되는 구조"가 생김.

따라서 Remote App 설치 시:

- manifest 필드 검증
- CPT/ACF schema 검증
- lifecycle hook hash 검증
- schema compatibility 검사
- dependency version 검사

이 과정을 반드시 수행해야 한다.

---

### **원칙 5: Schema Drift 위험이 있는 PR/코드 제안 금지**

아래 작업은 PR 자체가 금지된다:

❌ Migration 없이 엔티티 필드 추가
❌ select:false 없이 새로운 optional 필드 추가
❌ AppStore lifecycle에서 DB 변경하는 작업
❌ Remote App manifest에서 DB 필드 요구하는 기능
❌ update hook에서 DB 구조를 직접 변경하는 기능

모든 DB 구조 변경은 반드시 다음 조건을 충족해야 한다:

✔ migration-first
✔ schema-validator pass
✔ select:false
✔ AppStore-safe

---

## 3. 구체적 개발 규칙 (Detailed Development Rules)

---

### ✔ Rule 1 — 엔티티 수정 시 check-list

```
[ ] migration 생성했는가?
[ ] select: false 적용했는가?
[ ] nullable 여부 검증했는가?
[ ] default 값 필요 여부 확인했는가?
[ ] AppStore 설치/update/rollback에 영향 없는가?
```

---

### ✔ Rule 2 — AppStore Registry 엔티티는 항상 select:false

AppRegistry는 업데이트/롤백/remote install 등
"높은 변화 빈도"를 가지므로 다음이 기본 정책:

```typescript
@Column({ select: false, nullable: true })
previousVersion?: string;
```

---

### ✔ Rule 3 — Drift Detector Script(자동 도구) 도입 권장

정기적으로 다음 수행:

```bash
typeorm schema:log  # DB와 코드 차이 확인
typeorm query "SELECT column_name FROM information_schema.columns..."
```

이 스크립트는 CI/CD에서 자동 실행하는 것이 가장 이상적이다.

---

### ✔ Rule 4 — rollback 구현 시 down migration 반드시 제공

- update migration → "up"
- rollback migration → "down"

역방향 없는 migration은 금지.

---

### ✔ Rule 5 — Remote App은 schema 변경 금지

원격 앱은 절대 DB 스키마를 변경할 수 없다.

만약 DB 변경이 필요하다면:

- local app으로 변경
- platform-level migration 적용
- remote app은 CPT/ACF 확장만 허용

---

## 4. AppStore 통합 규칙 (Install/Update/Rollback)

Install 전:

```typescript
schemaValidator.checkBeforeInstall(manifest)
```

Update 전:

```typescript
schemaValidator.checkBeforeUpdate(manifest)
```

Rollback 전:

```typescript
schemaValidator.checkBeforeRollback(oldVersion)
```

SchemaValidator는 아래 항목을 검증해야 한다:

- manifest 요구 필드 vs 실제 엔티티
- CPT/ACF 충돌
- DB 컬럼 누락
- required migration 미적용

---

## 5. Remote App 구조 기반 규칙

remote manifest 설치 시:

- lifecycle hook hash 검증
- manifest signature(Optional Phase 5)
- blockScripts hash 체크
- dependency version 검사
- securityLevel 평가(low/medium/high/critical)

remote app이 스키마 요구할 경우:

- 설치 즉시 실패
- "Remote apps cannot require DB schema changes" 규칙 적용

---

## 6. 요약 – Schema Drift 예방 10원칙

1. **Migration-first**: 엔티티 변경 전 반드시 migration 생성
2. **새로운 필드는 select:false**: DB에 컬럼이 없어도 서버 안정성 유지
3. **AppStore install/update/rollback 전 schema validation**: 사전 검증 필수
4. **Remote App은 schema 변경 금지**: 외부 앱의 DB 변경 차단
5. **Drift Detector 스크립트 정기 실행**: 자동화된 검증 도구
6. **rollback/down migration 제공**: 양방향 migration 지원
7. **DB 변경은 AppStore-safe 설계만**: 앱 설치/업데이트 시 안전성 보장
8. **entity 변경 시 checklist 의무화**: 체계적인 변경 관리
9. **AppRegistry 컬럼은 select:false 기본**: 고빈도 변경 엔티티 보호
10. **Schema Drift 가능성이 있는 PR 금지**: 사전 예방 원칙

---

## 7. 실제 사례 – AppRegistry previousVersion 문제

### 문제 상황

```typescript
// AppRegistry 엔티티
@Column({ type: 'varchar', length: 50, nullable: true })
previousVersion?: string;
```

- 코드에는 `previousVersion` 필드가 정의됨
- 하지만 DB에는 해당 컬럼이 존재하지 않음
- AppStore API 호출 시 → **500 에러 발생**

### 에러 로그

```
QueryFailedError: column AppRegistry.previousVersion does not exist
```

### 해결 방법

```typescript
// TEMPORARY FIX: select: false to avoid querying non-existent column in DB
@Column({ type: 'varchar', length: 50, nullable: true, select: false })
previousVersion?: string; // for rollback support
```

### 교훈

- **Migration 없이 엔티티 필드를 추가하면 안 된다**
- **새 필드는 기본적으로 `select: false`를 적용**
- **AppStore 같은 핵심 기능은 특히 주의**

---

## 8. 버전 히스토리

- **v1.0** – 최초 작성 (2025-12-08)
  - Migration-First Rule 정립
  - select:false 기본 정책 수립
  - AppStore Schema Validation 규칙 정의
  - Remote App Schema 변경 금지 원칙 확립

---

## 9. 참고 문서

- [TypeORM Migration Guide](https://typeorm.io/migrations)
- [O4O AppStore Architecture](../architecture/)
- [Development Guidelines](./development-guidelines.md)

---

**문서 작성:** O4O Platform Team
**최종 수정:** 2025-12-08
**문서 위치:** `docs/reference/guidelines/SCHEMA_DRIFT_PREVENTION_GUIDE.md`
