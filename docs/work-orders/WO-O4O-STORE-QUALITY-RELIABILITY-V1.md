# 내 매장 SonarCloud 신뢰성·로컬 중복 정비

> **상태**: IN_PROGRESS
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13

PR #547의 최종 분석(중복률 10.2%, 신뢰성 D)을 근거로 코드·문서를 조사하며 TODO를 갱신한다. 새 전용 branch는 `wo/store-quality-reliability`다. AI·공통 Core·서비스 간 공통화·서버·DB·권한·분석 제외·품질 기준은 수정하지 않는다.

## TODO

- [x] 실제 SonarCloud GitHub annotations와 최신 main 조사
- [x] 태블릿 공통 영상 선택창을 native modal dialog로 정비, 키보드·닫기·포커스 검증
- [x] QR CTA·연결 대상, 사이니지 편집기, 스케줄의 label/control 및 요일 그룹 정합
- [x] 업무 이동 URL·모드 판단 및 화면별 중첩 분기 정리
- [x] 같은 업무 안의 반복 필터·중복 계산 정리, 공통화 대상과 구분
- [x] 순차 QR 출력·부분 실패 재시도 정책 유지, 정적 분석 지적의 근거 기록
- [ ] 테스트·type/build·lint·PC/모바일 브라우저 검증
- [ ] PR 재분석: 신뢰성·새 중복 확인 후 TODO 갱신, 실제 결과로 완료 판단

## 범위 판정

라벨·대화상자 관련 지적은 실제 화면 접근성을 개선한다. nested ternary·복잡성·readonly 등은 같은 화면 내부에서 정리한다. `await` 순차 실행은 QR 성공분 출력 후 첫 실패에서 중단 및 플레이리스트 실패분만 재시도하는 기존 계약을 위해 유지한다. 서비스 간 동일 구현은 전체 O4O 정비 대상으로 남기며 3% 달성을 위해 새 공통 패키지를 만들거나 분석에서 제외하지 않는다.

진행 근거: [CHECK](../checks/CHECK-O4O-STORE-QUALITY-RELIABILITY-V1.md). 실제 SonarCloud 등급은 PR 분석 결과로 확인한다.
