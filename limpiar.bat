@echo off
echo ========================================
echo  HorecaSO — Limpieza de entorno
echo ========================================
echo.

echo [1/3] Liberando puerto 8000 (backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo     PID %%a terminado.
)

echo [2/3] Liberando puerto 5173 (frontend Vite)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo     PID %%a terminado.
)

echo [3/3] Limpiando pantalla...
timeout /t 2 >nul
cls

echo ========================================
echo  Listo. Entorno limpio.
echo  Puedes arrancar backend y frontend.
echo ========================================
echo.
pause
```

Desde la terminal de VSCode lo ejecutas así:
```
.\limpiar.bat