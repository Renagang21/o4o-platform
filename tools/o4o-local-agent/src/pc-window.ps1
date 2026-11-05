# Packaged and hash-verified desktop status window. No credential values are displayed.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class O4OConsole {
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AttachConsole(uint id);
 [DllImport("kernel32.dll")] public static extern bool FreeConsole();
 [DllImport("kernel32.dll")] public static extern bool SetConsoleCtrlHandler(IntPtr handler, bool add);
 [DllImport("kernel32.dll")] public static extern bool GenerateConsoleCtrlEvent(uint type, uint group);
}
'@
$window = New-Object Windows.Window
$window.Title = 'O4O PC 연결'; $window.Width = 480; $window.Height = 250
$window.WindowStartupLocation = 'CenterScreen'; $window.ResizeMode = 'NoResize'
$panel = New-Object Windows.Controls.StackPanel; $panel.Margin = '24'
$label = New-Object Windows.Controls.TextBlock; $label.FontSize = 20; $label.Text = '프로그램을 시작하고 있습니다.'
$help = New-Object Windows.Controls.TextBlock; $help.TextWrapping = 'Wrap'; $help.Margin = '0,18,0,0'
$help.Text = 'O4O 화면에서 연결 확인을 누르면 현재 계정과의 연결을 확인할 수 있습니다. 이 창을 닫으면 정상 종료를 요청합니다.'
$panel.Children.Add($label) > $null; $panel.Children.Add($help) > $null; $window.Content = $panel
$process = $null
try {
 $info = New-Object Diagnostics.ProcessStartInfo
 $info.FileName = $env:O4O_WINDOW_NODE
 $info.Arguments = ([char]34 + $env:O4O_WINDOW_ENTRY + [char]34 + ' --worker')
 $info.WorkingDirectory = $env:O4O_WINDOW_CWD
 # A separate hidden console lets the window send the runtime's existing Ctrl+C
 # graceful shutdown. Never terminate/kill a process to update or close it.
 $info.UseShellExecute = $true; $info.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
 $process = [Diagnostics.Process]::Start($info)
} catch { $label.Text = '프로그램을 시작하지 못했습니다.'; $help.Text = '프로그램을 시작하지 못했습니다. 설치 파일을 다시 확인하시기 바랍니다.' }
$timer = New-Object Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(2)
$timer.Add_Tick({
 if (-not $process -or $process.HasExited) { $label.Text = '프로그램이 종료됐습니다.'; $timer.Stop(); if ($env:GITHUB_ACTIONS -eq 'true') { $window.Close() }; return }
 try {
  $request = [Net.HttpWebRequest]::Create('http://127.0.0.1:47821/health')
  $request.Headers.Add('Origin', 'https://neture.co.kr'); $request.Timeout = 1000
  $response = $request.GetResponse()
  try {
   $reader = New-Object IO.StreamReader($response.GetResponseStream())
   $health = $reader.ReadToEnd() | ConvertFrom-Json
   $reader.Dispose()
   $label.Text = if ($health.ok) { 'PC 프로그램이 실행 중입니다.' } else { '프로그램 응답을 확인하고 있습니다.' }
  } finally { $response.Dispose() }
 } catch { $label.Text = '프로그램 응답을 기다리고 있습니다.' }
})
$window.Add_Closing({
 if (-not $process -or $process.HasExited) { $timer.Stop(); return }
 $answer = [Windows.MessageBox]::Show('진행 중인 업무를 확인한 뒤 PC 프로그램을 종료하시겠습니까?', 'O4O PC 연결', 'YesNo', 'Question', 'No')
 if ($answer -ne 'Yes') { $_.Cancel = $true; return }
 [void][O4OConsole]::FreeConsole()
 if ([O4OConsole]::AttachConsole([uint32]$process.Id)) {
  try {
   [void][O4OConsole]::SetConsoleCtrlHandler([IntPtr]::Zero, $true)
   [void][O4OConsole]::GenerateConsoleCtrlEvent(0, 0)
   [void]$process.WaitForExit(5000)
  } finally {
   [void][O4OConsole]::FreeConsole()
   [void][O4OConsole]::SetConsoleCtrlHandler([IntPtr]::Zero, $false)
  }
 }
 if (-not $process.HasExited) {
  $_.Cancel = $true
  $help.Text = '아직 정상 종료를 확인하지 못했습니다. 업무 종료를 기다린 뒤 다시 시도하시기 바랍니다. 강제 종료하지 않습니다.'
 } else { $timer.Stop() }
})
$timer.Start()
[void]$window.ShowDialog()
