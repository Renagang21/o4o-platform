# Neture 배포 난독화 소규모 비교 시험

이 도구는 **운영 미적용 실험**이다. 실제 Neture의 로그인 복귀 경로 함수와 공급자 상품 초안 파서만 작은 ESM 파일로 빌드하고, 압축본과 가벼운 난독화본을 비교한다. 기본 `names`는 이름 변환만, `strings`는 문자열 이스케이프까지 시험한다. 화면 전체나 업무 연결 설계의 복제 방지 효과를 입증하는 도구가 아니다.

## 실행

저장소의 Node 22.18.0 · pnpm 10.25.0을 사용한다. 의존성은 이 디렉터리의 독립 package/lockfile에만 고정했다. 일반 workspace 설치·개발 서버는 도구를 설치하거나 읽지 않는다. 아래 소규모 비교 명령과 별도로, 2단계 운영 연결은 Docker 이미지 빌드와 CI에서만 이 고정 도구를 설치한다.

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

## 2단계: 선택 모듈의 운영 연결

사용자의 운영 적용 지시에 따라 `production.mjs`를 추가했다. 대상 모듈 3개는 그대로이며 **이름 변환만** 허용한다. 소규모 시험의 `strings` 후보는 운영에 연결하지 않는다.

- 일반 `vite`/`vite build`는 `NETURE_OBFUSCATION` 기본값 `off`여서 동작이 그대로다. 도구의 동적 로드도 생략한다.
- production 모드의 `vite build`에서 `NETURE_OBFUSCATION=names`일 때만 적용한다. dev 서버에서는 적용하지 않는다. 다른 설정 값은 거절한다.
- Neture Dockerfile의 해당 ARG 기본값은 `names`다. 고정 lockfile로 빌드 도구를 설치한다. React·외부 라이브러리는 allowlist 밖이므로 변환하지 않는다.
- Rollup의 별도 `neture-logic-<hash>.js` chunk에 allowlist만 들어가는지 확인하고, 최종 압축 뒤 변환한다. 반환된 source map은 Rollup이 TS 원본까지 합성한다.
- gzip 증가율 20%/1KiB 상한, 단일 chunk, hidden map, 공개 경로와 map hash 검사를 실패하면 빌드를 중단한다.
- 모든 `.map`은 `dist`에서 제거하고, 변환 대상의 map·manifest만 비공개 위치에 보관한다. 로컬 기본값은 workspace 밖 OS 임시 폴더의 `o4o-neture-production-debug/<경로 hash>/`이며, Docker builder는 `NETURE_PRIVATE_DEBUG_DIR=/app/.private-neture-build`로 명시한다. 일반 개발 서버가 로컬 map을 정적으로 제공하지 않도록 workspace 밖을 사용한다.
- Docker 최종 이미지에는 map·manifest를 nginx document root **밖**인 `/opt/o4o-private-debug/`에 복사한다. root만 읽을 수 있고 서버 UID 101에는 읽기 권한이 없다. 브라우저·공개 Actions artifact에는 map을 업로드하지 않는다.
- 기존 비공개 registry의 **배포 SHA 이미지**와 manifest의 최종 asset/map 해시가 대응한다. 별도 bucket·IAM·WIF·자격정보는 만들거나 변경하지 않는다.

운영 이미지 접근 권한이 있는 담당자가 해당 SHA 이미지를 받아 복원 정보를 추출한다. 실행 서버나 브라우저에서 map을 가져오는 방식이 아니다.

```sh
docker pull gcr.io/netureyoutube/neture-web:<배포 SHA>
docker create --name neture-debug-extract gcr.io/netureyoutube/neture-web:<배포 SHA>
docker cp neture-debug-extract:/opt/o4o-private-debug ./neture-private-debug
docker rm neture-debug-extract
node services/web-neture/tools/obfuscation-pilot/restore.mjs ./neture-private-debug assets/neture-logic-<hash>.js <줄> <열>
```

이미지에서 추출한 private 폴더는 접근이 제한된 위치에 둔다. 줄·열은 브라우저 stack의 1부터 시작하는 값을 쓴다. manifest의 파일명·map 해시가 다르면 복원을 거절한다. 이 이미지 tag의 보존 정책을 유지해야 해당 버전의 오류를 복원할 수 있다.

운영 문제 시 기존 verified rollout의 자동 원복 경계를 유지한다. 변환을 지속적으로 해제하려면 Docker ARG 기본값을 `off`로 되돌리는 PR을 정상 CI·배포 경로로 반영한다. 규칙이나 배포 gate를 우회하지 않는다.
