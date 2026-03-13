from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
from generator import HeliosGenerator
import uuid

app = FastAPI(title="Helios Video Generation API")

# Mount outputs directory to serve videos
os.makedirs("outputs", exist_ok=True)
app.mount("/static", StaticFiles(directory="outputs"), name="static")

# Initialize generator lazily to handle device placement
generator = None

class GenerationRequest(BaseModel):
    prompt: str
    num_frames: int = 132
    callback_url: str = None # For async notification

@app.on_event("startup")
async def startup_event():
    global generator
    # Only initialize if GPU is available
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = HeliosGenerator(device=device)

@app.get("/health")
async def health():
    return {"status": "ok", "model": "Helios-Distilled"}

@app.post("/generate")
async def generate_video(request: GenerationRequest):
    if not generator:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        video_path = generator.generate(
            prompt=request.prompt,
            num_frames=request.num_frames
        )
        
        # In a real production app, we would upload to S3/Cloudinary here
        # For now, we return the local path or a simulated URL
        return {
            "status": "completed",
            "video_url": f"/static/{os.path.basename(video_path)}",
            "message": "Video generated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
