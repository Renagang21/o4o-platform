# Store Structure Freeze v1.0

> **IR-STORE-STRUCTURE-FREEZE-V1**
> Declared at: 2026-03-03
> Scope: Store Domain Only
> Branch: `feature/store-library-foundation-v1`
> Tag: `v-store-1.0-freeze`

---

## 1. 선언

Store 도메인은 매장 단위 실행 공간이다.
모든 데이터는 store scope 기반으로 격리된다.
Store Library는 매장 내부 전용 저장소이며 외부 공유 기능은 없다.
Store는 Neture 및 Community와 자동 연동하지 않는다.

본 문서는 Store 도메인의 구조 기준선을 선언한다.
버그 수정·성능 개선·문서·테스트는 허용. **구조 변경은 명시적 WO 필수.**

---

## 2. Freeze 범위

### 포함 영역

| 영역 | 설명 |
|------|------|
| organizations (store 역할) | 매장 = organization, store_id = organization_id |
| store_library_items | 매장 내부 전용 자료실 테이블 |
| Store CRUD API | `/api/v1/store/library` 엔드포인트 |
| Store scope boundary | `createRequireStoreOwner` 미들웨어 기반 격리 |
| Store owner/manager 권한 | KPA branch_admin/operator + organization_members owner |

### 제외 영역

- Neture 도메인
- Community (Forum)
- Signage / CMS
- 주문/결제 (Commerce)
- KPI / 통계
- 외부 서비스 연동

---

## 3. 테이블 기준선

### store_library_items

```
id              UUID PK (gen_random_uuid)
store_id        UUID FK → organizations(id) ON DELETE CASCADE
title           VARCHAR(200) NOT NULL
description     TEXT (nullable)
file_url        TEXT NOT NULL
file_name       VARCHAR(255) NOT NULL
file_size       BIGINT NOT NULL
mime_type       VARCHAR(100) NOT NULL
category        VARCHAR(100) (nullable)
created_by      UUID FK → users(id)
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

INDEX: (store_id), (created_at DESC)
```

### organizations (store 역할 — 참조만, 변경 금지)

- store_id = organization_id (동일 개념)
- KPA 매장은 organizations 테이블의 레코드로 표현됨
- 이 테이블의 구조는 Organization Core에서 관리 (본 Freeze 범위 밖)

---

## 4. API 기준선

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/store/library` | 자료 목록 (store scope) |
| POST | `/api/v1/store/library` | 자료 생성 |
| PATCH | `/api/v1/store/library/:id` | 자료 수정 |
| DELETE | `/api/v1/store/library/:id` | 자료 삭제 (hard delete) |

**미들웨어 체인:** `requireAuth` → `requireStoreOwner` (2중 인증)

---

## 5. 보안 기준선 (Security Audit 결과)

| 기준 | 상태 |
|------|------|
| store_id는 body에서 받지 않는다 | **충족** — `req.organizationId`에서만 추출 |
| created_by는 body에서 받지 않는다 | **충족** — `req.user.id`에서만 추출 |
| 모든 쿼리에 store_id 복합 조건 적용 | **충족** — 4/4 메서드 WHERE { id, storeId } |
| 다른 store 접근 시 404 반환 | **충족** — storeId 불일치 시 null → 404 |
| update에서 store_id 변경 불가 | **충족** — UpdateInput에 storeId 필드 없음 |
| update에서 created_by 변경 불가 | **충족** — UpdateInput에 createdBy 필드 없음 |

감사 근거: `WO-O4O-STORE-LIBRARY-SECURITY-AUDIT-V1` (2026-03-03)

---

## 6. 코드 파일 기준선

| 파일 | 용도 |
|------|------|
| `modules/store/entities/StoreLibraryItem.entity.ts` | TypeORM 엔티티 |
| `modules/store/store-library.service.ts` | CRUD 서비스 (4 메서드) |
| `modules/store/store-library.routes.ts` | Express 라우트 (4 엔드포인트) |
| `database/migrations/20260303100000-CreateStoreLibraryItems.ts` | 마이그레이션 |
| `utils/store-owner.utils.ts` | Store owner 미들웨어 (기존, 변경 없음) |

---

## 7. 향후 확장 금지 사항

다음 변경은 **명시적 Work Order 없이 금지:**

1. `store_library_items` 테이블 구조 변경 (컬럼 추가/삭제/타입 변경)
2. store scope boundary 로직 변경 (`createRequireStoreOwner`)
3. `created_by` 처리 방식 변경 (body 입력 허용 등)
4. store role 권한 범위 변경 (접근 가능 역할 추가/삭제)
5. Store → Neture 자동 연결 추가
6. 외부 공개(is_public) 기능 추가
7. 승인 상태(approval status) 도입
8. Snapshot 구조 도입
9. HUB 자동 노출 연동

---

## 8. 허용 사항 (WO 불필요)

- 버그 수정
- 성능 개선 (인덱스 추가 등)
- 로깅/모니터링 강화
- 문서 업데이트
- 테스트 추가

---

## 9. 관련 Freeze 현황

| # | 대상 | Freeze 일자 | Tag |
|---|------|-----------|-----|
| F10 | **Store Structure** | 2026-03-03 | `v-store-1.0-freeze` |

기존 Freeze와의 관계:
- **F3 (Store Layer):** UI Core / Asset Policy Core / Hub Core 의존 방향 Freeze → 본 Freeze와 상호 보완
- **Neture v1.0 Freeze:** 공급자 도메인 Freeze → Store Freeze와 합쳐 O4O 실행 인프라 양축 확정

---

*Declared: 2026-03-03*
*Status: Active Freeze*
