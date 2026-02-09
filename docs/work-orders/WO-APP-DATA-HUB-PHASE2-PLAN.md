# WO-APP-DATA-HUB-PHASE2 — 내 대시보드 연결 계획

> **Status**: Ready (Phase 1 완료 후 즉시 실행 가능)
> **Dependency**: WO-APP-DATA-HUB-ACTIONS-PHASE1-V1 ✅ 완료

---

## Phase 2 목적

허브의 콘텐츠/사이니지를 **내 매장 대시보드의 자산으로 실체화**한다.

---

## Phase 2-A — 실제 "내 대시보드로 복사" 생성

### 핵심 동작

* 허브 데이터 → **새 레코드 생성**
* 원본과는 **참조 관계만 유지**
* 이후 수정은 **내 자산만 영향**

### 구현 포인트

```typescript
interface MyContent {
  id: string;
  sourceContentId: string;    // 원본 ID
  sourceType: 'hub' | 'community' | 'supplier';
  ownerType: 'store';
  ownerId: string;            // 매장 ID
  status: 'draft' | 'active' | 'archived';
  // ... 복사된 콘텐츠 필드
}
```

### UX

* 복사 완료 toast → "내 대시보드에 복사되었습니다"

---

## Phase 2-B — 복사 시 템플릿 / 옵션 선택

### 최소 옵션

| 옵션 | 설명 |
|------|------|
| 제목 수정 | 복사 시 제목 변경 여부 |
| 설명 요약 | AI 요약 사용 여부 (Phase 3) |
| 템플릿 | 안내형 / 프로모션형 / 정보형 |

### UX

* 복사 클릭 → **경량 모달**
* 선택 후 생성

❌ 고급 편집기, AI 추천은 Phase 3 이후

---

## Phase 2-C — 수정 / 삭제 실동작

### 수정

* **내 대시보드에서만 가능**
* 허브 화면에서는 수정 진입 불가 유지

### 삭제

* 내 자산만 soft delete
* 원본 허브 데이터 영향 ❌

### 안전장치

* "원본 콘텐츠에는 영향이 없습니다" 문구 고정

---

## 공통 원칙

1. **허브는 절대 수정되지 않는다**
2. 내 대시보드는 **완전한 소유**
3. 원본과 내 자산은 **단방향 참조**
4. UI 흐름:
   > 허브 → 복사 → 대시보드 → 편집

---

## 상태 전이

```
[Hub Content]
     │  복사
     ▼
[My Dashboard Content] (draft)
     │  수정/발행
     ▼
[Active Content]
```

---

## Phase 2 완료 의미

이 단계가 완료되면 O4O는:

* ❌ "콘텐츠 모아둔 사이트"
* ✅ **"콘텐츠를 가져다 쓰는 플랫폼"**

---

## Phase 3 미리보기 (참고)

* AI 요약/추천 템플릿
* 성과 기반 추천
* 파트너 콘텐츠 수익 분배

---

*Created: 2026-02-09*
*Phase 1 Completed: 2026-02-09*
