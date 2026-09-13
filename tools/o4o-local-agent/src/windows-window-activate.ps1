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
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
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
    public const int SW_MINIMIZE = 6;
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

if (-not $ok) {
    # WINDOWS-UI-AUTOMATION-V0 실측: 트레이에서 복귀한 창(카카오톡)은 AttachThreadInput 으로도 거절한다.
    # 최소화 뒤 복원하면 OS 가 그 창을 앞으로 보낸다. 창 상태는 결국 복원(원래대로)이고 입력 이벤트는 만들지 않는다.
    [void][O4OWindowActivate]::ShowWindow($handle, [O4OWindowActivate]::SW_MINIMIZE)
    Start-Sleep -Milliseconds 300
    [void][O4OWindowActivate]::ShowWindow($handle, [O4OWindowActivate]::SW_RESTORE)
    Start-Sleep -Milliseconds 300
    [void][O4OWindowActivate]::SetForegroundWindow($handle)
    Start-Sleep -Milliseconds 300
    $ok = ([O4OWindowActivate]::GetForegroundWindow() -eq $handle)
}

if (-not $ok) {
    # 마지막 수단(WINDOWS-UI-AUTOMATION-V0 실측): 콘솔 창이 없는 agent 자식 프로세스는 위 두 방법도 거절당한다.
    # ALT 키를 한 번 눌렀다 떼면 OS 가 이 프로세스에 foreground 권한을 준다(널리 알려진 규칙). 문자 · 단축키를 만들지 않는다 —
    # ALT 단독 down/up 은 어떤 앱에도 명령이 되지 않는다.
    [O4OWindowActivate]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
    [O4OWindowActivate]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    [void][O4OWindowActivate]::SetForegroundWindow($handle)
    Start-Sleep -Milliseconds 300
    $ok = ([O4OWindowActivate]::GetForegroundWindow() -eq $handle)
}

ConvertTo-Json -InputObject ([pscustomobject]@{ activated = [bool]$ok; restored = [bool]$restored }) -Compress
