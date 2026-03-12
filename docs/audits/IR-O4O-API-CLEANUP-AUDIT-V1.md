# IR-O4O-API-CLEANUP-AUDIT-V1

> API Route / Controller / Service 정비 대상 조사 보고서
> 조사일: 2026-03-12

---

## 요약

| 항목 | 발견 수 | 정비 대상 |
|------|---------|----------|
| Unused Controllers | 2 | SAFE DELETE |
| Dead API Routes (LMS Core) | ~150+ | SAFE DELETE |
| Dead API Routes (기타 도메인) | ~40+ | REVIEW NEEDED |
| Orphan Services | 2 | REVIEW NEEDED |
| Deprecated Patterns | 8 영역 | REVIEW NEEDED |
| Test/Debug Endpoints | 11 | KEEP (운영 도구) |

---

## 1. Unused Controllers

코드베이스 전체 131개 controller 중 **2개만 미사용** (99.2% 활용률).

| Controller | 위치 | 상태 | 판정 |
|------------|------|------|------|
| `store-events.controller.ts` | `routes/o4o-store/controllers/` | import 0회 | **SAFE DELETE** |
| `store-qr.controller.ts` | `routes/o4o-store/controllers/` | import 0회 | **SAFE DELETE** |

**참고:** `store-qr-landing.controller.ts`는 별개 파일이며 정상 사용 중.

---

## 2. Unused Route Files

모든 route 파일이 mount되어 있음. **unmounted route file 없음.**

---

## 3. Dead APIs (프론트엔드 미호출)

### 3-1. LMS Module — Core Routes (~150+ endpoints)

**가장 큰 정비 대상.** Core LMS 라우트가 실제로는 Yaksa-LMS extension으로 대체되어
frontend에서 호출하지 않는 상태.

| 영역 | Dead Route 수 | 판정 |
|------|---------------|------|
| Course CRUD | 8 | SAFE DELETE |
| Lesson Management | 6 | SAFE DELETE |
| Enrollment | 7 | SAFE DELETE |
| Progress Tracking | 7 | SAFE DELETE |
| Certificate | 6 | SAFE DELETE |
| Event & Attendance | 14 | SAFE DELETE |
| Quiz Core | 18 | SAFE DELETE |
| Survey Core | 22 | SAFE DELETE |
| Marketing Product Content | 10 | SAFE DELETE |
| Marketing Quiz/Survey Campaigns | 24 | SAFE DELETE |
| Instructor Application | 7 | SAFE DELETE |
| Template CRUD (admin) | 16 | SAFE DELETE |

**Active LMS Routes (유지):**
- `/content/:slug` — Public content
- `/store-contents/*` — Store Content CRUD (6 routes)
- `/store-content-blocks/*` — Block update (1 route)
- `/store-contents/:id/sns|pop|qr` — Usage (3 routes)
- `/content-analytics/*` — Analytics (3 routes)
- `/templates/search|library|tags|categories` — Library read (6 routes)

### 3-2. Partner Module — Tracking Routes (2 endpoints)

| API Path | Method | 판정 |
|----------|--------|------|
| `/track/click/:linkId` | GET | SAFE DELETE |
| `/track/conversion` | POST | SAFE DELETE |

### 3-3. Cosmetics Domain — Admin Routes (~9 endpoints)

| API Path | Method | 판정 |
|----------|--------|------|
| `/cosmetics/admin/products` | POST | REVIEW NEEDED |
| `/cosmetics/admin/products/:id` | PUT | REVIEW NEEDED |
| `/cosmetics/admin/products/:id/status` | PATCH | REVIEW NEEDED |
| `/cosmetics/admin/prices/:productId` | GET | REVIEW NEEDED |
| `/cosmetics/admin/prices/:productId` | PUT | REVIEW NEEDED |
| `/cosmetics/admin/logs/products` | GET | REVIEW NEEDED |
| `/cosmetics/admin/logs/prices` | GET | REVIEW NEEDED |
| `/cosmetics/products/search` | GET | REVIEW NEEDED |
| `/cosmetics/brands/:id` | GET | REVIEW NEEDED |

### 3-4. Dropshipping Admin (~10 endpoints)

| API Path | Method | 판정 |
|----------|--------|------|
| `/dropshipping/admin/catalog-items` | GET/POST | REVIEW NEEDED |
| `/dropshipping/admin/catalog-items/:id` | GET/PUT | REVIEW NEEDED |
| `/dropshipping/admin/catalog-items/:id/status` | PATCH | REVIEW NEEDED |
| `/dropshipping/admin/offers` | GET/POST | REVIEW NEEDED |
| `/dropshipping/admin/offers/:id` | PUT | REVIEW NEEDED |
| `/dropshipping/admin/offers/:id/status` | PATCH | REVIEW NEEDED |
| `/dropshipping/admin/logs` | GET | REVIEW NEEDED |

### 3-5. GlucoseView — Customer/Pharmacist Admin Routes

| 영역 | 예상 Dead Routes | 판정 |
|------|-----------------|------|
| Customer CRUD | ~4 | REVIEW NEEDED |
| Pharmacist admin | ~3 | REVIEW NEEDED |
| Application management | ~3 | REVIEW NEEDED |
| Pharmacy management | 여러 개 | REVIEW NEEDED |

### 3-6. KPA Domain — Mock/Placeholder Routes

| API Path | 증거 | 판정 |
|----------|------|------|
| `/kpa/resources/*` | mock data 반환 | REVIEW NEEDED |
| `/kpa/organization` | static response | REVIEW NEEDED |
| `/kpa/organization/branches` | mock data | REVIEW NEEDED |
| `/kpa/organization/officers` | mock data | REVIEW NEEDED |
| `/kpa/organization/contact` | static response | REVIEW NEEDED |
| `/kpa/groupbuy/*` | 미사용 추정 | REVIEW NEEDED |

### 3-7. Signage — Incomplete Implementations

| API Path | 증거 | 판정 |
|----------|------|------|
| `/signage/:serviceKey/templates/preview` | 미구현 추정 | REVIEW NEEDED |
| `/signage/:serviceKey/schedules/calendar` | 미구현 추정 | REVIEW NEEDED |
| `/signage/:serviceKey/ai/generate` | AI 미구현 | REVIEW NEEDED |
| `/signage/:serviceKey/community/playlists` | 미구현 추정 | REVIEW NEEDED |

---

## 4. Orphan Services

| Service | 위치 | 사용 여부 | 판정 |
|---------|------|----------|------|
| `AcfService` | `modules/cpt-acf/services/acf.service.ts` | 외부 import 0회 | **REVIEW NEEDED** |
| `PresetService` | `modules/cpt-acf/services/preset.service.ts` | 외부 import 0회 | **REVIEW NEEDED** |

**참고 (Orphan 아님):**
- `CptService` — deprecated 표시이나 활발히 사용 중 (wrapper 역할)
- `CatalogImportOfferService` — 1곳 사용 (catalog-import.service.ts)
- `CarePriorityService` — 2곳 사용

---

## 5. Deprecated/Legacy Patterns

| 영역 | 파일 | 패턴 | 판정 |
|------|------|------|------|
| Commission Config | `config/commission.config.ts` | `@deprecated Use CommissionEngine from @o4o/financial-core` | REVIEW NEEDED |
| Supplier Entity | `entities/Supplier.ts` | `@deprecated Consider migrating to package-based` | KEEP (아직 사용 중) |
| CommissionPolicy Entity | `entities/CommissionPolicy.ts` | `@deprecated` | KEEP (아직 사용 중) |
| App Manifest Loader | `app-manifests/index.ts` | `@deprecated Phase R1` | SAFE DELETE |
| Dashboard DTO Fields | `dto/dashboard.dto.ts` | backward-compat deprecated fields 다수 | KEEP (호환성) |
| Permission Entity | `modules/auth/entities/Permission.ts` | `TODO: Run migration to add appId` | REVIEW NEEDED |
| CptService Methods | `services/cpt/cpt.service.ts` | `@deprecated Use unifiedCPTService directly` | REVIEW NEEDED |
| BackupService | `services/BackupService.ts` | Legacy, 활성 사용 미확인 | REVIEW NEEDED |

---

## 6. Test/Debug/Seed Endpoints

운영 도구로 **모두 유지(KEEP)** 판정.

| Path | Auth | 용도 |
|------|------|------|
| `/__debug__/rbac-db-audit` | NONE (read-only) | RBAC 상태 감사 |
| `/__debug__/rbac-backfill-user-role` | Admin Secret | RA 없는 유저 보정 |
| `/__test__/tier1/create` | neture:admin | 테스트 오퍼 생성 |
| `/__test__/tier1/approve/*` | neture:admin | 승인 + 검증 |
| `/__test__/tier1/listings/*` | neture:admin | 리스팅 상태 확인 |
| `/__test__/tier1/supplier-deactivate/*` | neture:admin | 공급자 비활성화 테스트 |
| `/__test__/tier1/hub-kpi/*` | neture:admin | Hub KPI 스냅샷 |
| `/api/v1/ops/seed-store-hub` | Admin Secret | Store HUB 테스트 데이터 |
| `/llm-insight/health` | NONE | AI 시스템 상태 |
| `/health` (store-ai) | NONE | AI 시스템 상태 |
| `/health` (glycopharm) | NONE | Public 상태 체크 |

---

## 7. Cleanup Recommendation 요약

### Phase 1 — SAFE DELETE (즉시 삭제 가능)

| 대상 | 파일 수 | Route 수 |
|------|---------|----------|
| Unused Controllers (2) | 2 | — |
| LMS Core Dead Routes | 관련 controller/service | ~145 |
| Partner Tracking Routes | inline handlers | 2 |
| App Manifest Loader | 1 | — |

**예상 제거량: ~150+ dead routes, ~5 파일**

### Phase 2 — REVIEW NEEDED (검토 후 삭제)

| 대상 | 비고 |
|------|------|
| Cosmetics Admin Routes | admin UI 계획 확인 필요 |
| Dropshipping Admin Routes | admin UI 계획 확인 필요 |
| GlucoseView Admin Routes | glucoseview-web 연동 확인 필요 |
| KPA Mock Routes | 실제 데이터 전환 계획 확인 필요 |
| Signage Incomplete Routes | 개발 진행 여부 확인 필요 |
| Orphan Services (2) | CPT-ACF 모듈 상태 확인 필요 |
| Deprecated Patterns (6) | 마이그레이션 계획 확인 필요 |

### Phase 3 — KEEP (유지)

| 대상 | 사유 |
|------|------|
| Test/Debug Endpoints (11) | 운영 진단 도구 |
| Dashboard DTO deprecated fields | backward compatibility |
| Supplier/CommissionPolicy entities | 아직 활성 사용 |

---

## 기대 효과

Phase 1 완료 시:
- API surface 약 **30% 감소** (150+/~500 total routes)
- LMS module route file 크기 **60% 감소**
- 빌드 시 불필요 코드 제거
- Maintenance 부담 대폭 감소

Phase 2 완료 시:
- 추가 **10~15%** API surface 감소
- Orphan 코드 완전 제거

---

*Generated: 2026-03-12*
*Status: Investigation Complete*
*Next Action: WO-O4O-API-CODE-CLEANUP-V1*
