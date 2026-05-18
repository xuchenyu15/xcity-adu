@echo off
setlocal

set "ROOT=%~dp0"

start "XBuildApi" cmd /k "cd /d "%ROOT%server-dotnet\XBuildApi" && dotnet run"
start "figma" cmd /k "cd /d "%ROOT%figma" && npm run dev"

endlocal
