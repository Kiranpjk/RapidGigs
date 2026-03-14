from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import asyncio
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Helios Video Generation API", version="1.0.0")

# Allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3001", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated videos as static files
os.makedirs("outputs", exist_ok=True)
app.mount("/videos", StaticFiles(directory="outputs"), name="videos")

# Generator instance (initialized on startup)
generator = None
is_loading = False
load_error = None


class GenerationRequest(BaseModel):
    prompt: str
    num_frames: int = 136       # ~5.7s @ 24fps
    height: int = 384
    width: int = 640
    guidance_scale: float = 1.0
    seed: Optional[int] = None
    title: Optional[str] = None


class GenerationResponse(BaseModel):
    status: str
    video_url: str
    filename: str
    message: str


@app.on_event("startup")
async def startup_event():
    global generator, is_loading, load_error
    is_loading = True

    def load():
        global generator, is_loading, load_error
        try:
            import torch
            from generator import HeliosGenerator

            device = "cuda" if torch.cuda.is_available() else "cpu"
            if device == "cpu":
                logger.warning("⚠️  No CUDA GPU detected — running on CPU (will be very slow!)")
            else:
                vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
                logger.info(f"✅ GPU detected: {torch.cuda.get_device_name(0)} ({vram_gb:.1f} GB VRAM)")

            # Use low_vram=True for GPUs < 24GB
            low_vram = device == "cpu" or vram_gb < 20
            generator = HeliosGenerator(device=device, low_vram=low_vram)

        except Exception as e:
            load_error = str(e)
            logger.error(f"❌ Failed to load Helios: {e}")
        finally:
            is_loading = False

    # Load model in background thread so server starts up immediately
    import threading
    threading.Thread(target=load, daemon=True).start()


@app.get("/health")
async def health():
    return {
        "status": "ready" if generator else ("loading" if is_loading else "error"),
        "model": "Helios-Distilled (HeliosPyramidPipeline)",
        "error": load_error,
    }


@app.post("/generate", response_model=GenerationResponse)
async def generate_video(request: GenerationRequest):
    if is_loading:
        raise HTTPException(status_code=503, detail="Model is still loading, please wait...")

    if load_error:
        raise HTTPException(status_code=500, detail=f"Model failed to load: {load_error}")

    if not generator:
        raise HTTPException(status_code=503, detail="Model not initialized")

    try:
        # Run the blocking generation in a thread pool so FastAPI stays responsive
        loop = asyncio.get_event_loop()
        video_path = await loop.run_in_executor(
            None,
            lambda: generator.generate(
                prompt=request.prompt,
                num_frames=request.num_frames,
                height=request.height,
                width=request.width,
                guidance_scale=request.guidance_scale,
                seed=request.seed,
            )
        )

        filename = os.path.basename(video_path)
        # This URL will be accessible from the Node backend and frontend
        video_url = f"http://localhost:8000/videos/{filename}"

        return GenerationResponse(
            status="completed",
            video_url=video_url,
            filename=filename,
            message="Video generated successfully by Helios"
        )

    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
