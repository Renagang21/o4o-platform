# O4O Local Work Agent — 등재 사이트 열기
#
# WO-O4O-BROWSER-CONTROL-V0 §14·§15·§16·§25·§27
#
# 입력은 환경변수 `O4O_SITE_URL` **하나뿐**이고, 그 값은 agent 가 **자기 등재부에서** 꺼낸
# 상수다. AI 도 서버도 사용자도 이 값을 만들 수 없다 — siteId 만 오고, URL 은 agent 코드에
# 박혀 있다. 그래도 여기서 다시 `https://` 인지 확인한다(이중 방어).
#
# 하는 일은 하나뿐이다: **Windows 기본 URL handler 로 주소를 연다** (Start-Process $url).
# 그 결과 사용자의 기본 브라우저가 (실행 중이면 그 세션에 새 탭으로, 아니면 새로 실행되어)
# 그 주소를 연다. 사용자의 기존 프로필·세션이 그대로 쓰인다(§16) — 별도 프로필을 만들지도,
# cookie 를 읽지도 않는다.
#
# 하지 않는 것: 임의 실행 파일 실행 · 인자 조립 · 브라우저 플래그 지정(remote-debugging 등) ·
# 로그인 · 키보드/마우스 입력 · 화면 캡처 · 쿠키/프로필 접근.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$raw = $env:O4O_SITE_URL
if ([string]::IsNullOrWhiteSpace($raw)) { throw 'O4O_SITE_URL missing' }
# HTTPS 절대 URL 만. 공백·따옴표·제어문자가 섞이면 거절한다.
if ($raw -notmatch '^https://[A-Za-z0-9][A-Za-z0-9\-\.]*(:[0-9]{1,5})?(/[^\s"''<>]*)?$') {
    throw 'O4O_SITE_URL not an https URL'
}

# 어느 브라우저가 https 를 받는지는 Windows 사용자 설정(UrlAssociations)이 정한다. 그 설정의
# ProgId 하나만 읽어 되돌린다 — 어떤 창을 앞으로 보낼지 · 무엇을 기다릴지 결정하는 데 쓴다.
# 값이 없거나 읽지 못하면 null. 이 스크립트가 그 설정을 바꾸지는 않는다.
$progId = $null
try {
    $choice = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice' -Name ProgId -ErrorAction Stop
    $progId = [string]$choice.ProgId
} catch {
    $progId = $null
}

# Start-Process 에 URL 을 주면 ShellExecute → 기본 브라우저 handler 로 넘어간다.
# 실행 파일을 지정하지 않으므로 "어떤 프로그램이 뜨는가" 는 Windows 사용자 설정이 정한다.
Start-Process -FilePath $raw

ConvertTo-Json -InputObject ([pscustomobject]@{ opened = $true; progId = $progId }) -Compress
