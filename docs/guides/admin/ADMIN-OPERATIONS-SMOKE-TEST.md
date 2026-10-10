# Admin 운영 기능 직접 테스트

> **상태**: ACTIVE
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거**: 사용자 요청 — Google 로그인·SMTP 발송·AI 호출은 사용자가 직접 검증

이 안내는 테스트 방법이다. 작성 시점에 실제 계정 로그인·메일 발송·운영 AI 호출을 완료했다는 기록이 아니다.
현재 계약은 [Identity V3](../../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md),
[API 운영 runbook](../../baseline/operations/O4O-API-OPERATIONS-RUNBOOK-V1.md),
로컬 도구·설치는 [SETUP.md](../../../SETUP.md)를 따른다.

| 순서 | 실행 위치 | 통과 기준 |
|---|---|---|
| 1. Google 로그인 | 로컬 브라우저 | 관리자 화면 진입, 새로고침 후 세션 유지 |
| 2. AI 질문 1건 | 로그인된 Admin 브라우저 | 실제 API 성공과 비어 있지 않은 답변 |
| 3. SMTP 메일 1건 | 로컬 PowerShell 7 | SMTP 수락과 수신함 도착 모두 확인 |

## 1. Google 로그인

1. 로컬 브라우저에서 `https://admin.neture.co.kr/login`을 연다.
2. Google 버튼으로 기존 관리자 Google 계정을 선택한다. 비밀번호·토큰을 복사하지 않는다.
3. 관리자 화면에 진입하는지 확인하고 새로고침한다. 새로고침 후에도 관리자 화면을 사용할 수 있어야 한다.
4. `/settings/ai-query`를 열어 저장된 정책을 읽을 수 있는지 확인한다. 검증을 위해 정책을 수정·저장할 필요는 없다.

세션을 수치로 확인하려면 이 Admin 탭에서 F12 → Console에 아래를 실행한다.
사용자 프로필·토큰은 출력하지 않는다.

```javascript
(async () => {
  if (location.origin !== 'https://admin.neture.co.kr') throw new Error('Admin 탭에서 실행하세요.');
  const response = await fetch('https://api.neture.co.kr/api/v1/auth/status', { credentials: 'include' });
  const body = await response.json();
  console.table([{ test: '로그인 세션', http: response.status,
    success: body.success === true, authenticated: body.data?.authenticated === true }]);
})();
```

`http=200`, `success=true`, `authenticated=true`가 통과 기준이다.
Google 설정 API의 `enabled=true`만으로 실제 로그인 성공을 판정하지 않는다.
실패하면 Google 버튼 이후 어느 화면에서 멈췄는지와 HTTP 상태·오류 코드만 기록한다.
HAR·쿠키·ID token·개인 계정 응답 원문을 공유하지 않는다.

## 2. AI 실제 질문 1건

Google 로그인 직후 같은 Admin 탭의 Console에서 실행한다.
이 코드는 모델 목록·정책을 읽고, AI가 활성화되어 있으면 실제 질문을 **1회** 보낸다.
질문은 운영 사용량·질문 이력에 기록되고 공급자 호출 비용이 발생할 수 있다. 정책·키는 변경하지 않는다.

```javascript
(async () => {
  if (location.origin !== 'https://admin.neture.co.kr') throw new Error('Admin 탭에서 실행하세요.');
  const api = async (path, options = {}) => {
    const response = await fetch('https://api.neture.co.kr' + path, { ...options, credentials: 'include' });
    return { http: response.status, ok: response.ok, body: await response.json() };
  };
  const session = await api('/api/v1/auth/status');
  if (!session.ok || session.body.data?.authenticated !== true) {
    console.table([{ test: '로그인 필요', http: session.http }]);
    return;
  }
  const policy = await api('/api/ai/policy');
  const models = await api('/api/ai/models');
  console.table([{ test: '정책 조회', http: policy.http, success: policy.body.success === true,
    enabled: policy.body.data?.aiEnabled === true },
  { test: '모델 조회', http: models.http, success: models.body.success === true,
    source: models.body.data?.source ?? 'unknown' }]);
  if (!policy.ok || policy.body.success !== true || policy.body.data?.aiEnabled !== true) return;
  const result = await api('/api/ai/query', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '운영 연결 점검입니다. 연결 정상이라는 짧은 문장으로 답해주세요.', contextType: 'free' }) });
  console.table([{ test: 'AI 실제 호출', http: result.http, success: result.body.success === true,
    answerPresent: typeof result.body.answer === 'string' && result.body.answer.trim().length > 0,
    remainingQueries: result.body.remainingQueries ?? null, errorCode: result.body.errorCode ?? null }]);
})();
```

마지막 표의 `http=200`, `success=true`, `answerPresent=true`가 실제 호출 통과 기준이다.
모델 목록의 `source=static`은 내장 목록 사용이며 공급자 연결 성공을 의미하지 않는다.
`google-stale`은 과거 캐시이다. 모델 목록 조회만으로 질문 생성 성공을 판정하지 않는다.

| 결과 | 조치 |
|---|---|
| 401 | Google 로그인 후 다시 확인. 쿠키·토큰을 코드에 붙이지 않는다. |
| 403 | 관리자 권한 확인. 테스트를 위해 역할을 바꾸지 않는다. |
| AI 비활성화 | 현재 정책 때문에 호출을 보류한 것으로 기록한다. 임의로 활성화하지 않는다. |
| `NO_API_KEY` | 운영 키 구성 점검이 필요하다. 키를 Console·채팅·문서에 입력하지 않는다. |
| `LIMIT_EXCEEDED` / 429 | 한도·정책 확인. 반복 호출로 우회하지 않는다. |
| `AI_ERROR` / 5xx | HTTP 상태·오류 코드·실행 시각으로 운영 로그를 확인한다. |

## 3. SMTP 메일 1건

### 현재 화면의 검증 범위

Admin 이메일 설정 화면은 `Settings.value`에 값을 보관한다. 이 저장값은 실제 발송기에 자동 적용되지 않는다.
발송기는 환경 변수에서 transport를 만들며, transport가 없으면 별도 `SmtpSettings`를 조회한다.
현재 임의 수신자용 테스트 발송 API는 없다. Google 전용 관리자 계정에는 비밀번호 재설정 메일이 발송되지 않는다.

아래 방법은 **로컬 PC → 운영 SMTP 서버 → 지정 수신함**을 확인한다. Google 관리자 개인 주소도 수신자로 사용할 수 있다.
앱 서버의 SMTP 초기화·DB fallback·발송 템플릿까지 검증하는 방법은 아니다.
앱 전체 발송 검증은 기존 일반 테스트 계정의 정상 메일 흐름으로 별도 확인해야 한다.
HTTP 200인 재설정·재발송 응답도 계정 존재 여부를 숨기므로 실제 발송 성공 증거가 아니다.

### 필요한 값과 실행

운영자가 현재 적용된 SMTP 호스트·포트·암호화·사용자명·비밀번호·발신자를 확보한 경우에 실행한다.
Cloud Run `o4o-core-api`의 Variables & Secrets에서 설정 출처를 확인한다.
`SMTP_PASS`가 발송기의 비밀번호 변수이며, Admin 보관 기본값의 `SMTP_PASSWORD`와 혼동하지 않는다.
`EMAIL_SERVICE_ENABLED=false`이면 앱 발송은 비활성화 상태로 기록한다. 로컬 SMTP 성공으로 앱 발송 활성화를 주장하지 않는다.
DB fallback을 사용하거나 실제 운영값을 확보하지 못했다면 이 검증을 보류한다.
자격정보를 새로 발급하거나 운영 설정을 변경하는 단계는 포함하지 않는다.

로컬 저장소 루트에서 [SETUP.md](../../../SETUP.md)의 Node·pnpm·의존성 설치를 완료한 뒤 **PowerShell 7**에서 실행한다.
값은 입력 프롬프트로만 받으며 비밀번호는 숨겨 입력한다. 임의 개인 주소를 문서에 적지 않는다.

```powershell
$smtpProbe = @'
import nodemailer from 'nodemailer';
let input = '';
for await (const chunk of process.stdin) input += chunk;
let transport;
try {
  const config = JSON.parse(input);
  if (!config.host || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 ||
      !config.user || !config.pass || !config.from || !config.to || /[,;\r\n]/.test(config.to)) {
    throw Object.assign(new Error('Invalid input'), { code: 'INVALID_INPUT' });
  }
  transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure,
    requireTLS: !config.secure, tls: { rejectUnauthorized: true },
    auth: { user: config.user, pass: config.pass }, logger: false, debug: false,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
  await transport.verify();
  console.log('SMTP_CONNECTION_PASS');
  const result = await transport.sendMail({ from: config.from, to: config.to,
    subject: '[O4O] SMTP 연결 점검', text: '운영 SMTP 연결 점검용 메일 1건입니다.' });
  if (result.accepted?.length !== 1 || result.rejected?.length) {
    throw Object.assign(new Error('Recipient rejected'), { code: 'RECIPIENT_REJECTED' });
  }
  console.log('SMTP_ACCEPTED_1_RECIPIENT');
} catch (error) {
  console.error(JSON.stringify({ test: 'SMTP', code: error.code ?? 'SMTP_FAILED',
    responseCode: error.responseCode ?? null }));
  process.exitCode = 1;
} finally {
  transport?.close();
}
'@

$smtpConfig = @{
  host = (Read-Host '운영 SMTP 호스트').Trim()
  port = [int](Read-Host '운영 SMTP 포트')
  secure = (Read-Host '직접 TLS(보통 465)이면 true, STARTTLS(보통 587)이면 false') -eq 'true'
  user = Read-Host '운영 SMTP 사용자명'
  from = (Read-Host '운영 발신자 이메일').Trim()
  to = (Read-Host '점검 메일을 받을 본인 이메일').Trim()
}
$smtpSecurePassword = Read-Host '운영 SMTP 비밀번호' -AsSecureString
$smtpPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpSecurePassword)
try {
  $smtpConfig.pass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($smtpPasswordPointer)
  $smtpConfig | ConvertTo-Json -Compress | node --input-type=module -e $smtpProbe
  if ($LASTEXITCODE -ne 0) { throw 'SMTP 점검 실패: 표시된 오류 코드를 확인하세요.' }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($smtpPasswordPointer)
  $smtpConfig.Clear()
  $smtpSecurePassword.Dispose()
  Remove-Variable smtpConfig, smtpSecurePassword, smtpPasswordPointer
}
```

`SMTP_CONNECTION_PASS`는 연결·인증 확인, `SMTP_ACCEPTED_1_RECIPIENT`는 서버의 수신자 수락이다.
수신함·스팸함에서 점검 메일이 도착했는지 확인해야 **발송·수신 통과**로 기록한다.
수락됐는데 수신되지 않으면 발신자 정책·스팸 분류·SMTP 제공자 전달 로그를 확인한다.
인증 실패는 SMTP 계정·앱 비밀번호, 연결 실패는 호스트·포트·로컬 네트워크를 확인한다.
TLS 오류를 해결하려고 인증서 검증을 끄지 않는다.

## 결과 전달 양식

다음 항목만 전달한다. 수신 주소·키·쿠키·메일 링크·원문 응답은 제외한다.

- 실행 시각: 날짜와 한국 시간
- Google: 관리자 진입 성공/실패, 새로고침 유지 여부
- AI: HTTP 상태, success, answerPresent, errorCode
- SMTP: 연결 통과 여부, 수신자 수락 여부, 실제 수신 여부, 실패 시 오류 코드
- SMTP 범위: 로컬 SMTP 직접 연결 / 앱 전체 발송 흐름 중 실제 수행한 것

문서 예제의 구문 확인과 운영 기능의 실제 성공은 구분한다. 실제 테스트는 사용자가 수행한다.
