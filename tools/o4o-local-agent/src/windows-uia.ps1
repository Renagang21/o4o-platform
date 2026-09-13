# O4O Local Work Agent — Windows UI Automation (WO-O4O-WINDOWS-UI-AUTOMATION-V0)
#
# 등재 앱(process id) 의 top-level 창들을 UIA(System.Windows.Automation) 로 읽고, 요소 하나에 값 입력 · 기본 동작 ·
# 키 1회 · 창 안 좌표 클릭을 수행하는 일곱 번째 스크립트. 셸 · 임의 프로세스 · 임의 창(등재 밖 pid) 은 다루지 않는다.
#
# 입력(환경변수만 · argv 없음):
#   O4O_UIA_ACTION         inspect | set_value | invoke | key | click
#   O4O_UIA_PID            대상 process id(agent census 에서 나온 값) — 10진 정수
#   O4O_UIA_PROCESS_NAMES  등재 process 이름(콤마) — pid 의 실제 process 이름이 여기 있어야 한다(이중 방어)
#   O4O_UIA_HWND           (set_value/invoke/key/click) 대상 창 핸들 — inspect 결과의 창
#   O4O_UIA_RID            (set_value/invoke/key) 요소 RuntimeId(점 구분 정수) — inspect 결과의 값
#   O4O_UIA_TEXT           (set_value) 텍스트 — 제어문자 없음 · 길이는 agent 가 검사
#   O4O_UIA_KEY            (key) ENTER | TAB | ESC
#   O4O_UIA_X / _Y         (click) 창 client 정규화 좌표 0..1
#   O4O_UIA_CLICKS         (click) 1 | 2
#
# 출력: JSON 한 줄. inspect 는 창 목록 + 요소 목록(상한 있음). 값은 80자 · 이름 80자로 자른다.
# 요소 RuntimeId 는 agent 메모리의 snapshot 에만 남고 서버로 나가지 않는다(agent 가 e_n 으로 바꾼다).

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# 창 제목 · 요소 이름(한글)을 JSON 으로 내보낸다 — stdout 을 UTF-8 로 고정한다(기본 CP949 면 agent 쪽에서 깨진다).
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class O4OUia {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT p);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, IntPtr extra);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    // 사용자가 방금 키보드/마우스를 썼으면 입력을 주입하지 않는다 — 자동화가 앞으로 가져온 창에 사용자의 타이핑이 섞여 들어가는 사고(실측) 방지.
    public static uint IdleMs() { LASTINPUTINFO li = new LASTINPUTINFO(); li.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO)); if (!GetLastInputInfo(ref li)) return 0; return (uint)Environment.TickCount - li.dwTime; }
    // 허용 키 하나를 **그 컨트롤의 창 메시지**로 보낸다(WM_KEYDOWN/WM_KEYUP + 스캔코드 lParam). 전역 입력 큐 · IME 조합 · foreground 잠금을
    // 타지 않는다 — 카카오톡 실측: SendInput 경로는 IME 조합 상태에 따라 ENTER 가 줄바꿈이 됐지만 메시지 경로는 항상 제출됐다.
    // 텍스트를 **타이핑**한다(KEYEVENTF_UNICODE down/up, computer-input 과 같은 방식). 가상키 · 스캔코드 · 수식키를 만들지 않으므로
    // 키보드 레이아웃/IME 상태와 무관하게 그 문자가 들어간다. WM_SETTEXT(ValuePattern.SetValue) 만으로는 앱이 "입력됨" 을 모르는 경우
    // (카카오톡: 전송 버튼이 활성화되지 않음 실측) 를 위한 경로.
    public static bool TypeUnicode(string text) {
        INPUT[] inputs = new INPUT[text.Length * 2];
        for (int i = 0; i < text.Length; i++) {
            inputs[i * 2].type = 1; inputs[i * 2].u.ki.wScan = text[i]; inputs[i * 2].u.ki.dwFlags = 0x0004;
            inputs[i * 2 + 1].type = 1; inputs[i * 2 + 1].u.ki.wScan = text[i]; inputs[i * 2 + 1].u.ki.dwFlags = 0x0004 | 0x0002;
        }
        return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT))) == (uint)inputs.Length;
    }
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessageW(IntPtr hWnd, uint msg, IntPtr wParam, string lParam);
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    // Win32 Edit/RichEdit 컨트롤에 텍스트를 **편집 메시지**로 넣는다: EM_SETSEL(전체 선택) + EM_REPLACESEL(치환). WM_SETTEXT 와 달리
    // EN_CHANGE 가 발생해 앱이 "입력됨" 을 안다(카카오톡: 전송 버튼 활성 실측). 포커스 · foreground · IME 와 무관하다.
    public static void ReplaceAllText(IntPtr hWnd, string text) {
        SendMessage(hWnd, 0x00B1, IntPtr.Zero, (IntPtr)(-1));
        SendMessageW(hWnd, 0x00C2, (IntPtr)1, text);
    }
    public static bool PostKey(IntPtr hWnd, ushort vk) {
        uint scan = MapVirtualKey(vk, 0);
        IntPtr down = (IntPtr)(long)((scan << 16) | 1u);
        IntPtr up = (IntPtr)(long)(0xC0000000u | (scan << 16) | 1u);
        bool ok = PostMessage(hWnd, 0x0100, (IntPtr)vk, down);
        ok &= PostMessage(hWnd, 0x0101, (IntPtr)vk, up);
        return ok;
    }
    [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Explicit)] public struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
    [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public INPUTUNION u; }
    [DllImport("user32.dll", SetLastError = true)] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    // computer-input 과 같은 방식: 허용 키 하나를 가상키 down/up 으로 보낸다(수식키 · 스캔코드 조합 없음).
    [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint code, uint mapType);
    static bool One(ushort vk, ushort scan, bool up) {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = 1; inputs[0].u.ki.wVk = vk; inputs[0].u.ki.wScan = scan; inputs[0].u.ki.dwFlags = up ? 0x0002u : 0u;
        return SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT))) == 1;
    }
    // 수식키는 별도 SendInput 으로 내려두고 잠깐 기다린다 — 한 호출에 몰아 보내면 앱이 Ctrl 상태를 못 읽는 경우가 있다(카카오톡 실측).
    public static bool PressKey(ushort vk, bool ctrl) {
        ushort scan = (ushort)MapVirtualKey(vk, 0);
        ushort ctrlScan = (ushort)MapVirtualKey(0x11, 0);
        bool ok = true;
        if (ctrl) { ok &= One(0x11, ctrlScan, false); System.Threading.Thread.Sleep(180); }
        ok &= One(vk, scan, false); System.Threading.Thread.Sleep(60); ok &= One(vk, scan, true);
        if (ctrl) { System.Threading.Thread.Sleep(150); ok &= One(0x11, ctrlScan, true); }
        return ok;
    }
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
    public const int SW_MINIMIZE = 6; public const int SW_RESTORE = 9;
    public const uint LEFTDOWN = 2; public const uint LEFTUP = 4;
}
'@

$action = $env:O4O_UIA_ACTION
if ($action -notmatch '^(inspect|set_value|invoke|key|click|activate|verify)$') { throw 'O4O_UIA_ACTION invalid' }
$pidRaw = $env:O4O_UIA_PID
if ($pidRaw -notmatch '^[1-9][0-9]{0,9}$') { throw 'O4O_UIA_PID invalid' }
$targetPid = [int]$pidRaw
$allowedNames = @()
if ($env:O4O_UIA_PROCESS_NAMES) { $allowedNames = @($env:O4O_UIA_PROCESS_NAMES.Split(',') | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ -ne '' }) }
$proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
if ($null -eq $proc) { ConvertTo-Json -InputObject ([pscustomobject]@{ ok = $false; reason = 'PROCESS_NOT_FOUND' }) -Compress; exit 0 }
if ($allowedNames.Count -eq 0 -or ($allowedNames -notcontains $proc.ProcessName.ToLowerInvariant())) { throw 'process not registered' }

$MAX_ELEMENTS = 150
$MAX_DEPTH = 12
$NAME_MAX = 80
# 임베디드 웹 콘텐츠(광고 · 웹뷰) 는 앱 UI 가 아니다 — 그 아래는 내려가지 않는다.
$SKIP_CLASS = @('Chrome_WidgetWin_0', 'Chrome_WidgetWin_1', 'Intermediate D3D Window', 'Chrome_RenderWidgetHostHWND')

function Trunc([string]$s, [int]$n) { if ($null -eq $s) { return '' } $t = ($s -replace '[\r\n\t]+', ' ').Trim(); if ($t.Length -gt $n) { return $t.Substring(0, $n) } return $t }
function Rid($el) { try { return (($el.GetRuntimeId() | ForEach-Object { [string]$_ }) -join '.') } catch { return '' } }
function RoleOf($el) {
    $ct = $el.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''
    $cls = [string]$el.Current.ClassName
    $hasValue = $false
    try { $null = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern); $hasValue = $true } catch { }
    switch ($ct) {
        'Edit' { return 'textbox' }
        'Document' { if ($hasValue) { return 'textbox' } return 'document' }
        'Button' { return 'button' }
        'SplitButton' { return 'button' }
        'Hyperlink' { return 'link' }
        'CheckBox' { return 'checkbox' }
        'RadioButton' { return 'radio' }
        'TabItem' { return 'tab' }
        'MenuItem' { return 'menuitem' }
        'ListItem' { return 'listitem' }
        'List' { return 'list' }
        'Tree' { return 'list' }
        'TreeItem' { return 'listitem' }
        'DataItem' { return 'listitem' }
        'ComboBox' { return 'combobox' }
        'Text' { return 'text' }
        'Image' { return 'image' }
        'Window' { return 'window' }
        'Pane' { if ($cls -match 'Edit|RICHEDIT' -and $hasValue) { return 'textbox' } if ($cls -match 'List') { return 'list' } return 'pane' }
        default { return 'custom' }
    }
}
function Patterns($el) {
    [string[]]$p = @()
    try { $null = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern); $p += 'value' } catch { }
    try { $null = $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern); $p += 'invoke' } catch { }
    try { $null = $el.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern); $p += 'text' } catch { }
    try { $null = $el.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern); $p += 'select' } catch { }
    return $p
}
function ValueOf($el) {
    try { $v = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern); return (Trunc $v.Current.Value $NAME_MAX) } catch { return $null }
}
function RectOf($el) { $r = $el.Current.BoundingRectangle; if ([double]::IsInfinity($r.X) -or [double]::IsNaN($r.X)) { return $null } return @([int]$r.X, [int]$r.Y, [int]$r.Width, [int]$r.Height) }

function TopWindows() {
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $targetPid)
    $found = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)
    $list = @()
    foreach ($w in $found) { $h = [int64]$w.Current.NativeWindowHandle; if ($h -gt 0 -and [O4OUia]::IsWindowVisible([IntPtr]$h)) { $list += $w } }
    return $list
}

function Activate([IntPtr]$h) {
    if ([O4OUia]::GetForegroundWindow() -eq $h) { return $true }
    if ([O4OUia]::IsIconic($h)) { [void][O4OUia]::ShowWindow($h, [O4OUia]::SW_RESTORE); Start-Sleep -Milliseconds 150 }
    [void][O4OUia]::SetForegroundWindow($h)
    Start-Sleep -Milliseconds 150
    if ([O4OUia]::GetForegroundWindow() -eq $h) { return $true }
    # 트레이에서 복귀한 창 등 SetForegroundWindow 를 거절하는 창 — 최소화 뒤 복원하면 OS 가 앞으로 보낸다(실측).
    [void][O4OUia]::ShowWindow($h, [O4OUia]::SW_MINIMIZE); Start-Sleep -Milliseconds 300
    [void][O4OUia]::ShowWindow($h, [O4OUia]::SW_RESTORE); Start-Sleep -Milliseconds 300
    [void][O4OUia]::SetForegroundWindow($h); Start-Sleep -Milliseconds 300
    if ([O4OUia]::GetForegroundWindow() -eq $h) { return $true }
    # 마지막 수단: ALT 한 번(콘솔 없는 자식 프로세스의 foreground 잠금 해제 — activate 스크립트와 같은 규칙).
    [O4OUia]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [O4OUia]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    [void][O4OUia]::SetForegroundWindow($h); Start-Sleep -Milliseconds 300
    return ([O4OUia]::GetForegroundWindow() -eq $h)
}

$USER_IDLE_MIN_MS = 1200
# agent 가 넘긴 "우리 자신의 마지막 입력 주입 뒤 경과(ms)". 최근 입력이 우리 것(직전 activate/click)이면 사용자 활동으로 보지 않는다.
$sinceInject = 999999
if ($env:O4O_UIA_SINCE_INJECT_MS -match '^[0-9]{1,9}$') { $sinceInject = [int]$env:O4O_UIA_SINCE_INJECT_MS }
function UserBusy() { $idle = [int][O4OUia]::IdleMs(); return (($idle -lt $USER_IDLE_MIN_MS) -and ($sinceInject -gt ($idle + 300))) }

function ClickElementCenter($el) {
    $er = $el.Current.BoundingRectangle
    if ([double]::IsInfinity($er.X) -or $er.Width -le 0 -or $er.Height -le 0) { return $false }
    [void][O4OUia]::SetCursorPos([int]($er.X + $er.Width / 2), [int]($er.Y + $er.Height / 2)); Start-Sleep -Milliseconds 60
    [O4OUia]::mouse_event([O4OUia]::LEFTDOWN, 0, 0, 0, [IntPtr]::Zero); [O4OUia]::mouse_event([O4OUia]::LEFTUP, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 250
    return $true
}

function FindByRid($winEl, [string]$rid) {
    $ints = @()
    foreach ($part in $rid.Split('.')) { if ($part -notmatch '^-?[0-9]{1,10}$') { throw 'rid invalid' } $ints += [int]$part }
    $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::RuntimeIdProperty, [int[]]$ints)
    return $winEl.FindFirst([System.Windows.Automation.TreeScope]::Subtree, $cond)
}

function Out-Json($obj) { ConvertTo-Json -InputObject $obj -Compress -Depth 6 }

if ($action -eq 'inspect') {
    $fg = [int64][O4OUia]::GetForegroundWindow()
    $windows = @()
    $elements = @()
    $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
    foreach ($w in TopWindows) {
        $h = [int64]$w.Current.NativeWindowHandle
        $windows += [pscustomobject]@{ hwnd = $h; title = (Trunc $w.Current.Name 60); rect = (RectOf $w); foreground = ($h -eq $fg); minimized = [bool][O4OUia]::IsIconic([IntPtr]$h) }
        # 창 자체도 요소로 낸다(좌표 클릭의 기준 창).
        $elements += [pscustomobject]@{ hwnd = $h; rid = (Rid $w); role = 'window'; className = (Trunc $w.Current.ClassName 40); name = (Trunc $w.Current.Name 60); automationId = ''; value = $null; patterns = @(); rect = (RectOf $w); focused = $false; enabled = [bool]$w.Current.IsEnabled; offscreen = $false }
        $stack = New-Object System.Collections.Stack
        $top = @(); $c0 = $walker.GetFirstChild($w)
        while ($null -ne $c0) { $top += $c0; $c0 = $walker.GetNextSibling($c0) }
        for ($i = $top.Count - 1; $i -ge 0; $i--) { $stack.Push(@($top[$i], 1)) }
        while ($stack.Count -gt 0 -and $elements.Count -lt $MAX_ELEMENTS) {
            $item = $stack.Pop(); $el = $item[0]; $depth = [int]$item[1]
            $cls = [string]$el.Current.ClassName
            $skipChildren = ($SKIP_CLASS -contains $cls) -or ($depth -ge $MAX_DEPTH)
            $elements += [pscustomobject]@{
                hwnd = $h; rid = (Rid $el); role = (RoleOf $el); className = (Trunc $cls 40); name = (Trunc $el.Current.Name $NAME_MAX)
                automationId = (Trunc $el.Current.AutomationId 40); value = (ValueOf $el); patterns = @(Patterns $el); rect = (RectOf $el)
                focused = [bool]$el.Current.HasKeyboardFocus; enabled = [bool]$el.Current.IsEnabled; offscreen = [bool]$el.Current.IsOffscreen
            }
            if (-not $skipChildren) {
                # 형제를 역순으로 넣어 문서 순서대로 나오게 한다.
                $kids = @(); $c = $walker.GetFirstChild($el)
                while ($null -ne $c) { $kids += $c; $c = $walker.GetNextSibling($c) }
                for ($i = $kids.Count - 1; $i -ge 0; $i--) { $stack.Push(@($kids[$i], ($depth + 1))) }
            }
        }
    }
    Out-Json ([pscustomobject]@{ ok = $true; windows = $windows; elements = $elements; elementCount = $elements.Count; truncated = ($elements.Count -ge $MAX_ELEMENTS) })
    exit 0
}

# ── 요소/창 대상 동작 ─────────────────────────────────────────────────────────
$hwndRaw = $env:O4O_UIA_HWND
if ($hwndRaw -notmatch '^[1-9][0-9]{0,18}$') { throw 'O4O_UIA_HWND invalid' }
$hwnd = [IntPtr]::new([int64]$hwndRaw)
$owner = [uint32]0
[void][O4OUia]::GetWindowThreadProcessId($hwnd, [ref]$owner)
if ([int]$owner -ne $targetPid) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'WINDOW_NOT_TARGET' }); exit 0 }
if (-not [O4OUia]::IsWindowVisible($hwnd)) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'WINDOW_NOT_VISIBLE' }); exit 0 }
$winEl = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)

if ($action -eq 'verify') {
    # WINDOWS-AUTOMATION-SAFETY-V1 §7·§13·§14 — 입력을 만들지 않는 검사만: 사용자 idle · foreground 창/프로세스 · 대상 창 존재/제목 ·
    # (요소 rid 가 있으면) 요소 재해석 가능 여부 · 대상 process 의 보이는 top-level 창 수(새 modal/dialog 감지).
    $fg = [O4OUia]::GetForegroundWindow()
    $fgPid = [uint32]0
    [void][O4OUia]::GetWindowThreadProcessId($fg, [ref]$fgPid)
    $targetTitle = $null
    try { $targetTitle = Trunc $winEl.Current.Name 60 } catch { $targetTitle = $null }
    $elementOk = $null
    if ($env:O4O_UIA_RID) { try { $e = FindByRid $winEl $env:O4O_UIA_RID; $elementOk = ($null -ne $e -and $e.Current.IsEnabled) } catch { $elementOk = $false } }
    $count = 0
    foreach ($w in TopWindows) { $count++ }
    Out-Json ([pscustomobject]@{
        ok = $true; idleMs = [int][O4OUia]::IdleMs(); sinceInjectMs = $sinceInject; userBusy = (UserBusy)
        foregroundHwnd = [int64]$fg; foregroundPid = [int]$fgPid; foregroundIsTarget = ($fg -eq $hwnd); foregroundSameProcess = ([int]$fgPid -eq $targetPid)
        targetVisible = [bool][O4OUia]::IsWindowVisible($hwnd); targetTitle = $targetTitle; elementOk = $elementOk; windowCount = $count
    })
    exit 0
}

if ($action -eq 'activate') {
    # 창 요소의 "기본 동작" = 그 창을 앞으로(같은 앱의 여러 창 중 하나를 고를 때). 입력을 만들지 않는다(ALT 잠금 해제 제외).
    if (UserBusy) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'USER_ACTIVE' }); exit 0 }
    $ok = Activate $hwnd
    Out-Json ([pscustomobject]@{ ok = $ok; executed = $ok; reason = $(if ($ok) { $null } else { 'TARGET_NOT_FOREGROUND' }) })
    exit 0
}

if ($action -eq 'click') {
    $xs = $env:O4O_UIA_X; $ys = $env:O4O_UIA_Y
    $coordPattern = '^(0(\.[0-9]{1,6})?|1(\.0{1,6})?)$'
    if ($xs -notmatch $coordPattern -or $ys -notmatch $coordPattern) { throw 'O4O_UIA_X/Y invalid' }
    $clicks = 1
    if ($env:O4O_UIA_CLICKS -eq '2') { $clicks = 2 } elseif ($env:O4O_UIA_CLICKS -and $env:O4O_UIA_CLICKS -ne '1') { throw 'O4O_UIA_CLICKS invalid' }
    if (UserBusy) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'USER_ACTIVE' }); exit 0 }
    if (-not (Activate $hwnd)) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'TARGET_NOT_FOREGROUND' }); exit 0 }
    $rect = New-Object O4OUia+RECT
    [void][O4OUia]::GetClientRect($hwnd, [ref]$rect)
    $cw = [int]($rect.Right - $rect.Left); $ch = [int]($rect.Bottom - $rect.Top)
    if ($cw -le 0 -or $ch -le 0) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'OUT_OF_BOUNDS' }); exit 0 }
    $x = [double]::Parse($xs, [System.Globalization.CultureInfo]::InvariantCulture)
    $y = [double]::Parse($ys, [System.Globalization.CultureInfo]::InvariantCulture)
    $px = [int][math]::Min([math]::Floor($x * $cw), $cw - 1); $py = [int][math]::Min([math]::Floor($y * $ch), $ch - 1)
    $pt = New-Object O4OUia+POINT; $pt.X = $px; $pt.Y = $py
    [void][O4OUia]::ClientToScreen($hwnd, [ref]$pt)
    [void][O4OUia]::SetCursorPos($pt.X, $pt.Y); Start-Sleep -Milliseconds 60
    for ($i = 0; $i -lt $clicks; $i++) { [O4OUia]::mouse_event([O4OUia]::LEFTDOWN, 0, 0, 0, [IntPtr]::Zero); [O4OUia]::mouse_event([O4OUia]::LEFTUP, 0, 0, 0, [IntPtr]::Zero); if ($clicks -eq 2) { Start-Sleep -Milliseconds 70 } }
    Start-Sleep -Milliseconds 300
    Out-Json ([pscustomobject]@{ ok = $true; executed = $true; clicks = $clicks; clientWidth = $cw; clientHeight = $ch })
    exit 0
}

if ($action -eq 'key') {
    $key = $env:O4O_UIA_KEY
    # CTRL+ENTER = 여러 줄 입력창의 제출 관례(카카오톡 "Ctrl+Enter 로 전송" 설정 실측). 그 밖의 수식키 조합은 없다.
    if ($key -notmatch '^(ENTER|TAB|ESC|CTRL\+ENTER)$') { throw 'O4O_UIA_KEY invalid' }
    $el = $null
    $focusedByClick = $false
    if (UserBusy) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'USER_ACTIVE' }); exit 0 }
    if ($env:O4O_UIA_RID) {
        $el = FindByRid $winEl $env:O4O_UIA_RID
        if ($null -eq $el) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'ELEMENT_STALE' }); exit 0 }
        # 요소가 있으면 그 요소 가운데를 마우스로 한 번 클릭한다 — 창을 앞으로 가져오는 동시에(마우스 클릭은 foreground 잠금을 타지 않는다)
        # 앱 내부 키보드 포커스를 그 요소에 둔다. ALT 잠금 해제 뒤에는 Ctrl+Enter 가 줄바꿈으로 처리되는 현상이 있어(카카오톡 실측)
        # 키 입력 전 활성화는 이 클릭으로만 한다. 입력창 가운데 클릭은 커서를 옮길 뿐 내용을 바꾸지 않는다.
        $needsInputPath = ($key -eq 'CTRL+ENTER') -or ($el.Current.NativeWindowHandle -eq 0)
        if ($needsInputPath) {
            if ([O4OUia]::GetForegroundWindow() -ne $hwnd -or -not $el.Current.HasKeyboardFocus) { $focusedByClick = ClickElementCenter $el }
            if ([O4OUia]::GetForegroundWindow() -ne $hwnd) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'TARGET_NOT_FOREGROUND' }); exit 0 }
        }
    } else {
        if (-not (Activate $hwnd)) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'TARGET_NOT_FOREGROUND' }); exit 0 }
    }
    $before = $null; if ($null -ne $el) { $before = ValueOf $el }
    $vk = @{ ENTER = [uint16]0x0D; TAB = [uint16]0x09; ESC = [uint16]0x1B; 'CTRL+ENTER' = [uint16]0x0D }
    $via = 'input'
    $sent = $false
    $ctrlHwnd = [IntPtr]::Zero
    if ($null -ne $el) { try { $ctrlHwnd = [IntPtr]::new([int64]$el.Current.NativeWindowHandle) } catch { $ctrlHwnd = [IntPtr]::Zero } }
    if ($key -ne 'CTRL+ENTER' -and $ctrlHwnd -ne [IntPtr]::Zero) {
        # 컨트롤 자체 HWND 가 있으면 창 메시지로(foreground · IME 무관). 수식키 조합은 메시지로 표현할 수 없어 입력 경로.
        $sent = [O4OUia]::PostKey($ctrlHwnd, $vk[$key]); $via = 'message'
    } else {
        $sent = [O4OUia]::PressKey($vk[$key], ($key -eq 'CTRL+ENTER'))
    }
    if (-not $sent) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'INPUT_FAILED' }); exit 0 }
    Start-Sleep -Milliseconds 400
    $after = $null; if ($null -ne $el) { try { $after = ValueOf $el } catch { $after = $null } }
    Out-Json ([pscustomobject]@{ ok = $true; executed = $true; key = $key; via = $via; valueBefore = $before; valueAfter = $after; foregroundStill = ([O4OUia]::GetForegroundWindow() -eq $hwnd); focusedByClick = $focusedByClick })
    exit 0
}

$rid = $env:O4O_UIA_RID
if (-not $rid) { throw 'O4O_UIA_RID missing' }
$el = FindByRid $winEl $rid
if ($null -eq $el) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'ELEMENT_STALE' }); exit 0 }
if (-not $el.Current.IsEnabled) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'ELEMENT_DISABLED' }); exit 0 }

if ($action -eq 'set_value') {
    $text = $env:O4O_UIA_TEXT
    if ($null -eq $text -or $text.Length -eq 0 -or $text.Length -gt 500 -or $text -match '[\x00-\x1f\x7f]') { throw 'O4O_UIA_TEXT invalid' }
    if (-not (Activate $hwnd)) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'TARGET_NOT_FOREGROUND' }); exit 0 }
    $vp = $null
    try { $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern) } catch { $vp = $null }
    if ($null -eq $vp) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'NOT_EDITABLE' }); exit 0 }
    if ($vp.Current.IsReadOnly) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'READ_ONLY' }); exit 0 }
    # 컨트롤 자체 HWND 가 있는 Edit/RichEdit 는 편집 메시지(EM_SETSEL+EM_REPLACESEL)로 넣는다 — EN_CHANGE 가 나서 앱이 "입력됨" 을 알고,
    # foreground · 포커스 · IME 와 무관하다(카카오톡: SetValue/유니코드 타이핑은 전송 버튼이 활성화되지 않았고 이 경로만 활성화 실측).
    # 그 밖(HWND 없는 커스텀 편집기)은 ValuePattern.SetValue.
    $via = 'setvalue'
    $ctrlH = [IntPtr]::Zero
    try { $ctrlH = [IntPtr]::new([int64]$el.Current.NativeWindowHandle) } catch { $ctrlH = [IntPtr]::Zero }
    if ($ctrlH -ne [IntPtr]::Zero -and ($el.Current.ClassName -match 'Edit|RICHEDIT')) {
        [O4OUia]::ReplaceAllText($ctrlH, $text); $via = 'edit_message'
        Start-Sleep -Milliseconds 200
    } else {
        $vp.SetValue($text)
        Start-Sleep -Milliseconds 200
    }
    $after = ValueOf $el
    if ($after -ne (Trunc $text $NAME_MAX)) { $vp.SetValue($text); Start-Sleep -Milliseconds 200; $after = ValueOf $el; $via = 'setvalue' }
    Out-Json ([pscustomobject]@{ ok = $true; executed = $true; verified = ($after -eq (Trunc $text $NAME_MAX)); via = $via; valueAfter = $after; hasValue = ($null -ne $after -and $after.Length -gt 0) })
    exit 0
}

if ($action -eq 'invoke') {
    if (-not (Activate $hwnd)) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'TARGET_NOT_FOREGROUND' }); exit 0 }
    $done = $false
    try { $ip = $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern); $ip.Invoke(); $done = $true } catch { }
    if (-not $done) { try { $sp = $el.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern); $sp.Select(); $done = $true } catch { } }
    if (-not $done) { try { $lp = $el.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern); $lp.DoDefaultAction(); $done = $true } catch { } }
    if (-not $done) { Out-Json ([pscustomobject]@{ ok = $false; reason = 'NOT_INVOKABLE' }); exit 0 }
    Start-Sleep -Milliseconds 300
    Out-Json ([pscustomobject]@{ ok = $true; executed = $true })
    exit 0
}

throw 'unreachable'
