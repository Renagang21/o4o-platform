# WO-APP-DATA-HUB-PHASE3-A-AI-RECOMMENDATION-V1

> **작업일**: 2026-02-11
> **성격**: AI 추천 – Non-blocking
> **상태**: 실행용 Work Order

---

## 0. 목적 (Purpose)

Phase 2-B에서 완성된 **복사 옵션 선택 UX** 위에
AI를 **"추천자(advisor)" 역할로만** 추가한다.

> 핵심 원칙
> **AI는 제안만 한다. 선택·적용은 항상 사람이다.**

---

## 1. Phase 3-A 위치 정의

| 구분 | 내용 |
|------|------|
| Phase 3-A | AI 추천 (Non-blocking) |
| Phase 3-B | 조건부 자동 기본값 |
| Phase 3-C | 운영자 판단 보조 |

본 WO는 **Phase 3-A에만 해당**한다.

---

## 2. 전제 조건 (이미 충족)

| 항목 | 상태 |
|------|------|
| Phase 2-A 완료 | ✅ |
| Phase 2-B 완료 | ✅ |
| 복사 옵션 모달 존재 | ✅ |
| 승인 정책 4종 고정 | ✅ |
| Copy API stub 존재 | ✅ |

---

## 3. 범위 정의 (Scope)

### 포함

* AI 기반 **옵션 추천 표시**
* 템플릿 추천
* 노출 방식 추천
* LIMITED 조건 해석 요약

### 제외 (명시)

* 자동 선택 ❌
* 강제 적용 ❌
* 추천값 자동 submit ❌
* 정책 변경 ❌
* 신규 엔티티 ❌

---

## 4. 적용 화면

### 대상 UI

* `HubCopyModal.tsx`

### 비대상

* 메인 허브 페이지
* Admin/Operator 대시보드
* 승인/정책 관리 화면

---

## 5. AI 추천 개입 지점

### 5-1. 추천 표시 위치

**옵션 선택 모달 상단**

```
[ AI 추천 배너 ]
"이 항목은 '기본 템플릿 + 즉시 노출'을 추천합니다."
(이유 보기 ▸)
```

### 5-2. 추천 대상 항목

#### (A) 템플릿 추천

| 값 | 설명 |
|------|------|
| 기본 템플릿 | 콘텐츠가 즉시 활용 가능한 경우 |
| 빈 템플릿 | 조건 많음 / 편집 필요 / LIMITED |

#### (B) 노출 방식 추천

| 값 | 설명 |
|------|------|
| 즉시 노출 | 승인 완료 + 제한 없음 |
| 비공개 | LIMITED / REQUEST 이력 있음 |

### 5-3. 추천 근거 표시 (필수)

* 추천 배너에 "이유 보기" 토글 제공
* 이유 예시:
  * "최근 동일 유형의 80%가 기본 템플릿을 선택했습니다."
  * "이 콘텐츠는 조건(LIMITED)이 있어 비공개 시작이 안전합니다."

⚠️ **확률·통계는 추정치로 표시** (정확 수치 강조 금지)

---

## 6. AI 추천 로직 (초기 기준)

### 입력 데이터 (기존 데이터만 사용)

* approvalStatus
* LIMITED 조건 타입
* 콘텐츠 타입
* 과거 선택 로그 (있을 경우, 없으면 무시)

### 출력 데이터

```ts
{
  recommendedTemplate: 'default' | 'empty',
  recommendedVisibility: 'public' | 'private',
  reasons: string[]
}
```

---

## 7. 기술 구현 원칙

### Backend

* **신규 API 필수 아님**
* `store-ai-summary.ts` 패턴 확장 (권장)

### Frontend

* 추천 결과는 **초기 선택값으로 자동 세팅 ❌**
* UI 상에서:
  * "추천" 배지
  * 클릭 시 적용 가능

---

## 8. UX 원칙 (강조)

* ❌ "AI가 정해줍니다" 느낌 금지
* ❌ 추천 숨김 금지
* ✅ "도움 제안" 톤 유지
* ✅ 사용자가 바꾸면 **즉시 추천 상태 해제**

---

## 9. Acceptance Criteria

| 기준 | 완료 조건 |
|------|------|
| AI 추천 배너 표시 | HubCopyModal 상단 |
| 추천 근거 설명 제공 | 토글 방식 |
| 추천값 자동 적용 ❌ | 사용자가 클릭해야 적용 |
| Phase 2 UX 회귀 없음 | 기존 흐름 유지 |
| 타입/빌드 오류 없음 | `tsc --noEmit` |

---

## 10. 변경 대상 파일 (예상)

### Frontend

* `HubCopyModal.tsx`
* `store-ai-recommend.ts` (신규 helper)

### Backend

* ❌ 필수 아님 (Phase 3-A는 Front 중심)

---

## 구현 이력

| WO | 상태 | 일자 |
|----|------|------|
| WO-STORE-MAIN-PAGE-PHASE1-V1 | 완료 | 2026-02 |
| WO-STORE-MAIN-PAGE-PHASE2-A | 완료 | 2026-02 |
| WO-APP-DATA-HUB-PHASE2-B | 완료 | 2026-02-11 |
| WO-APP-DATA-HUB-PHASE2-FREEZE-V1 | 완료 | 2026-02-11 |
| WO-APP-DATA-HUB-PHASE3-A-AI-RECOMMENDATION-V1 | 본 문서 | 2026-02-11 |
