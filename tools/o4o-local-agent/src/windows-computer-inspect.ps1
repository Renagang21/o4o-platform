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
# 하지 않는 것: 이미지를 파일로 내보내기 · 주기적 캡처 · 다른 창 캡처 · 창 제목 출력 · 입력.
#
# ── Visual Computer Use (WO-O4O-WINDOWS-VISUAL-COMPUTER-USE-AND-FAST-LOOP-V1 §4·§4-1) ──
#   환경변수 `O4O_INSPECT_CAPTURE=1` 이 올 때만, 그리고 foreground 캡처가 실제로 성공했을 때만,
#   그 client 영역 비트맵을 **stdout 으로 한 번** JPEG base64 로 내보낸다. 목적은 UIA 가 못 보는
#   화면을 AI planner 가 실제로 보고 이어서 작업하게 하는 것이다.
#   지키는 경계: 파일 저장 0 (MemoryStream 만) · 장변 상한 축소(캡처 대역·프롬프트 비용) ·
#   플래그가 없으면 종전대로 이미지 필드 자체가 없다(하위호환) · base64 는 이 프로세스 stdout 한 줄로만
#   존재하고 handler → 서버 요청 메모리까지만 흐르며 DB·장기로그엔 닿지 않는다(경계는 상위 계층이 지킨다).

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

# Visual Computer Use: 이미지를 실제로 내보낼지. '1' 일 때만. 그 밖의 모든 값은 종전(치수만).
$wantImage = ($env:O4O_INSPECT_CAPTURE -eq '1')
$imageMaxDim = 1280   # 장변 상한 — 캡처 대역·프롬프트 토큰 비용을 억제한다(§4-1).
$imageQuality = 72    # JPEG 품질

$captured = $false
$snapshotWidth = 0
$snapshotHeight = 0
$imageBase64 = $null
$imageWidth = 0
$imageHeight = 0
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
        if ($wantImage) {
            # 장변을 상한에 맞춰 축소한 사본을 만들고 JPEG 로 인코딩한다. 원본·사본·스트림 모두
            # 이 블록에서 만들어지고 이 블록에서 Dispose 된다 — 파일로 나가지 않는다.
            $scale = [Math]::Min(1.0, $imageMaxDim / [double]([Math]::Max($clientWidth, $clientHeight)))
            $outW = [Math]::Max(1, [int][Math]::Floor($clientWidth * $scale))
            $outH = [Math]::Max(1, [int][Math]::Floor($clientHeight * $scale))
            $scaled = New-Object System.Drawing.Bitmap $outW, $outH
            try {
                $sg = [System.Drawing.Graphics]::FromImage($scaled)
                try {
                    $sg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                    $sg.DrawImage($bitmap, 0, 0, $outW, $outH)
                } finally {
                    $sg.Dispose()
                }
                $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
                $encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
                $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [int64]$imageQuality)
                $stream = New-Object System.IO.MemoryStream
                try {
                    if ($jpegCodec) { $scaled.Save($stream, $jpegCodec, $encParams) }
                    else { $scaled.Save($stream, [System.Drawing.Imaging.ImageFormat]::Jpeg) }
                    $imageBase64 = [Convert]::ToBase64String($stream.ToArray())
                    $imageWidth = $outW
                    $imageHeight = $outH
                } finally {
                    $stream.Dispose()
                    $encParams.Dispose()
                }
            } finally {
                $scaled.Dispose()
            }
        }
    } finally {
        $bitmap.Dispose()
    }
}

$out = [ordered]@{
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
}
if ($imageBase64) {
    # imageMime + imageBase64 + 실제 인코딩 치수. 플래그가 꺼져 있거나 캡처가 없으면 이 세 필드는 아예 없다.
    $out.imageMime = 'image/jpeg'
    $out.imageWidth = [int]$imageWidth
    $out.imageHeight = [int]$imageHeight
    $out.imageBase64 = $imageBase64
}
ConvertTo-Json -InputObject ([pscustomobject]$out) -Compress
