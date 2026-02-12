# WO-CONTENT-MEDIA-STRATEGY-DECLARATION-V1

*(Media 전략 선언서 - v1 고정)*

> **작성일**: 2026-02-12
> **성격**: 구조 선언서 (구현 지시서 아님)
> **상태**: v1 고정

---

## 1. 목적

현재 플랫폼에 존재하는 Media 3중 구조에 대해:

* 즉시 통합하지 않는다.
* 책임 경계를 명확히 한다.
* 장기 통합 방향만 선언한다.

Core 변경 ❌
DB 변경 ❌
코드 수정 ❌

---

## 2. 현재 구조 정리

| 영역            | 저장 위치             | 역할                    |
| ------------- | ----------------- | --------------------- |
| CMS Media     | `cms_media`       | 콘텐츠 자산 관리 (이미지/영상/문서) |
| Signage Media | `signage_media`   | 플레이 전용 자산             |
| LMS Lesson    | `lesson.videoUrl` | 강의 소비용 영상 URL         |

이 세 영역은 현재 서로 FK 없이 완전 분리되어 있다.

---

## 3. v1 정책 선언

### 선언 1 - Media는 분리 유지

* CMS는 CMS 자산만 관리
* Signage는 자체 플레이 자산 유지
* LMS는 단순 URL 기반 유지

통합 금지.

---

### 선언 2 - URL 참조만 허용

* Lesson은 mediaId 사용하지 않는다.
* Signage는 cms_media를 참조하지 않는다.
* CMS는 signage_media를 소유하지 않는다.

모든 연결은 URL 단방향 참조로만 허용.

---

### 선언 3 - 동기화 로직 금지

* Media 간 자동 복제 ❌
* Media 삭제 이벤트 연동 ❌
* Media 공유 상태 관리 ❌

운영 수동 원칙 유지.

---

## 4. 장기 방향 (v3 이상)

미래 통합 후보:

> CMS를 단일 Media Source로 승격

즉,

```
cms_media
   ↓
LMS
   ↓
Signage
```

그러나:

* 지금은 수행하지 않는다.
* Media Core 생성 금지.
* Schema 변경 금지.

---

## 5. 삭제 정책

각 Media는 독립 삭제 원칙.

* CMS Media 삭제 → CMS 콘텐츠 영향
* Signage Media 삭제 → 플레이 영향
* Lesson.videoUrl 변경 → 강의 영향

상호 영향 없음.

---

## 6. 리스크 평가

| 항목      | 현재 위험 | 대응      |
| ------- | ----- | ------- |
| URL 중복  | 낮음    | 수동 관리   |
| 동기화 필요성 | 없음    | 선언으로 차단 |
| 복잡도 증가  | 없음    | 통합 금지   |

현재 통합은 오히려 복잡도 증가 위험.

---

## 7. 아키텍처 선언

> Media는 현재 3영역 분리 구조를 유지한다.
> CMS는 미래 단일 Source 후보이나,
> v1/v2에서는 통합을 시도하지 않는다.

---

## 8. 결정 요약

* Media Core 생성 ❌
* cms_media 확장 ❌
* signage_media 변경 ❌
* lesson.videoUrl 변경 ❌
* FK 연결 ❌

구조 동결.
