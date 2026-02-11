# WO-CONTENT-ARCH-REDEFINITION-PHASE2

> **확정일**: 2026-02-11
> **상태**: Phase2 Frozen
> **범위**: 설계 확정 (코드 변경 없음)

---

## 1. 목적

O4O 플랫폼에서 **콘텐츠의 최소 의미 단위**를 확정하고,
CMS / LMS / Signage 간 경계를 재정의한다.

목표:

- 최소 단위 확정
- 중복 구조 정리 방향 제시
- 시스템 역할 구분
- 향후 리팩토링 기준선 마련

---

## 2. 조사 전제

이미 확정된 사실:

- Lesson은 여러 Course에 삽입하지 않음
- Lesson은 독립 노출 가능
- 유료는 Course 단위
- Signage는 유료 강의 사용 안 함
- 결제는 dormant
- 강사 승인 모델 확정

---

## 3. 핵심 질문

### Q1. 콘텐츠의 최소 의미 단위는 무엇인가?

후보:

- Media
- CmsContent
- Lesson
- Course
- Bundle

---

## 4. 정의 기준

최소 단위는 다음 조건을 만족해야 한다:

1. 의미가 있다 (사용자 관점에서 독립적 가치)
2. 독립 노출 가능
3. 상위 구조에 포함 가능
4. 접근 제어 가능
5. 재생/소비 가능

---

## 5. 분석

### Media

- 파일 단위
- 의미 없음
- 접근 제어 불명확

-> 최소 단위 X

### CmsContent

- 게시 단위
- 학습 구조와 분리
- Quiz/Enrollment 개념 없음

-> 최소 단위 X

### Course

- 학습 완결 단위
- 독립 노출 가능
- 하지만 내부에 Lesson 의존
- Signage 직접 사용 불가

-> 최소 단위 X (상위 구조)

### Bundle

- 범용 컨테이너
- 의미 모호
- 현재 LMS 내부 보조 개념

-> 최소 단위 X

### Lesson

- 학습 의미 단위
- 영상/텍스트/퀴즈 포함 가능
- 독립 노출 가능
- Course에 포함 가능
- Signage 참조 가능
- 접근 제어 가능

-> **최소 단위 확정**

---

## 6. 결론

> 콘텐츠의 최소 의미 단위는 **Lesson**으로 확정한다.

---

## 7. 경계 재정의

### 구조 정의

```
Media (파일)
   |
Lesson (최소 의미 단위)
   |
Course (Lesson 묶음)
   |
CMS 게시 (노출 레이어)
   |
Signage (재생 레이어)
```

---

## 8. 시스템 역할 재정의

### CMS

- Lesson 게시
- Course 소개
- Media 관리
- 노출 제어

### LMS

- Lesson 구조 관리
- Course 흐름 관리
- Enrollment 제어
- Quiz/Certificate 관리

### Signage

- Lesson.videoUrl 참조
- Media 직접 참조 (과도기 유지)
- 유료 Lesson 사용 금지

---

## 9. Media 3중화 문제 방향

현재:

- cms_media
- signage_media
- Lesson.videoUrl

Phase2 판단:

> 즉시 통합하지 않는다.
> v3에서 Media Core 통합 검토.

지금은 "최소 단위 확정"이 목적.

---

## 10. Bundle 처리 방향

Bundle은:

- 내부 마케팅/교육 묶음 개념
- 최소 단위 아님
- 유지하되 중심 개념으로 승격 금지

---

## 11. Freeze 선언

- Lesson을 최소 의미 단위로 확정
- Course는 구조 단위
- CMS는 노출 레이어
- Signage는 재생 레이어
- Media 통합은 v3 이후 검토

---

*Frozen: 2026-02-11*
*Status: Phase2 Baseline Lock*
