# O4O Local Work Agent — 창 활성화
#
# WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §13·§18·§19
#
# 입력은 환경변수 `O4O_WINDOW_HANDLE` **하나뿐**이고, 그 값은 agent 가 자기 census 에서
# 얻은 창 핸들이다. AI 도 서버도 이 값을 만들 수 없다. agent 쪽에서 10진 정수인지 다시
# 확인한 뒤에만 여기까지 온다.
#
# 하는 일은 두 가지뿐이다: **최소화면 복원**, **foreground 로 전환**.
# 하지 않는 것: 창 닫기 · 프로세스 종료 · 크기/위치 변경 · 키보드/마우스 입력 · 화면 캡처.
# 숨은 창을 임의로 띄우지도 않는다 — census 가 애초에 보이는 창만 넘긴다(§18).

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$raw = $env:O4O_WINDOW_HANDLE
if ([string]::IsNullOrWhiteSpace($raw)) { throw 'O4O_WINDOW_HANDLE missing' }
if ($raw -notmatch '^[0-9]{1,19}$') { throw 'O4O_WINDOW_HANDLE invalid' }
$handle = [System.IntPtr][int64]$raw

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class O4OWindowActivate {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr processId);
    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint attachTo, uint attachFrom, bool attach);
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    public const int SW_RESTORE = 9;
}
'@

if (-not [O4OWindowActivate]::IsWindowVisible($handle)) { throw 'window not visible' }

$restored = $false
if ([O4OWindowActivate]::IsIconic($handle)) {
    # 최소화된 창만 복원한다. 그 외 상태에는 ShowWindow 를 호출하지 않는다(§18).
    [void][O4OWindowActivate]::ShowWindow($handle, [O4OWindowActivate]::SW_RESTORE)
    $restored = $true
    Start-Sleep -Milliseconds 150
}

[void][O4OWindowActivate]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 120
$ok = ([O4OWindowActivate]::GetForegroundWindow() -eq $handle)

if (-not $ok) {
    # Windows 는 background 프로세스의 foreground 전환을 자주 거절한다.
    # 입력 큐를 잠시 붙여 한 번만 다시 시도한다. **입력을 보내는 것이 아니다** —
    # 키·마우스 이벤트를 만들지 않으므로 §27(keyboard/mouse 제어 금지)에 걸리지 않는다.
    $foreThread = [O4OWindowActivate]::GetWindowThreadProcessId([O4OWindowActivate]::GetForegroundWindow(), [System.IntPtr]::Zero)
    $selfThread = [O4OWindowActivate]::GetCurrentThreadId()
    if ($foreThread -ne 0 -and $foreThread -ne $selfThread) {
        [void][O4OWindowActivate]::AttachThreadInput($selfThread, $foreThread, $true)
        [void][O4OWindowActivate]::SetForegroundWindow($handle)
        [void][O4OWindowActivate]::AttachThreadInput($selfThread, $foreThread, $false)
        Start-Sleep -Milliseconds 120
        $ok = ([O4OWindowActivate]::GetForegroundWindow() -eq $handle)
    }
}

ConvertTo-Json -InputObject ([pscustomobject]@{ activated = [bool]$ok; restored = [bool]$restored }) -Compress
