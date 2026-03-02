@echo off
setlocal

echo [Serenade] Ensuring port 8000 is free...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
  taskkill /PID %%P /F >nul 2>&1
)

echo [Serenade] Starting Django on 0.0.0.0:8000...
py manage.py runserver 0.0.0.0:8000
