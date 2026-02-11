# WO-APP-DATA-HUB-PHASE3-B-AUTO-DEFAULT-V1

> **작업일**: 2026-02-11
> **성격**: AI 추천 기반 자동 기본값 적용
> **상태**: 실행용 Work Order

---

## 0. 목적 (Purpose)

Phase 3-A에서 구현된 **AI 추천(제안)**을 한 단계 확장하여,
운영자의 판단을 대체하지 않으면서도 **초기 선택 부담을 줄이는 자동화**를 도입한다.

> 핵심 목표
> * "추천은 AI가 하되, 선택은 사람이 한다" 원칙 유지
> * 단, **모달 최초 진입 시 기본값을 AI 추천으로 미리 채움**

---

## 1. 범위 (Scope)

### 포함

* HubCopyModal 내 **초기 선택값(auto default)** 적용
* 기존 `generateCopyRecommendation()` 결과 재사용
* 사용자 수동 조작 시 자동 기본값 **즉시 해제**
* UI에서 "AI 기본값 적용됨" 상태 명확히 표시

### 제외

* 자동 복사 / 자동 submit ❌
* 추천 결과의 강제 적용 ❌
* 승인 정책/비즈니스 로직 변경 ❌
* 다른 서비스로의 확산 ❌

---

## 2. AI 개입 경계

| 항목 | 허용 여부 |
|------|------|
| 모달 열릴 때 기본값 세팅 | ✅ |
| 사용자가 값 변경 | ✅ |
| AI가 자동 제출 | ❌ |
| 사용자의 변경을 덮어씀 | ❌ |
| 추천 조건 변경 시 재적용 | ❌ |

---

## 3. 자동 기본값 적용 규칙

### 적용 대상 조건

| 조건 | Auto Default |
|------|------|
| `policy === 'OPEN'` | ❌ (추천만 표시) |
| `policy === 'DISPLAY_ONLY'` | ❌ |
| `policy === 'LIMITED'` | ✅ |
| `limitedConditions.length > 0` | ✅ |
| `REQUEST_REQUIRED` 승인 완료 | ✅ |

### 적용 시점

* HubCopyModal 최초 open 시 1회
* 이후 상태 변화로 재적용하지 않음

---

## 4. UX 요구사항

### 상태 표현

* AI 추천 배너에 "기본값 적용됨" subtle 표시
* 사용자가 하나라도 변경 시 즉시 해제

### 사용자 조작 시 처리

| 상황 | 동작 |
|------|------|
| 템플릿 변경 | auto-default 해제 |
| 노출 설정 변경 | auto-default 해제 |
| 다시 추천 적용 버튼 클릭 | 명시적 재적용 |

---

## 5. 변경 대상 파일

| 파일 | 변경 |
|------|------|
| HubCopyModal.tsx | auto default 적용 로직 + 상태 배지 |
| store-ai-recommend.ts | shouldAutoApply 판정 함수 추가 |

> API / Backend 변경 없음

---

## 6. Acceptance Criteria

| 기준 | 통과 조건 |
|------|------|
| AI 추천은 자동 제출하지 않는다 | ✅ |
| 모달 최초 진입 시만 기본값 적용 | ✅ |
| 사용자가 수정하면 즉시 해제 | ✅ |
| 추천/기본값 상태가 UI로 명확히 보임 | ✅ |
| 기존 Phase 3-A UX 훼손 없음 | ✅ |
| tsc / build 오류 없음 | ✅ |

---

## 구현 이력

| WO | 상태 | 일자 |
|----|------|------|
| WO-STORE-MAIN-PAGE-PHASE1-V1 | 완료 | 2026-02 |
| WO-STORE-MAIN-PAGE-PHASE2-A | 완료 | 2026-02 |
| WO-APP-DATA-HUB-PHASE2-B | 완료 | 2026-02-11 |
| WO-APP-DATA-HUB-PHASE2-FREEZE-V1 | 완료 | 2026-02-11 |
| WO-APP-DATA-HUB-PHASE3-A-AI-RECOMMENDATION-V1 | 완료 | 2026-02-11 |
| WO-APP-DATA-HUB-PHASE3-B-AUTO-DEFAULT-V1 | 본 문서 | 2026-02-11 |
