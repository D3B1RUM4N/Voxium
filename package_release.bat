@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Voxium - Build Release Package
echo ============================================
echo.

:: Configuration
set "VERSION=0.1.0"
set "RELEASE_DIR=release_package"
set "ZIP_NAME=Voxium-v%VERSION%-windows-x64"

:: Clean previous release
if exist "%RELEASE_DIR%" (
    echo [1/4] Cleaning previous release...
    rmdir /s /q "%RELEASE_DIR%"
)
mkdir "%RELEASE_DIR%"

:: Step 1: Build Tauri app in release mode (includes backend)
echo [2/4] Building Voxium (release)... This may take a few minutes.
cd discord-app
call npx tauri build 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed!
    cd ..
    pause
    exit /b 1
)
cd ..
echo      Build OK

:: Step 2: Copy files to release folder
echo [3/4] Packaging release...

:: Tauri app exe (portable - contains embedded backend)
copy /y "target\release\voxium-app.exe" "%RELEASE_DIR%\Voxium.exe" >nul

:: README
copy /y "RELEASE_README.txt" "%RELEASE_DIR%\README.txt" >nul

:: Also copy NSIS installer if it exists
if exist "target\release\bundle\nsis\*.exe" (
    for %%f in (target\release\bundle\nsis\*.exe) do (
        copy /y "%%f" "%RELEASE_DIR%\Voxium-Setup.exe" >nul
        echo      NSIS installer included
    )
)

echo      Package ready in %RELEASE_DIR%\

:: Step 3: Create ZIP (using PowerShell)
echo [4/4] Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%RELEASE_DIR%\*' -DestinationPath '%ZIP_NAME%.zip' -Force"
echo      %ZIP_NAME%.zip created!

echo.
echo ============================================
echo   Release package ready!
echo   - Folder: %RELEASE_DIR%\
echo   - ZIP:    %ZIP_NAME%.zip
echo ============================================
echo.
echo Upload %ZIP_NAME%.zip to GitHub Releases.
pause
