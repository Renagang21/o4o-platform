# Neture 가벼운 배포 난독화 소규모 시험

> **상태**: COMPLETED · 비교 시험 완료, 운영 미적용
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20
> **기준**: main `8075aa77caf8869c2815d7242cb65a5c07464c6a`
> **실행 방법**: [시험 도구 README](../../services/web-neture/tools/obfuscation-pilot/README.md)

## 목적과 범위

개발 원본·일반 빌드·사용자 경험에 영향을 주지 않는 추가 난독화의 비용을 작은 자체 코드 묶음에서 측정했다. 보호 목표는 업무 사이 연결 설계의 재구성 비용을 조금 높이는 보조 수단이며, 기능 은폐나 접근 통제를 대체하지 않는다.

실제 Neture의 `loginReturnPath.ts`, `supplier-product-authoring/parse.ts`와 파서 상수 모듈만 사용했다. 앱 소스는 변경하지 않았다. 시험 전용 entry가 Vite **앱 모드**의 esbuild 압축을 거친 뒤 javascript-obfuscator로 변환된다. allowlist 밖 모듈이 섞이면 중단한다. 라이브러리 모드는 ES 공백을 남기므로 최종 비교 기준에서 제외했다.

시험 의존성은 `services/web-neture/tools/obfuscation-pilot/`의 독립 package/lockfile에 고정했다. 일반 workspace의 package.json·lockfile, Vite 설정, Dockerfile, CI/CD는 변경하지 않았다. 산출물은 checkout과 Docker context 밖의 OS 임시 폴더에 worktree·후보별로 분리했다.

push 직전 main은 `b54074d038`로 이동했다(#717). 시험 대상 모듈·Vite 설정·Neture package.json·AGENTS·SETUP에는 변경이 없어 위 기준의 검증을 유지했다. 다른 작업의 커밋은 이 branch에 합치지 않았다.

## 후보와 판정

공통 설정은 짧은 식별자 재배치(`mangled-shuffled`), 고정 seed, 속성·export 이름 보존이다. 흐름 변형·가짜 코드·문자열 배열/디코더·eval·디버거 방해·콘솔 억제·self-defending은 사용하지 않았다.

| 후보 | 추가 변환 | JS 크기 | gzip 크기 | 압축본 대비 gzip | 판정 |
|---|---|---:|---:|---:|---|
| baseline | 기존 압축 | 4,993 B | 2,155 B | — | 비교 기준 |
| names | 식별자 재배치 | 5,557 B | 2,275 B | +120 B / +5.57% | 이 작은 시험의 예산 통과 |
| strings | names + 문자열 이스케이프 | 12,599 B | 2,656 B | +501 B / +23.25% | 크기 예산 초과, 보류 |

두 후보에 같은 예산을 적용했다: gzip 증가율 20% 이하이면서 증가량 1KiB 이하, 1회 작업 추가 지연 중앙값 0.1ms 이하. `strings` 브라우저 명령은 크기 초과로 **exit 1**이다. 이를 성공으로 처리하거나 상한을 올리지 않았다. 기본 시험 후보는 `names`이며, 운영 빌드에는 어느 후보도 연결하지 않았다.

초기 library-mode·긴 hexadecimal 식별자의 수치는 최종 수치로 쓰지 않는다. 비교 기준을 실제 앱 모드의 공백 압축에 맞춘 뒤 위 결과를 재산출했다. 문자열 일부를 남기는 후보도 비교했으나 해당 샘플에서는 gzip이 줄지 않아 채택하지 않았다.

## 검증

환경: Node 22.18.0, pnpm 10.25.0, Vite 5.4.19, javascript-obfuscator 4.1.1, Playwright 1.57.0, Chromium 154.0.8037.57 (Linux).

| 검증 | 결과 |
|---|---|
| 독립 도구 frozen install + integrity 검증 | PASS |
| names 변환본 계약·경계·맵·재현성 Node 테스트 | 30 PASS / 0 FAIL / 0 SKIP |
| strings 변환본 같은 테스트 | 30 PASS / 0 FAIL / 0 SKIP |
| 기존 로그인 복귀 경로·초안 파서 Vitest | 2 files / 17 PASS |
| 후보별 합성 브라우저 | 1440px·390px × baseline/변환본, 각 4개 입력·버튼 흐름 정상 |
| 후보별 브라우저 corpus | 각 페이지 23개 입력, baseline과 변환본 결과 일치 |
| 소스맵 복원 | Node·브라우저 모두 실제 변환본의 TypeError → 원본 `parse.ts`의 `.trim()` 행 |
| 공개 경로 검사 | private manifest·map 경로 모두 404, JS의 map URL 없음 |
| page error / 외부 요청 / 쓰기 요청 | 각 후보 모두 0 / 0 / 0 |
| JS 도구 ESLint recommended + Node/browser globals | 오류 0 |
| 시험 entry의 저장소 ESLint | 오류 0 |
| 문서 민감정보 패턴 검사 | 0건 |

시험 도구 작성 중 오류 복원 입력이 오류를 발생시키지 않던 문제와 비동기 테스트 선언 누락을 고쳤다. 위 수치는 수정 후 최종 실행 결과다.

## 성능 관측과 한계

긴 합성 초안 파싱 + 로그인 복귀 경로 해석을 한 작업으로 묶었다. warm-up 후 baseline/변환본의 실행 순서를 교대로 바꿔 2,000회씩 10개 표본을 측정했다.

| 후보 | baseline 중앙값 / 2,000회 | 변환본 중앙값 / 2,000회 | 추가 지연 예산 |
|---|---:|---:|---|
| names | 15.0ms | 10.5ms | 통과 |
| strings | 15.9ms | 16.1ms | 통과 |

JIT·캐시·표본 변동을 포함하는 단일 머신 합성 측정이다. names가 실제 서비스를 빠르게 한다는 근거로 쓰지 않는다. 로컬 모듈 import 관측치는 names에서 baseline 39.9~45.4ms / 변환본 11.9~13.4ms, strings에서 baseline 30.3~34.5ms / 변환본 13.6~16.3ms였다. 순서·로컬 HTTP 비용을 포함하므로 인터넷 전송·앱 전체 로딩 성능의 비교 근거로 쓰지 않는다.

실제 Neture 화면, 실계정 로그인, API·저장, 실기기, 전체 production build 및 운영 배포는 이번 시험에서 실행하지 않았다. 본 시험은 실제 모듈을 작은 합성 화면에 연결한 검증이다.

## 오류 추적·다음 판단

private manifest에는 입력 소스 해시·출력 파일 해시·도구 버전·옵션을 보관한다. 두 단계 source map(변환본 → 압축본 → 원본)은 공개 디렉터리에 넣지 않는다. 임시 폴더의 map은 장기 운영 오류 추적 체계가 아니다.

`names`는 비용 측면의 시험 후보일 뿐이다. 기본 Vite도 이미 이름을 축약하므로 추가 보호 효과는 제한적이다. `strings` 이스케이프도 쉽게 되돌릴 수 있다. 업무 연결 설계 복제 난이도가 얼마나 증가하는지는 측정하지 않았다.

운영 채택은 별도 판단이다. 실제 route chunk의 vendor 혼입·해시·캐시, 전체 화면 회귀, 저사양 기기와 비공개 map 보존·복원 절차가 확인되기 전에는 적용하지 않는다. DB·GCS·IAM/WIF·운영 workflow 변경은 없다.

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
