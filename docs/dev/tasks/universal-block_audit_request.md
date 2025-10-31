# 🧩 **O4O Platform — 유니버셜 블록 조사 요청서 (1차 실사)**

## 🎯 목적

현재 유니버셜 블록(Universal Block)의 **기능, 구조, 데이터 흐름**을 실사하여
향후 "코드 실행형 확장(툴셋형)" 적용 가능성과 **보다 안전한 대안 구조** 설계를 위한 기초 자료 확보.

---

## 📍 조사 범위

유니버셜 블록 전체 파이프라인

> **에디터 블록 → usePreset → API → PresetRenderer → ViewPreset**

---

## 🧭 조사 항목

### 1️⃣ 파일 맵 및 구조 파악

* Universal Block 관련 주요 파일 경로 및 역할을 표로 정리
  예)

  | 구분    | 경로                                                                    | 주요 기능         | 비고 |
  | ----- | --------------------------------------------------------------------- | ------------- | -- |
  | 블록 정의 | apps/admin-dashboard/src/components/editor/blocks/universal/index.tsx | 속성·UI 정의      |    |
  | 데이터 훅 | packages/shortcodes/src/hooks/usePreset.ts                            | 프리셋 로딩        |    |
  | 렌더러   | packages/shortcodes/src/components/PresetRenderer.tsx                 | ViewPreset 호출 |    |

---

### 2️⃣ 데이터 흐름 조사

* 블록이 렌더될 때 호출되는 전체 경로를 시퀀스로 정리
  `유니버셜 블록 → usePreset → /api/... → PresetService → DB`
* 요청/응답 JSON 구조 캡처 (presetId 기준으로 호출 시 실제 데이터 구조 기록)
* 캐시 전략(SWR / 서버 캐시) 확인 (TTL, 키 구조 포함)

---

### 3️⃣ 기능 점검

* 지원 모드: list / grid / card / table
* 권한 필터(roles) 동작 여부 확인
* ACF 필드 / 관계형 필드(타 CPT) 조회 가능 여부 확인
* expand, filter, sort, limit, page 등 쿼리 파라미터 존재 여부 조사

---

### 4️⃣ 갭 분석

* 교차 CPT ACF 조회 불가 항목 목록
* 고급 필터/정렬/관계 확장 미지원 항목
* 캐시/권한 일관성 문제 가능성
* 뷰 템플릿 헬퍼 존재 여부(`acf()`, `media()`, `priceFormat()` 등)

---

### 5️⃣ 출력 결과물

* `universal-block_audit.md` 로 정리
  포함 내용:

  1. 파일 구조 및 주요 코드 경로
  2. API 요청·응답 예시
  3. 렌더링 시퀀스 다이어그램(간단)
  4. 갭 요약 표 (Must / Should / Could / Won't)
  5. 개선 제안 초안

---

## ⚙️ 수행 방식

* 코드 읽기 + 콘솔/네트워크 트레이스 중심
* 수정 금지, **읽기 전용 조사만 수행**
* 완성 후 결과를 `docs/dev/audit/universal-block_audit.md` 로 저장

---

## 🕒 예상 소요

약 2~3시간 (파일 트리 조사 1h + 런타임 트레이스 1h + 정리 0.5h)

---

## ✅ 완료 조건 (Acceptance Criteria)

1. Universal Block 관련 핵심 파일 모두 확인 및 표 정리
2. API 흐름 및 데이터 구조 명세 확보
3. ACF 교차조회 가능 여부 명확히 확인
4. 개선 포인트 3가지 이상 도출
5. 결과물 저장 및 리포트 확인 가능

---

필요 시 후속 조사 요청서로
**「Phase 2 — 데이터 프리셋 확장 설계」**를 추가 발행 예정입니다.

---

*조사 시작일: 2025-10-31*