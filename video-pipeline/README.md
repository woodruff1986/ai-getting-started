# Local Open-Source Video Pipeline (ComfyUI + CogVideoX)

This folder provides a local-first, open-source workflow to transform a dialogue continuity into a downloadable MP4.

## What this gives you

- Dialogue/script -> structured shot plan (`shots.json`)
- Shot plan -> generated clips via ComfyUI API
- Clips -> assembled final video via FFmpeg

## Requirements

- Python 3.10+
- `ffmpeg` installed and available on PATH
- A running ComfyUI server with video-capable workflow (CogVideoX family recommended)
- GPU recommended for practical render times

## Folder structure

```
video-pipeline/
  assets/
    audio/                # optional music/voice tracks
    characters/           # optional character reference images
  configs/
    pipeline.example.yaml
  dialogues/
    example-dialogue.md
  workflows/
    comfyui-cogvideox.example.json
  plans/
  outputs/
    shots/
    final/
  scripts/
    plan_from_dialogue.py
    render_shots_comfyui.py
    assemble_final.py
```

## Quickstart

### 1) Create shot plan from dialogue

```bash
python3 video-pipeline/scripts/plan_from_dialogue.py \
  --input video-pipeline/dialogues/example-dialogue.md \
  --output video-pipeline/plans/versailles-shots.json \
  --default-duration 4
```

### 2) Generate shots through ComfyUI

1. Duplicate config and workflow examples:

```bash
cp video-pipeline/configs/pipeline.example.yaml video-pipeline/configs/pipeline.yaml
cp video-pipeline/workflows/comfyui-cogvideox.example.json video-pipeline/workflows/comfyui-cogvideox.json
```

2. Edit:
   - `video-pipeline/configs/pipeline.yaml`
   - `video-pipeline/workflows/comfyui-cogvideox.json`

3. Render:

```bash
python3 video-pipeline/scripts/render_shots_comfyui.py \
  --plan video-pipeline/plans/versailles-shots.json \
  --workflow video-pipeline/workflows/comfyui-cogvideox.json \
  --output video-pipeline/outputs/shots \
  --comfy-url http://127.0.0.1:8188
```

### 3) Assemble final MP4

```bash
python3 video-pipeline/scripts/assemble_final.py \
  --plan video-pipeline/plans/versailles-shots.json \
  --shots-dir video-pipeline/outputs/shots \
  --output video-pipeline/outputs/final/versailles-final.mp4
```

## Expected plan format

The assembler expects this shape:

```json
{
  "version": 1,
  "source": "video-pipeline/dialogues/example-dialogue.md",
  "shots": [
    {
      "id": "scene_01",
      "title": "Le seuil du palais",
      "duration_seconds": 4,
      "positive_prompt": "cinematic TV drama shot ...",
      "negative_prompt": "blurry, low quality ..."
    }
  ]
}
```

`plan_from_dialogue.py` now emits this format directly.

## Download helper (Windows)

If your final video is committed to GitHub, you can download it directly to your Windows Downloads folder:

```powershell
powershell -ExecutionPolicy Bypass -File video-pipeline/scripts/download_final_to_windows.ps1 `
  -Url "https://raw.githubusercontent.com/<owner>/<repo>/<branch>/video-pipeline/outputs/final/versailles-final.mp4" `
  -OutFileName "versailles-final.mp4"
```

## Notes on "persistent actors"

To improve character consistency:

- Keep stable character descriptors in prompts
- Use reference images in `assets/characters` + adapter nodes in your ComfyUI graph
- Keep seed discipline across adjacent shots
- Keep wardrobe/lighting/camera constraints explicit in each shot prompt

This scaffold is intentionally generic because ComfyUI node IDs differ by workflow. You only need to align node IDs once in `pipeline.yaml`.
