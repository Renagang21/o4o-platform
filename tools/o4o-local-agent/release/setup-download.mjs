/** Small Windows launcher. Downloads only the exact, hash-pinned release built beside it. */
export function setupDownload(manifest) {
  if (
    !/^o4o-pc-connection-[a-f0-9]{12}-[a-f0-9]{12}\.zip$/.test(
      manifest.filename,
    ) ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
    !Number.isSafeInteger(manifest.bytes) ||
    manifest.bytes <= 0 ||
    manifest.bytes >= 32 * 1024 * 1024
  )
    throw Error("INVALID_SETUP_RELEASE");
  return Buffer.from(
    `@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
set "O4O_SETUP_FILE=%~f0"
"%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoLogo -NoProfile -Command "$text=[IO.File]::ReadAllText($env:O4O_SETUP_FILE,[Text.Encoding]::UTF8); & ([scriptblock]::Create($text.Substring($text.LastIndexOf('# O4O_SETUP_SCRIPT')+18)))"
set "O4O_SETUP_EXIT=%ERRORLEVEL%"
if not "%O4O_SETUP_EXIT%"=="0" pause
exit /b %O4O_SETUP_EXIT%
# O4O_SETUP_SCRIPT
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$downloadUrl = 'https://neture.co.kr/downloads/pc-connection/${manifest.filename}'
$expectedHash = '${manifest.sha256}'
$expectedBytes = ${manifest.bytes}
function Receive-Package([string]$target) {
  Add-Type -AssemblyName System.Net.Http
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $handler = [Net.Http.HttpClientHandler]::new()
  $handler.AllowAutoRedirect = $false
  $client = [Net.Http.HttpClient]::new($handler)
  $client.Timeout = [TimeSpan]::FromMinutes(3)
  $cancel = [Threading.CancellationTokenSource]::new([TimeSpan]::FromMinutes(3))
  $response = $null; $inputStream = $null; $outputStream = $null
  try {
    $response = $client.GetAsync($downloadUrl, [Net.Http.HttpCompletionOption]::ResponseHeadersRead, $cancel.Token).GetAwaiter().GetResult()
    if ([int]$response.StatusCode -ne 200) { throw 'DOWNLOAD_FAILED' }
    $inputStream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $outputStream = [IO.File]::Open($target, [IO.FileMode]::CreateNew)
    $buffer = New-Object byte[] 65536
    $total = 0
    while (($read = $inputStream.ReadAsync($buffer, 0, $buffer.Length, $cancel.Token).GetAwaiter().GetResult()) -gt 0) {
      $total += $read
      if ($total -gt $expectedBytes) { throw 'PACKAGE_TOO_LARGE' }
      $outputStream.Write($buffer, 0, $read)
    }
  } finally {
    if ($outputStream) { $outputStream.Dispose() }
    if ($inputStream) { $inputStream.Dispose() }
    if ($response) { $response.Dispose() }
    $client.Dispose()
    $cancel.Dispose()
  }
}
function Expand-VerifiedPackage([string]$archive, [string]$destination) {
  if ((Get-Item -LiteralPath $archive).Length -ne $expectedBytes) { throw 'PACKAGE_SIZE_MISMATCH' }
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'PACKAGE_HASH_MISMATCH' }
  Expand-Archive -LiteralPath $archive -DestinationPath $destination
}
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('o4o-setup-' + [Guid]::NewGuid().ToString('N'))
try {
  if (-not [Environment]::Is64BitOperatingSystem -or -not [Environment]::Is64BitProcess -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'WINDOWS_X64_REQUIRED' }
  New-Item -ItemType Directory -Path $temporary | Out-Null
  Write-Host 'O4O PC 연결을 설치합니다. 잠시 기다려 주세요.'
  $archive = Join-Path $temporary 'package.zip'
  $package = Join-Path $temporary 'package'
  Receive-Package $archive
  Expand-VerifiedPackage $archive $package
  & (Join-Path $package 'runtime/node.exe') (Join-Path $package 'install.mjs') --window
  if ($LASTEXITCODE -ne 0) { throw 'INSTALL_NOT_COMPLETED' }
  Write-Host '원래 화면으로 돌아가 연결하기를 눌러 주세요.'
} catch {
  if ($env:GITHUB_ACTIONS -eq 'true') { Write-Host ('O4O_SETUP_ERROR: ' + $_.Exception.Message) }
  Write-Host '설치를 마치지 못했습니다. 인터넷 연결과 열린 PC 연결 프로그램을 확인한 뒤 다시 설치해 주세요.'
  exit 1
} finally {
  if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Recurse -Force }
}
`.replace(/\n/g, "\r\n"),
    "utf8",
  );
}
