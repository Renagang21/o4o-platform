import { createHash } from "node:crypto";

/** One offline Windows installer: readable batch/PowerShell header + verified ZIP + footer. */
export function setupDownload(manifest, archive) {
  if (
    !/^o4o-pc-connection-[a-f0-9]{12}-[a-f0-9]{12}\.zip$/.test(
      manifest.filename,
    ) ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
    !Buffer.isBuffer(archive) ||
    archive.length !== manifest.bytes ||
    archive.length <= 0 ||
    createHash("sha256").update(archive).digest("hex") !== manifest.sha256
  )
    throw Error("INVALID_SETUP_RELEASE");
  const header = Buffer.from(
    `@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
set "O4O_SETUP_FILE=%~f0"
"%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoLogo -NoProfile -Command "$f=[IO.File]::OpenRead($env:O4O_SETUP_FILE); $r=[IO.BinaryReader]::new($f); if($f.Length -lt 16){throw 'Invalid installer'}; $f.Position=$f.Length-16; $footer=$r.ReadBytes(16); if([Text.Encoding]::ASCII.GetString($footer,0,8) -ne 'O4OPKG1!'){throw 'Invalid installer'}; $n=[BitConverter]::ToInt64($footer,8); if($n -le 0 -or $n -gt 16384 -or $n -gt $f.Length-16){throw 'Invalid installer'}; $f.Position=0; $text=[Text.Encoding]::UTF8.GetString($r.ReadBytes([int]$n)); $r.Dispose(); & ([scriptblock]::Create($text.Substring($text.LastIndexOf('# O4O_SETUP_SCRIPT')+18)))"
set "O4O_SETUP_EXIT=%ERRORLEVEL%"
if not "%O4O_SETUP_EXIT%"=="0" pause
exit /b %O4O_SETUP_EXIT%
# O4O_SETUP_SCRIPT
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$expectedHash = '${manifest.sha256}'
$expectedBytes = ${manifest.bytes}
function Copy-EmbeddedPackage([string]$target) {
  $source = [IO.File]::OpenRead($env:O4O_SETUP_FILE)
  $outputStream = $null
  try {
    $reader = [IO.BinaryReader]::new($source)
    $source.Position = $source.Length - 16
    $footer = $reader.ReadBytes(16)
    if ([Text.Encoding]::ASCII.GetString($footer, 0, 8) -ne 'O4OPKG1!') { throw 'INVALID_PACKAGE_FOOTER' }
    $offset = [BitConverter]::ToInt64($footer, 8)
    if ($offset -le 0 -or $offset -gt 16384 -or $source.Length -ne $offset + $expectedBytes + 16) { throw 'PACKAGE_SIZE_MISMATCH' }
    $source.Position = $offset
    $outputStream = [IO.File]::Open($target, [IO.FileMode]::CreateNew)
    $buffer = New-Object byte[] 65536
    $remaining = $expectedBytes
    while ($remaining -gt 0) {
      $read = $source.Read($buffer, 0, [Math]::Min($remaining, $buffer.Length))
      if ($read -le 0) { throw 'TRUNCATED_PACKAGE' }
      $outputStream.Write($buffer, 0, $read)
      $remaining -= $read
    }
  } finally {
    if ($outputStream) { $outputStream.Dispose() }
    $source.Dispose()
  }
}
function Expand-VerifiedPackage([string]$archive, [string]$destination) {
  if ([IO.FileInfo]::new($archive).Length -ne $expectedBytes) { throw 'PACKAGE_SIZE_MISMATCH' }
  $hasher = [Security.Cryptography.SHA256]::Create()
  $file = [IO.File]::OpenRead($archive)
  try { $actualHash = [BitConverter]::ToString($hasher.ComputeHash($file)).Replace('-', '').ToLowerInvariant() }
  finally { $file.Dispose(); $hasher.Dispose() }
  if ($actualHash -ne $expectedHash) { throw 'PACKAGE_HASH_MISMATCH' }
  [void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem')
  [IO.Compression.ZipFile]::ExtractToDirectory($archive, $destination)
}
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('o4o-setup-' + [Guid]::NewGuid().ToString('N'))
try {
  if (-not [Environment]::Is64BitOperatingSystem -or -not [Environment]::Is64BitProcess -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'WINDOWS_X64_REQUIRED' }
  [void][IO.Directory]::CreateDirectory($temporary)
  Write-Host 'O4O PC 연결을 설치합니다. 잠시 기다려 주세요.'
  $archive = Join-Path $temporary 'package.zip'
  $package = Join-Path $temporary 'package'
  Copy-EmbeddedPackage $archive
  Expand-VerifiedPackage $archive $package
  & (Join-Path $package 'runtime/node.exe') (Join-Path $package 'install.mjs') --window
  if ($LASTEXITCODE -ne 0) { throw 'INSTALL_NOT_COMPLETED' }
  Write-Host '설치가 끝났습니다. O4O 화면에서 연결 상태를 확인해 주세요.'
} catch {
  if ($env:GITHUB_ACTIONS -eq 'true') { Write-Host ('O4O_SETUP_ERROR: ' + $_.Exception.Message) }
  Write-Host '설치를 마치지 못했습니다. 열린 PC 연결 프로그램을 종료한 뒤 다시 설치해 주세요. 파일이 손상됐다면 O4O에서 다시 받아 주세요.'
  exit 1
} finally {
  if ([IO.Directory]::Exists($temporary)) { [IO.Directory]::Delete($temporary, $true) }
}
`.replace(/\n/g, "\r\n"),
    "utf8",
  );
  if (header.length > 16384) throw Error("INSTALLER_HEADER_TOO_LARGE");
  const footer = Buffer.alloc(16);
  footer.write("O4OPKG1!", 0, "ascii");
  footer.writeBigInt64LE(BigInt(header.length), 8);
  const installer = Buffer.concat([header, archive, footer]);
  if (installer.length >= 32 * 1024 * 1024)
    throw Error("PC installer exceeds the 32 MiB HTTP download limit");
  return installer;
}
