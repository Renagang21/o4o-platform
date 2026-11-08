# kpa-society 약관 · 동의 · 가입 약관 API 잔재 제거

> **상태**: ACTIVE
> **작성일**: 2026-11-08 · **최종 갱신**: 2026-11-08
> **실행 위치**: BOTH
> **인계**: wo/kpa-society-policy-api-residue · push 전 · 다음 실행자 CLOUD
> **근거**: 사용자 확인(2026-11-08) — "kpa-society 는 삭제한 서비스다. API 가 있으면 잘못된 것이다." · 상위 결정 [`WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1`](WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md) D1(pharmacy 만 `kpa-society` 서비스 키를 갖는 예외 제거) · D4(`kpa-society` 회원 · 약관 동의 · 콘텐츠는 테스트 데이터, 이전 없음)

## 1. 배경

[`WO-O4O-ACCOUNT-POLICY-V2-PUBLICATION-V1`](WO-O4O-ACCOUNT-POLICY-V2-PUBLICATION-V1.md)(약관 v2 게시) 준비 중, 서비스별 안내 「약국·약사회」를 `kpa-society` 에 게시하도록 설계돼 있고
관리자 약관 API 가 이 키를 받는 것을 확인했다. 사용자 확인으로 `kpa-society` 는 삭제한 서비스이므로 게시 대상에서 뺐다. 남은 API 표면을 이 WO 로 정리한다.

### 1-1. 남은 표면 (`origin/main` 1084f51486 기준 · 2026-11-08 LOCAL 확인)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/modules/service-legal/service-legal-scope.ts:36,81` | `SUPPORTED_LEGAL_SERVICE_KEYS` · `CONFIG_BY_SERVICE_KEY` 에 `kpa-society` — 관리자 약관 API · 공개 footer-legal 이 이 키를 받는다 |
| `apps/api-server/src/modules/policy-acceptance/service-enrollment-policy.service.ts:7` | `ENROLLMENT_POLICY_SERVICES` 에 `kpa-society` |
| `apps/api-server/src/modules/policy-acceptance/policy-acceptance.service.ts:51,168-221` | 매장 이용계약(`store_owner_agreement`) 대상 판정에 `kpa-society` 분기 · `'kpa-society': 'kpa:store_owner'` |
| `apps/api-server/src/modules/policy-acceptance/policy-acceptance.routes.ts:73` | `kpa-society` 매장계약 승낙 분기 |
| `apps/api-server/src/modules/neture-pharmacy/services/pharmacy-payment-access.ts:13,33-38` | 약국 결제 전 매장 이용계약 검사가 `service_key='kpa-society'` 문서 · 동의를 본다 |
| `apps/api-server/src/services/auth/signup-policy.service.ts:13,43-44,67` | 자체 가입 약관 허용 serviceKey 가 `neture` · `kpa-society` |
| `apps/api-server/src/common/auth/terms-acceptance.policy.ts:205` | `['/api/v1/kpa', 'kpa-society']` 경로 → 약관 서비스 매핑 |
| `apps/api-server/src/modules/service-legal/entities/*.entity.ts` 주석 | 허용 키 설명에 `kpa-society` |

- 운영 DB(2026-11-08 read-only): `kpa-society` 정책 문서는 terms · privacy v1 published 2건뿐이고 `store_owner_agreement` 문서는 없다. 동의 기록은 terms v1 2건.
  따라서 위 매장계약 · 결제 검사 분기는 현재 요구 문서가 없어 실제로는 아무것도 막지 않는다.
- `kpa-society` 키 전체(서비스 카탈로그 · `routes/kpa` · store · cms 등 api-server 119개 파일 269곳)의 정리는 상위 WO 범위다. 이 WO 는 위 표의 약관 · 동의 · 가입 약관 표면만 다룬다.

## 2. 사용자 확정

- `kpa-society` 는 삭제한 서비스다. 약관 · 동의 API 가 이 키를 받으면 안 된다(2026-11-08).
- 약관 v2 게시에서 `kpa-society` 2건은 게시하지 않는다(2026-11-08).

## 3. 설계 판단

| 결정 | 근거 |
|---|---|
| 관리자 약관 API · 공개 legal API · 가입 약관 · 서비스 신청 약관에서 `kpa-society` 를 제거해 `UNKNOWN_SERVICE` 로 거부되게 한다 | 사용자 확정. 상위 D1 |
| 약국 매장 이용계약 · 결제 검사는 `kpa-society` 대신 약국 사업 범위(`business:<id>` — `business-policy-scope.ts`)를 쓰도록 바꾸거나, 사업 범위 계약이 아직 정의되지 않았으면 `kpa-society` 분기를 제거만 한다. **어느 쪽인지 코드 조사로 정하고 PR 「결정 사항」에 적는다** | 현재 요구 문서 0건이라 제거해도 결제 동작은 바뀌지 않는다. 사업별 약관은 상위 WO 의 사업 범위 축 |
| 운영 DB 의 `kpa-society` 정책 문서 · 동의 행은 이 WO 에서 지우지 않는다 | 상위 D4 · 데이터 삭제는 운영 write(통합 담당 승인 · 상위 WO §데이터 단계). 동의 증빙 보존 규칙과 충돌 여부도 그 단계에서 본다 |
| `kpa:*` role · `/api/v1/kpa` route 자체는 건드리지 않는다 | 상위 WO 범위(§1-1 마지막 줄) |

## 4. 범위 밖

- 서비스 카탈로그 `kpa-society` 항목 · `pharmacy.neture.co.kr` 세션 축 · web 서비스 하드코딩 — 상위 WO.
- 운영 DB 데이터 삭제 — 상위 WO의 데이터 단계(통합 담당 승인).
- 약관 v2 본문 · 게시 — `WO-O4O-ACCOUNT-POLICY-V2-PUBLICATION-V1`.

## 5. TODO

- [ ] [CLOUD] §1-1 표의 각 위치를 최신 `origin/main` 에서 다시 확인(줄 번호 이동 · 새 소비처). `node scripts/quality/check-literal-consumers.mjs` 로 `'kpa-society'` 문자열 소비처를 함께 본다
- [ ] [CLOUD] 약관 · 동의 · 가입 약관 표면에서 `kpa-society` 제거(§3 판단대로). 프런트가 이 API 를 `kpa-society` 로 호출하는 곳이 남아 있으면 같은 PR 에서 함께 정리하거나 PR 에 적는다
- [ ] [CLOUD] 테스트: `kpa-society` 로 관리자 약관 API · 공개 legal · 가입 약관 · 서비스 신청 약관 호출 시 거부, 다른 서비스(neture · supplier · community · funding · lecture) 회귀 없음, 약국 결제 검사 회귀 없음
- [ ] [CLOUD] `/verify` · PR(「결정 사항」에 §3 두 번째 행 결정 기록)
- [ ] [LOCAL] 배포 후: `neture.co.kr` 회원가입 · 약관 동의 화면, `/terms` · `/privacy` 정상 · 약국 결제 진입 정상(Demo 매장 경영자)

## 6. 검증 계획

- 단위 · 통합 테스트로 `kpa-society` 거부와 다른 서비스 회귀 없음을 확인한다.
- 배포 후 Demo 로그인(매장 경영자 · 공급자)으로 재동의 · 가입 약관 · 결제 진입을 본다.

## 문서 정합

해당 없음(작성 시점). 실행 중 발견하면 `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` 형식으로 적는다.
