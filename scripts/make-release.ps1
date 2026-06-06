# Builds the Release/ distribution folder and a ZIP for GitHub Releases.
#
# Prerequisites (local, NOT committed to the repo):
#   - native/onyx/onyx-command-line-*/onyx.exe
#       (download "onyx-command-line-*-windows-x64.zip" from
#        https://github.com/mtolly/onyx/releases and unzip it here)
#   - native/7zip/7z.exe + 7z.dll + License.txt
#
# Usage:  powershell -File scripts\make-release.ps1 [-Version 0.1.0]

param([string]$Version = "0.1.0")

$ErrorActionPreference = "Stop"
$proj = Split-Path -Parent $PSScriptRoot
$rel = Join-Path $proj "Release"

Write-Host "==> Building portable exe (electron-builder)"
Push-Location (Join-Path $proj "app")
npm run dist:portable
Pop-Location

Write-Host "==> Assembling Release/"
if (Test-Path $rel) { Remove-Item $rel -Recurse -Force }
New-Item -ItemType Directory -Force -Path $rel, "$rel\onyx", "$rel\tools" | Out-Null

# 1) exe — najdi portable build (electron-builder pojmenovává podle productName)
$portable = Get-ChildItem (Join-Path $proj "app\dist") -Filter "*.exe" |
  Where-Object { $_.Name -notmatch "Setup" } | Select-Object -First 1
if (-not $portable) { throw "Portable .exe not found in app\dist" }
Copy-Item $portable.FullName "$rel\Clone Hero Chart Manager.exe" -Force

# 2) onyx (whole CLI folder)
$onyxFolder = Get-ChildItem (Join-Path $proj "native\onyx") -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName "onyx.exe") } | Select-Object -First 1
if (-not $onyxFolder) { throw "Could not find a folder containing onyx.exe in native\onyx" }
Copy-Item $onyxFolder.FullName (Join-Path "$rel\onyx" $onyxFolder.Name) -Recurse -Force

# 3) 7-Zip (zip / 7z / RAR5) — moderní LGPL build
$SevenZipDir = Join-Path $proj "native\7zip"
Copy-Item (Join-Path $SevenZipDir "7z.exe") "$rel\tools\7z.exe" -Force
Copy-Item (Join-Path $SevenZipDir "7z.dll") "$rel\tools\7z.dll" -Force
Copy-Item (Join-Path $SevenZipDir "License.txt") "$rel\tools\7-Zip-License.txt" -Force

# 4) docs + license
Copy-Item (Join-Path $proj "LICENSE") "$rel\LICENSE.txt" -Force
Copy-Item (Join-Path $proj "THIRD-PARTY.txt") "$rel\THIRD-PARTY.txt" -Force
Copy-Item (Join-Path $proj "release-assets\README.txt") "$rel\README.txt" -Force

Write-Host "==> Creating ZIP"
$zip = Join-Path $proj "CHM-v$Version-win-x64.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$rel\*" -DestinationPath $zip
$mb = "{0:N1} MB" -f ((Get-Item $zip).Length / 1MB)
Write-Host "Done: $zip ($mb)"
