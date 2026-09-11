# O4O Local Work Agent — 대상 창 안 단일 입력 (Computer Use V0)
#
# WO-O4O-COMPUTER-USE-V0 §9·§15~§22·§26
#
# 입력은 환경변수뿐이다. 값은 전부 agent 가 서버 인자를 **다시 검사한 뒤** 넘긴 것이고,
# 여기서 한 번 더 형식을 확인한다(§26 삼중 검사 — 서버 · agent JS · 이 스크립트).
#
#   O4O_WINDOW_HANDLE  창 핸들 (agent 자신의 census 값, 10진 정수)
#   O4O_INPUT_KIND     click | text | key
#   O4O_INPUT_X / _Y   click: client 영역 정규화 좌표 0..1 (소수 6자리까지)
#   O4O_INPUT_TEXT     text : 1~500자, 제어문자 없음
#   O4O_INPUT_KEY      key  : ENTER | TAB | ESC
#
# 실행 조건 (§9 target boundary): 실행 **직전**에 대상 창이 foreground 여야 하고, 아니면
# 아무 입력도 만들지 않고 `executed=false` 로 끝낸다. 실행 **직후** 다시 foreground 를 확인해
# `verified` 로 보고한다. 클릭 좌표는 client 영역 안으로만 환산되며 밖이면 실행하지 않는다(§16).
#
# 하지 않는 것: 우클릭 · 더블클릭 · 드래그 · 스크롤 · 키 조합 · WIN · ALT · CTRL · 임의 VK ·
# 창 닫기 · 프로세스 종료 · 화면 캡처 · 클립보드. 아래 C# 에는 그것을 표현할 메서드가 없다.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$raw = $env:O4O_WINDOW_HANDLE
if ([string]::IsNullOrWhiteSpace($raw)) { throw 'O4O_WINDOW_HANDLE missing' }
if ($raw -notmatch '^[0-9]{1,19}$') { throw 'O4O_WINDOW_HANDLE invalid' }
$handle = [System.IntPtr][int64]$raw

$kind = $env:O4O_INPUT_KIND
if ($kind -notmatch '^(click|text|key)$') { throw 'O4O_INPUT_KIND invalid' }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class O4OComputerInput {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public INPUTUNION u; }

    const uint INPUT_MOUSE = 0;
    const uint INPUT_KEYBOARD = 1;
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    const uint KEYEVENTF_KEYUP = 0x0002;
    const uint KEYEVENTF_UNICODE = 0x0004;

    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT point);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    static uint Send(INPUT[] inputs) {
        return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    // 왼쪽 버튼 down/up 한 쌍. 커서는 호출자가 이미 client 영역 안 좌표로 옮겨 놓았다.
    public static bool LeftClick() {
        INPUT[] inputs = new INPUT[2];
        inputs[0].type = INPUT_MOUSE; inputs[0].u.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        inputs[1].type = INPUT_MOUSE; inputs[1].u.mi.dwFlags = MOUSEEVENTF_LEFTUP;
        return Send(inputs) == 2;
    }

    // UTF-16 code unit 하나당 KEYEVENTF_UNICODE down/up. 가상키 · 스캔코드 · 수식키를 만들지 않는다.
    public static bool TypeUnicode(string text) {
        INPUT[] inputs = new INPUT[text.Length * 2];
        for (int i = 0; i < text.Length; i++) {
            inputs[i * 2].type = INPUT_KEYBOARD;
            inputs[i * 2].u.ki.wScan = text[i];
            inputs[i * 2].u.ki.dwFlags = KEYEVENTF_UNICODE;
            inputs[i * 2 + 1].type = INPUT_KEYBOARD;
            inputs[i * 2 + 1].u.ki.wScan = text[i];
            inputs[i * 2 + 1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
        }
        return Send(inputs) == (uint)inputs.Length;
    }

    // 허용키 셋만 이름을 가진다. 그 밖의 VK 를 받는 메서드는 없다(§19·§20).
    public static bool PressAllowedKey(string name) {
        ushort vk;
        if (name == "ENTER") vk = 0x0D;
        else if (name == "TAB") vk = 0x09;
        else if (name == "ESC") vk = 0x1B;
        else return false;
        INPUT[] inputs = new INPUT[2];
        inputs[0].type = INPUT_KEYBOARD; inputs[0].u.ki.wVk = vk;
        inputs[1].type = INPUT_KEYBOARD; inputs[1].u.ki.wVk = vk; inputs[1].u.ki.dwFlags = KEYEVENTF_KEYUP;
        return Send(inputs) == 2;
    }
}
'@

function Get-ForegroundState {
    $fore = [O4OComputerInput]::GetForegroundWindow()
    $forePid = [uint32]0
    [void][O4OComputerInput]::GetWindowThreadProcessId($fore, [ref]$forePid)
    return [pscustomobject]@{ hwnd = [int64]$fore; procId = [int64]$forePid }
}

function Write-Result([bool]$executed, [string]$reason, [bool]$verified, [int]$clientWidth, [int]$clientHeight) {
    $fg = Get-ForegroundState
    $targetPid = [uint32]0
    [void][O4OComputerInput]::GetWindowThreadProcessId($handle, [ref]$targetPid)
    ConvertTo-Json -InputObject ([pscustomobject]@{
        executed       = $executed
        reason         = $reason
        verified       = $verified
        kind           = $kind
        targetPid      = [int64]$targetPid
        foregroundPid  = $fg.procId
        foregroundHwnd = $fg.hwnd
        clientWidth    = $clientWidth
        clientHeight   = $clientHeight
    }) -Compress
}

if (-not [O4OComputerInput]::IsWindowVisible($handle)) {
    Write-Result -executed $false -reason 'TARGET_NOT_VISIBLE' -verified $false -clientWidth 0 -clientHeight 0
    exit 0
}

$rect = New-Object O4OComputerInput+RECT
[void][O4OComputerInput]::GetClientRect($handle, [ref]$rect)
$clientWidth = [int]($rect.Right - $rect.Left)
$clientHeight = [int]($rect.Bottom - $rect.Top)

# §9 실행 직전 boundary — 대상 창이 앞에 있지 않으면 어떤 입력도 만들지 않는다.
$before = Get-ForegroundState
if ($before.hwnd -ne [int64]$handle) {
    Write-Result -executed $false -reason 'TARGET_LOST' -verified $false -clientWidth $clientWidth -clientHeight $clientHeight
    exit 0
}

$ok = $false
switch ($kind) {
    'click' {
        $xs = $env:O4O_INPUT_X
        $ys = $env:O4O_INPUT_Y
        $coordPattern = '^(0(\.[0-9]{1,6})?|1(\.0{1,6})?)$'
        if ($xs -notmatch $coordPattern -or $ys -notmatch $coordPattern) { throw 'O4O_INPUT_X/Y invalid' }
        if ($clientWidth -le 0 -or $clientHeight -le 0) {
            Write-Result -executed $false -reason 'OUT_OF_BOUNDS' -verified $false -clientWidth $clientWidth -clientHeight $clientHeight
            exit 0
        }
        $x = [double]::Parse($xs, [System.Globalization.CultureInfo]::InvariantCulture)
        $y = [double]::Parse($ys, [System.Globalization.CultureInfo]::InvariantCulture)
        # 정규화 → client 픽셀. 1.0 은 마지막 픽셀에 고정한다(닫힌 구간).
        $px = [int][math]::Min([math]::Floor($x * $clientWidth), $clientWidth - 1)
        $py = [int][math]::Min([math]::Floor($y * $clientHeight), $clientHeight - 1)
        if ($px -lt 0 -or $py -lt 0 -or $px -ge $clientWidth -or $py -ge $clientHeight) {
            Write-Result -executed $false -reason 'OUT_OF_BOUNDS' -verified $false -clientWidth $clientWidth -clientHeight $clientHeight
            exit 0
        }
        $pt = New-Object O4OComputerInput+POINT
        $pt.X = $px
        $pt.Y = $py
        [void][O4OComputerInput]::ClientToScreen($handle, [ref]$pt)
        [void][O4OComputerInput]::SetCursorPos($pt.X, $pt.Y)
        Start-Sleep -Milliseconds 40
        $ok = [O4OComputerInput]::LeftClick()
    }
    'text' {
        $text = $env:O4O_INPUT_TEXT
        if ([string]::IsNullOrEmpty($text)) { throw 'O4O_INPUT_TEXT missing' }
        if ($text.Length -gt 500) { throw 'O4O_INPUT_TEXT too long' }
        if ($text -match '[\x00-\x1f\x7f-\x9f]') { throw 'O4O_INPUT_TEXT control char' }
        $ok = [O4OComputerInput]::TypeUnicode($text)
    }
    'key' {
        $key = $env:O4O_INPUT_KEY
        if ($key -notmatch '^(ENTER|TAB|ESC)$') { throw 'O4O_INPUT_KEY invalid' }
        $ok = [O4OComputerInput]::PressAllowedKey($key)
    }
}

if (-not $ok) {
    Write-Result -executed $false -reason 'INPUT_FAILED' -verified $false -clientWidth $clientWidth -clientHeight $clientHeight
    exit 0
}

# §6·§9 실행 직후 재확인 — 입력이 들어간 뒤에도 대상 창이 앞에 있는가.
Start-Sleep -Milliseconds 120
$after = Get-ForegroundState
$verified = ($after.hwnd -eq [int64]$handle)
Write-Result -executed $true -reason '' -verified $verified -clientWidth $clientWidth -clientHeight $clientHeight
