import torch
from diffusers import HeliosPipeline, HeliosScheduler
from diffusers.utils import export_to_video
import os

class HeliosGenerator:
    def __init__(self, model_id="BestWishYSH/Helios-Distilled", device="cuda"):
        self.device = device
        self.model_id = model_id
        
        print(f"🚀 Loading Helios Model: {model_id}...")
        self.pipe = HeliosPipeline.from_pretrained(
            model_id, 
            torch_dtype=torch.float16
        ).to(device)
        
        # Enable offloading to save VRAM if needed as per README
        # self.pipe.enable_model_cpu_offload() 
        
        print("✅ Helios Model Loaded.")

    def generate(self, prompt, num_frames=132, height=320, width=576, num_inference_steps=8):
        """
        Generates a video from a text prompt.
        Helios generates 33 frames per chunk. 
        132 frames = ~5.5s @ 24fps (multiple of 33 as requested in README)
        """
        print(f"🎬 Generating video for: {prompt}")
        
        video_frames = self.pipe(
            prompt=prompt,
            num_frames=num_frames,
            height=height,
            width=width,
            num_inference_steps=num_inference_steps,
            guidance_scale=1.0, # Distilled models often use lower guidance
        ).frames[0]
        
        output_filename = f"gen_{os.urandom(4).hex()}.mp4"
        output_path = os.path.join("outputs", output_filename)
        os.makedirs("outputs", exist_ok=True)
        
        export_to_video(video_frames, output_path, fps=24)
        print(f"📁 Video saved to: {output_path}")
        
        return output_path

if __name__ == "__main__":
    # Test generation
    gen = HeliosGenerator()
    gen.generate("A cinematic shot of a modern office space with professionals working, 4k, high quality")
