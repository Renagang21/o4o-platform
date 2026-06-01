# IR-O4O-CMS-CONTENT-ROUTES-SPLIT-POST-CHECK-V1

> Post-check investigation for WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
> Branch: `feature/cms-content-routes-split`
> Commit: `086f12a2b`
> Date: 2026-03-22
> Status: **Read-only investigation — no code modifications**

---

## 1. 전체 판정

| 항목 | 결과 |
|------|------|
| Split 최종 상태 | **SAFE — push ready** |
| Oversized 정비 1차 완료 | **YES** |
| Push 가능 여부 | **YES** |
| 후속 follow-up 필요 | **NO** (현재 상태로 충분) |

---

## 2. 파일별 상세 표

| 파일 | Lines | 역할 | 판정 | 책임 혼합 | 비고 |
|------|-------|------|------|----------|------|
| `cms-content.routes.ts` | 69 | Facade: CmsContentService 1회 생성, 3 sub-handler compose, health inline | **SAFE** | NO | Business logic 0줄, pure compose |
| `cms-content-utils.ts` | 13 | Shared types + constant: ContentAuthorRole, ContentVisibilityScope, VALID_CONTENT_TYPES | **SAFE** | NO | 최소 단위, god-helper 아님 |
| `cms-content-query.handler.ts` | 256 | Content read: stats, contents list, contents detail — 3 endpoints | **SAFE** | NO | Content 조회 단일 책임, 모든 endpoint optionalAuth |
| `cms-content-mutation.handler.ts` | 313 | Content write: create, update, status transition — 3 endpoints | **SAFE** | NO | Content 수정 단일 책임, auth role detection 자체 포함 |
| `cms-content-slot.handler.ts` | 521 | Slot management: CRUD + bulk assign + lock checking — 6 endpoints | **SAFE** | NO | Slot domain 단일 책임, lock logic 내장으로 자연스러운 크기 |

---

## 3. 조사 항목별 결과

### 3.1 Facade 안전성 점검

**판정: SAFE**

- Facade 69줄 중 business logic: **0줄**
- 역할: `Router` 생성, `CmsContentService` 인스턴스 생성, 3개 sub-handler mount, health inline
- Sub-handler 연결: 3개 모두 `router.use('/', ...)` — 누락 없음
- Health endpoint: 6줄 inline 유지 — facade에 적합한 크기
- Export signature: `createCmsContentRoutes(dataSource: DataSource): Router` — 원본과 동일
- `main.ts` diff: 비어있음 (변경 없음)
- `index.ts` diff: 비어있음 (변경 없음)
- `cms-content.service.ts` diff: 비어있음 (변경 없음)

### 3.2 Handler 책임 분리 점검

**판정: SAFE — 모든 handler가 단일 책임**

| Handler | 책임 범위 | 교차 도메인 | God-handler 위험 |
|---------|----------|------------|-----------------|
| Query | Content 조회 (stats + list + detail) | 없음 | 없음 (256줄) |
| Mutation | Content 생성/수정/상태전이 | 없음 | 없음 (313줄) |
| Slot | Slot CRUD + lock + bulk assign | 없음 | 없음 (521줄) |

- Query/Mutation 경계: Query는 read-only (`optionalAuth`), Mutation은 write (`requireAuth`/`requireAdmin`) — 명확히 구분
- Mutation 내 auth role detection: POST /contents에 ~45줄의 platform admin / service admin 판정 로직이 있으나, 이 endpoint 전용 로직으로 분리 불필요
- Slot 독립성: Content handler와 Slot handler 간 상호 의존 없음. 각각 독립적으로 `dataSource.getRepository()` 호출
- Slot 내부 응집도: 6 endpoints 모두 `CmsContentSlot` entity 대상, lock checking은 PUT/DELETE에만 적용 — 동일 도메인

### 3.3 Utils/Helper 적절성 점검

**판정: SAFE — god-helper 아님**

각 export의 실제 사용처:

| Export | Query | Mutation | Slot | Facade |
|--------|:-----:|:--------:|:----:|:------:|
| `ContentAuthorRole` (type) | — | YES | — | — |
| `ContentVisibilityScope` (type) | — | YES | — | — |
| `VALID_CONTENT_TYPES` (const) | — | YES | — | — |

- 3개 export 모두 Mutation handler에서만 사용
- 현재 단일 소비자이나, utils 위치 적절한 이유:
  - `ContentAuthorRole`/`ContentVisibilityScope`는 CMS 도메인 어휘로 향후 다른 handler에서도 참조 가능
  - `VALID_CONTENT_TYPES`는 원본에서 POST/PUT 2곳에 중복되어 있던 것을 상수로 통합한 개선
- 13줄은 최소 단위이며 orchestration 없음 — god-helper 판정 **불해당**

### 3.4 Route / Endpoint 정합성 점검

**판정: SAFE — 13/13 endpoints 유지**

| # | Method | Path | Handler | Auth |
|---|--------|------|---------|------|
| 1 | GET | `/stats` | Query | optionalAuth |
| 2 | GET | `/contents` | Query | optionalAuth |
| 3 | GET | `/contents/:id` | Query | optionalAuth |
| 4 | GET | `/slots/:slotKey` | Slot | optionalAuth |
| 5 | GET | `/slots` | Slot | requireAdmin |
| 6 | POST | `/slots` | Slot | requireAdmin |
| 7 | PUT | `/slots/:id` | Slot | requireAdmin |
| 8 | DELETE | `/slots/:id` | Slot | requireAdmin |
| 9 | PUT | `/slots/:slotKey/contents` | Slot | requireAdmin |
| 10 | POST | `/contents` | Mutation | requireAuth |
| 11 | PUT | `/contents/:id` | Mutation | requireAdmin |
| 12 | PATCH | `/contents/:id/status` | Mutation | requireAdmin |
| 13 | GET | `/health` | Facade (inline) | none |

Route 순서 검증:
- Facade mount 순서: Query → Slot → Mutation → Health
- `/stats`, `/contents`, `/slots`, `/health` 모두 다른 path prefix — cross-handler shadowing 없음
- `GET /slots/:slotKey` (Slot handler line 39) → `GET /slots` (line 126): 순서 보존 — Express는 `/slots` (exact) vs `/slots/:slotKey` (param) 정확히 구분
- `PUT /slots/:id` vs `PUT /slots/:slotKey/contents`: 1-segment vs 2-segment path — 충돌 없음
- 동일 path의 GET/POST/PUT/PATCH/DELETE는 HTTP method로 구분 — 순서 무관

### 3.5 Dead Code / Orphan 여부 점검

**판정: CLEAN — dead code 없음**

- **Facade**: 모든 import 사용됨 (Router, Request, Response, DataSource, CmsContentService, 3개 handler factory)
- **Utils**: 모든 export가 Mutation handler에서 import됨 (3/3 사용)
- **Query handler**: `CmsContent` → `getRepository` + `findAndCount` + `findOne`에 사용. `ContentType` → line 158 `as ContentType`. `ContentStatus` → line 165 `as ContentStatus`. `optionalAuth` → 3개 endpoint 모두 사용. 미사용 import **없음**
- **Mutation handler**: 10개 import 모두 사용됨. `roleAssignmentService` → lines 59, 73. `logger` → lines 61, 76. `StatusValidationError`/`StatusTransitionError` → lines 290, 297. 미사용 import **없음**
- **Slot handler**: `In` → line 456 (bulk assign). `CmsContent` → lines 224, 328, 450. `CmsContentSlot` → lines 44, 129, 234, 293, 384, 449. `optionalAuth` → line 39. `requireAdmin` → lines 126, 201, 275, 381, 436. 미사용 import **없음**
- 중복 response formatting: 없음 (각 endpoint 독자 응답 shape 유지)
- 중복 validation: 없음 (VALID_CONTENT_TYPES 상수로 통합 완료)
- 원본 unused imports 정리 완료: `IsNull`, `Not`, `LessThanOrEqual`, `MoreThanOrEqual` 제거됨

**Observation**: Slot handler의 `savedSlots` (line 493) 변수는 할당 후 직접 사용되지 않으나 (reload query로 `result`를 별도 조회), 이는 원본 코드의 save-then-reload 패턴과 동일한 동작. dead code가 아닌 의도적 패턴.

### 3.6 Oversized 잔존 여부 점검

| 파일 | Lines | 판정 |
|------|-------|------|
| `cms-content-slot.handler.ts` | 521 | **유지 가능** — 6 endpoints, PUT에 lock checking + content validation 포함. 개별 endpoint 최대 98줄 (PUT /slots/:id) |
| `cms-content-mutation.handler.ts` | 313 | **유지 가능** — 3 endpoints, POST에 auth role detection 45줄 포함 |
| `cms-content-query.handler.ts` | 256 | **유지 가능** — 3 endpoints, stats에 12-count Promise.all 포함 |
| `cms-content-utils.ts` | 13 | **유지 가능** — 최소 단위 |

**Slot handler 521줄 상세 분석:**

| Endpoint | Lines | 비고 |
|----------|-------|------|
| GET /slots/:slotKey | 76 | Time-window filtering + content projection |
| GET /slots | 69 | Admin list + slotKey grouping |
| POST /slots | 65 | Content existence validation + create |
| PUT /slots/:id | 98 | Lock checking + content validation + field update |
| DELETE /slots/:id | 41 | Lock checking + remove |
| PUT /slots/:slotKey/contents | 82 | Bulk validation + delete-then-create |

- 6 endpoints의 순수 body 합산: 431줄
- File header + imports + function signature: 90줄
- 모든 endpoint가 slot domain 내 — 교차 도메인 없음
- Lock checking (PUT/DELETE): slot management의 핵심 정책 — 분리 시 오히려 응집도 저하
- 미세 분해 (slot-query + slot-mutation) 가능하나: slot domain이 충분히 작고, 분리 이점 < 파일 수 증가 비용

**후속 미세 분해: 불필요.** 모든 파일이 단일 책임이며 개별 endpoint 크기 적정.

---

## 4. 잔존 이슈

| 항목 | 결과 |
|------|------|
| Dead code | 없음 |
| 중복 로직 | 없음 (VALID_CONTENT_TYPES 통합 완료) |
| 과분할 | 없음 (utils 13줄이 최소이나, 도메인 어휘 공유 목적으로 유지 적절) |
| 미분리 | 없음 |
| Follow-up | 없음 |

**Observation (정보 제공):**
- GET /slots/:slotKey (public, optionalAuth)과 나머지 5개 slot endpoint (requireAdmin)의 auth 수준이 다르나, 동일 domain이므로 같은 handler에 있는 것이 자연스러움. 원본에서도 같은 파일에 있었음.
- Mutation handler의 POST /contents auth role detection (~45줄)은 이 endpoint 전용 로직이므로 별도 helper 분리보다 inline 유지가 적절. 향후 다른 endpoint에서 동일 로직 필요 시 utils로 이동 검토 가능.

---

## 5. 다음 Oversized 정비 추천

Oversized File Audit Phase 2 기준 P0 잔여:

| 순위 | 파일 | Lines | 특성 | 권장 |
|------|------|-------|------|------|
| 1 | `mail.service.ts` | ~800+ | Service, 다수 template + 발송 로직 혼합 | 단독 WO (service split) |

**추천: `mail.service.ts`를 다음 대상으로.**
- 이유: route 계열 정비 완료 (partner-controller-split → unified-store-public-split → cms-content-split). Service 계열로 전환 자연스러움.
- 패턴 전환: route facade 패턴 대신 service split 패턴 필요 — template/발송 분리, service factory 또는 strategy 패턴 검토
- route 정비 3건이 모두 안정적으로 완료되었으므로 service 계열 첫 시도에 적합한 시점

---

## 6. 결론

WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1은 **안전한 구조 분해로 완료**.

- 1,065줄 → 69줄 facade + 3 handler + shared utils
- 13 endpoints 전량 유지
- Route path, response, 권한 정책 변경 없음
- tsc --noEmit 신규 오류 0건
- Dead code 없음, 과분할/미분리 없음
- unused imports 정리 완료 (IsNull, Not, LessThanOrEqual, MoreThanOrEqual 제거)
- VALID_CONTENT_TYPES 상수 통합으로 중복 검증 코드 개선
- **Push ready. Follow-up 불필요.**
