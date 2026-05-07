# IR-O4O-SIGNAGE-TAG-CENTERED-UX-FINAL-V1

> **운영 확정 상태 기준 문서** — 설계 변경 문서가 아님
>
> Signage 콘텐츠 구조를 카테고리 기반 → 태그 중심 탐색 구조로 전환하고,
> 등록–저장–탐색까지 일관된 UX를 확정한 시점의 기준 상태를 기록한다.

*Status: Active Baseline*
*Date: 2026-04-23*

---

## 1. 전체 판정

**PASS (운영 가능 상태)**

- 탐색 구조 정리 완료
- 등록 구조 정리 완료
- 백엔드 제약 조건 적용 완료
- 다중 서비스 정렬 완료

---

## 2. 핵심 구조

### 2.1 탐색 구조

```
검색

태그 필터 (multi-select)

콘텐츠 유형 선택
  - 플레이리스트
  - 개별 영상

콘텐츠 리스트
```

### 2.2 제거된 요소

- 카테고리 (완전 제거)
- 소스 탭 (운영자/커뮤니티/공급자)

→ 탐색 기준 단일화

---

## 3. 태그의 역할 (핵심 정의)

태그는 다음 3가지 역할을 동시에 수행한다:

1. **탐색 기준**
2. **콘텐츠 의미 표현**
3. **검색 보조 키**

Signage 구조의 핵심 축으로 확정.

---

## 4. 등록 UX 구조

### 4.1 적용 대상

- 동영상 (media)
- 플레이리스트 (playlist)

### 4.2 입력 구조

```
태그 입력 (필수)

[ #당뇨 ][ #복약지도 ][ #이벤트 ]

추천 태그
#당뇨 #복약지도 #혈압 #면역 #프로모션 ...
```

### 4.3 입력 규칙

- 최소 1개 이상 필수
- 중복 불가
- 자유 입력 허용 (Enter / 쉼표)
- 추천 태그 클릭 지원

### 4.4 초기 추천 태그 목록 (하드코딩)

```ts
const DEFAULT_TAG_SUGGESTIONS = [
  '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
  '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
];
```

---

## 5. 저장 규칙 (Backend)

### 적용 API

- `createMedia` — `apps/api-server/src/routes/signage/services/media.service.ts`
- `createPlaylist` — `apps/api-server/src/routes/signage/services/playlist.service.ts`

### Validation

```
tags.length === 0 → 400 (TAGS_REQUIRED)
```

태그 없는 데이터 저장 차단.

---

## 6. 필터 동작

### 태그 필터

- 다중 선택 가능
- OR 조건

```ts
selectedTags.some(tag => item.tags.includes(tag))
```

### 태그 목록 구성

- API 변경 없음
- client-side에서 추출 (로드된 아이템 기준)

```ts
const availableTags = [...new Set(items.flatMap(item => item.tags ?? []))].sort();
```

---

## 7. UI 정리

| 위치 | 내용 |
|------|------|
| 헤더 | "안내 영상 · 자료 / 영상과 플레이리스트를 검색하고 활용하세요" |
| 태그 필터 | chip 버튼, 선택 시 파란색, 초기화 버튼 포함 |
| 콘텐츠 카드 | `#복약지도 #당뇨 +2` 형태 노출 |
| 빈 상태 | 태그 선택 시 "선택한 태그에 해당하는 콘텐츠가 없습니다" 분기 |

---

## 8. 적용 서비스 및 파일

| 서비스 | 파일 |
|--------|------|
| KPA-Society | `pages/signage/ContentHubPage.tsx` |
| KPA-Society | `pages/operator/signage/HqMediaPage.tsx` |
| KPA-Society | `pages/operator/signage/HqPlaylistsPage.tsx` |
| GlycoPharm | `pages/store-management/signage/ContentHubPage.tsx` |
| GlycoPharm | `pages/operator/signage/HqMediaPage.tsx` |
| GlycoPharm | `pages/operator/signage/HqPlaylistsPage.tsx` |
| K-Cosmetics | `pages/signage/ContentHubPage.tsx` |
| K-Cosmetics | `pages/operator/signage/HqMediaPage.tsx` |
| K-Cosmetics | `pages/operator/signage/HqPlaylistsPage.tsx` |
| Backend | `apps/api-server/src/routes/signage/services/media.service.ts` |
| Backend | `apps/api-server/src/routes/signage/services/playlist.service.ts` |

---

## 9. 운영 전략 (현재 단계)

### 정책 상태

- 태그 관리 정책 ❌ 미적용
- HQ 태그 목록 관리 ❌ 미적용
- 승인/정규화 ❌ 미적용

### 운영 방식

**자연 생성 기반**

- 운영자 / 커뮤니티 입력에 의해 태그 생성
- 실제 사용 패턴 관찰 후 보정

---

## 10. 리스크

| 항목 | 내용 |
|------|------|
| 태그 난립 | 동일 의미 중복 생성 가능 |
| 품질 편차 | 입력자에 따라 수준 차이 |
| 초기 데이터 부족 | 필터 효과 약할 수 있음 |

→ 현재 단계에서는 허용 (관찰 우선)

---

## 11. 향후 확장 포인트

(현재 미적용)

- 추천 태그 고정 목록 (DB 기반)
- 태그 자동 제안 (입력 중 autocomplete)
- 태그 병합/정규화 (동의어 처리)
- 인기 태그 노출 (사용 빈도 기반)
- AI 기반 태그 생성 (콘텐츠 분석)

---

## 12. 한 줄 요약

> "Signage는 분류가 아니라 태그로 탐색하는 구조다"

```
등록(태그 필수) → 저장(validation) → 탐색(태그 필터) → 활용
```
