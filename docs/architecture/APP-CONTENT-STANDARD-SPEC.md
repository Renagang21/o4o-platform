# APP-CONTENT 표준 UI 스펙 (v1)

> 첫 번째 기준 앱 — 모든 O4O 서비스에 재사용

## 0. 범위

* 대상: **공지 / 뉴스 / 배너 / 혜택 / 기타 CMS 콘텐츠**
* 적용: **모든 O4O 서비스 공통**

---

## 1. 화면 구성 원칙

### 메인(요약)

* **카드 요약**만 사용
* 타입별 **2~6개**
* **"더보기" 필수**
* 테이블 금지

### 전체보기(탐색)

* **리스트(카드형 리스트)** 기본
* 상단 **정렬 토글** 고정
* 필터는 Phase 2

---

## 2. 카드/리스트 컴포넌트 스펙

### 공통 필드

* 제목
* 요약(1~2줄)
* 메타: 작성자/출처 + 날짜 + 조회수
* 배지: 타입/출처(운영자/공급자/사용자)
* CTA(상세/링크/쿠폰)

### 시각 규칙

* 운영자: 남색 (#1a5276)
* 공급자: 보라 (#6c3483)
* 사용자: 녹색 (#1e8449)
* Pinned/Featured: 상단 고정 배지

---

## 3. 정렬 (모든 타입 공통)

* 최신순 (default)
* 추천순 (featured/pinned 기반)
* 조회순 (viewCount)

> UI는 항상 제공, 서버는 Phase 1에서 최신순만 확실. 나머지는 단계 적용.

---

## 4. Empty / Error State

* 데이터 없음: 타입별 안내 문구 + CTA
* 로딩 실패: 재시도 버튼
* 인증 필요 시: 로그인 유도 카드

---

## 5. 모바일 기준

* 카드 간격 고정
* 제목 2줄 제한
* 터치 영역 44px 이상

---

## Phase 1 Work Order

### 목적

APP-CONTENT의 메인 요약 + 전체 리스트 + 정렬 UI를 안정화하고,
모든 서비스에 재사용 가능한 표준으로 확정.

### Backend

1. **Home Summary API**: `GET /api/v1/{service}/home/content` — 타입별 최신 N건
2. **List API**: `GET /api/v1/{service}/contents` — params: type, sort, limit, page
3. 공통 조건: status=published, serviceKey 일치

### Frontend

1. **ContentSummarySection** — 메인 요약 카드 + "더보기"
2. **ContentListPage** — 카드형 리스트 + 정렬 토글
3. 공통 UI — 출처 배지, Empty/Error 처리

### 비범위 (Phase 2)

* 고급 필터
* 추천 알고리즘 고도화
* AI 요약/추천
* 테이블 뷰

### 완료 기준 (DoD)

* 메인에 콘텐츠 요약 노출
* 전체보기에서 정렬 토글 동작
* KPA에서 검증 후 다른 서비스에 무변경 적용 가능

---

*Created: 2026-02-08*
*Status: Phase 1 Active*
