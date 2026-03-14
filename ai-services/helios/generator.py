import torch
from diffusers import AutoModel, HeliosPyramidPipeline
from diffusers.utils import export_to_video
import os
import uuid

# Negative prompt recommended by Helios authors for best quality
NEGATIVE_PROMPT = """
Bright tones, overexposed, static, blurred details, subtitles, style, works, paintings, images,
static, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete,
extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, misshapen limbs,
fused fingers, still picture, messy background, three legs, many people in the background, walking backwards
"""

class HeliosGenerator:
    def __init__(self, model_id="BestWishYsh/Helios-Distilled", device="cuda", low_vram=True):
        self.device = device
        self.model_id = model_id
        self.low_vram = low_vram

        print(f"🚀 Loading Helios Model: {model_id}...")
        print(f"   Device: {device} | Low VRAM mode: {low_vram}")

        # Load VAE separately with float32 (improves quality, as per official docs)
        vae = AutoModel.from_pretrained(
            model_id,
            subfolder="vae",
            torch_dtype=torch.float32  # VAE must be float32
        )

        # Load the full pipeline with bfloat16 for transformer
        self.pipe = HeliosPyramidPipeline.from_pretrained(
            model_id,
            vae=vae,
            torch_dtype=torch.bfloat16
        )

        if low_vram:
            # Group offloading: ~6 GB VRAM required
            # Works on most consumer GPUs (RTX 3060+)
            print("   ✨ Enabling group offloading (low VRAM mode, ~6GB required)...")
            self.pipe.enable_group_offload(
                onload_device=torch.device(device),
                offload_device=torch.device("cpu"),
                offload_type="leaf_level",
                use_stream=True,
            )
        else:
            # Full GPU mode: ~24 GB VRAM — fastest
            self.pipe.to(device)

        os.makedirs("outputs", exist_ok=True)
        print("✅ Helios Model Ready!")

    def generate(
        self,
        prompt: str,
        num_frames: int = 136,   # Must be multiple of 8+1 (e.g. 9, 17, 33, 65, 129, 137…)
        height: int = 384,
        width: int = 640,
        guidance_scale: float = 1.0,
        seed: int = None,
    ) -> str:
        """
        Generate a video from a text prompt using Helios-Distilled.
        Returns the path to the saved MP4 file.

        Args:
            prompt: Text description of the video to generate
            num_frames: Number of frames (default 136 ≈ ~5.7s @ 24fps)
            height/width: Video resolution (default 384x640)
            guidance_scale: Classifier-free guidance (1.0 = distilled default)
            seed: Random seed for reproducibility (None = random)
        """
        print(f"🎬 Generating: '{prompt[:80]}...' | {num_frames} frames @ {height}x{width}")

        generator = None
        if seed is not None:
            generator = torch.Generator(self.device).manual_seed(seed)

        result = self.pipe(
            prompt=prompt,
            negative_prompt=NEGATIVE_PROMPT.strip(),
            num_frames=num_frames,
            height=height,
            width=width,
            pyramid_num_inference_steps_list=[2, 2, 2],  # Fast distilled schedule
            guidance_scale=guidance_scale,
            is_amplify_first_chunk=True,
            generator=generator,
        )

        video_frames = result.frames[0]

        output_filename = f"helios_{uuid.uuid4().hex[:8]}.mp4"
        output_path = os.path.join("outputs", output_filename)

        export_to_video(video_frames, output_path, fps=24)
        print(f"📁 Saved: {output_path}")

        return output_path


if __name__ == "__main__":
    # Quick sanity check
    gen = HeliosGenerator(low_vram=True)
    path = gen.generate(
        "A vibrant tropical fish swimming gracefully among colorful coral reefs in a clear turquoise ocean. "
        "Close-up shot with dynamic movement, cinematic lighting.",
        num_frames=33,   # Short test: ~1.4s
    )
    print(f"✅ Test video saved to: {path}")
