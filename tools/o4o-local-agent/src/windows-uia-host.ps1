# O4O Local Work Agent — 지속 UIA 호스트 (WO-O4O-WINDOWS-UIA-ELEMENT-IDENTITY-AND-PERSISTENT-CLIENT-V1)
#
# 아홉 번째 스크립트. windows-uia.ps1(요청당 1회)과 달리 **오래 사는 한 프로세스**다. stdin 으로 JSON 한 줄 요청을 받고
# stdout 으로 JSON 한 줄 응답을 낸다(단순 IPC — 브로커/큐 없음, §29·§30). 목적은 하나다: 요소를 **한 번** 네이티브
# 공급자로 걸어 두고(RootElement.FindAll(Children,pid) + ControlViewWalker — WinForms 네이티브 공급자가 붙는 유일한 조합,
# 실측), 그 살아 있는 AutomationElement 를 캐시해 여러 동작(set_value·invoke)에 재사용한다. 요청마다 FromHandle +
# FindFirst(RuntimeId) 로 다시 찾으면 MSAA 프록시가 와서 패턴이 없어(set_value=NOT_EDITABLE·invoke=NOT_INVOKABLE) 실패했다 —
# 이 호스트는 그 실패의 근본 원인을 피한다.
#
# 경계(WO §29·§30·§35·§36·§39·§62):
#   - 입력은 stdin JSON 뿐. 임의 UIA 질의·임의 속성명·raw PowerShell 을 받지 않는다 — op 는 ping|inspect|act|shutdown 넷뿐이고
#     act 의 kind 는 set_value|invoke 둘뿐이다.
#   - 등록된 대상 process(pid + 이름) 밖으로 나가지 않는다. inspect 가 pid 의 실제 process 이름을 등재 이름과 대조하고(이중 방어),
#     act 의 hwnd 는 그 pid 소유여야 한다. 전역 데스크톱 UI 트리 census 는 없다(대상 pid 의 top-level 창만).
#   - 입력을 **만들지 않는다**. 마우스·키보드 주입 API(SendInput·mouse_event·keybd_event·PostMessage)가 없다 — 값 입력/동작은
#     UIA 패턴(ValuePattern·InvokePattern)으로만 한다. 그래서 이 호스트로는 Safety V1 을 우회할 방법이 없다(foreground·사용자
#     활동 판정은 windows-uia.mjs 가 windows-uia.ps1 verify 로 이 호스트 앞에서 그대로 건다 — §37·§38).
#   - RuntimeId·창 핸들 원문은 stdout JSON 에만(agent 메모리 snapshot 으로) 가고 그 위로는 e_n 만 나간다. 전체 UI 트리를
#     클라우드/로그로 내보내지 않는다.
#
# 요청/응답(JSON 한 줄):
#   {"id":N,"op":"ping"}                                             -> {"id":N,"ok":true,"generation":"..."}
#   {"id":N,"op":"inspect","pid":P,"processNames":"a,b"}             -> {"id":N,"ok":true,"generation","windows":[...],"elements":[...],"elementCount","truncated"}
#   {"id":N,"op":"act","generation":"..","kind":"set_value","rid":"..","hwnd":H,"text":"..","identity":{...}} -> {"id":N,"ok":true,"executed":true,"verified":..,"via":"..","reidentified":..}
#   {"id":N,"op":"act",...,"kind":"invoke",...}                       -> {"id":N,"ok":true,"executed":true,"reidentified":..}
#   {"id":N,"op":"shutdown"}                                          -> {"id":N,"ok":true} 뒤 종료
#
# generation: 프로세스 기동 시 한 번 만든 GUID. 응답마다 실어 보낸다. act 는 요청의 generation 이 이 값과 다르면 거절한다
# (GENERATION_MISMATCH) — 호스트가 (재)기동하면 값이 바뀌므로 이전 snapshot 의 ref 는 자동으로 거부된다(client restart -> old ref reject).

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class O4OUiaHost {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
'@

$GENERATION = [Guid]::NewGuid().ToString('N')
$NAME_MAX = 80
$MAX_ELEMENTS = 150
$MAX_DEPTH = 12
$SKIP_CLASS = @('Chrome_WidgetWin_0', 'Chrome_WidgetWin_1', 'Intermediate D3D Window', 'Chrome_RenderWidgetHostHWND')

# 세션 상태 — 이번 attach 대상과 캐시. 캐시 key = rid 문자열, 값 = 살아 있는 element + 식별 앵커.
$script:Cache = @{}
$script:CachePid = 0
$script:CacheNames = @()

function Trunc([string]$s, [int]$n) { if ($null -eq $s) { return '' } $t = ($s -replace '[\r\n\t]+', ' ').Trim(); if ($t.Length -gt $n) { return $t.Substring(0, $n) } return $t }
function Rid($el) { try { return (($el.GetRuntimeId() | ForEach-Object { [string]$_ }) -join '.') } catch { return '' } }
function HasValuePattern($el) { try { $null = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern); return $true } catch { return $false } }
function RoleOf($el) {
    $ct = $el.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''
    $cls = [string]$el.Current.ClassName
    switch ($ct) {
        'Edit' { return 'textbox' }
        'Document' { if (HasValuePattern $el) { return 'textbox' } return 'document' }
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
        'Pane' { if ($cls -match 'Edit|RICHEDIT' -and (HasValuePattern $el)) { return 'textbox' } if ($cls -match 'List') { return 'list' } return 'pane' }
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

# 네이티브 공급자가 붙는 유일한 조합(실측): RootElement 를 pid 로 걸러 top-level 창을 얻는다. FromHandle 은 쓰지 않는다(MSAA).
function TopWindowElements([int]$targetPid) {
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $targetPid)
    $found = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)
    $list = @()
    foreach ($w in $found) { $h = [int64]$w.Current.NativeWindowHandle; if ($h -gt 0 -and [O4OUiaHost]::IsWindowVisible([IntPtr]$h)) { $list += $w } }
    return $list
}

# 창 element 아래를 ControlViewWalker 로만 내려가며 element 를 모은다(FindFirst(RuntimeId) 를 쓰면 MSAA 프록시가 온다).
# $collect 가 참이면 각 element 를 [pscustomobject] 로 담아 반환하고 살아 있는 element 를 캐시한다.
function WalkWindow($winEl, [int64]$hwnd, [ref]$elements) {
    $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
    $stack = New-Object System.Collections.Stack
    $top = @(); $c0 = $walker.GetFirstChild($winEl)
    while ($null -ne $c0) { $top += $c0; $c0 = $walker.GetNextSibling($c0) }
    for ($i = $top.Count - 1; $i -ge 0; $i--) { $stack.Push(@($top[$i], 1)) }
    while ($stack.Count -gt 0 -and $elements.Value.Count -lt $MAX_ELEMENTS) {
        $item = $stack.Pop(); $el = $item[0]; $depth = [int]$item[1]
        $cls = [string]$el.Current.ClassName
        $skipChildren = ($SKIP_CLASS -contains $cls) -or ($depth -ge $MAX_DEPTH)
        $rid = (Rid $el); $role = (RoleOf $el); $autoId = (Trunc $el.Current.AutomationId 40); $name = (Trunc $el.Current.Name $NAME_MAX)
        $elements.Value += [pscustomobject]@{
            hwnd = $hwnd; rid = $rid; role = $role; className = (Trunc $cls 40); name = $name
            automationId = $autoId; value = (ValueOf $el); patterns = @(Patterns $el); rect = (RectOf $el)
            focused = [bool]$el.Current.HasKeyboardFocus; enabled = [bool]$el.Current.IsEnabled; offscreen = [bool]$el.Current.IsOffscreen
        }
        if ($rid -ne '') { $script:Cache[$rid] = [pscustomobject]@{ el = $el; hwnd = $hwnd; automationId = $autoId; role = $role; className = (Trunc $cls 40); name = $name } }
        if (-not $skipChildren) {
            $kids = @(); $c = $walker.GetFirstChild($el)
            while ($null -ne $c) { $kids += $c; $c = $walker.GetNextSibling($c) }
            for ($i = $kids.Count - 1; $i -ge 0; $i--) { $stack.Push(@($kids[$i], ($depth + 1))) }
        }
    }
}

function DoInspect([int]$targetPid, [string[]]$names) {
    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    if ($null -eq $proc) { return [pscustomobject]@{ ok = $false; reason = 'PROCESS_NOT_FOUND' } }
    if ($names.Count -eq 0 -or ($names -notcontains $proc.ProcessName.ToLowerInvariant())) { return [pscustomobject]@{ ok = $false; reason = 'PROCESS_NOT_REGISTERED' } }
    # 이번 inspect 가 이 대상의 캐시를 새로 만든다(같은 generation 안에서 element 를 새 walk 로 갱신).
    $script:Cache = @{}
    $script:CachePid = $targetPid
    $script:CacheNames = $names
    $fg = [int64][O4OUiaHost]::GetForegroundWindow()
    $windows = @()
    $elements = @()
    foreach ($w in TopWindowElements $targetPid) {
        $h = [int64]$w.Current.NativeWindowHandle
        $windows += [pscustomobject]@{ hwnd = $h; title = (Trunc $w.Current.Name 60); rect = (RectOf $w); foreground = ($h -eq $fg); minimized = [bool][O4OUiaHost]::IsIconic([IntPtr]$h) }
        $ridW = (Rid $w)
        $elements += [pscustomobject]@{ hwnd = $h; rid = $ridW; role = 'window'; className = (Trunc $w.Current.ClassName 40); name = (Trunc $w.Current.Name 60); automationId = ''; value = $null; patterns = @(); rect = (RectOf $w); focused = $false; enabled = [bool]$w.Current.IsEnabled; offscreen = $false }
        if ($ridW -ne '') { $script:Cache[$ridW] = [pscustomobject]@{ el = $w; hwnd = $h; automationId = ''; role = 'window'; className = (Trunc $w.Current.ClassName 40); name = (Trunc $w.Current.Name 60) } }
        $ref = [ref]$elements
        WalkWindow $w $h $ref
        $elements = $ref.Value
    }
    return [pscustomobject]@{ ok = $true; windows = $windows; elements = $elements; elementCount = $elements.Count; truncated = ($elements.Count -ge $MAX_ELEMENTS) }
}

# hwnd 의 창을 네이티브 recipe 로 다시 걸어 식별 앵커(automationId·className·name·controlType)로 element 를 재식별한다(stale recovery).
function ReidentifyInWindow([int64]$hwnd, $identity) {
    $wantAuto = ''; $wantName = ''; $wantClass = ''; $wantRole = ''
    if ($null -ne $identity) {
        if ($identity.PSObject.Properties.Name -contains 'automationId') { $wantAuto = [string]$identity.automationId }
        if ($identity.PSObject.Properties.Name -contains 'name') { $wantName = [string]$identity.name }
        if ($identity.PSObject.Properties.Name -contains 'className') { $wantClass = [string]$identity.className }
        if ($identity.PSObject.Properties.Name -contains 'role') { $wantRole = [string]$identity.role }
    }
    foreach ($w in TopWindowElements $script:CachePid) {
        if ([int64]$w.Current.NativeWindowHandle -ne $hwnd) { continue }
        $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
        $stack = New-Object System.Collections.Stack
        $c0 = $walker.GetFirstChild($w)
        while ($null -ne $c0) { $stack.Push(@($c0, 1)); $c0 = $walker.GetNextSibling($c0) }
        $bestName = $null
        while ($stack.Count -gt 0) {
            $item = $stack.Pop(); $el = $item[0]; $depth = [int]$item[1]
            $cls = Trunc $el.Current.ClassName 40; $nm = Trunc $el.Current.Name $NAME_MAX; $auto = Trunc $el.Current.AutomationId 40; $role = RoleOf $el
            # 강한 앵커: automationId(비어있지 않음) + role 일치. WinForms 네이티브는 컨트롤 .Name 을 automationId 로 노출한다(안정).
            if ($wantAuto -ne '' -and $auto -eq $wantAuto -and ($wantRole -eq '' -or $role -eq $wantRole)) { return $el }
            # 약한 앵커: className + name + role 일치(automationId 가 없을 때).
            if ($wantAuto -eq '' -and $null -eq $bestName -and $nm -ne '' -and $nm -eq $wantName -and $cls -eq $wantClass -and ($wantRole -eq '' -or $role -eq $wantRole)) { $bestName = $el }
            if (($SKIP_CLASS -notcontains [string]$el.Current.ClassName) -and ($depth -lt $MAX_DEPTH)) {
                $c = $walker.GetFirstChild($el)
                while ($null -ne $c) { $stack.Push(@($c, ($depth + 1))); $c = $walker.GetNextSibling($c) }
            }
        }
        if ($null -ne $bestName) { return $bestName }
    }
    return $null
}

# 캐시된 살아 있는 element 를 꺼내되, 죽었으면(속성 접근 예외) 재식별한다. 반환: @{ el; reident } 또는 $null(끝내 못 찾음).
function ResolveElement([string]$rid, [int64]$hwnd, $identity) {
    $el = $null
    if ($script:Cache.ContainsKey($rid)) {
        $cached = $script:Cache[$rid].el
        try { $null = $cached.Current.IsEnabled; $el = $cached } catch { $el = $null }  # stale detection: 캐시된 핸들이 죽었다
    }
    $reident = $false
    if ($null -eq $el) {
        $el = ReidentifyInWindow $hwnd $identity
        if ($null -ne $el) { $reident = $true; $newRid = (Rid $el); if ($newRid -ne '') { $script:Cache[$newRid] = [pscustomobject]@{ el = $el; hwnd = $hwnd; automationId = ''; role = ''; className = ''; name = '' } } }
    }
    if ($null -eq $el) { return $null }
    return [pscustomobject]@{ el = $el; reident = $reident }
}

function DoAct($req) {
    $kind = [string]$req.kind
    if ($kind -ne 'set_value' -and $kind -ne 'invoke') { return [pscustomobject]@{ ok = $false; reason = 'BAD_KIND' } }
    $rid = [string]$req.rid
    $hwnd = [int64]$req.hwnd
    # 대상 창은 이번 attach 의 pid 소유여야 한다(등록 대상 밖 금지).
    $owner = [uint32]0
    [void][O4OUiaHost]::GetWindowThreadProcessId([IntPtr]$hwnd, [ref]$owner)
    if ([int]$owner -ne $script:CachePid -or $script:CachePid -eq 0) { return [pscustomobject]@{ ok = $false; reason = 'WINDOW_NOT_TARGET' } }
    if (-not [O4OUiaHost]::IsWindowVisible([IntPtr]$hwnd)) { return [pscustomobject]@{ ok = $false; reason = 'WINDOW_NOT_VISIBLE' } }
    $identity = $null
    if ($req.PSObject.Properties.Name -contains 'identity') { $identity = $req.identity }
    $r = ResolveElement $rid $hwnd $identity
    if ($null -eq $r) { return [pscustomobject]@{ ok = $false; reason = 'ELEMENT_STALE' } }
    $el = $r.el
    try { if (-not $el.Current.IsEnabled) { return [pscustomobject]@{ ok = $false; reason = 'ELEMENT_DISABLED'; reidentified = $r.reident } } } catch { return [pscustomobject]@{ ok = $false; reason = 'ELEMENT_STALE' } }

    if ($kind -eq 'set_value') {
        $text = [string]$req.text
        if ($null -eq $text -or $text.Length -eq 0 -or $text.Length -gt 500 -or $text -match '[\x00-\x1f\x7f]') { return [pscustomobject]@{ ok = $false; reason = 'BAD_TEXT' } }
        $vp = $null
        try { $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern) } catch { $vp = $null }
        if ($null -eq $vp) { return [pscustomobject]@{ ok = $false; reason = 'NOT_EDITABLE'; reidentified = $r.reident } }
        if ($vp.Current.IsReadOnly) { return [pscustomobject]@{ ok = $false; reason = 'READ_ONLY'; reidentified = $r.reident } }
        $vp.SetValue($text)
        Start-Sleep -Milliseconds 120
        $after = ValueOf $el
        return [pscustomobject]@{ ok = $true; executed = $true; verified = ($after -eq (Trunc $text $NAME_MAX)); via = 'setvalue'; valueAfter = $after; hasValue = ($null -ne $after -and $after.Length -gt 0); reidentified = $r.reident }
    }

    # invoke
    $done = $false
    try { $ip = $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern); $ip.Invoke(); $done = $true } catch { }
    if (-not $done) { try { $sp = $el.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern); $sp.Select(); $done = $true } catch { } }
    if (-not $done) { try { $lp = $el.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern); $lp.DoDefaultAction(); $done = $true } catch { } }
    if (-not $done) { return [pscustomobject]@{ ok = $false; reason = 'NOT_INVOKABLE'; reidentified = $r.reident } }
    Start-Sleep -Milliseconds 150
    return [pscustomobject]@{ ok = $true; executed = $true; reidentified = $r.reident }
}

function Respond($id, $obj) {
    $obj | Add-Member -NotePropertyName id -NotePropertyValue $id -Force
    $obj | Add-Member -NotePropertyName generation -NotePropertyValue $GENERATION -Force
    [Console]::Out.WriteLine((ConvertTo-Json -InputObject $obj -Compress -Depth 6))
    [Console]::Out.Flush()
}

# ── 메인 루프: stdin 한 줄 = 요청 하나 ──
while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }   # stdin 닫힘 -> 종료
    $line = $line.Trim()
    if ($line -eq '') { continue }
    $id = 0
    try {
        $req = ConvertFrom-Json -InputObject $line
        if ($req.PSObject.Properties.Name -contains 'id') { $id = $req.id }
        $op = [string]$req.op
        if ($op -eq 'ping') {
            Respond $id ([pscustomobject]@{ ok = $true })
        } elseif ($op -eq 'inspect') {
            $p = [int]$req.pid
            $names = @()
            if ($req.PSObject.Properties.Name -contains 'processNames' -and $req.processNames) { $names = @(([string]$req.processNames).Split(',') | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ -ne '' }) }
            Respond $id (DoInspect $p $names)
        } elseif ($op -eq 'act') {
            if (([string]$req.generation) -ne $GENERATION) {
                Respond $id ([pscustomobject]@{ ok = $false; reason = 'GENERATION_MISMATCH' })
            } else {
                Respond $id (DoAct $req)
            }
        } elseif ($op -eq 'shutdown') {
            Respond $id ([pscustomobject]@{ ok = $true })
            break
        } else {
            Respond $id ([pscustomobject]@{ ok = $false; reason = 'BAD_OP' })
        }
    } catch {
        Respond $id ([pscustomobject]@{ ok = $false; reason = 'HOST_ERROR' })
    }
}
