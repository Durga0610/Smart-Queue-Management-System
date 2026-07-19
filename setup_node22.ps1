Stop-Process -Name 'node' -Force -ErrorAction SilentlyContinue
$nodeDir = "C:\Users\HOME\node_local22"
if (-not (Test-Path "$nodeDir\node-v22.14.0-win-x64\node.exe")) {
    Write-Host "Creating directory..."
    New-Item -ItemType Directory -Force -Path $nodeDir
    Write-Host "Downloading Node.js v22 (please wait)..."
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip" -OutFile "$nodeDir\node.zip"
    Write-Host "Extracting Node.js v22 (please wait)..."
    Expand-Archive -Path "$nodeDir\node.zip" -DestinationPath $nodeDir -Force
} else {
    Write-Host "Node.js v22 already downloaded."
}

$batContent = @"
@echo off
set "PATH=C:\Users\HOME\node_local22\node-v22.14.0-win-x64;%PATH%"
echo Starting pnpm installation...
call npm install -g pnpm@9
echo Installing project dependencies...
call pnpm install
echo Starting project server...
call pnpm run dev
pause
"@

Set-Content -Path "C:\Users\HOME\Downloads\Unique-Finance-Tracker\Unique-Finance-Tracker\start_project.bat" -Value $batContent
Write-Host "Setup complete! Now double click start_project.bat"
