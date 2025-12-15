# Phase 8-A: Regression Issues Log

**Date:** 2025-12-15
**Branch:** feature/cosmetics-service

---

## Issue Tracking

### P1-PARTNER-001

**ID:** P1-PARTNER-001
**Priority:** P1 (핵심 기능 오류)
**영향 영역:** Partner Extension / All Controllers & Services
**현상:** 48개 TypeScript 컴파일 에러로 인해 partner-extension 빌드 불안정

**재현 경로:**
```bash
cd packages/cosmetics-partner-extension
npx tsc --noEmit
```

**예상 결과:** 0 errors
**실제 결과:** 48 errors

**상세 에러 목록:**

| Category | Count | Example |
|----------|-------|---------|
| Controller 메서드 미정의 | 8 | findByUserId, update, getTopEarners |
| Service 메서드 미정의 | 3 | findAll |
| Entity 프로퍼티 미정의 | 15 | title, slug, productId on PartnerLink |
| DTO 프로퍼티 불일치 | 6 | displayName |
| Export 충돌 | 1 | RoutineStep 중복 |
| Repository 타입 불일치 | 2 | policyRepository |
| 기타 타입 에러 | 13 | - |

**근본 원인:**
- Controller와 Service 인터페이스 동기화 누락
- Entity 정의와 사용처 불일치
- Phase 7-Y에서 Routine 통합 시 일부 타입 정리 누락

**조치 계획:**
1. PartnerLink Entity에 누락된 프로퍼티 추가
2. PartnerProfileController에 누락된 메서드 구현
3. PartnerProfileService에 findAll 메서드 추가
4. RoutineStep export 충돌 해결
5. DTO 프로퍼티 정렬

**예상 공수:** 0.5 ~ 1일

---

### P2-CORE-001

**ID:** P2-CORE-001
**Priority:** P2 (UX/표시 오류)
**영향 영역:** Core / dictionary.service.ts
**현상:** 제네릭 타입 제약 조건 에러

**재현 경로:**
```bash
cd packages/dropshipping-cosmetics
npx tsc --noEmit | grep dictionary.service
```

**예상 결과:** 0 errors
**실제 결과:** 3 errors

**에러 내용:**
```
dictionary.service.ts(207,28): error TS2344: Type 'T' does not satisfy the constraint 'ObjectLiteral'.
dictionary.service.ts(216,5): error TS2322: Type 'T[]' is not assignable to type 'T'.
dictionary.service.ts(244,54): error TS2344: Type 'T' does not satisfy the constraint 'ObjectLiteral'.
```

**근본 원인:**
- TypeORM Repository 제네릭 타입 사용 시 ObjectLiteral 제약 미적용

**조치 계획:**
- 제네릭 함수에 `extends ObjectLiteral` 제약 추가

**예상 공수:** 0.5시간

---

### P3-SUPPLIER-001

**ID:** P3-SUPPLIER-001
**Priority:** P3 (경미한 디자인)
**영향 영역:** Supplier Extension / manifest.ts
**현상:** manifest export 방식 및 routes 타입 불일치

**재현 경로:**
```bash
cd packages/cosmetics-supplier-extension
npx tsc --noEmit
```

**예상 결과:** 0 errors
**실제 결과:** 2 errors

**에러 내용:**
```
src/index.ts(13,10): error TS2614: Module '"./manifest"' has no exported member 'manifest'.
src/manifest.ts(70,5): error TS2353: Object literal may only specify known properties, and 'prefix' does not exist in type 'string[]'.
```

**근본 원인:**
- manifest.ts가 다른 패키지와 다른 형식 사용 (AppManifest 타입)
- routes 정의가 string[] 대신 object 형태

**조치 계획:**
1. manifest.ts를 다른 패키지와 동일한 형식으로 통일
2. 또는 index.ts에서 default import 사용

**예상 공수:** 0.5시간

---

### P3-SAMPLE-001

**ID:** P3-SAMPLE-001
**Priority:** P3 (경미한 디자인)
**영향 영역:** Sample Display Extension
**현상:** cosmetics-sample-display-extension 패키지 미생성

**재현 경로:**
```bash
ls packages/cosmetics-sample-display-extension
# 결과: 디렉토리 없음
```

**예상 결과:** 패키지 존재
**실제 결과:** 패키지 없음

**근본 원인:**
- Phase 7 감사 보고서에 언급되었으나 실제 구현되지 않음
- 스펙 문서에서 정의만 있고 구현 미완료

**조치 계획:**
- 옵션 A: 스텁 패키지 생성 (manifest + lifecycle만)
- 옵션 B: Phase 8 스펙에서 제외

**예상 공수:** 옵션 A: 1시간 / 옵션 B: 0

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 | 0 | ✅ |
| P1 | 1 | Fix 필요 |
| P2 | 1 | Defer 가능 |
| P3 | 2 | Quick fix / Defer |

**Total Issues:** 4
**Blocking Issues (P0+P1):** 1

---

*Log updated: 2025-12-15*
