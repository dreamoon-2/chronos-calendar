$ErrorActionPreference = 'Stop'
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$dl = "$env:TEMP\sdk-download"
New-Item -ItemType Directory -Force -Path $sdk, $dl | Out-Null

$items = @(
  @{ name = 'platform-36';      url = 'platform-36_r02.zip';          marker = 'android.jar' },
  @{ name = 'build-tools-36.0'; url = 'build-tools_r36_windows.zip';  marker = 'aapt2.exe' },
  @{ name = 'build-tools-36.1'; url = 'build-tools_r36.1_windows.zip'; marker = 'aapt2.exe' },
  @{ name = 'platform-tools';   url = 'platform-tools_r37.0.1-win.zip'; marker = 'adb.exe' }
)

foreach ($it in $items) {
  $zip = Join-Path $dl $it.url
  if (-not (Test-Path $zip)) {
    Write-Output "downloading $($it.url) ..."
    curl.exe -sL --retry 3 --retry-all-errors --connect-timeout 30 --max-time 900 -o $zip "https://mirrors.cloud.tencent.com/AndroidSDK/$($it.url)"
    if ($LASTEXITCODE -ne 0) { throw "download failed: $($it.url)" }
  } else {
    Write-Output "cached $($it.url)"
  }

  $extractDir = Join-Path $dl $it.name
  New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
  Write-Output "extracting $($it.name) ..."
  tar -xf $zip -C $extractDir
}

Write-Output "=== extracted structure ==="
foreach ($it in $items) {
  Write-Output "--- $($it.name) ---"
  Get-ChildItem (Join-Path $dl $it.name) -Recurse -Depth 1 | Select-Object -First 8 | ForEach-Object { $_.FullName.Replace("$dl\$($it.name)\", '') }
  Write-Output ""
}
