@echo off
echo ============================================================
echo  Helios AI Service — Setup Script
echo ============================================================
echo.

REM Step 1: Install PyTorch with CUDA 12.1
echo [1/3] Installing PyTorch with CUDA 12.1 support...
py -3.10 -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
if %ERRORLEVEL% neq 0 (
    echo ❌ PyTorch install failed. Trying CUDA 11.8...
    py -3.10 -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
)

REM Step 2: Install diffusers from source (required for HeliosPyramidPipeline)
echo.
echo [2/3] Installing diffusers from source (required for Helios)...
py -3.10 -m pip install git+https://github.com/huggingface/diffusers.git

REM Step 3: Install remaining dependencies
echo.
echo [3/3] Installing other dependencies...
py -3.10 -m pip install transformers accelerate sentencepiece safetensors protobuf fastapi "uvicorn[standard]" pydantic python-multipart numpy "imageio[ffmpeg]" moviepy python-dotenv huggingface_hub

echo.
echo ============================================================
echo  ✅ Setup complete!
echo.
echo  To start the Helios service, run:
echo    start.bat
echo.
echo  The service will:
echo    1. Download the Helios-Distilled model (~30GB on first run)
echo    2. Load it on your GPU
echo    3. Serve the API at http://localhost:8000
echo ============================================================
pause
