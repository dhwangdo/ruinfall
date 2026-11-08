$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverUrl = 'http://localhost:3000/'
$portInUse = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet

if (-not $portInUse) {
    $serverCommand = "cd /d `"$projectRoot`" && npm run dev -- --port 3000"
    Start-Process -FilePath $env:ComSpec `
        -ArgumentList @('/k', $serverCommand) `
        -WorkingDirectory $projectRoot `
        -WindowStyle Normal | Out-Null
}

for ($attempt = 0; $attempt -lt 90; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri $serverUrl -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Start-Process -FilePath $serverUrl
            exit 0
        }
    } catch { }
    Start-Sleep -Seconds 1
}

Write-Host '3000 서버가 준비되지 않았어요. 열린 Ruinfall 서버 창에서 오류를 확인해 주세요.'
Read-Host 'Enter를 누르면 닫힙니다'
exit 1
