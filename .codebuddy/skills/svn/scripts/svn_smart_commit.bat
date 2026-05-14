@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM SVN Smart Commit - Windows
REM ============================================================
REM ENCODING STRATEGY:
REM   On Windows, cmd.exe command-line arguments (%1) are encoded
REM   in the system's ANSI codepage (e.g. GBK/936) BEFORE the
REM   script runs. chcp 65001 cannot fix already-garbled args.
REM
REM   Therefore, for Chinese commit messages from AI tools
REM   (OpenClaw etc.), ALWAYS use the -f flag to pass the message
REM   via a UTF-8 encoded temp file:
REM     svn_smart_commit.bat -f <path_to_utf8_message_file>
REM
REM   The script uses svn commit with --encoding UTF-8 to ensure
REM   the SVN server interprets the message correctly.
REM ============================================================

REM Save original codepage for restore on exit
for /f "tokens=2 delims=:=" %%a in ('chcp 2^>nul') do set "ORIG_CP=%%a"
set "ORIG_CP=%ORIG_CP: =%"

REM Switch to UTF-8 for display
chcp 65001 >nul 2>&1

echo === SVN Smart Commit ===
echo.

REM Check SVN
where svn >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] SVN not found.
    goto :RESTORE_CP
)

REM Check working directory
svn info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Not in a SVN working directory.
    goto :RESTORE_CP
)

echo Current SVN status:
svn status
echo.

REM Check for changes
for /f %%a in ('svn status 2^>nul ^| findstr /r "^[AMRD]" ^| find /c /v ""') do set CHANGED=%%a
if "!CHANGED!"=="0" (
    echo No changes to commit.
    goto :RESTORE_CP
)
echo Found !CHANGED! changed file(s)
echo.

REM Show diff (first 100 lines)
echo Diff (first 100 lines):
echo.
svn diff | more +0 /c /e
echo.

REM ============================================================
REM Get commit message
REM ============================================================
REM Priority:
REM   -f <file>  : Read message from a UTF-8 file (RECOMMENDED for Chinese)
REM   -m <msg>   : Use message string directly (ASCII only recommended)
REM   (none)     : Interactive prompt
REM ============================================================
set "COMMIT_MSG="
set "MSG_FILE="
set "USE_FILE_MODE=0"

if "%~1"=="-f" (
    if "%~2"=="" (
        echo [ERROR] Missing file path after -f
        goto :RESTORE_CP
    )
    if not exist "%~2" (
        echo [ERROR] File not found: %~2
        goto :RESTORE_CP
    )
    set "MSG_FILE=%~2"
    set "USE_FILE_MODE=1"
) else if "%~1"=="-m" (
    if "%~2"=="" (
        echo [ERROR] Missing message after -m
        goto :RESTORE_CP
    )
    set "COMMIT_MSG=%~2"
) else if not "%~1"=="" (
    set "COMMIT_MSG=%~1"
) else (
    echo Please enter commit message:
    set /p "COMMIT_MSG="
)

REM Validate: either file mode or message must be set
if "!USE_FILE_MODE!"=="0" (
    if "!COMMIT_MSG!"=="" (
        echo [ERROR] Commit message cannot be empty.
        goto :RESTORE_CP
    )
)

echo.
echo Commit message:
echo ----------------------------------------
if "!USE_FILE_MODE!"=="1" (
    type "!MSG_FILE!"
) else (
    echo !COMMIT_MSG!
)
echo.
echo ----------------------------------------
echo.

echo Committing...
echo.

REM ============================================================
REM SVN commit
REM   - File mode (-f): use svn commit -F <file> --encoding UTF-8
REM     This bypasses cmd.exe argument encoding entirely.
REM   - String mode: use svn commit -m with --encoding UTF-8
REM ============================================================
if "!USE_FILE_MODE!"=="1" (
    svn commit --encoding UTF-8 -F "!MSG_FILE!"
) else (
    svn commit --encoding UTF-8 -m "!COMMIT_MSG!"
)
set "EXITCODE=%errorlevel%"

if %EXITCODE% equ 0 (
    echo.
    echo Commit OK.
    echo.
    echo === Verify last commit ===
    svn log -r HEAD -l 1
) else (
    echo.
    echo [ERROR] Commit failed.
)

:RESTORE_CP
REM Restore original codepage before exit
chcp %ORIG_CP% >nul 2>&1
if defined EXITCODE (
    if %EXITCODE% neq 0 exit /b %EXITCODE%
)

echo.
echo Done.
