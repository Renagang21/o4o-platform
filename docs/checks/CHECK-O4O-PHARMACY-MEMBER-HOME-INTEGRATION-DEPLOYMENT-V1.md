# CHECK-O4O-PHARMACY-MEMBER-HOME-INTEGRATION-DEPLOYMENT-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-18 · **최종 갱신**: 2026-10-18 (KST)
> **근거 WO/IR**: [완료된 개발 TODO](../work-orders/TODO-O4O-PHARMACY-MEMBER-HOME-REORGANIZATION-V1.md) · 2026-10-18 사용자의 후속 main 병합·배포 요청

## 후속 단계와 기존 기록 보존

개발 push 후 사용자가 이 공간에서 main 병합·배포를 추가 지시했다. 이 문서는 그 후속 단계의
실제 운영 반영 증거와 최종 판정이다. 기존 COMPLETED TODO와
[개발 CHECK](CHECK-O4O-PHARMACY-MEMBER-HOME-REORGANIZATION-V1.md)는 main source 통합 시점의
이력으로 보존하며 본문·체크박스를 다시 고치지 않는다. 기존 기록의 당시 미실행/미체크 상태와
현재 완료 상태를 혼동하지 않는다. 개발에 이어 승인된 통합·배포 항목은 아래 근거로 완료 판정한다.

[문서 lifecycle §2](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)에 따라 완료 기록을
재작성하지 않고, 운영 증거가 필요한 후속 단계를 새 CHECK로 남긴다. 새 개발 TODO나 기능 수정용
중복 PR을 만드는 것은 아니다. 현행 기준은 [서비스 탐색·회원 메인 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)이다.

## main 통합 확인

[PR #704](https://github.com/Renagang21/o4o-platform/pull/704)는 source HEAD
`62084e9577828c0e99889f537fdbb15b90bdd447`에서 required CI Gate와
[CI #39126128276](https://github.com/Renagang21/o4o-platform/actions/runs/39126128276)를 통과했다.
최종 코드 리뷰는 `25761e7394`에서 완료됐고 지적 4건의 미해결 스레드는 0이다.
그 뒤 #705의 다른 트랙 문서 갱신을 최신 main에서 merge한 `62084e9577`은
리뷰한 코드와 services/packages/apps/.github 차이가 0임을 확인했다.
실제 main ruleset은 PR·CI Gate 필수·필수 human approval 0이며 bypass 없이 정상 merge했다.
main merge SHA는 `0b6649bd3615fd5b6dae1889c9a32a03d1a019cc`다.
병합 결과도 검증한 branch와 코드 차이 0이며 post-merge CI·Delivery를 확인한다.
SonarCloud app suite는 통합 시 queued로 결과가 없었다. 필수 gate 통과와 미보고 외부 분석을 구분한다.

이 절과 운영 결과 추가는 동일 WO의 source PR 통합 후 완료 근거를 보충하는 연속 단계다.
기능 수정용 중복 PR을 만들지 않고 같은 branch에서 문서 전용 완료 기록을 진행한다.

SonarCloud는 이후 source HEAD `62084e9577`에서 SUCCESS로 완료됐다. 신규 중복률 0%·
security hotspots 0이다. CSS !important 2곳과 표시 문구 중첩 ternary 1곳, 총 3개 warning은
남아 있으며 gate 통과와 구분한다. 공통 Hero의 기존 !important를 서비스 범위에서 덮는 표시 문제이며
검사 제외·threshold 변경이나 공통 CSS 계약 변경은 하지 않았다.

## 운영 배포·최종 판정

- main `0b6649bd3615fd5b6dae1889c9a32a03d1a019cc`의
  [CI #39126999450](https://github.com/Renagang21/o4o-platform/actions/runs/39126999450) SUCCESS.
- [Delivery #39127701475](https://github.com/Renagang21/o4o-platform/actions/runs/39127701475) SUCCESS.
  실제 누적 판정에 따라 약국 웹(kpa-society)만 자동 배포했으며 API·관리자·다른 웹은 대상이 아니다.
- 신규 revision smoke·트래픽 전환·Verify deployment·최종 serving SHA 확인 SUCCESS.
  해당 main SHA의 `production` 상태는 SUCCESS / `DEPLOYED · deploy: kpa-society`다.
  단순 skip run 성공으로 운영 반영을 대신하지 않았다.
- 공식 `pharmacy.neture.co.kr` HTML/entry JS는 모두 HTTP 200. entry가
  `/assets/index-CkV8yavU.js`에서 `/assets/index-BGfGNHOW.js`로 바뀌었고, 새 메인 제목
  '약국에 필요한 소식과 자료'와 실제 헤더 높이를 반영하는 이동 코드가 포함됐다.
- API readiness는 HTTP 200 / ready. API 신규 배포·실제 OAuth·실제 운영 업무 검증을 의미하지 않는다.
- source 코드의 약국 웹 188건·공통 운영 UI 188건, 양 사업 PC/mobile 28흐름 PASS와
  최종 branch→main 코드 차이 0을 대조했다. 운영 업무 데이터·권한·Google 연결 변경 없음.

**완료**: TODO→코드/문서 조사→화면 보완→로컬 검증→push→리뷰 보완→정상 main 통합→
실제 verified 운영 배포와 공식 제공 코드 확인. 실제 OAuth·실제 업무 확인은 사용자 검증 항목으로 남긴다.
Sonar gate는 통과했으며 표시 코드의 warning 3개와 기존 hook 경고 1개는 앞 절에 구분했다.

완료 기록은 문서 전용 후속 PR로 통합하며 별도 runtime 배포는 NOT_APPLICABLE이다.
WORKTREE_DISPOSITION: KEEP — 완료 기록 main 포함·post-merge CI·clean·진행 중 operation/작업 process 없음
확인 후 SAFE_TO_REMOVE로 판정해 이번 worktree/branch만 정리한다. 기존 공간은 보존한다.
