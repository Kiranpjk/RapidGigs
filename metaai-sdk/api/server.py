import uvicorn
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from src.metaai_sdk.client import MetaAI, AuthConfig
from src.metaai_sdk.image import ImageGeneration
from src.metaai_sdk.video import VideoGeneration

app = FastAPI()
metadata = {}
# Create SDK instances (global)
# NOTE: In production you may want to manage these with dependency injection
metaai_client = MetaAI()
image_gen = ImageGeneration(metaai_client)
video_gen = VideoGeneration(metaai_client)


# Request models
class GenerateImageRequest(BaseModel):
    prompt: str
    orientation: str = "LANDSCAPE"


class GenerateImageResponse(BaseModel):
    success: bool
    image_urls: list[str]
    prompt: str


class GenerateVideoRequest(BaseModel):
    prompt: str
    orientation: str = "VERTICAL"


class GenerateVideoResponse(BaseModel):
    success: bool
    video_urls: list[str]
    prompt: str
    job_id: str | None = None


# Health check
@app.get("/healthz", status_code=status.HTTP_200_OK)
async def healthz():
    return {"status": "ok"}


# Image generation endpoint
@app.post("/image", response_model=GenerateImageResponse)
async def generate_image(req: GenerateImageRequest):
    try:
        images = await image_gen.generate_image(
            prompt=req.prompt,
            orientation=req.orientation,
            datr=os.getenv("META_AI_DATR", ""),
            abra_sess=os.getenv("META_AI_ABRA_SESS", ""),
            ecto_1_sess=os.getenv("META_AI_ECTO_1_SESS", ""),
        )
        return GenerateImageResponse(
            success=images["success"],
            image_urls=images["image_urls"],
            prompt=images["prompt"],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


# Video generation endpoint (sync)
@app.post("/video", response_model=GenerateVideoResponse)
async def generate_video(req: GenerateVideoRequest):
    try:
        result = await video_gen.generate_video(
            prompt=req.prompt,
            orientation=req.orientation,
            auto_poll=True,
            max_attempts=20,
            poll_interval=5,
        )
        return GenerateVideoResponse(
            success=result["success"],
            video_urls=result["video_urls"],
            prompt=result["prompt"],
            job_id=result.get("job_id"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


# Video generation endpoint (async, returns job_id)
@app.post("/video/async", response_model=GenerateVideoResponse)
async def generate_video_async(req: GenerateVideoRequest):
    try:
        result = await video_gen.generate_video(
            prompt=req.prompt,
            orientation=req.orientation,
            auto_poll=False,
            max_attempts=1,
            poll_interval=5,
        )
        # When async we return the job_id for polling later
        return GenerateVideoResponse(
            success=result["success"],
            video_urls=[],  # empty until polled
            prompt=result["prompt"],
            job_id=result.get("job_id"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


# Poll for video job status
@app.get("/video/jobs/{job_id}", response_model=GenerateVideoResponse)
async def poll_video_job(job_id: str):
    # NOTE: This is a simplified version; actual status parsing may vary
    # For now just return placeholder result to indicate job completion
    return GenerateVideoResponse(
        success=False,
        video_urls=[],
        prompt="placeholder",
        job_id=job_id,
    )


if __name__ == "__main__":
    # Run with: uvicorn api.server:app --reload
    uvicorn.run("metaai_sdk.api.server:app", host="0.0.0.0", port=8000, reload=False)