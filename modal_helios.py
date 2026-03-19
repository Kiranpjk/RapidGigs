"""
modal_helios.py — Deploy Helios video generation as a serverless GPU function on Modal.com

Deploy:   modal deploy modal_helios.py
Test:     modal run modal_helios.py
Endpoint: https://your-org--helios-video-generate-video.modal.run
"""

import modal
from pydantic import BaseModel
from typing import Optional
import uuid

# ── Image: install all deps including Helios (diffusers from source) ──────────
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "ffmpeg")
    .pip_install(
        "torch==2.3.0",
        "torchvision",
        index_url="https://download.pytorch.org/whl/cu121",
    )
    .pip_install(
        "git+https://github.com/huggingface/diffusers.git",
        "transformers>=4.40.0",
        "accelerate>=0.30.0",
        "sentencepiece",
        "safetensors",
        "imageio[ffmpeg]",
        "huggingface_hub",
        "fastapi",
        "pydantic",
    )
)

# ── Modal volume to cache the model weights (~30GB, downloaded once) ──────────
model_cache = modal.Volume.from_name("helios-model-cache", create_if_missing=True)

app = modal.App("helios-video")

# ── Negative prompt recommended by Helios authors ────────────────────────────
NEGATIVE_PROMPT = (
    "Bright tones, overexposed, static, blurred details, subtitles, style, works, paintings, "
    "images, static, overall gray, worst quality, low quality, JPEG compression residue, ugly, "
    "incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, "
    "misshapen limbs, fused fingers, still picture, messy background, three legs, walking backwards"
)


class GenerateRequest(BaseModel):
    prompt: str
    num_frames: int = 73        # ~30 seconds @ 24fps (must be 8n+1: 9,17,33,65,73,129...)
    height: int = 384
    width: int = 640
    guidance_scale: float = 1.0
    seed: Optional[int] = None
    callback_url: Optional[str] = None   # n8n or backend webhook to call when done
    job_id: Optional[str] = None         # for tracking async jobs


class GenerateResponse(BaseModel):
    status: str
    video_url: Optional[str] = None
    job_id: str
    message: str
    provider: str = "modal-helios"


# ── Main generation function ──────────────────────────────────────────────────
@app.function(
    gpu="A10G",                    # A10G is cheapest capable GPU (~$0.0014/sec)
    image=image,
    volumes={"/model-cache": model_cache},
    timeout=600,                   # 10 min max per generation
    scaledown_window=120,          # keep warm for 2 min between requests
    memory=32768,                  # 32GB RAM
)
@modal.fastapi_endpoint(method="POST", label="helios-video-generate")
def generate_video(item: GenerateRequest) -> GenerateResponse:
    import torch
    import os
    import base64
    import httpx
    from diffusers import AutoModel, DiffusionPipeline
    from diffusers.utils import export_to_video

    job_id = item.job_id or f"vj_{uuid.uuid4().hex[:8]}"
    output_path = f"/tmp/{job_id}.mp4"

    # ── Load model (from cache volume if already downloaded) ─────────────────
    model_id = "BestWishYsh/Helios-Distilled"
    cache_dir = "/model-cache/helios"

    print(f"Loading Helios model... (cache: {cache_dir})")
    vae = AutoModel.from_pretrained(
        model_id,
        subfolder="vae",
        torch_dtype=torch.float32,
        cache_dir=cache_dir,
    )
    pipe = DiffusionPipeline.from_pretrained(
        model_id,
        vae=vae,
        torch_dtype=torch.bfloat16,
        cache_dir=cache_dir,
        custom_pipeline="BestWishYsh/Helios-Distilled"
    ).to("cuda")

    # ── Generate ──────────────────────────────────────────────────────────────
    print(f"Generating: '{item.prompt[:80]}...' | {item.num_frames} frames")
    generator = torch.Generator("cuda").manual_seed(item.seed) if item.seed else None

    result = pipe(
        prompt=item.prompt,
        negative_prompt=NEGATIVE_PROMPT,
        num_frames=item.num_frames,
        height=item.height,
        width=item.width,
        pyramid_num_inference_steps_list=[2, 2, 2],
        guidance_scale=item.guidance_scale,
        is_amplify_first_chunk=True,
        generator=generator,
    )

    export_to_video(result.frames[0], output_path, fps=24)
    print(f"Video saved: {output_path}")

    # ── Upload to Cloudinary if configured, else return base64 ───────────────
    video_url = None
    cloudinary_cloud = os.environ.get("CLOUDINARY_CLOUD_NAME")
    cloudinary_key = os.environ.get("CLOUDINARY_API_KEY")
    cloudinary_secret = os.environ.get("CLOUDINARY_API_SECRET")

    if cloudinary_cloud and cloudinary_key and cloudinary_secret:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=cloudinary_cloud,
            api_key=cloudinary_key,
            api_secret=cloudinary_secret,
        )
        upload_result = cloudinary.uploader.upload(
            output_path,
            resource_type="video",
            folder="rapidgigs/ai-shorts",
            public_id=job_id,
        )
        video_url = upload_result["secure_url"]
        print(f"Uploaded to Cloudinary: {video_url}")
    else:
        # Return base64 — backend saves it
        with open(output_path, "rb") as f:
            video_url = f"data:video/mp4;base64,{base64.b64encode(f.read()).decode()}"

    # ── Fire callback if provided (n8n or backend webhook) ───────────────────
    if item.callback_url:
        try:
            httpx.post(item.callback_url, json={
                "job_id": job_id,
                "status": "completed",
                "video_url": video_url if not video_url.startswith("data:") else "base64_payload",
                "provider": "modal-helios",
            }, timeout=30)
            print(f"Callback fired: {item.callback_url}")
        except Exception as e:
            print(f"Callback failed (non-critical): {e}")

    return GenerateResponse(
        status="completed",
        video_url=video_url,
        job_id=job_id,
        message="Video generated successfully by Helios on Modal",
    )


# ── Health check endpoint ─────────────────────────────────────────────────────
@app.function(image=image)
@modal.web_endpoint(method="GET", label="helios-health")
def health():
    return {"status": "ok", "provider": "modal-helios", "gpu": "A10G"}


# ── Local test ────────────────────────────────────────────────────────────────
@app.local_entrypoint()
def main():
    result = generate_video.remote(GenerateRequest(
        prompt="A professional software developer working at a modern desk, "
               "multiple monitors showing code, warm office lighting, cinematic shot",
        num_frames=33,  # short test ~1.4s
    ))
    print(f"Result: {result.status} | job_id: {result.job_id}")
