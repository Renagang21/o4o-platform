# Neture 배포 난독화 소규모 비교 시험

이 도구는 **운영 미적용 실험**이다. 실제 Neture의 로그인 복귀 경로 함수와 공급자 상품 초안 파서만 작은 ESM 파일로 빌드하고, 압축본과 가벼운 난독화본을 비교한다. 기본 `names`는 이름 변환만, `strings`는 문자열 이스케이프까지 시험한다. 화면 전체나 업무 연결 설계의 복제 방지 효과를 입증하는 도구가 아니다.

## 실행

저장소의 Node 22.18.0 · pnpm 10.25.0을 사용한다. 시험 의존성은 이 디렉터리의 독립 package/lockfile에만 고정했다. **일반 workspace 설치, 개발 서버, 앱 빌드, Dockerfile, CI/CD에는 연결하지 않는다.**

저장소 루트에서:

```sh
pnpm --dir services/web-neture/tools/obfuscation-pilot install --ignore-workspace --frozen-lockfile --ignore-scripts --verify-store-integrity=true
pnpm --dir services/web-neture/tools/obfuscation-pilot build
pnpm --dir services/web-neture/tools/obfuscation-pilot test
pnpm --dir services/web-neture/tools/obfuscation-pilot exec playwright install chromium
pnpm --dir services/web-neture/tools/obfuscation-pilot verify:browser
```

이미 설치된 Chromium을 쓸 때는 `PILOT_CHROMIUM_EXECUTABLE`에 실행 파일 경로를 지정한다. Linux 예:

```sh
PILOT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm --dir services/web-neture/tools/obfuscation-pilot verify:browser
```

PowerShell 예:

```powershell
$env:PILOT_CHROMIUM_EXECUTABLE = '<설치된 Chromium 실행 파일>'
pnpm --dir services/web-neture/tools/obfuscation-pilot verify:browser
Remove-Item Env:PILOT_CHROMIUM_EXECUTABLE
```

`test`와 `verify:browser`도 비교 파일을 새로 빌드한다. 같은 worktree에서 두 명령을 동시에 실행하지 않는다. 기본 설치·빌드 명령에 이 시험을 넣지 않는다.

문자열 후보는 `NETURE_PILOT_PROFILE=strings`를 지정해 같은 명령을 실행한다. 예:

```sh
NETURE_PILOT_PROFILE=strings pnpm --dir services/web-neture/tools/obfuscation-pilot test
NETURE_PILOT_PROFILE=strings PILOT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm --dir services/web-neture/tools/obfuscation-pilot verify:browser
```

PowerShell에서는 `$env:NETURE_PILOT_PROFILE = 'strings'`를 지정하고, 시험 뒤 `Remove-Item Env:NETURE_PILOT_PROFILE`로 해제한다. `names`·`strings` 외 값은 거절한다. 각 후보의 성능 예산은 같으며 실패를 통과로 바꾸지 않는다.

## 적용 범위와 강도

- 실제 모듈: `src/lib/loginReturnPath.ts`, `src/lib/supplier-product-authoring/parse.ts`, 파서의 상수·타입 모듈. `entry.ts`는 시험에서만 쓰는 export 진입점이다.
- 번들에 이 allowlist 밖 모듈이 들어오면 중단한다. React·외부 라이브러리·공통 package를 난독화하지 않는다.
- 실제 앱 모드와 같은 Vite/esbuild 공백·식별자 압축 뒤 짧은 식별자 재배치(`mangled-shuffled`)를 적용한다. `strings` 후보만 문자열 이스케이프를 추가한다. seed를 고정한다. Vite library 모드는 ES 공백을 남기므로 비교 기준으로 사용하지 않는다.
- 속성 이름, export, URL, API 필드, 문자열의 실행 시 값은 보존한다.
- 문자열 배열·런타임 디코더, 흐름 변형, 가짜 코드, 전역/속성 이름 변경, 콘솔 억제, eval, 디버거 방해와 self-defending은 사용하지 않는다.
- 이스케이프는 쉽게 되돌릴 수 있다. 암호화나 비밀 보호 수단이 아니며 API 응답·실제 사용자 동작을 숨기지 않는다.

## 산출물과 오류 복원

산출물은 checkout·Docker context 밖인 OS 임시 폴더 `o4o-neture-obfuscation-pilot/<worktree 경로 hash>/<profile>/`에 둔다. `build` 출력의 `outputRoot`로 실제 위치를 확인한다.

| 경로 | 내용 |
|---|---|
| `public/baseline/pilot.js` | 일반 압축 비교본 |
| `public/obfuscated/pilot.js` | 난독화 비교본 |
| `private/baseline.js.map` | 압축본 → 원본 TS 대응 |
| `private/obfuscated.js.map` | 난독화본 → 압축본 대응 |
| `private/manifest.json` | 도구 버전·옵션·입력 해시·출력 해시·크기·빌드 시간 |
| `private/browser-report.json` | 브라우저 합성 검증·성능 측정 결과 |

공개용 파일에는 소스맵·소스맵 URL을 넣지 않는다. 로컬 시험 서버는 정확히 지정한 JS와 harness만 제공하고 private/map 경로는 404로 거절한다. 원본 코드가 포함된 private 폴더를 커밋하거나 공개 artifact·정적 호스팅에 올리지 않는다. OS 임시 폴더는 장기 보존소가 아니다. 향후 운영 채택 전에는 배포 SHA/파일 해시에 대응하는 비공개 소스맵 저장·보존·복원 절차가 필요하다.

`restorePosition()`은 Node의 `SourceMap`을 사용해 두 map을 순서대로 읽는다. 단위 시험과 Chromium 모두 실제 변환본의 파서 예외를 발생시켜 원본 `parse.ts`의 `.trim()` 행으로 복원되는지 확인한다. 운영 오류 추적 서비스에 연결한 것은 아니다.

## 비교 기준과 한계

- 합성 입력으로 정상/오류/경고·금지 필드·외부 복귀 경로 거절 결과가 정확히 같아야 한다.
- Chromium desktop 1440px/mobile 390px에서 입력·버튼을 통한 합성 흐름과 corpus 결과를 비교한다. CSP는 eval 없이 실행 가능한지 확인한다. 외부 요청·쓰기 요청·page error는 0이어야 한다.
- 크기 예산: gzip 증가율 20% 이하이면서 증가량 1KiB 이하. 이 **작은 시험 번들**에만 쓰는 상한이며 운영 전체 허용 기준이 아니다.
- 지연 예산: 긴 합성 초안 파싱과 복귀 경로 해석을 묶은 1회당 추가 시간이 중앙값 기준 0.1ms 이하. 2,000회씩, warm-up 후 순서를 교대로 바꿔 10회 측정한다.
- 로컬 모듈 import 시간은 관측치로만 남긴다. 인터넷 전송·실제 앱 전체 로딩·저사양 단말의 지연을 대신하지 않는다.
- 예산이나 동작 검증에 실패해도 강도를 자동으로 낮추거나 운영에 적용하지 않는다. 실패를 보고하고 기본 빌드는 유지한다.
- 실계정 로그인, 실제 저장, API 호출, 운영 배포, 모바일 실기기 검증은 포함하지 않는다.

다음 단계는 실제 Neture route chunk의 vendor 혼입·해시·캐시·전체 화면·비공개 오류 추적을 검증하는 별도 작업이다. 이 시험 도구를 통과했다고 운영 빌드 전체에 바로 적용하지 않는다.
