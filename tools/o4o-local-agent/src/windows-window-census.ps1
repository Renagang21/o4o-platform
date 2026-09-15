# O4O Local Work Agent — 창 목록 조사
#
# WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §6·§7·§17·§20
#
# 이 스크립트는 **인자를 받지 않는다.** 조건도 필터도 없다. 그냥 지금 화면에 있는
# top-level 창 목록을 내놓고 끝난다. appId 매칭은 agent(JS) 안에서 하므로
# **AI 가 준 값이 이 프로세스 경계를 넘어오지 않는다.**
#
# 내보내지 않는 것 (§21): executable 전체 경로 · command line · 사용자 경로 ·
# 환경변수 · 전체 process 목록(창을 가진 것만 나온다).
#
# 하지 않는 것 (§25·§26·§27·§28): 프로그램 실행 · 종료 · 입력 · 화면 캡처.
# 아래에 선언된 Win32 함수는 전부 **조회 전용**이다.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# 창 제목 · process 이름(한글)을 JSON 으로 내보낸다 — stdout 을 UTF-8 로 고정한다(기본 CP949 면 agent 쪽에서 깨진다).
# WO-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1 — real smoke 에서 'Doctors.메인' 이 U+FFFD 로 깨져 matchWindows 가 0건이 된 결함 수정.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class O4OWindowCensus {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr GetParent(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowTextLengthW(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    public class WindowInfo {
        public long Hwnd;
        public uint Pid;
        public string Title;
        public bool Minimized;
    }

    public static List<WindowInfo> List() {
        List<WindowInfo> found = new List<WindowInfo>();
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
            // §17 창 선택 기준: visible · top-level · 제목 있음.
            // 보이지 않는 창은 여기서 탈락한다 — 숨은 창을 임의로 띄우지 않기 위해서다(§18).
            if (!IsWindowVisible(hWnd)) return true;
            if (GetParent(hWnd) != IntPtr.Zero) return true;
            int len = GetWindowTextLengthW(hWnd);
            if (len <= 0) return true;
            StringBuilder sb = new StringBuilder(len + 1);
            GetWindowTextW(hWnd, sb, sb.Capacity);
            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            WindowInfo info = new WindowInfo();
            info.Hwnd = hWnd.ToInt64();
            info.Pid = pid;
            info.Title = sb.ToString();
            info.Minimized = IsIconic(hWnd);
            found.Add(info);
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
'@

$windows = [O4OWindowCensus]::List()

# pid → process 이름. Id / ProcessName 두 필드만 읽는다.
# Path · StartInfo · CommandLine 은 조회하지 않는다(§21).
$names = @{}
foreach ($p in Get-Process) {
    if (-not $names.ContainsKey([uint32]$p.Id)) {
        $names[[uint32]$p.Id] = $p.ProcessName
    }
}

$out = @()
foreach ($w in $windows) {
    $name = ''
    if ($names.ContainsKey($w.Pid)) { $name = $names[$w.Pid] }
    $out += [pscustomobject]@{
        hwnd        = $w.Hwnd
        pid         = [int64]$w.Pid
        processName = $name
        title       = $w.Title
        minimized   = [bool]$w.Minimized
        foreground  = ([int64]$w.Hwnd -eq [int64][O4OWindowCensus]::GetForegroundWindow())
    }
}

# 항상 배열로 직렬화한다 (1건일 때 객체로 떨어지는 PowerShell 기본 동작을 막는다).
ConvertTo-Json -InputObject @($out) -Depth 3 -Compress
