# O4O 전문 강의 학습 편의 개선 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-22
> **근거 WO/IR**: 사용자 인계 — TODO 작성부터 개발·검증·commit·push

## 범위

독립 서비스 `lecture`의 현재 실행 코드가 기준이다. 이전 KPA·K-Cosmetics 구조를 복구하거나 개선 기준으로 삼지 않는다. 기존 인증·membership·콘텐츠 접근·수료 판정을 유지한다. PR·병합·배포·운영 DB write·migration은 수행하지 않는다. 결제·AI·실시간 커뮤니티는 범위 밖이다.

## TODO

| 순서 | 항목 | 상태 | 근거·변경·검증 |
|---|---|---|---|
| 1 | 최신 코드·정본·소비처 조사 | 완료 | base `b5a5423587e341958302e08f26815d45df2983d5`; 기존 SETUP 수정 보존; 직접 runtime 소비처 Lecture |
| 2 | 공개 목록 위 안내문 | 완료 | CoursesPage에서 gateSlot 분리; 검색·오류 재시도·계정 전환 stale 응답 폐기 |
| 3 | 공개 목차·조회 상태 분리 | 완료 | 기존 상세 query의 opt-in 소개 projection; 기존 본문 guard 유지; 실패와 빈 결과 분리 |
| 4 | 전문 강의 소개 | 일부 완료 | 기존 course metadata 작성→학습자·운영 검토 표시; 강사 신청서 필드는 schema가 없어 보류 |
| 5 | 영상 이어보기·내 학습 | 완료 | Progress.metadata bookmark; 본인 수강·레슨 경계; 완료 데이터와 분리 |
| 6 | 교재·영상 URL·미리보기 | 일부 완료 | 기존 attachments 연결·HTTPS 직접 영상 안내; 샘플 공개 guard 확대는 보류 |
| 7 | 필요한 책임 분리 | 완료 | ResumeVideo·LessonResources·전문 정보/영상자료 입력·수료증 복구 목록 분리; 핵심 adapter read 타입 정리 |
| 8 | 수료증 복구·미사용 홈 | 완료 | 미발급 수료 조회·검색·기존 API 재시도; Lecture 홈·Hero 관리 제거 |
| 9 | 질문·자막 최소 연결 | 일부 완료/선택 보류 | 기존 운영 문의에 강의·레슨 맥락 첨부; 준비된 자막·계약 없어 자막 보류 |
| 10 | 테스트·타입·빌드·모바일·키보드 | 완료 | 합성 fixture와 운영 smoke 분리; 상세 결과 CHECK |
| 11 | commit·push·인계 | 종료 보고로 인계 | 검증 후 작업 branch만 commit·push; 실제 SHA·push 결과는 종료 보고에 기록; PR·병합·배포 제외 |

## 검증과 잔여 사항

완료·기존 제공·선택 보류·외부 blocker를 최종 CHECK에서 분리한다. 실제 계정·운영 검증은 수행하지 않는다. 공개 외부 비교는 공식 페이지 접근 성공한 내용만 기록한다.

## 구현 안내

[전문 강의 작성·학습 안내](../guides/LECTURE-PROFESSIONAL-LEARNING.md) · [검증 CHECK](../checks/CHECK-O4O-LECTURE-PROFESSIONAL-LEARNING-IMPROVEMENTS-V1.md)
