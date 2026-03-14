@echo off
echo ============================================================
echo  Starting Helios Video Generation Service
echo ============================================================
echo.
echo  ⚡ GPU mode with group offloading (~6GB VRAM)
echo  📡 API will be available at: http://localhost:8000
echo  🎥 Generated videos at:      http://localhost:8000/videos/
echo  🏥 Health check:             http://localhost:8000/health
echo.
echo  NOTE: First run downloads the Helios model (~30GB).
echo        Subsequent runs load from HuggingFace cache.
echo.

cd /d "%~dp0"
py -3.10 -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
pause
