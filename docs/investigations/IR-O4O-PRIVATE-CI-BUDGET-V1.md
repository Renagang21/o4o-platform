# O4O 비공개 전환 월 예산 조사 및 1차 절감 준비

> **상태**: DRAFT
> **작성일**: 2026-10-30 · **최종 갱신**: 2026-10-30
> **범위**: 월 추가 비용 100,000원 이내를 목표로 하는 GitHub 비공개 전환 준비. 현재 공개 여부·요금제·계정 예산은 변경하지 않는다.

## 1. 실제 조회 및 추정의 구분

2026-09-30~2026-10-29 UTC 생성 Actions run을 날짜별 pagination으로 조회했다. 총 9,414건이다.
종류별 기간 분산 표본 208건의 job 시작·종료 시각을 합산하고 job별 분 단위 올림으로 환산했다.
공개 저장소 timing API의 billable=0은 비공개 예상 실행시간 0으로 해석하지 않았다.

| 종류 | 전체 run | 월 실행시간 추정(분) |
|---|---:|---:|
| CI Pipeline | 2,633 | 69,774.5 |
| CodeQL | 2,626 | 9,628.7 |
| PR Size Labeler | 1,960 | 1,960 |
| Guard Policy | 1,015 | 1,015 |
| Delivery | 629 | 2,778.1 |
| Promote | 207 | 2,070 |
| 기타 | 344 | 1,547.3 |
| 합계 | 9,414 | 88,773.6 |

표준 private Linux $0.006/분·Windows $0.010/분 기준, Linux 88,510.3분·Windows 263.3분을 적용하면
차감 전 약 $533.69다. Pro $4 + 기본 제공 $18 차감 가정이면 약 $519.69다.
계정의 실제 구독/청구 내역은 조회하지 않았다. 저장 공간·외부 Sonar·Code Security 구독·Copilot 등은 제외다.
표본 기반이므로 오차 범위를 통계적으로 검증한 확정 견적이 아니다.

공식 요금 확인 출처(2026-10-30):

- https://docs.github.com/en/billing/reference/actions-runner-pricing
- https://docs.github.com/en/billing/reference/product-usage-included
- https://github.com/pricing
- https://github.com/security/advanced-security

## 2. 월 10만원의 판단 기준

환율 1,400원/$·세금 10%·Pro $4를 가정할 때 Actions 추가 사용료를 $50 이내로 제한하면 합계 약 83,160원이다.
환율·기존 구독·계정의 다른 저장소 사용량·저장 공간까지 확인해야 실제 상한이 된다.
**이 문서는 $50 예산을 설정한 결과가 아니다.** 계정 Billing에서 stop-usage 예산을 실제 적용하고 범위를 확인해야 한다.
한도 도달 시 검사/배포가 멈출 수 있다. 한도를 높이거나 검사 실패를 무시하는 자동 우회는 만들지 않는다.

CodeQL 자동 실행을 전부 제거한다고 가정해도 gross 약 $475.92, Pro 차감 후 약 $461.92가 남는다.
따라서 보안 상품 제거만으로 목표를 달성할 수 없다. CI가 주된 절감 대상이다.

## 3. 이번 branch의 안전한 1차 준비

1. `CI_COST_PROFILE=budget` opt-in: Draft PR의 무거운 검사 보류, docs 민감정보 검사 유지.
2. 보류된 Draft는 CI Gate 실패. Ready for review 전환에서 전체 검사, 이후 추가 commit에도 재검사.
3. main/develop push·배포 gate·매일 full Jest는 유지. profile 미설정이면 기존 동작.
4. budget에서 CodeQL 자동 실행 중지. private은 별도 명시적 enablement 없이는 수동도 실행하지 않음.
5. Sonar 공개 API 진단을 budget/private에서 생략. 외부 App 설정·구독은 미변경.
6. `actions-cost.mjs`: 읽기 전용 재계산. workflow·event·결과별 표본, job별 올림, 재실행 포함,
   날짜별 조회 및 밀집일 시간별 분할, pagination 누락·미지원 runner·조회 실패 시 추정 중단.

**아직 월 10만원 이하라는 판정은 아니다.** 과거 run의 당시 Draft 상태는 이번 조사에서 확보하지 못했으므로
Draft 전환에 따른 절감률을 임의로 부여하지 않는다. 공개 여부/variables/budget/Sonar 연결은 미변경이다.

## 4. 전환 전 남은 작업

- 실제 최종 검증 횟수·job별 install/build/test 시간을 더 세분화한다. main과 PR의 중복 검증 재사용은
  target SHA/merge tree와 검사 설정의 일치를 검증해야 하며, 과거 green을 임의 재사용하지 않는다.
- API affected selector는 현재 shadow다. frontend를 읽는 API raw-source contract가 있으므로
  `api_affected=false`만으로 전체 API Jest를 생략하면 안 된다. full 결과 대비 누락 여부를 확인한 뒤 승격한다.
- 품질 검사·세 shard의 반복 install/dependency build를 캐시/공유할 수 있는지 측정한다.
  cache hit/miss 모두 같은 검사 결과를 내야 하며 lockfile·Node·플랫폼·소스 변경으로 무효화해야 한다.
- Sonar App의 private 지원·분석 코드량·기존 요금제는 계정에서 확인한다. 유료 구독 자동 시작 금지.
- 새 구성의 계산액+저장 공간+구독이 예산 안에 들어오고 계정 stop-usage 설정이 확인된 뒤 private 전환한다.
- AI 리뷰는 이미 사용하는 개발환경에서 수행하며, 타인의 구독/사용자 계정으로 서버 background 자동 실행을 만들지 않는다.

## 5. 검증 및 인계

검증 결과·PR·HEAD는 개발 완료 보고에서 기록한다. 이번 변경은 저장소 검사 설정이며 production 배포 대상은 아니다.
main 병합 전까지 개발 담당이 검증·CI 지적 보완을 수행하며, main 병합과 계정 설정 변경은 통합 담당 영역이다.
