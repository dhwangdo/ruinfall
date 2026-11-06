$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$exePath = Join-Path $ProjectRoot "outputs\desktop\Ruinfall-win32-x64\Ruinfall.exe"
$sourceRoots = @("app", "public") | ForEach-Object { Join-Path $ProjectRoot $_ }
$sourceFiles = @(
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "postcss.config.mjs",
  "tsconfig.json",
  "desktop\main.cjs",
  "desktop\asset-path.cjs",
  "desktop\verify.cjs",
  "desktop\icon.svg",
  "scripts\build-desktop.mjs",
  "scripts\desktop-runtime.mjs"
) | ForEach-Object { Join-Path $ProjectRoot $_ } | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
$sourceFiles += $sourceRoots | Where-Object { Test-Path -LiteralPath $_ -PathType Container } |
  ForEach-Object { Get-ChildItem -LiteralPath $_ -Recurse -File | ForEach-Object FullName }

$needsBuild = -not (Test-Path -LiteralPath $exePath -PathType Leaf)
if (-not $needsBuild) {
  $buildTime = (Get-Item -LiteralPath $exePath).LastWriteTimeUtc
  $latestSourceTime = $sourceFiles | ForEach-Object { (Get-Item -LiteralPath $_).LastWriteTimeUtc } |
    Measure-Object -Maximum | Select-Object -ExpandProperty Maximum
  $needsBuild = $null -ne $latestSourceTime -and $latestSourceTime -gt $buildTime
}

if ($needsBuild) {
  $runningInstance = Get-Process -Name "Ruinfall" -ErrorAction SilentlyContinue
  if ($runningInstance) {
    Write-Error "소스가 바뀌었지만 Ruinfall이 실행 중입니다. 게임을 닫고 Ruinfall.cmd를 다시 실행하세요."
  }
  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "node_modules\next\dist\bin\next"))) {
    Write-Error "최신 버전을 만들려면 프로젝트 의존성이 필요합니다. 프로젝트 폴더에서 npm install을 먼저 실행하세요."
  }
  Write-Host "소스 변경을 반영해 오프라인 실행기를 갱신합니다..."
  & npm.cmd run build:desktop
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path -LiteralPath $exePath -PathType Leaf)) {
  Write-Error "Ruinfall.exe를 찾을 수 없습니다: $exePath"
}
Start-Process -FilePath $exePath -WorkingDirectory (Split-Path -Parent $exePath)
