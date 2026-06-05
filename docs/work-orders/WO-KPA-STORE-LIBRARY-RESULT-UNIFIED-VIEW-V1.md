# WO-KPA-STORE-LIBRARY-RESULT-UNIFIED-VIEW-V1

> KPA `내 약국 → 내 자료함 → 매장 제작 자료`에서 **POP · QR-code · 블로그 결과물을 읽기 통합 노출**한다. 기존 저장소는 그대로 두고, 신규 API/DB/migration 없이 기존 list API 를 병합한다. (IR Phase 2-B-1)
> **본 문서는 작업 요청서이며, 코드 착수는 별도 지시 후 진행한다.**

- **작성일**: 2026-06-04
- **상태**: WO 작성 완료 / **코드 착수 대기**
- **Phase**: 2-B-1 (저위험 — 읽기 통합, migration 0)
- **선행 IR**: [`IR-KPA-STORE-ASSET-DERIVED-LINK-AND-UNIFIED-VIEW-SCHEMA-V1`](../investigations/IR-KPA-STORE-ASSET-DERIVED-LINK-AND-UNIFIED-VIEW-SCHEMA-V1.md) (`c31c6ed12`)
- **선행 WO**: `1e50247de`(cross-create CTA) · `9d967d45a`(POP 저장) · `36c47f060`(콘텐츠→POP PDF)

---

## 1. 작업 목적

매장 경영자가 "내가 만든 결과물"(POP·QR·블로그)을 **한 곳(`매장 제작 자료`)에서** 확인·재사용·관리할 수 있게 한다.

선행 IR 결론:
- 저장소는 **물리적으로 합치지 않는다** (POP/QR/블로그/사이니지 boundary·삭제정책 상이).
- 내 자료함은 **읽기 통합**으로만 노출한다 (기존 저장소 유지).
- 원본↔파생 관계 저장은 **별도 WO(Phase 2-B-2, relation table)** 로 분리한다.
- GCS orphan 정리는 **별도 운영성 WO** 로 분리한다.

이번 WO 목적:
1. `매장 제작 자료`에 POP(기존) + QR + 블로그 결과물을 함께 노출한다.
2. 기존 list API 병합으로 구현한다 (신규 API/DB/migration **없음**).
3. 결과물별 **유형 배지** + **행 액션**(열기/출력/수정/삭제)을 제공한다.
4. 원본↔파생 관계 저장·GCS 정리는 **이번 범위 밖**(후속 WO).

---

## 2. 작업 기준

CLAUDE.md 규칙에 따른다. 작업 전:
```bash
git checkout main
git pull --ff-only
git status --short
```
- 다른 세션 미커밋 변경 건드리지 않음. 새 브랜치 금지. main 직접 작업.
- **Home 영역 외부 세션 활성**(IR 별건) — 본 WO는 Home 미접촉, store 영역만.

---

## 3. 대상

- 서비스: KPA-Society
- 주 화면: `/store/library/production-materials` → `StoreProductionMaterialsPage`
- 병합 소스(기존 list API, 읽기 전용):
  - **POP**: `GET /api/v1/kpa/store/assets` (이미 사용 중, sourceType=generated/category=pop)
  - **QR**: `GET /api/v1/kpa/pharmacy/qr` (items + scanCount, soft delete)
  - **블로그**: `GET /api/v1/kpa/stores/{slug}/blog/staff` (posts, hard delete)

---

## 4. 선행 구조 요약 (IR 실측)

| 결과물 | 저장 | boundary | 목록 API | 삭제 | source-link |
|--------|------|----------|----------|------|:-----------:|
| POP | store_execution_assets(file/generated/pop)+GCS | organization_id | `GET /store/assets` | soft(row) | ❌ |
| QR | store_qr_codes | organization_id | `GET /pharmacy/qr` | soft(is_active) | ❌ |
| 블로그 | store_blog_posts | store_id+service_key | `GET /stores/{slug}/blog/staff` | **hard** | ❌ |

- QR/블로그/POP **어느 것도 원본 source-link 컬럼 없음** → 이번 WO는 관계 표시 안 함(후속 2-B-2).

---

## 5. 범위

### 포함
- `매장 제작 자료` 목록에 QR·블로그 결과물 **읽기 병합**.
- 유형 배지(제작자료 / POP / QR / 블로그) + 유형별 행 액션.
- (선택) 유형 필터 탭(전체 / 제작자료 / POP / QR / 블로그).
- 기존 POP "출력" / "활용하기" 유지.

### 제외 (반드시 준수)
```text
- 신규 API / DB / migration / entity / route 추가 금지
- store_asset_derivations 등 관계 테이블 — Phase 2-B-2 (이번 범위 밖)
- 원본↔파생 관계 표시/저장 — 이번 범위 밖
- GCS orphan cleanup — 별도 운영성 WO
- 저장소 통합/미러링 금지 (읽기 병합만)
- 사이니지 결과물 통합 — 후속(snapshot 참조 기반 별도)
- GlycoPharm/K-Cosmetics 변경 / 3서비스 공통화 금지
- kpa_store_contents rename 금지
- HeroBannerSection.tsx / Home 영역 / drawer 미접촉
- 라벨/권한/API 구조 변경 금지 (읽기 호출만 추가)
- git add . / git commit -am 금지
```

---

## 6. 우선 조사 (착수 시)

```bash
rg "StoreProductionMaterialsPage|getStoreExecutionAssets|directContentApi" services/web-kpa-society/src
rg "pharmacy/qr|fetchQrCodes|qrApi|store_qr" services/web-kpa-society/src
rg "blog/staff|fetchStaffBlogPosts|blogStaff|PharmacyBlogPage" services/web-kpa-society/src
rg "slug|useStore|storeSlug|currentStore|StoreContext" services/web-kpa-society/src/pages/pharmacy services/web-kpa-society/src/contexts
```
확인:
1. `StoreProductionMaterialsPage` 의 현재 병합(`directContentApi.list` + `getStoreExecutionAssets`) 구조.
2. **QR 목록 클라이언트**(`/pharmacy/qr`) 존재 여부 / 응답 필드.
3. **블로그 staff 목록 클라이언트** 존재 여부 + **store slug 획득 경로**(블로그 API가 slug 필요).
4. slug 가 화면 컨텍스트에서 어떻게 제공되는지 (없으면 store 조회 1회 필요).
5. 기존 행 액션/배지/필터 UI 패턴.

> **slug 의존성 주의**: 블로그 API 는 `/stores/{slug}/...`. slug 미확보 시 블로그 병합은 조건부(획득 가능 시) 또는 후속 분리. 착수 시 결정·보고.

---

## 7. 구현 방향

```text
1. StoreProductionMaterialsPage fetchAll() 확장:
   기존 2소스(direct + generated) + QR 목록 + 블로그 목록 병렬 페치(Promise.all, 각 .catch→[]).
2. 공통 표시 모델로 정규화:
   { id, kind: 'content'|'pop'|'qr'|'blog', title, updatedAt, status?, href?, fileUrl?, deletable, deleteKind }
3. updatedAt(또는 createdAt) DESC 병합 정렬.
4. 유형 배지 컬럼 + 유형별 행 액션 분기.
5. (선택) 유형 필터 탭.
```

### 7.1 유형별 행 액션
| 유형 | 열기/보기 | 추가 액션 | 삭제 |
|------|-----------|-----------|------|
| 제작자료(content) | (기존) | 활용하기(기존) | 기존(soft) |
| POP(file) | **출력**(fileUrl, 기존) | 활용하기 | 기존(soft) |
| QR | `/store/marketing/qr` 이동(또는 상세) | (scanCount 표시 가능) | soft(`DELETE /pharmacy/qr/{id}`) — **확인 모달** |
| 블로그 | `/store/content/blog` 이동/수정 | 상태 배지(초안/발행/보관) | **hard delete 주의** — 블로그 화면에서 처리 권장(이번 WO는 이동만 우선) |

> 삭제는 보수적으로: QR soft delete 는 본 화면에서 허용 가능, **블로그 hard delete 는 본 화면에서 노출하지 않고 블로그 관리 화면으로 이동**(오삭제 위험 회피). 착수 시 최종 결정.

### 7.2 병합/페이지네이션
- MVP: 각 목록 first page(limit ~50) union + 클라이언트 정렬. 소량 staff 데이터 전제.
- 대량 시 over-fetch 위험 → 서버 통합 endpoint 는 **후속**(이번 WO는 클라이언트 병합).
- 각 소스 일부만 가져오는 경우 "더 보기/각 화면에서 전체 보기" 링크로 안내(silent truncation 금지).

---

## 8. 권한 / boundary

- 모든 호출은 기존 store_owner 인증/guard 재사용.
- **boundary 규칙 소스별 상이**(IR §13): QR=organization_id(토큰), 블로그=store slug+service_key. 각 API 의 기존 격리 그대로 사용 — **단일 필터 가정 금지**.
- 다른 약국 데이터 접근 불가(기존 API 격리에 위임).
- 권한 구조 변경 없음.

---

## 9. UI 문구 (KPA 기준)

사용: 내 약국 · 내 자료함 · 매장 제작 자료 · POP · QR-code · 블로그 · 출력 · 활용하기 · 열기 · 삭제
피함: asset · entity · snapshot · source_type · generated · blob

배지 예: `제작 자료` / `POP` / `QR-code` / `블로그`. 안내(상단, 기존 박스 확장): "POP·QR-code·블로그 등 만든 결과물을 한 곳에서 확인하고 다시 활용하세요."

---

## 10. 검증

### 10.1 정적
```bash
tsc -p services/web-kpa-society/tsconfig.json --noEmit
pnpm --filter web-kpa-society build
```

### 10.2 화면 smoke (production, 약국 경영자 로그인)
```text
/store/library/production-materials:
- POP(기존 저장) · QR · 블로그 결과물이 함께 보이는가
- 유형 배지가 정확한가
- POP 출력(기존) 정상
- QR 행 → QR 화면/상세 이동
- 블로그 행 → 블로그 화면 이동
- (구현 시) QR soft delete 동작 + 목록 반영
- 기존 제작자료(content) 활용하기/삭제 회귀 없음
- 빈 상태/일부 소스 실패(catch→[]) 시 깨지지 않음
- mobile 390px 깨짐 없음
- console critical error 없음
```
> 테스트 매장에 결과물이 없으면, Phase 2-A 처럼 최소 검증 데이터(QR 1·블로그 1)를 앱 API로 생성→확인→정리.

### 10.3 회귀
- QR/블로그 **원본 화면**(`/store/marketing/qr`, `/store/content/blog`) 동작 불변.
- Store Hub 가져오기 / Home / 다른 서비스 영향 없음.

---

## 11. Git
```text
- path-specific staging만 (git add . / commit -am 금지)
- commit 직전: git status --short / git diff --cached --name-only / git diff --name-only
- HeroBannerSection / Home(CommunityHomePage,StandardHomeTemplate) / drawer / 다른 세션 WIP staged 시 즉시 중단·보고
- pnpm-lock.yaml 등 비의도 staged 즉시 unstage
```
권장 커밋: `feat(kpa): unify pop/qr/blog results in store library view`

---

## 12. 완료 기준
```text
- 매장 제작 자료에 POP/QR/블로그 결과물 읽기 통합 노출
- 유형 배지 + 유형별 행 액션(열기/출력/이동/삭제 정책 준수)
- 신규 API/DB/migration 없음 (기존 list 병합)
- 기존 POP 출력·제작자료 활용하기/삭제 회귀 없음
- 블로그 hard delete 오노출 회피
- KPA tsc/build PASS · 화면 smoke PASS · mobile PASS
- 다른 서비스/Home/Hub 영향 없음
- 의도한 파일만 staged/commit · push
- (선택) CHECK 문서
```

---

## 13. 후속
```text
- WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1 (Phase 2-B-2): 원본↔파생 relation table + write 배선 + 역추적
- WO-KPA-GCS-ORPHAN-CLEANUP-V1 (운영성): media_assets↔store_execution_assets reconcile
- 사이니지 결과물 통합(snapshot 참조 기반, 별도)
- (선택) 서버 통합 endpoint 로 페이지네이션 정합
```

---

*Phase 2-B-1 — 읽기 통합만(저장소 미통합·migration 0). 관계 저장/GCS 정리는 후속 분리. 본 문서는 요청서이며 코드 변경을 포함하지 않는다.*
