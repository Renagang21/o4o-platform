# CHECK-O4O-CAREPHARM-PHARMACY-WEB-TRANSITION-V1

> **상태**: COMPLETED · **검증일**: 2026-10-29
> **범위**: [WO](../work-orders/WO-O4O-CAREPHARM-PHARMACY-WEB-TRANSITION-V1.md)의 CarePharm 약국 협업체 웹 이전·옛 KPA 자원 제거. 새 아키텍처 정본이 아닌 실행 결과 기록이다.

## 최종 서비스 구분

| 서비스 | 도메인·역할 | 결과 |
|---|---|---|
| `pharmacy-business-web` | `carepharm.neture.co.kr`, `pharmacy.neture.co.kr`, `megapharm.neture.co.kr` — 약국 협업체 웹 | CarePharm 추가 연결·공개 검증 성공 |
| `cooperative-web` | `pharmcoop.neture.co.kr` — 개인 회원 기반 약사/약국 협동조합, 소스 `services/web-pharmacy-coop` | 별개 서비스로 유지 |
| `kpa-branch-web` | `kpa.neture.co.kr` — 약사회 분회 | 유지 |
| `kpa-society-web` | 이전이 끝난 옛 서비스 | Run·backend·NEG 제거 완료 |

배포 워크플로의 `service=kpa-society`는 레거시 선택 키다. 실제 Dockerfile·이미지·Run·verified rollout 대상은 `pharmacy-business-web`이다. 내부 키·과거 이미지 기록을 옛 서비스 재생성으로 해석하지 않는다.

## 통합·운영 근거

- 구현 [PR #875](https://github.com/Renagang21/o4o-platform/pull/875), `/terms` 호환 [PR #876](https://github.com/Renagang21/o4o-platform/pull/876), 안전한 관측·검증 시간 보완 [PR #877](https://github.com/Renagang21/o4o-platform/pull/877) main 통합.
- 최종 코드 main `cdfaf4f63bc5dd80de5b0128a69b792ee8ed8452`: [CI 성공](https://github.com/Renagang21/o4o-platform/actions/runs/40819515358), [CodeQL 성공](https://github.com/Renagang21/o4o-platform/actions/runs/40819515324), [Delivery 성공](https://github.com/Renagang21/o4o-platform/actions/runs/40820627468).
- [약국 웹 verified 배포 성공](https://github.com/Renagang21/o4o-platform/actions/runs/40819656787). `pharmacy-business-web-00038-wuq`, 코드 main 이미지·traffic 100%.
- [최종 CarePharm 계획](https://github.com/Renagang21/o4o-platform/actions/runs/40820925905)의 digest `018da90d11d50caf66bb9aa38cfe70625fcac29ff1ccfd1c86cbb74777b90f5d` 검토 뒤 [전환 성공](https://github.com/Renagang21/o4o-platform/actions/runs/40821072947), applied=true. 정상 공개 URL HTML·JS 검증 및 목표 bundle SHA256 `d1be746fbebc38e90ec7fce2a42f36f384b8c6baee1384ba69655304d7c5ebaf` 일치.
- [독립 인벤토리 성공](https://github.com/Renagang21/o4o-platform/actions/runs/40821484252). 전체 명시 host 집합이 동일하며 CarePharm의 backend만 Neture에서 약국 웹으로 변경됐다. 다른 host의 backend와 기존 경로 규칙은 보존했다.
- [retire-plan](https://github.com/Renagang21/o4o-platform/actions/runs/40818421465)의 요청 0·참조 검사 후 [retire 성공](https://github.com/Renagang21/o4o-platform/actions/runs/40818605154). `kpa-society-web`, `backend-kpa-society-web`, `neg-kpa-society-web` 제거, old_resource_count=0. 후속 독립 인벤토리에서도 backend/NEG 부재 확인.
- 모든 운영 변경은 기존 owner/main/CI/freeze·동시 writer 검사·계획 digest를 사용했다. DB/migration·IAM 변경 없음.

## 실패 기록과 검증 한계

앞선 전환 40816164897·40817043556은 공개 검증 실패 뒤 이전 라우팅을 복구했다. 첫 복구 인벤토리 40816769118은 전환 전 전체 host 연결과 동일했다. 당시 관측이 부족하므로 두 실패의 원인은 확정하지 않는다.

최종 전환의 첫 관측은 HTTP 200이지만 기존 Neture JS였으며 이후 목표 약국 JS와 일치했다. 검증 시간 안의 응답 반영 지연을 실제 관측했으며, 캐시 우회로 성공 조건을 대체하지 않았다. 공개 검증 실패 시 원상 복구·다른 writer의 수정 덮어쓰기 거부는 유지한다.

Pharmacy 169·Neture 1,464·공통 UI 212 tests 및 관련 빌드, 운영 Python 최종 53 tests 통과. 실제 빌드 desktop/mobile fixture로 공개·회원·운영 진입과 기존 법정 문서 URL 호환을 검사했다. 이 브라우저 검사는 합성 API fixture를 사용했고 production 업무 데이터를 쓰지 않았다. 로컬 네트워크 정책상 CarePharm 직접 요청은 허용되지 않아 이를 우회하지 않았으며 실제 공개 검증은 승인된 배포 워크플로에서 수행했다.

실계정 파일이 없어 실제 로그인·권한별 업무 조작은 검증하지 않았다. 공개 bundle 검증을 회원 업무 전체의 실계정 검증으로 해석하지 않는다. 기존 계정·세션·가입·자료·권한 저장 구조와 CarePharm publication key는 보존했고 Neture의 얇은 어댑터는 복구용 소비처로 유지한다.
