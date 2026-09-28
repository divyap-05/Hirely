@echo off
cd /d "%~dp0backend"
if exist ".venv\Scripts\uvicorn.exe" (
    ".venv\Scripts\uvicorn.exe" main:app --reload
) else if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m uvicorn main:app --reload
) else (
    python -m uvicorn main:app --reload
)
pause

