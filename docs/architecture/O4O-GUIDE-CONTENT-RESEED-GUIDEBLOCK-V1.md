# O4O Guide Content Reseed — guideblock-page-help

> **WO-O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1**
>
> `WO-O4O-GUIDE-SECTIONKEY-MIGRATION-V1` 이후 `page-help` JSON row를
> `guideblock-page-help` namespace로 재등록하는 운영 데이터 재정렬 작업.

---

## 1. 조사 결과: DB 클린 상태

### 조사 방법

```bash
# 전체 서비스 × 전체 pageKey API 조회
curl "https://o4o-core-api-.../api/v1/guide/contents?serviceKey={service}&pageKey={page}"
```

### 결과

```
모든 serviceKey × pageKey 조합: {"success":true,"data":{"sections":{}}}
```

**`guide_contents` 테이블에 데이터 없음.**

4개 서비스 × 전체 pageKey(23개) 모두 빈 응답.

### 확인 환경

- 테이블: `guide_contents` (migration `2026042900001-CreateGuideContents.ts`)
- API: `https://o4o-core-api-117791934476.asia-northeast3.run.app/api/v1/guide/contents`
- 확인 서비스: `kpa-society`, `glycopharm`, `k-cosmetics`, `neture`

---

## 2. 재등록 대상: 0건

### 재등록 기준

```
page-help sectionKey row 중 content가 JSON 형태인 것
```

### 실제 대상

```
0건 — page-help row 자체가 없음
```

---

## 3. 현재 상태 정리

| 항목 | 상태 |
|------|------|
| `page-help` JSON row | 없음 |
| `page-help` plain text row (GuideEditableSection) | 없음 |
| `guideblock-page-help` row | 없음 |
| GuideBlock 화면 상태 | 전원 static fallback 표시 중 |

---

## 4. 클린 상태의 의미

`guide_contents` 테이블은 존재하지만 어떤 운영자도 아직 가이드 내용을 저장하지 않은 상태다.

이는 다음을 의미한다:

- `WO-O4O-GUIDE-SECTIONKEY-MIGRATION-V1`의 "전환 직후 기존 override는 fallback으로 돌아간다" 우려가 실제로는 발생하지 않음
- fallback은 migration 전부터 이미 작동 중이었음
- "DB override 정상" 으로 분류된 서비스들도 실제 override 데이터 없이 코드 기반으로만 분류된 것

---

## 5. 재등록 작업 결과

| 항목 | 수행 결과 |
|------|----------|
| 재등록 행 수 | 0 |
| skip된 plain text row | 0 |
| DB 변경 | 없음 |
| 코드 변경 | 없음 |

**WO 목표(page-help JSON → guideblock-page-help 재등록)는 소스 데이터 부재로 수행 불필요.**

---

## 6. 향후 운영자 가이드 등록 절차

운영자가 GuideBlock 내용을 설정하려면:

```
/operator/guide-contents
  → pageKey 선택
  → 제목/설명/단계 입력
  → 저장
  → DB에 (serviceKey, pageKey, sectionKey='guideblock-page-help') row 생성
  → 실화면 GuideBlock에 override 내용 표시
```

`guideblock-page-help` sectionKey로 저장되므로 `GuideEditableSection`의 `page-help`와 충돌 없음.

---

## 7. 서비스별 GuideBlock 페이지 현황

### KPA-Society (7개 pageKey)

| pageKey | 현재 상태 |
|---------|----------|
| `lms.course.editor` | fallback |
| `lms.lesson.editor` | fallback |
| `content.document.editor` | fallback |
| `content.resource.editor` | fallback |
| `forum.request.management` | fallback |
| `store.channel.editor` | fallback |
| `signage.playlist.manager` | fallback |

### GlycoPharm (4개 pageKey)

| pageKey | 현재 상태 |
|---------|----------|
| `store.channel.editor` | fallback |
| `forum.request.management` | fallback |
| `store.product.management` | fallback |
| `signage.playlist.manager` | fallback |

### K-Cosmetics (4개 pageKey)

| pageKey | 현재 상태 |
|---------|----------|
| `store.channel.editor` | fallback |
| `store.product.management` | fallback |
| `event.offer.management` | fallback |
| `forum.request.management` | fallback |

### Neture (5개 pageKey)

| pageKey | 현재 상태 |
|---------|----------|
| `supplier.product.editor` | fallback |
| `supplier.event-offer.editor` | fallback |
| `operator.brand.management` | fallback (GuideBlock: `guideblock-page-help` 대기, GuideEditableSection: `page-help` 독립) |
| `operator.event-offer.management` | fallback |
| `forum.request.management` | fallback |

---

## 8. 금지 사항 (이행 확인)

| 금지 항목 | 이행 |
|----------|------|
| 기존 page-help row 삭제 | ✅ 삭제하지 않음 (row 자체 없음) |
| GuideEditableSection row 수정 | ✅ 수정하지 않음 (row 자체 없음) |
| guide_contents schema 변경 | ✅ 변경 없음 |
| GuideBlock 코드 변경 | ✅ 변경 없음 |
| sectionKey 정책 변경 | ✅ 변경 없음 |

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| sectionKey Migration | `docs/architecture/O4O-GUIDE-SECTIONKEY-MIGRATION-V1.md` |
| sectionKey 충돌 정책 | `docs/architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md` |
| Guide Schema Validation | `docs/architecture/O4O-GUIDE-SCHEMA-VALIDATION-V1.md` |

---

*작성일: 2026-05-06*
*WO: WO-O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1*
*상태: PASS — 소스 데이터 없음, 재등록 불필요*
