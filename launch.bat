@echo off
echo Starting Discord2 Clone...

:: Start Backend in a new window
echo Starting Backend...
start "Discord2 Backend" cmd /k "cd backend && cargo run --bin backend"

:: Start Frontend in a new window
echo Starting Frontend...
cd discord-app
start "Discord2 App" cmd /k "npm run tauri dev"

echo Done! Backend and Frontend are launching in separate windows.
pause
