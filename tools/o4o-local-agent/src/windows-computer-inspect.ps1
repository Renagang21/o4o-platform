# O4O Local Work Agent — 대상 창 검사 (Computer Use V0)
#
# WO-O4O-COMPUTER-USE-V0 §9·§10·§11·§12·§14
#
# 입력은 환경변수 `O4O_WINDOW_HANDLE` **하나뿐**이고, 그 값은 agent 가 자기 census 에서 얻은
# 창 핸들이다(§8 "AI 가 HWND 를 직접 지정하지 않는다"). agent 쪽에서 10진 정수인지 다시
# 확인한 뒤에만 여기까지 온다.
#
# 하는 일:
#   1. 그 창이 지금 foreground 인지 (§9 target boundary)
#   2. client 영역 크기 (§10 "client area 우선")
#   3. foreground 일 때만 client 영역을 **메모리에서** 한 번 캡처하고 크기만 남긴 뒤 버린다
#
# 하지 않는 것: 이미지를 파일이나 stdout 으로 내보내기 · 주기적 캡처 · 다른 창 캡처 ·
# 창 제목 출력 · 입력. 반환은 아래 숫자와 불리언뿐이다(§12 "서버 DB 저장 0" 은 여기서
# 이미 이미지가 존재하지 않는 것으로 지킨다).

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$raw = $env:O4O_WINDOW_HANDLE
if ([string]::IsNullOrWhiteSpace($raw)) { throw 'O4O_WINDOW_HANDLE missing' }
if ($raw -notmatch '^[0-9]{1,19}$') { throw 'O4O_WINDOW_HANDLE invalid' }
$handle = [System.IntPtr][int64]$raw

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class O4OComputerInspect {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }

    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT point);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

if (-not [O4OComputerInspect]::IsWindowVisible($handle)) { throw 'window not visible' }

$fore = [O4OComputerInspect]::GetForegroundWindow()
$targetPid = [uint32]0
[void][O4OComputerInspect]::GetWindowThreadProcessId($handle, [ref]$targetPid)
$forePid = [uint32]0
[void][O4OComputerInspect]::GetWindowThreadProcessId($fore, [ref]$forePid)
$isForeground = ($fore -eq $handle)

$rect = New-Object O4OComputerInspect+RECT
[void][O4OComputerInspect]::GetClientRect($handle, [ref]$rect)
$clientWidth = [int]($rect.Right - $rect.Left)
$clientHeight = [int]($rect.Bottom - $rect.Top)

$captured = $false
$snapshotWidth = 0
$snapshotHeight = 0
if ($isForeground -and $clientWidth -gt 0 -and $clientHeight -gt 0 -and -not [O4OComputerInspect]::IsIconic($handle)) {
    # §10 client 영역만, §11 한 번만. 비트맵은 이 블록 안에서 만들어지고 이 블록 안에서 사라진다.
    $origin = New-Object O4OComputerInspect+POINT
    $origin.X = 0
    $origin.Y = 0
    [void][O4OComputerInspect]::ClientToScreen($handle, [ref]$origin)
    Add-Type -AssemblyName System.Drawing
    $bitmap = New-Object System.Drawing.Bitmap $clientWidth, $clientHeight
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.CopyFromScreen($origin.X, $origin.Y, 0, 0, $bitmap.Size)
            $captured = $true
            $snapshotWidth = $bitmap.Width
            $snapshotHeight = $bitmap.Height
        } finally {
            $graphics.Dispose()
        }
    } finally {
        $bitmap.Dispose()
    }
}

ConvertTo-Json -InputObject ([pscustomobject]@{
    visible        = $true
    foreground     = [bool]$isForeground
    targetPid      = [int64]$targetPid
    foregroundPid  = [int64]$forePid
    foregroundHwnd = [int64]$fore
    clientWidth    = $clientWidth
    clientHeight   = $clientHeight
    captured       = [bool]$captured
    snapshotWidth  = [int]$snapshotWidth
    snapshotHeight = [int]$snapshotHeight
}) -Compress
