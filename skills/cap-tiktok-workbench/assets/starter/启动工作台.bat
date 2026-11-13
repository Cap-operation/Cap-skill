@echo off
cd /d "%~dp0"
where py >nul 2>nul && (py -3 -B start_workbench.py) || (python -B start_workbench.py)
if errorlevel 1 pause
