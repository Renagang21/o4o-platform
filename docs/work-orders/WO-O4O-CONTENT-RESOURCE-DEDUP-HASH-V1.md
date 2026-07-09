# WO-O4O-CONTENT-RESOURCE-DEDUP-HASH-V1

## 1. 작업명

WO-O4O-CONTENT-RESOURCE-DEDUP-HASH-V1

---

## 2. 배경

[`IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1`](../investigations/IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1.md) 조사 결과, 현재 `media_assets` 는 동일 파일을 여러 번 업로드하면 매번 새로운 Resource 가 생성된다. 이는 **의도된 동작**(가져오기=값 복사, Resource 독립성)이며 Metadata · Ownership · Usage Trace 와는 별개다.

그러나 장기적으로 **동일 바이너리 파일을 식별할 수 있는 기준**은 필요하다. 이번 WO 는 **중복을 제거하지 않고**, 중복을 판단할 수 있는 Hash 기반만 구축한다.

## 3. 목적

모든 Media Resource 가 파일 자체를 식별하는 Hash 를 갖게 한다. 이 Hash 는 Dedup · 무결성 검증 · AI 추천 · 캐시 · Storage 최적화의 공통 기반이 된다(이번 WO 는 기반만).

## 4. 적용 대상

- `media_assets`

## 5. 구현 원칙

### 5.1 Hash 는 파일 속성
Hash 는 파일 자체의 속성이다. 서술 Metadata(title/description/tags…)와 별개이며 파일이 바뀌지 않는 한 불변.

### 5.2 Hash 는 자동 계산
업로드 시 자동 생성. 사용자는 입력하지 않는다.

### 5.3 Hash 는 수정하지 않는다
파일 교체가 아닌 이상 변경되지 않는다. metadata PATCH 화이트리스트에 포함하지 않는다(파일 속성 불변 원칙 — Metadata WO 와 동일).

### 5.4 중복 삭제/병합 없음
이번 WO 흐름은:
```
Hash 생성 → 중복 여부 표시 → 끝
```
자동 병합 · 자동 삭제 · 자동 재사용 **모두 제외**.

### 5.5 Hash 는 Resource 분석용이지 Storage 공유가 아니다 (핵심)
- 동일 Hash 라도 **각 Resource 는 독립적으로 그대로 유지**한다.
- O4O 핵심 원칙 **"가져오기 = 값 복사(Resource 독립성)"** 를 유지한다.
- Hash 는 **중복 여부를 알려주는 지표**일 뿐, 자동으로 합치거나 하나의 파일/Resource 를 공유하도록 만들지 않는다.
- → 이후 Dedup 기능이 확장되어도 현재의 Resource 독립성 원칙과 충돌하지 않는다.

## 6. Hash 정책

- 알고리즘: **SHA-256**
- 저장: `content_hash varchar(64)` nullable (hex 64자)

## 7. 생성 시점

```
Upload → 파일 버퍼 읽기 → SHA-256 → DB 저장(content_hash)
```
- 업로드 시 이미 buffer 를 보유(sharp 변환 경로) → 추가 I/O 최소. **원본 바이트 기준** 해시(WebP 변환 전/후 기준은 §13 조사에서 확정하여 CHECK 기록 — 재업로드 동일성 판정과 일관되게).

## 8. 기존 Resource

**Backfill 없음.** 기존 Resource 는 `content_hash = NULL` 유지. 필요 시 후속 Batch WO.

## 9. Admin

Resource 상세에 추가 표시(읽기 전용):
```
SHA-256(content_hash) · Duplicate Count
```
Duplicate Count = 동일 content_hash 를 가진 Resource 개수(자신 포함/제외 기준은 CHECK 명시). 표시만, 액션 없음.

## 10. Duplicate 판정

```sql
SELECT count(*) FROM media_assets WHERE content_hash = ?
```
동일 Hash 2건 이상 → Duplicate(표시만). NULL hash 는 판정 대상 아님.

## 11. API

기존 `GET /platform/media-library` 응답에 필드 추가(additive):
```
contentHash · duplicateCount
```
- duplicateCount 는 목록 성능을 고려해 산출 방식(서브쿼리/후처리)을 §13 에서 판단. 목록 부하가 크면 상세 조회에서만 계산.

## 12. Migration

```
content_hash varchar(64) nullable
INDEX idx_media_assets_hash (content_hash)   -- Unique 아님
```
Backfill 없음. additive. 타임스탬프 = 순차 카운터 규칙 준수.

## 13. 착수 전 조사 (CHECK 기록)

- 업로드 경로에서 해시 대상 바이트(원본 vs sharp WebP 변환 후) 확정 — 재업로드 동일성 판정과 일관되게.
- duplicateCount 산출 위치(목록 vs 상세) 성능 판단.
- 기존 media 업로드 경로가 단일(`MediaLibraryService.upload`)인지 확인 후 그 지점에서만 해시 계산.

## 14. 검증

- 신규 업로드 → content_hash 생성.
- 기존 Resource → NULL 유지.
- 동일 파일 재업로드 → Hash 동일 → Duplicate Count 증가.
- 기존 목록/검색/업로드 회귀 없음.
- typecheck · build · 배포 · 브라우저 smoke · 콘솔 에러 없음.

## 15. 완료 기준

SHA-256 저장 · Duplicate 표시 · Index 생성 · 기존 Resource 정상 · 기존 기능 회귀 없음 · CHECK · commit/push.

## 16. 산출물

CHECK — `CHECK-O4O-CONTENT-RESOURCE-DEDUP-HASH-V1.md`

## 17. 작업 원칙

Additive Migration · Nullable · Backfill 없음 · **Dedup 수행 안 함** · Merge 없음 · Delete 없음 · **Resource 독립성 유지(§5.5)** · 최소 변경.

## 18. 후속 WO

```text
WO-O4O-CONTENT-RESOURCE-DEDUP-HASH-V1  (본 WO)
      ↓
WO-O4O-CONTENT-RESOURCE-VERSIONING-V1
      ↓
WO-O4O-AI-RESOURCE-METADATA-V1
```

---

## 목표

모든 Media Resource 가 파일을 식별하는 SHA-256 Hash 를 갖는다. Hash 는 **중복 여부를 알려주는 분석 지표**이며, Resource 를 자동으로 병합/공유하지 않는다(Resource 독립성 유지). 이 기반 위에서 이후 Dedup 정책 · 무결성 검증 · AI 추천을 확장한다.

---

*Status: 확정 (핸드오프 대기). Dedup 는 "판정 기반"만 — 병합/삭제 없음. 실행은 별도 지시로 착수.*
