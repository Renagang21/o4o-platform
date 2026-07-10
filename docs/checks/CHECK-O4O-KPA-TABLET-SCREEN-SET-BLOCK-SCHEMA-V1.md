# CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-SCHEMA-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-SCHEMA-V1`
> 성격: **additive schema only** — 빈 구조 생성. 기능/런타임/UI/데이터 변경 없음.
> 설계 근거: [DESIGN-V1 §5](CHECK-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1.md) (A안 Phase 1)
> 구현 커밋: (본 커밋) · migration: `20270120000000-CreateTabletScreenSetsAndBlocks`

---

## 1. 목적

Screen Set / Block 모델을 저장할 **최소 additive schema** 만 추가한다. 이후 API/UI/runtime WO를 위한 빈 저장 구조.

## 2. 추가 대상 (3)

| # | 대상 | 내용 |
|---|---|---|
| 1 | `store_tablet_screen_sets` (신규 테이블) | 코너/태블릿에 적용할 화면 세트 |
| 2 | `store_tablet_screen_blocks` (신규 테이블) | 세트 내부 구성 단위(block) |
| 3 | `store_tablets.current_screen_set_id` (신규 컬럼, nullable) | 현재 적용 세트(assignment). NULL = legacy 경로 |

### 2.1 store_tablet_screen_sets

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | UUID PK `gen_random_uuid()` | |
| organization_id | UUID NOT NULL | Store Ops 경계(soft ref — 최근 store_tablet_* 관례) |
| service_key | VARCHAR(50) NULL | 운영자 템플릿(Broadcast 경계) |
| tablet_id | UUID NULL | 지정=코너 전용, NULL=매장 재사용 (soft ref) |
| name | VARCHAR(120) NOT NULL | |
| origin | VARCHAR(20) NOT NULL DEFAULT 'store' | CHECK IN ('store','operator') |
| status | VARCHAR(20) NOT NULL DEFAULT 'draft' | CHECK IN ('draft','active','archived','operator_template') |
| created_by_user_id | UUID NULL | soft ref |
| created_at / updated_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ NULL | soft delete |

인덱스: `idx_stss_org_status (organization_id, status) WHERE deleted_at IS NULL`, `idx_stss_tablet (tablet_id) WHERE deleted_at IS NULL`.

### 2.2 store_tablet_screen_blocks

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | UUID PK `gen_random_uuid()` | |
| screen_set_id | UUID NOT NULL | **FK → store_tablet_screen_sets(id) ON DELETE CASCADE** |
| block_type | VARCHAR(30) NOT NULL | CHECK IN (idle_media, product_list, product_content, corner_description, health_info, staff_inquiry, qr_guide) |
| sort_order | INTEGER NOT NULL DEFAULT 0 | |
| is_visible | BOOLEAN NOT NULL DEFAULT TRUE | |
| config | JSONB NOT NULL DEFAULT '{}' | block_type별 스키마(서버 검증은 후속 API WO) |
| created_at / updated_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

인덱스: `idx_stsb_set_order (screen_set_id, sort_order)`.

### 2.3 store_tablets.current_screen_set_id

`ADD COLUMN IF NOT EXISTS current_screen_set_id UUID` + `FK_store_tablets_current_screen_set → store_tablet_screen_sets(id) ON DELETE SET NULL` (세트 삭제 시 태블릿은 legacy 복귀). 조건부 추가(DO 블록)로 재실행 안전.

## 3. 경계 / 설계 준수

- **F6 Boundary**: `organization_id`(Store Ops) / `service_key`(운영자 템플릿, Broadcast). cross-domain FK 없음 — signage_forced_content 등은 참조 시 soft(후속 WO).
- **FK 정책**: 도메인 내부만 하드 FK(blocks→sets CASCADE, tablets.current→sets SET NULL). org/tablet/user 는 최근 store_tablet_* 관례대로 soft ref.
- **DESIGN-V1 §5 초안과 일치**. 테이블명은 WO 지정 `store_tablet_` prefix 채택(기존 `store_tablet_*` 네이밍 일관).

## 4. 제외 범위 준수 (하지 않은 것)

| 금지 | 준수 |
|---|:--:|
| 기존 데이터 이전 | ✅ 0 (dual-read/흡수는 후속 WO) |
| store_tablet_displays 흡수 | ✅ 미접촉 |
| idle_playlist_items 변경 | ✅ 미접촉 |
| operator common video 정책 변경 | ✅ 미접촉 |
| public tablet runtime 변경 | ✅ 미접촉 (current_screen_set_id NULL → 동작 완전 불변) |
| editor UI 구현 | ✅ 없음 |
| screen set 자동 생성 | ✅ 없음 (빈 테이블) |
| 테스트 데이터 생성 | ✅ 없음 |
| 엔티티/서비스/라우트 변경 | ✅ 없음 (raw SQL 접근 테이블 — 최근 store_tablet_* 관례, 엔티티 클래스 없음) |

## 5. 검증

| 항목 | 결과 |
|---|:--:|
| api-server typecheck (변경 파일) | ✅ PASS (migration 파일 error 0; 기존 무관 `src/scripts/drug-otc-*` 에러는 선존재) |
| migration glob 자동 인식 (`migration-config.ts` `migrations/*.ts|*.js`) | ✅ 수동 등록 불필요 |
| additive 안전성 | ✅ CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / 데이터 변경 0 / down() 완비 |
| CI/CD 마이그레이션 적용 | ✅ Deploy API Server success (run 29097947226, `545961fd7`) |
| 프로덕션 검증 (read-only information_schema / pg_constraint, 2026-07-10) | ✅ 아래 |

### 프로덕션 검증 실측 (read-only SELECT, Cloud SQL proxy)

| 확인 | 결과 |
|---|---|
| `store_tablet_screen_sets` / `store_tablet_screen_blocks` 존재 · row count | ✅ 둘 다 존재, **count 0** (빈 구조 · 자동생성 0) |
| `store_tablets.current_screen_set_id` | ✅ uuid · nullable=YES |
| screen_sets 컬럼 11개 (id/org NOT NULL, service_key/tablet_id/created_by/deleted_at NULL, origin/status/name NOT NULL, ts) | ✅ 설계 일치 |
| CHECK 제약 3 (origin / status / block_type) | ✅ 존재 |
| FK 2 (blocks→sets CASCADE, tablets.current→sets SET NULL) | ✅ 존재 |
| PK 2 | ✅ 존재 |
| `typeorm_migrations` 기록 | ✅ `CreateTabletScreenSetsAndBlocks20270120000000` |

## 6. 후속 WO

DESIGN-V1 §10 순서대로: API-CONTRACT → IDLE-BLOCK-INTEGRATION → EDITOR-UX → PUBLIC-RUNTIME-SCREEN-SET-READ → LEGACY-COMPATIBILITY. 본 WO는 그 1단계(빈 구조)만 완료.
