# LMS (Learning Management System) 프론트엔드 모듈

## 구조

### 관리자 페이지 (/admin)
- 과정 및 콘텐츠 관리
  - 강좌 생성/수정/삭제
  - 학습 자료 업로드/관리
  - 평가 문항 관리
- 사용자 관리
  - 교사/학생 계정 관리
  - 권한 설정
- 학습 현황 모니터링
  - 진도율 추적
  - 성과 분석
  - 리포트 생성

### 교사 페이지 (/teacher)
- 강의 관리
  - 수업 자료 등록/수정
  - 과제 출제/평가
  - 온라인 시험 관리
- 학생 관리
  - 출석 체크
  - 성적 관리
  - 피드백 제공
- 실시간 수업
  - 화상 강의
  - 화면 공유
  - 채팅/토론

### 학생 페이지 (/student)
- 학습
  - 강의 수강
  - 과제 제출
  - 시험 응시
- 진도 관리
  - 학습 일정 확인
  - 진도율 확인
  - 성적 조회
- 상호작용
  - 질문/답변
  - 토론 참여
  - 피드백 확인

## 주요 기능
- 적응형 학습 시스템
- 실시간 화상 수업
- 자동 채점 시스템
- 학습 분석 및 리포팅
- 협업 도구 통합

## 기술 스택
- React/Next.js
- TypeScript
- Tailwind CSS
- Redux/Redux Toolkit
- React Query
- Socket.io (실시간 기능)
- WebRTC (화상 수업)
- IndexedDB (오프라인 지원) 