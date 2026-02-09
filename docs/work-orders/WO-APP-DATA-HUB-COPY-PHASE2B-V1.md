# WO-APP-DATA-HUB-COPY-PHASE2B-V1

**Data Hub → 내 대시보드 복사 시 템플릿/옵션 선택**

> **Status**: In Progress
> **Created**: 2026-02-09
> **Dependency**: WO-APP-DATA-HUB-COPY-PHASE2A-V1 ✅

---

## 1. 작업 목적

Data Hub에서 자산을 **내 대시보드로 복사할 때**,
"그대로 복사"가 아니라 **용도에 맞게 쓰도록 최소 선택지를 제공**한다.

> Phase 2-B는 **편집 단계가 아니라 '초기 형태 결정 단계'**다.

---

## 2. 작업 범위

### 포함
* 복사 시 **경량 옵션 선택 UI**
* 선택값을 반영한 대시보드 자산 생성

### 제외
* 고급 편집기
* AI 추천
* 콘텐츠 미리보기
* 공개 설정

---

## 3. UX 흐름

```
[Data Hub 카드]
   📥 복사 클릭
        ↓
[경량 모달 (옵션 선택)]
        ↓
[내 대시보드 자산 생성 (draft)]
```

---

## 4. 옵션 UI 구성

### ① 제목 처리 방식 (필수)
* (●) 원본 제목 그대로 사용
* (○) 제목 직접 수정

### ② 설명 처리 방식 (선택)
* (●) 원본 요약 사용
* (○) 설명 비우기

### ③ 템플릿 선택
* 정보형 (info)
* 프로모션형 (promo)
* 안내형 (guide)

---

## 5. API 연계

```json
{
  "sourceType": "content",
  "sourceId": "uuid",
  "targetDashboardId": "uuid",
  "options": {
    "titleMode": "keep | edit",
    "title": "optional",
    "descriptionMode": "keep | empty",
    "templateType": "info | promo | guide"
  }
}
```

---

## 6. 완료 기준 (DoD)

- [ ] 복사 클릭 시 옵션 선택 모달 노출
- [ ] 선택값에 따라 대시보드 자산 생성
- [ ] 생성 자산은 draft 상태
- [ ] 옵션을 선택하지 않아도 기본값으로 생성 가능
- [ ] Phase 2-A API 재사용
- [ ] 빌드 성공
