$nodeDir = "C:\Users\HOME\node_local"
if (-not (Test-Path "$nodeDir\node-v20.15.0-win-x64\node.exe")) {
    Write-Host "Creating directory..."
    New-Item -ItemType Directory -Force -Path $nodeDir
    Write-Host "Downloading Node.js (please wait)..."
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.15.0/node-v20.15.0-win-x64.zip" -OutFile "$nodeDir\node.zip"
    Write-Host "Extracting Node.js (please wait)..."
    Expand-Archive -Path "$nodeDir\node.zip" -DestinationPath $nodeDir -Force
} else {
    Write-Host "Node.js already downloaded."
}

$batContent = @"
@echo off
set "PATH=C:\Users\HOME\node_local\node-v20.15.0-win-x64;%PATH%"
echo Starting pnpm installation...
call npm install -g pnpm
echo Installing project dependencies...
call pnpm install
echo Starting project server...
call pnpm --filter @workspace/queueless dev
pause
"@

Set-Content -Path "C:\Users\HOME\Downloads\Unique-Finance-Tracker\Unique-Finance-Tracker\start_project.bat" -Value $batContent
Write-Host "Setup complete! Now double click start_project.bat"
