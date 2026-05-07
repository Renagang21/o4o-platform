# TypeORM 엔티티 등록 누락 정비 완료 보고

**버전**: V1  
**기준 커밋**: `a3611e8c7`  
**작성일**: 2026-04-22  
**상태**: 완료

---

## 1. 배경

### 발단 사례

KPA-Society 포럼 게시글 좋아요 클릭 시 "좋아요 처리에 실패했습니다." 토스트가 발생.  
원인 조사 결과 `ForumPostLike` 엔티티가 `@o4o/forum-core`에 정상 구현되어 있었으나  
`connection.ts`의 `entities` 배열에 미등록 상태였음.

### 문제 특성

```
컴파일/빌드 → PASS  ← 감지 불가
TypeScript 체크 → PASS  ← 감지 불가
마이그레이션 → 정상 실행  ← 감지 불가
런타임 getRepository() → 500  ← 여기서만 감지됨
```

엔티티 파일, 마이그레이션, 서비스 코드가 모두 존재해도 `connection.ts` 등록 누락 시  
`AppDataSource.getRepository(Entity)` 단계에서 TypeORM이 metadata를 찾지 못해 500 에러 발생.

---

## 2. 문제 유형 정의

| 조건 | 상태 |
|------|------|
| `@Entity()` 선언 파일 | ✅ 존재 |
| 마이그레이션 테이블 | ✅ 존재 |
| 서비스/컨트롤러 구현 | ✅ 완료 |
| `connection.ts` import | ❌ 누락 |
| `connection.ts` entities 배열 | ❌ 누락 |
| **결과** | 런타임 `getRepository()` → 500 |

---

## 3. 정비 범위

| 구분 | 엔티티 | 위험도 | 실사용 |
|------|--------|:------:|:------:|
| **P0** | CourseCompletion | P0 | ✅ CompletionService |
| **P0** | CreditBalance | P0 | ✅ CreditService |
| **P0** | CreditTransaction | P0 | ✅ CreditService, QuizService |
| **P1** | KpaApprovalRequest | P1 | 준비 단계 |
| **P1** | KpaContent | P1 | 준비 단계 |
| **P1** | KpaWorkingContent | P1 | 준비 단계 |
| **P1** | KpaLegalDocument | P1 | 준비 단계 |
| **V2** | KpaSteward | P0 | ✅ steward.controller.ts |
| **V2** | NetureOrder | P0 | ✅ adminDashboardController.ts |
| **V2** | NeturePartner | P0 | ✅ adminDashboardController.ts |

**총 10개 엔티티 정비 완료**

---

## 4. 수행 단계

| 단계 | WO | 커밋 | 내용 |
|------|-----|------|------|
| 발단 수정 | ForumPostLike Fix | `3899ae155` | ForumPostLike 등록 누락 복구 |
| 전수 조사 | IR-TYPEORM-ENTITY-REGISTRATION-GAP-AUDIT-V1 | — | @Entity 파일 vs connection.ts 전수 비교 |
| P0 수정 | WO-TYPEORM-ENTITY-REGISTRATION-FIX-V1 | `d4a05fdd7` | CourseCompletion, CreditBalance, CreditTransaction |
| P0 검증 | WO-TYPEORM-ENTITY-REGISTRATION-P0-VERIFY-V1 | — | 배포 후 API 401 정상 응답 확인 |
| P1 예방 등록 | WO-TYPEORM-ENTITY-REGISTRATION-P1-FIX-V1 | `861076be1` | KpaApprovalRequest 등 4개 |
| 스크립트 도입 | WO-TYPEORM-ENTITY-REGISTRATION-CHECK-SCRIPT-V1 | `095d4df9d` | 정적 검사 + npm script |
| V2 수정 | WO-TYPEORM-ENTITY-REGISTRATION-FIX-V2 | `a3611e8c7` | KpaSteward, NetureOrder, NeturePartner |

---

## 5. 자동 검사 체계

### 스크립트

```bash
node scripts/check-typeorm-entities.mjs
# 또는
pnpm check:typeorm-entities
```

### 검사 방식

| 검사 | 내용 |
|------|------|
| 검사 A | connection.ts import 엔티티 → entities 배열 미등록 감지 |
| 검사 B | `src/modules/` + `src/routes/` @Entity() → entities 미등록 감지 |
| Alias 처리 | `import { View as CMSView }` 패턴 정확히 처리 |
| ALLOWLIST | 의도적 미등록 항목을 이유 주석과 함께 명시 관리 |

### 제외 범위

- `src/entities/` — 레거시 파일 모음 (별도 감사 대상)
- `packages/` — 외부 도메인 패키지 (연결 여부는 아키텍처 결정사항)
- `node_modules/`, `dist/`, `migrations/`

---

## 6. 현재 상태 (기준: `a3611e8c7`)

| 항목 | 수치 |
|------|------|
| entities 배열 등록 | 247개 |
| allowlist (의도적 미등록) | 25개 |
| 스크립트 상태 | ✅ PASS |

### allowlist 주요 분류

| 분류 | 예시 |
|------|------|
| Alias import (CMSView/CMSPage로 등록됨) | View, Page |
| 의도적 제거 | GlycopharmPharmacy |
| Signage extension 준비 단계 | CosmeticsBrandContent 등 11개 |
| KPA/Platform 준비 단계 | KpaCourseRequest, StoreEvent 등 |
| 연관 엔티티 추가 감사 예정 | NetureOrderItem, NetureProduct, NetureProductLog |

---

## 7. 운영 기준

### 신규 엔티티 추가 시 필수 체크리스트

```
1. 엔티티 파일 생성 (@Entity() 선언)
2. 마이그레이션 작성 및 실행
3. connection.ts import 추가
4. connection.ts entities 배열 등록
5. pnpm check:typeorm-entities 실행 → PASS 확인
```

### PR/CI 연결 (권장)

```yaml
# .github/workflows 내 원하는 step에 추가
- name: Check TypeORM Entity Registration
  run: node scripts/check-typeorm-entities.mjs
```

---

## 8. 향후 관리 원칙

1. **allowlist 이유 필수**: 의도적 미등록 항목은 반드시 이유와 근거 WO 주석 포함
2. **작업 단위 통합**: "엔티티 생성 → 등록 → 스크립트 통과"를 하나의 완성 단위로 취급
3. **런타임 500 사전 차단**: 구조적 정적 검사로 빌드 단계에서 차단
4. **allowlist 누적 방지**: 분기마다 allowlist 재검토, 실사용 확인 후 등록 또는 제거 판단
