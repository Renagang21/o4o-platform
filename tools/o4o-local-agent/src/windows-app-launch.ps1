# O4O Local Work Agent — 등재 프로그램 실행 (WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 §22·§26·§27)
#
# 저장소 전체에서 `Start-Process` 를 쓰는 두 번째(마지막) 파일이다. 첫 번째(windows-browser-open.ps1)가
# "등재 https URL 을 OS handler 에 넘기는 것" 이라면, 이 파일은 "등재 실행 파일/바로가기 하나를 인자 없이
# 시작하는 것" 이다. 입력은 환경변수 하나(O4O_LAUNCH_PATH)뿐이고, 그 값은 agent 등재부의 **상수**다 —
# AI · 서버 · 사용자 문장이 이 값을 만들 수 없다.
#
# 경로 규칙(이중 방어 — JS 쪽이 이미 등재부 상수임을 보장한다):
#   - 절대 경로(드라이브 문자) · 확장자는 .exe 또는 .lnk 뿐
#   - 공백 · 따옴표 · 제어문자 · 줄바꿈 없음
#   - 파일이 실제로 존재해야 한다
# -ArgumentList · -Verb · -WorkingDirectory 는 쓰지 않는다. 인자 · 관리자 승격 · 셸 명령은 표현할 수 없다.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$raw = $env:O4O_LAUNCH_PATH
if ([string]::IsNullOrWhiteSpace($raw)) { throw 'O4O_LAUNCH_PATH missing' }
if ($raw -notmatch '^[A-Za-z]:\\[^"''<>|?*\r\n\t]+\.(exe|lnk)$') {
    throw 'O4O_LAUNCH_PATH not a registered executable or shortcut path'
}
if (-not (Test-Path -LiteralPath $raw -PathType Leaf)) {
    ConvertTo-Json -InputObject ([pscustomobject]@{ launched = $false; reason = 'NOT_FOUND' }) -Compress
    exit 0
}

$proc = Start-Process -FilePath $raw -PassThru
$pidValue = $null
if ($null -ne $proc) { $pidValue = [int]$proc.Id }

ConvertTo-Json -InputObject ([pscustomobject]@{ launched = $true; pid = $pidValue }) -Compress
